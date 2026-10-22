#!/usr/bin/env python3
"""Small independent executable definition of LitmusLab's finite SC/TSO DSL.

This is a validation reference, not the application engine or a hardware oracle.
Only Python's standard library is used. State is represented by immutable tuples;
search and replay share the transition relation, but never call MoonBit code.
"""

from __future__ import annotations

import argparse
from collections import deque
from dataclasses import dataclass
import json
from pathlib import Path
import re
from typing import Iterable


IDENTIFIER = re.compile(r"[A-Za-z][A-Za-z0-9_]{0,31}\Z", re.ASCII)
INTEGER = re.compile(r"-?[0-9]+\Z", re.ASCII)
ACTION = re.compile(r"([tf])([0-9]+)\Z", re.ASCII)


class DSLParseError(ValueError):
    def __init__(self, message: str, line: int, column: int = 1):
        super().__init__(f"line {line}, column {column}: {message}")
        self.message = message
        self.line = line
        self.column = column


class ReplayError(ValueError):
    """Witness is malformed, disabled, redundant, or does not terminate."""


@dataclass(frozen=True)
class Instruction:
    op: str
    address: int = -1
    value: int = 0
    register: int = -1


@dataclass(frozen=True)
class Thread:
    name: str
    registers: tuple[str, ...]
    instructions: tuple[Instruction, ...]


@dataclass(frozen=True)
class Program:
    addresses: tuple[str, ...]
    initial: tuple[int, ...]
    threads: tuple[Thread, ...]


@dataclass(frozen=True)
class State:
    memory: tuple[int, ...]
    pcs: tuple[int, ...]
    registers: tuple[tuple[int, ...], ...]
    buffers: tuple[tuple[tuple[int, int], ...], ...]


def _replace(items: tuple, index: int, value) -> tuple:
    return items[:index] + (value,) + items[index + 1 :]


def parse(source: str) -> Program:
    """Parse a line-oriented program with bounds checked before exploration."""
    if len(source) > 32768:
        raise DSLParseError("source exceeds 32768 Unicode code points", 1)
    addresses: list[str] = []
    initial: list[int] = []
    threads: list[Thread] = []
    current_name: str | None = None
    registers: list[str] = []
    instructions: list[Instruction] = []
    memory_seen = False
    # The DSL uses LF line endings; CR is accepted as token whitespace for CRLF.
    # Unicode whitespace is deliberately not a substitute for ASCII separators.
    lines = source.split("\n")

    def fail(message: str, line: int, token: str = ""):
        column = lines[line - 1].find(token) + 1 if token else 1
        raise DSLParseError(message, line, max(column, 1))

    def integer(token: str, line: int) -> int:
        if not INTEGER.fullmatch(token):
            fail("expected a decimal integer", line, token)
        # Avoid host integer conversion limits and pathological input costs.
        digits = token.lstrip("-").lstrip("0") or "0"
        if len(digits) > 5:
            fail("integer must be in -32768..32767", line, token)
        value = int(digits) * (-1 if token.startswith("-") else 1)
        if not -32768 <= value <= 32767:
            fail("integer must be in -32768..32767", line, token)
        return value

    for number, raw in enumerate(lines, 1):
        content = raw.split("#", 1)[0].strip(" \t\r")
        if not content:
            continue
        parts = re.split(r"[ \t\r]+", content)
        command = parts[0]
        if not memory_seen:
            if command != "memory":
                fail("the first nonempty line must declare memory", number)
            if len(parts) < 2:
                fail("memory requires at least one address", number)
            for assignment in parts[1:]:
                pair = assignment.split("=")
                if len(pair) != 2 or not IDENTIFIER.fullmatch(pair[0]):
                    fail("expected name=integer memory assignment", number, assignment)
                name, value = pair
                if name in addresses:
                    fail("duplicate memory name", number, name)
                if len(addresses) >= 8:
                    fail("at most 8 memory addresses are allowed", number, name)
                addresses.append(name)
                initial.append(integer(value, number))
            memory_seen = True
            continue
        if command == "memory":
            fail("memory may only be declared once", number)
        if command == "thread":
            if current_name is not None:
                fail("a thread must end before another begins", number)
            if len(parts) != 2 or not IDENTIFIER.fullmatch(parts[1]):
                fail("expected thread NAME", number)
            if parts[1] in {thread.name for thread in threads}:
                fail("duplicate thread name", number, parts[1])
            if len(threads) >= 4:
                fail("at most 4 threads are allowed", number)
            current_name, registers, instructions = parts[1], [], []
            continue
        if command == "end":
            if len(parts) != 1 or current_name is None:
                fail("end requires an open thread and no arguments", number)
            threads.append(Thread(current_name, tuple(registers), tuple(instructions)))
            current_name = None
            continue
        if current_name is None:
            fail("instructions must occur inside a thread", number)
        if len(instructions) >= 16:
            fail("at most 16 instructions per thread are allowed", number)
        if command == "fence":
            if len(parts) != 1:
                fail("fence takes no arguments", number)
            instructions.append(Instruction("fence"))
        elif command == "store":
            if len(parts) != 3:
                fail("expected store ADDRESS INTEGER", number)
            if parts[1] not in addresses:
                fail("unknown memory address", number, parts[1])
            instructions.append(Instruction("store", addresses.index(parts[1]), integer(parts[2], number)))
        elif command == "load":
            if len(parts) != 3 or not IDENTIFIER.fullmatch(parts[1]):
                fail("expected load REGISTER ADDRESS", number)
            if parts[2] not in addresses:
                fail("unknown memory address", number, parts[2])
            if parts[1] not in registers:
                if len(registers) >= 8:
                    fail("at most 8 registers per thread are allowed", number, parts[1])
                registers.append(parts[1])
            instructions.append(Instruction("load", addresses.index(parts[2]), register=registers.index(parts[1])))
        else:
            fail("unknown instruction", number, command)
    if not memory_seen:
        raise DSLParseError("memory declaration is required", 1)
    if current_name is not None:
        raise DSLParseError("thread is missing end", len(lines) + 1)
    if not threads:
        raise DSLParseError("at least one thread is required", len(lines) + 1)
    return Program(tuple(addresses), tuple(initial), tuple(threads))


