#!/usr/bin/env python3
"""Independent experiment expectations; never imports or calls the product engine."""
from dataclasses import replace
import json
from pathlib import Path
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))
import reference as ref


def insert_fences(program, locations):
    selected = {(item["thread"], item["index"]) for item in locations}
    threads = []
    for thread in program.threads:
        instructions = []
        for boundary in range(len(thread.instructions) + 1):
            if (thread.name, boundary) in selected:
                instructions.append(ref.Instruction("fence"))
            if boundary < len(thread.instructions):
                instructions.append(thread.instructions[boundary])
        threads.append(replace(thread, instructions=tuple(instructions)))
    return replace(program, threads=tuple(threads))


def serialize(program):
    lines = ["memory " + " ".join(f"{name}={value}" for name, value in zip(program.addresses, program.initial))]
    for thread in program.threads:
        lines.append("thread " + thread.name)
        for instruction in thread.instructions:
            if instruction.op == "fence":
                lines.append("fence")
            elif instruction.op == "store":
                lines.append(f"store {program.addresses[instruction.address]} {instruction.value}")
            else:
                lines.append(f"load {thread.registers[instruction.register]} {program.addresses[instruction.address]}")
        lines.append("end")
    return "\n".join(lines) + "\n"


def matches(outcome, clauses):
    return all((outcome["memory"][clause["name"]] if clause["kind"] == "mem" else
                outcome["registers"][clause["thread"]][clause["name"]]) == clause["value"]
               for clause in clauses)


def outcome_id(program, value):
    return "|".join([",".join(str(value["memory"][name]) for name in program.addresses)] +
                    [",".join(str(value["registers"][thread.name][name]) for name in thread.registers)
                     for thread in program.threads])


def mapped_witness(program, transformed, locations, model, witness):
    """Insert only fences, keeping every original t/f action in its old order.

    Tail fences are appended only after the entire original terminal witness.
    A blocked fence does not invent a flush or reorder any original action.
    """
    ref.replay(program, model, witness)
    selected = {(item["thread"], item["index"]) for item in locations}
    original_state = ref.initial_state(program)
    state = ref.initial_state(transformed)
    actions = []
    inserted = set()
    tokens = witness.split()

    def fence(index, boundary, original_step, original_action):
        nonlocal state
        thread = program.threads[index]
        if (thread.name, boundary) not in selected or (thread.name, boundary) in inserted:
            return None
        action = f"t{index}"
        available = dict(ref.transitions(transformed, state, model))
        if action not in available:
            return {"originalStep": original_step, "originalAction": original_action,
                    "thread": thread.name, "boundary": boundary, "instructionIndex": state.pcs[index],
                    "reason": "fence_requires_empty_buffer",
                    "pendingWrites": [{"address": program.addresses[address], "value": value}
                                      for address, value in state.buffers[index]],
                    "stateBefore": ref.snapshot(transformed, state, len(actions), None)}
        state = available[action]
        actions.append(action)
        inserted.add((thread.name, boundary))
        return None

    for original_step, token in enumerate(tokens, 1):
        index = int(token[1:])
        if token.startswith("t"):
            blocked = fence(index, original_state.pcs[index], original_step, token)
            if blocked:
                return {"status": "blocked", "prefix": " ".join(actions), "witness": None,
                        "firstBlock": blocked, "outcome": None}
        available = dict(ref.transitions(transformed, state, model))
        if token not in available:
            raise AssertionError("An original action became disabled without an inserted blocking fence")
        state = available[token]
        original_state = dict(ref.transitions(program, original_state, model))[token]
        actions.append(token)
    for index, thread in enumerate(program.threads):
        blocked = fence(index, len(thread.instructions), len(tokens) + 1, None)
        if blocked:
            raise AssertionError("A tail fence after an original terminal witness must be enabled")
    if not ref.terminal(transformed, state):
        raise AssertionError("Mapped witness was not terminal")
    value = ref.outcome(transformed, state)
    return {"status": "preserved", "prefix": " ".join(actions), "witness": " ".join(actions),
            "firstBlock": None, "outcome": {**value, "id": outcome_id(transformed, value)}}


def execute(job):
    program = ref.parse(job["source"])
    transformed = insert_fences(program, job.get("fences", []))
    source = serialize(transformed)
    # Reparse so the independent DSL limits apply to inserted programs too.
    ref.parse(source)
    if job.get("operation") == "map":
        result = mapped_witness(program, transformed, job.get("fences", []), job["model"], job["witness"])
    elif job.get("operation") == "replay":
        result = ref.replay(source, job["model"], job["witness"])
    else:
        result = ref.analyze(transformed, job.get("model", "TSO"), job.get("strategy", "bfs"),
                             job.get("maxStates", 100000), job.get("maxOutcomes", 1024))
        if "clauses" in job:
            hits = [outcome for outcome in result["outcomes"] if matches(outcome, job["clauses"])]
            result["matches"] = hits
            result["verdict"] = "reachable" if hits else "unreachable" if result["complete"] else "unknown"
        for value in result["outcomes"]:
            value["id"] = outcome_id(transformed, value)
    return {"name": job.get("name"), "source": source, **result}


def main():
    results = []
    for job in json.load(sys.stdin):
        try:
            results.append(execute(job))
        except Exception as error:
            results.append({"name": job.get("name"), "ok": False, "error": type(error).__name__ + ": " + str(error)})
    json.dump(results, sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