def initial_state(program: Program) -> State:
    return State(program.initial, (0,) * len(program.threads),
                 tuple((0,) * len(thread.registers) for thread in program.threads),
                 ((),) * len(program.threads))


def terminal(program: Program, state: State) -> bool:
    return (all(pc == len(thread.instructions) for pc, thread in zip(state.pcs, program.threads))
            and not any(state.buffers))


def transitions(program: Program, state: State, model: str) -> Iterable[tuple[str, State]]:
    """Enumerate exactly the legal next atomic actions."""
    if model not in {"SC", "TSO"}:
        raise ValueError("model must be SC or TSO")
    for index, thread in enumerate(program.threads):
        pc = state.pcs[index]
        if pc < len(thread.instructions):
            instruction = thread.instructions[pc]
            memory, registers, buffers = state.memory, state.registers, state.buffers
            if instruction.op == "fence" and model == "TSO" and buffers[index]:
                pass  # Fence remains disabled until this thread's buffer is empty.
            else:
                if instruction.op == "store":
                    if model == "SC":
                        memory = _replace(memory, instruction.address, instruction.value)
                    else:
                        buffers = _replace(buffers, index, buffers[index] + ((instruction.address, instruction.value),))
                elif instruction.op == "load":
                    value = memory[instruction.address]
                    if model == "TSO":
                        for address, pending in reversed(buffers[index]):
                            if address == instruction.address:
                                value = pending
                                break
                    registers = _replace(registers, index, _replace(registers[index], instruction.register, value))
                yield f"t{index}", State(memory, _replace(state.pcs, index, pc + 1), registers, buffers)
        # A thread can flush after its last instruction has executed.
        if model == "TSO" and state.buffers[index]:
            address, value = state.buffers[index][0]
            yield f"f{index}", State(_replace(state.memory, address, value), state.pcs,
                                    state.registers, _replace(state.buffers, index, state.buffers[index][1:]))


def outcome(program: Program, state: State) -> dict:
    return {
        "memory": dict(zip(program.addresses, state.memory)),
        "registers": {thread.name: dict(zip(thread.registers, values))
                      for thread, values in zip(program.threads, state.registers)},
    }


def outcome_key(value: dict) -> str:
    return json.dumps({"memory": value["memory"], "registers": value["registers"]}, sort_keys=True, separators=(",", ":"))


def snapshot(program: Program, state: State, step: int, action: str | None) -> dict:
    return {
        "step": step, "action": action, **outcome(program, state),
        "pcs": dict(zip((thread.name for thread in program.threads), state.pcs)),
        "buffers": {thread.name: [{"address": program.addresses[address], "value": value}
                                   for address, value in buffer]
                    for thread, buffer in zip(program.threads, state.buffers)},
        "terminal": terminal(program, state),
    }


def replay(source: str | Program, model: str, witness: str) -> dict:
    """Replay a complete witness, rejecting all disabled or extra actions."""
    program = parse(source) if isinstance(source, str) else source
    if model not in {"SC", "TSO"}:
        raise ReplayError("model must be SC or TSO")
    if len(witness) > 1024:
        raise ReplayError("witness exceeds 1024 characters")
    state = initial_state(program)
    trace = [snapshot(program, state, 0, None)]
    tokens = re.split(r"[ \t\r\n]+", witness.strip(" \t\r\n")) if witness.strip(" \t\r\n") else []
    for step, token in enumerate(tokens, 1):
        if step > 128:
            raise ReplayError("witness exceeds 128 steps")
        if not ACTION.fullmatch(token):
            raise ReplayError(f"step {step}: malformed action {token!r}")
        if terminal(program, state):
            raise ReplayError(f"step {step}: action after termination")
        available = dict(transitions(program, state, model))
        if token not in available:
            raise ReplayError(f"step {step}: action {token!r} is not enabled")
        state = available[token]
        trace.append(snapshot(program, state, step, token))
    if not terminal(program, state):
        raise ReplayError("witness does not reach a terminal state")
    return {"ok": True, "model": model, "outcome": outcome(program, state), "trace": trace}


def analyze(source: str | Program, model: str = "TSO", strategy: str = "bfs",
            max_states: int = 100000, max_outcomes: int = 1024) -> dict:
    """Enumerate terminal observations with explicit conservative truncation.

    max_states bounds distinct discovered states, including the initial state.
    max_outcomes bounds retained distinct terminal observations. A result only
    becomes incomplete when an additional unseen state/outcome cannot be kept.
    """
    program = parse(source) if isinstance(source, str) else source
    if model not in {"SC", "TSO"}:
        raise ValueError("model must be SC or TSO")
    if strategy not in {"bfs", "dfs"}:
        raise ValueError("strategy must be bfs or dfs")
    if (type(max_states) is not int or type(max_outcomes) is not int or
            not 1 <= max_states <= 100000 or not 1 <= max_outcomes <= 1024):
        raise ValueError("max_states must be 1..100000 and max_outcomes 1..1024")
    start = initial_state(program)
    frontier = deque([start])
    paths: dict[State, tuple[str, ...]] = {start: ()}
    found: dict[str, dict] = {}
    complete, reason, expanded = True, None, 0
    while frontier:
        state = frontier.popleft() if strategy == "bfs" else frontier.pop()
        expanded += 1
        if terminal(program, state):
            value = outcome(program, state)
            key = outcome_key(value)
            if key not in found:
                if len(found) >= max_outcomes:
                    complete, reason = False, "max_outcomes"
                    break
                found[key] = {**value, "witness": " ".join(paths[state])}
        for action, successor in transitions(program, state, model):
            if successor in paths:
                continue
            if len(paths) >= max_states:
                complete, reason = False, "max_states"
                break
            paths[successor] = paths[state] + (action,)
            frontier.append(successor)
        if not complete:
            break
    return {"ok": True, "model": model, "strategy": strategy,
            "complete": complete, "status": "complete" if complete else "incomplete",
            "reason": reason, "states": len(paths), "expanded": expanded,
            "outcomes": [found[key] for key in sorted(found)]}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--model", choices=["SC", "TSO"], default="TSO")
    parser.add_argument("--strategy", choices=["bfs", "dfs"], default="bfs")
    parser.add_argument("--max-states", type=int, default=100000)
    parser.add_argument("--max-outcomes", type=int, default=1024)
    parser.add_argument("--witness", help="independently replay this witness instead of searching")
    args = parser.parse_args()
    source = args.source.read_text(encoding="utf-8")
    try:
        result = (replay(source, args.model, args.witness) if args.witness is not None else
                  analyze(source, args.model, args.strategy, args.max_states, args.max_outcomes))
    except (DSLParseError, ReplayError, ValueError) as error:
        result = {"ok": False, "error": str(error)}
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(0 if result["ok"] else 2)


if __name__ == "__main__":
    main()
