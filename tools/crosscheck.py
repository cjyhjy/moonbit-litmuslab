#!/usr/bin/env python3
"""Compare the compiled MoonBit engine against an independent Python model.

Run after tools/build.sh. The corpus exhausts every pair of length-0..2 threads
over four load/store instructions, adds named semantic cases and seeded random
programs, and verifies every returned witness and every replay snapshot.
This is implementation cross-validation, not an external hardware/model oracle.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import itertools
import json
from pathlib import Path
import platform
import random
import select
import shutil
import subprocess
import sys
import time

import reference


ROOT = Path(__file__).resolve().parents[1]
SEED = 20261022
BRIDGE = r"""
import {pathToFileURL} from 'node:url';
import {createInterface} from 'node:readline';
const engine = await import(pathToFileURL(process.argv[1]).href);
console.log(JSON.stringify({ready:true,node:process.version}));
const lines = createInterface({input:process.stdin,crlfDelay:Infinity});
for await (const line of lines) {
  try {
    const request = JSON.parse(line);
    if (request.method === '__host_type_checks') {
      const source = request.args[0];
      const values = [['fraction',1.5],['numeric-string','2'],['true',true],['null',null],
                      ['undefined',undefined],['nan',NaN],['infinity',Infinity],
                      ['negative-infinity',-Infinity],['array',[]],['object',{}]];
      const records = [];
      function probe(label, method, args) {
        try {
          const raw = engine[method](...args);
          records.push({label,method,result:typeof raw === 'string' ? JSON.parse(raw) : raw});
        } catch (error) {
          records.push({label,method,threw:String(error)});
        }
      }
      for (const [label,value] of values) {
        probe('max-states-'+label,'analyze',[source,'SC','bfs',value,256]);
        probe('max-outcomes-'+label,'analyze',[source,'SC','bfs',20000,value]);
      }
      for (const [label,value] of values.filter(([label])=>label!=='numeric-string')) {
        probe('analyze-source-'+label,'analyze',[value,'SC','bfs',20000,256]);
        probe('analyze-model-'+label,'analyze',[source,value,'bfs',20000,256]);
        probe('analyze-strategy-'+label,'analyze',[source,'SC',value,20000,256]);
        probe('replay-source-'+label,'replay',[value,'SC','']);
        probe('replay-model-'+label,'replay',[source,value,'']);
        probe('replay-witness-'+label,'replay',[source,'SC',value]);
      }
      console.log(JSON.stringify({result:records}));
      continue;
    }
    const raw = engine[request.method](...request.args);
    console.log(JSON.stringify({result:typeof raw === 'string' ? JSON.parse(raw) : raw}));
  } catch (error) {
    console.log(JSON.stringify({bridgeError:String(error)}));
  }
}
"""


class Engine:
    def __init__(self, module: Path, node: str):
        self.process = subprocess.Popen([node, "--input-type=module", "-e", BRIDGE, str(module)],
                                        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                        text=True, bufsize=1)
        ready = self.read()
        if not ready.get("ready"):
            raise RuntimeError(f"engine bridge failed to start: {ready}")
        self.node_version = ready["node"]
        self.calls = 0

    def read(self):
        if not select.select([self.process.stdout], [], [], 45)[0]:
            self.process.kill()
            raise RuntimeError("engine response timed out after 45 seconds")
        line = self.process.stdout.readline()
        if not line:
            self.process.wait(timeout=5)
            raise RuntimeError("engine bridge closed: " + self.process.stderr.read()[-4000:])
        return json.loads(line)

    def call(self, method, *args):
        self.calls += 1
        self.process.stdin.write(json.dumps({"method": method, "args": args}) + "\n")
        self.process.stdin.flush()
        response = self.read()
        if "bridgeError" in response:
            raise AssertionError(response["bridgeError"])
        return response["result"]

    def close(self):
        self.process.stdin.close()
        try:
            self.process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.process.kill()
            self.process.wait()
        self.process.stdout.close()
        self.process.stderr.close()


def source_for(*threads, memory="x=0 y=0"):
    return "memory " + memory + "\n" + "\n".join(
        "thread P" + str(index) + "\n" + "\n".join(instructions) + "\nend"
        for index, instructions in enumerate(threads)
    ) + "\n"


def corpus(random_cases):
    named = [
        ("store-buffering", source_for(["store x 1", "load r0 y"], ["store y 1", "load r0 x"])),
        ("store-buffering-fences", source_for(["store x 1", "fence", "load r0 y"], ["store y 1", "fence", "load r0 x"])),
        ("load-buffering", source_for(["load r0 x", "store y 1"], ["load r0 y", "store x 1"])),
        ("message-passing", source_for(["store x 1", "store y 1"], ["load flag y", "load value x"])),
        ("forward-newest", source_for(["store x 1", "store x 2", "load r0 x"])),
        ("forward-through-other-address", source_for(["store x 1", "store y 2", "load r0 x"])),
        ("fifo-same-address", source_for(["store x 1", "store x 2"], ["load r0 x", "load r1 x"])),
        ("register-overwrite", source_for(["load r0 x", "store x -1", "load r0 x", "load r1 y"], memory="x=7 y=-2")),
        ("three-writers", source_for(["store x -1"], ["store x 0"], ["store x 1"])),
        ("iriw", source_for(["store x 1"], ["store y 1"], ["load r0 x", "load r1 y"], ["load r0 y", "load r1 x"])),
        ("four-empty-threads", source_for([], [], [], [])),
        ("sixteen-fences", source_for(["fence"] * 16)),
        ("eight-addresses-registers", source_for([f"load r{i} a{i}" for i in range(8)], memory=" ".join(f"a{i}={i - 4}" for i in range(8)))),
        ("integer-boundaries", source_for(["store x -32768", "store y 32767", "load r0 x", "load r1 y"])),
        ("comment-crlf", "# header\r\nmemory x=0 y=-1 # init\r\nthread P0\r\n\tload r0 x\r\nfence # barrier\r\nend\r\n"),
    ]
    yield from (("named", name, source) for name, source in named)
    alphabet = ("store x 1", "store y 1", "load r0 x", "load r0 y")
    short_threads = [()] + list(itertools.product(alphabet, repeat=1)) + list(itertools.product(alphabet, repeat=2))
    for index, (left, right) in enumerate(itertools.product(short_threads, repeat=2)):
        yield "exhaustive", f"pair-{index:03d}", source_for(left, right)
    rng = random.Random(SEED)
    for index in range(random_cases):
        threads = []
        for _ in range(rng.randint(1, 3)):
            instructions = []
            for _ in range(rng.randint(0, 3)):
                operation = rng.choice(["store", "load", "load", "fence"])
                address = rng.choice(["x", "y"])
                instructions.append(f"store {address} {rng.choice([-2, -1, 0, 1, 2])}" if operation == "store" else
                                    f"load {rng.choice(['r0', 'r1'])} {address}" if operation == "load" else "fence")
            threads.append(instructions)
        yield "seeded-random", f"random-{index:03d}", source_for(*threads, memory=f"x={rng.choice([-1, 0, 1])} y={rng.choice([-1, 0, 1])}")


def normalized_trace(trace):
    """Translate only MoonBit's presentation schema, retaining all semantic state."""
    return [{"step": item["step"], "action": item["action"], "memory": item["memory"],
             "registers": {thread["name"]: thread["registers"] for thread in item["threads"]},
             "pcs": {thread["name"]: thread["pc"] for thread in item["threads"]},
             "buffers": {thread["name"]: thread["buffer"] for thread in item["threads"]},
             "terminal": item["terminal"]} for item in trace]


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def check_witness(engine, source, model, result):
    own = reference.replay(source, model, result["witness"])
    require(reference.outcome_key(own["outcome"]) == reference.outcome_key(result), "independent witness outcome mismatch")
    native = engine.call("replay", source, model, result["witness"])
    require(native.get("status") == "ok" and native.get("exitCode") == 0, f"MoonBit rejected its witness: {native}")
    require(reference.outcome_key(native["outcome"]) == reference.outcome_key(result), "MoonBit replay outcome mismatch")
    require(normalized_trace(native["trace"]) == own["trace"], "replay snapshot differs from independent transition semantics")


def check_case(engine, category, name, source):
    row = {"category": category, "name": name, "sourceSha256": hashlib.sha256(source.encode()).hexdigest(), "models": {}}
    collections = {}
    witness_count = 0
    for model in ["SC", "TSO"]:
        sets = []
        stats = []
        for strategy in ["bfs", "dfs"]:
            own = reference.analyze(source, model, strategy)
            native = engine.call("analyze", source, model, strategy, 100000, 1024)
            require(own["complete"], f"reference corpus search incomplete: {own['reason']}")
            require(native.get("status") == "complete" and native.get("exitCode") == 0 and native.get("reason") is None,
                    f"native corpus search not complete: {native}")
            expected = {reference.outcome_key(item) for item in own["outcomes"]}
            actual = {reference.outcome_key(item) for item in native["outcomes"]}
            require(len(actual) == len(native["outcomes"]), "duplicate final outcomes")
            require(actual == expected, f"{model}/{strategy} outcome mismatch: missing={expected-actual}, extra={actual-expected}")
            require(native["stats"]["outcomes"] == len(actual), "reported outcome count differs")
            require(native["stats"]["visitedStates"] == own["states"], "complete reachable-state count differs")
            require(native["stats"]["expandedStates"] == own["expanded"], "complete expanded-state count differs")
            for item in native["outcomes"]:
                check_witness(engine, source, model, item)
                witness_count += 1
            # Also accept independently constructed paths, which can use a different action order.
            for item in own["outcomes"]:
                native_replay = engine.call("replay", source, model, item["witness"])
                require(native_replay.get("status") == "ok", "MoonBit rejected an independent witness")
                require(reference.outcome_key(native_replay["outcome"]) == reference.outcome_key(item), "independent path native replay mismatch")
            sets.append(actual)
            stats.append(native["stats"])
        require(sets[0] == sets[1], f"{model} BFS and DFS differ")
        collections[model] = sets[0]
        row["models"][model] = {"outcomes": len(sets[0]), "visitedStates": stats[0]["visitedStates"],
                                 "bfsTransitions": stats[0]["transitions"], "dfsTransitions": stats[1]["transitions"]}
    require(collections["SC"] <= collections["TSO"], "SC outcomes are not a subset of TSO outcomes")
    row["witnessesReplayed"] = witness_count
    return row


def invalid_sources():
    return [
        "", "# empty", "thread P0\nend", "memory\nthread P0\nend", "memory x=0",
        "memory x=0 x=1\nthread P0\nend", "memory x=0\nmemory y=0\nthread P0\nend",
        "memory x=0\nend", "memory x=0\nthread P0\nthread P1\nend\nend",
        "memory x=0\nthread P0", "memory x=0\nthread P0\nend\nthread P0\nend",
        "memory x=0\nstore x 1\nthread P0\nend", "memory x=0\nthread P0 extra\nend",
        "memory x=0\nthread P0\nend extra", "memory x=0 y =1\nthread P0\nend",
        source_for(["noop"]), source_for(["load r0 z"]), source_for(["store z 1"]),
        source_for(["load _r x"]), source_for(["load ré x"]), source_for(["load r0 x extra"]),
        source_for(["fence x"]), source_for(["store x"]), source_for(["store x 32768"]),
        source_for(["store x -32769"]), source_for(["store x 1.0"]), source_for(["store x +1"]),
        source_for(["store x r0"]), source_for([], memory="_x=0"), source_for([], memory="é=0"),
        source_for([], memory="x==1"), source_for([], memory="x=1e2"), source_for([], memory="x=32768"),
        source_for([], memory="x" * 33 + "=0"), source_for(["load " + "r" * 33 + " x"]),
        source_for([], [], [], [], []), source_for(["fence"] * 17),
        source_for([f"load r{index} x" for index in range(9)]),
        source_for([], memory=" ".join(f"a{index}=0" for index in range(9))),
        source_for([]) + "#" * 32768,
        "memory x=0\nthread " + "P" * 33 + "\nend",
        source_for(["store x 99999999999999999999999999999999999"]),
        source_for([]).replace("memory ", "memory\u00a0"),
        source_for([]).replace("\n", "\v"), source_for([]).replace("\n", "\r"),
    ]


def check_boundaries(engine):
    checks = []
    for index, source in enumerate(invalid_sources()):
        try:
            reference.parse(source)
            raise AssertionError("invalid fixture accepted by reference")
        except reference.DSLParseError:
            pass
        native = engine.call("analyze", source, "SC", "bfs", 20000, 256)
        require(native.get("status") == "error" and native.get("exitCode") == 2, f"invalid source {index} accepted: {native}")
        global_limit = native["error"]["code"] == "InputLimit" and native["error"]["line"] == native["error"]["column"] == 0
        require(global_limit or (native["error"]["line"] >= 1 and native["error"]["column"] >= 1),
                f"parser error lacks valid location in invalid source {index}: {native}")
        checks.append({"kind": "invalid-source", "index": index, "error": native["error"]})

    limits = [source_for(*[[f"load r{i % 8} a{i % 8}" for i in range(16)] for _ in range(4)],
                         memory=" ".join(f"a{i}=0" for i in range(8))),
              source_for(*[[f"store x {i}" for i in range(16)] for _ in range(4)]),
              source_for([], memory="x" * 32 + "=-32768"),
              source_for(["load " + "r" * 32 + " x"]),
              "memory x=0\nthread " + "P" * 32 + "\nend",
              source_for(["store x -00032768", "store y 00032767"])]
    exact = source_for([])
    limits.append(exact + "#" + "a" * (32768 - len(exact) - 1))
    limits.append(exact + "#" + "😀" * (32768 - len(exact) - 1))
    for index, source in enumerate(limits):
        program = reference.parse(source)
        native = engine.call("analyze", source, "TSO", "bfs", 1, 1024)
        require(native.get("status") in {"complete", "incomplete"}, f"inclusive limit {index} rejected: {native}")
        state, actions = reference.initial_state(program), []
        while not reference.terminal(program, state):
            action, state = next(iter(reference.transitions(program, state, "TSO")))
            actions.append(action)
        check_witness(engine, source, "TSO", {**reference.outcome(program, state), "witness": " ".join(actions)})
        checks.append({"kind": "valid-boundary", "index": index, "status": native["status"]})

    empty = source_for([])
    for model, strategy, states, outcomes in [("ARM", "bfs", 10, 10), ("SC", "random", 10, 10),
                                             ("SC", "bfs", 0, 10), ("SC", "bfs", 100001, 10),
                                             ("SC", "bfs", 10, 0), ("SC", "bfs", 10, 1025)]:
        native = engine.call("analyze", empty, model, strategy, states, outcomes)
        require(native.get("status") == "error" and native.get("exitCode") == 2, f"invalid options accepted: {native}")
        checks.append({"kind": "invalid-options", "options": [model, strategy, states, outcomes]})

    for source, model, states, outcomes, status, reason in [
        (empty, "SC", 1, 1, "complete", None),
        (source_for(["store x 1"]), "SC", 2, 1, "complete", None),
        (source_for(["store x 1"]), "SC", 1, 1, "incomplete", "max_states"),
        (source_for(["store x 1"]), "TSO", 2, 1, "incomplete", "max_states"),
        (source_for(["store x 1"]), "TSO", 3, 1, "complete", None),
        (source_for(["store x 1"], ["store x 2"]), "SC", 100, 1, "incomplete", "max_outcomes"),
        (source_for(["store x 1"], ["store x 2"]), "SC", 100, 2, "complete", None),
    ]:
        for strategy in ["bfs", "dfs"]:
            native = engine.call("analyze", source, model, strategy, states, outcomes)
            require(native.get("status") == status and native.get("reason") == reason,
                    f"budget boundary differs: expected {status}/{reason}, got {native}")
            require(native["exitCode"] == (0 if status == "complete" else 3), "incorrect budget exit code")
            require(native["stats"]["visitedStates"] <= states and len(native["outcomes"]) <= outcomes, "budget exceeded")
            for item in native["outcomes"]:
                check_witness(engine, source, model, item)
            checks.append({"kind": "budget", "model": model, "strategy": strategy, "limits": [states, outcomes],
                           "status": native["status"], "reason": reason})

    fenced = source_for(["store x 1", "fence"])
    witnesses = [(fenced, "TSO", item) for item in ["", "t0", "t0 t0", "f0 t0 t0", "t9", "T0", "t-1", "t00", "t0,", "t0 f0 t0 t0"]]
    witnesses += [(source_for(["store x 1"]), "SC", "t0 f0"), (empty, "TSO", "t0"), (empty, "ARM", ""),
                  (source_for(["store x 1"]), "TSO", "t0\u00a0f0"), (empty, "TSO", " " * 1025)]
    for source, model, witness in witnesses:
        try:
            reference.replay(source, model, witness)
            raise AssertionError("invalid witness accepted by reference")
        except reference.ReplayError:
            pass
        native = engine.call("replay", source, model, witness)
        require(native.get("status") == "error" and native.get("exitCode") == 2, f"invalid witness accepted: {witness!r}: {native}")
        checks.append({"kind": "invalid-witness", "model": model, "witness": witness, "error": native["error"]})
    valid_padded = engine.call("replay", empty, "TSO", " " * 1024)
    require(valid_padded.get("status") == "ok", "exact 1024-character witness limit rejected")
    require(normalized_trace(valid_padded["trace"]) == reference.replay(empty, "TSO", " " * 1024)["trace"],
            "whitespace-only witness changes semantics")
    checks.append({"kind": "valid-witness-boundary", "characters": 1024})
    return checks


def check_resources(engine):
    records = []
    fences = source_for(*[["fence"] * 16 for _ in range(4)])
    started = time.monotonic()
    native = engine.call("analyze", fences, "SC", "bfs", 100000, 1)
    require(native.get("status") == "complete" and native["stats"]["visitedStates"] == 17 ** 4,
            "four 16-instruction threads must have exactly 17^4 reachable SC fence states")
    require(len(native["outcomes"]) == 1, "fence-only program must have one outcome")
    check_witness(engine, fences, "SC", native["outcomes"][0])
    records.append({"name": "complete-83521-states", "stats": native["stats"],
                    "status": native["status"], "elapsedSeconds": round(time.monotonic() - started, 3)})
    stores = source_for(*[[f"store x {i}" for i in range(16)] for _ in range(4)])
    started = time.monotonic()
    native = engine.call("analyze", stores, "TSO", "bfs", 100000, 1024)
    require(native.get("status") == "incomplete" and native.get("reason") == "max_states" and
            native["stats"]["visitedStates"] == 100000, "maximum state budget must truncate at exactly 100000")
    for item in native["outcomes"]:
        check_witness(engine, stores, "TSO", item)
    records.append({"name": "incomplete-100000-states", "stats": native["stats"], "status": native["status"],
                    "reason": native["reason"], "elapsedSeconds": round(time.monotonic() - started, 3)})
    return records


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--engine", type=Path, default=ROOT / "dist" / "engine.mjs")
    parser.add_argument("--node", default=shutil.which("node") or "node")
    parser.add_argument("--random-cases", type=int, default=128)
    parser.add_argument("--report", type=Path, default=ROOT / "reports" / "crosscheck.json")
    args = parser.parse_args()
    started = time.monotonic()
    engine = Engine(args.engine.resolve(), args.node)
    report = {"kind": "independent-implementation-crosscheck", "externalOracle": False,
              "generatedAt": datetime.now(timezone.utc).isoformat(), "seed": SEED,
              "versions": {"python": platform.python_version(), "node": engine.node_version},
              "engineSha256": hashlib.sha256(args.engine.read_bytes()).hexdigest(),
              "referenceSha256": hashlib.sha256(Path(reference.__file__).read_bytes()).hexdigest(),
              "harnessSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              "corpus": [], "boundaries": [], "hostTypeChecks": [], "resourceChecks": [], "failures": []}
    source_digest = hashlib.sha256()
    report["moonbitSourceFiles"] = {}
    for path in sorted((ROOT / "core").glob("*.mbt")):
        relative, data = path.relative_to(ROOT).as_posix(), path.read_bytes()
        report["moonbitSourceFiles"][relative] = hashlib.sha256(data).hexdigest()
        source_digest.update(relative.encode() + b"\0" + data + b"\0")
    report["moonbitSourceSha256"] = source_digest.hexdigest()
    raw_engine = args.engine.with_name("engine.raw.mjs")
    if raw_engine.is_file():
        report["rawEngineSha256"] = hashlib.sha256(raw_engine.read_bytes()).hexdigest()
    try:
        for index, (category, name, source) in enumerate(corpus(args.random_cases)):
            try:
                report["corpus"].append(check_case(engine, category, name, source))
            except (AssertionError, ValueError, RuntimeError, KeyError) as error:
                report["failures"].append({"name": name, "source": source, "error": str(error)})
                print(f"FAIL {name}: {error}", file=sys.stderr, flush=True)
                if len(report["failures"]) >= 10:
                    break
            if (index + 1) % 100 == 0:
                print(f"checked {index + 1} programs; failures={len(report['failures'])}", flush=True)
        try:
            report["boundaries"] = check_boundaries(engine)
        except (AssertionError, ValueError, RuntimeError, KeyError) as error:
            report["failures"].append({"name": "boundary-checks", "error": str(error)})
            print(f"FAIL boundaries: {error}", file=sys.stderr, flush=True)
        report["hostTypeChecks"] = engine.call("__host_type_checks", source_for([]))
        engine.calls += len(report["hostTypeChecks"]) - 1
        for item in report["hostTypeChecks"]:
            if item.get("result", {}).get("status") != "error" or item.get("result", {}).get("exitCode") != 2:
                report["failures"].append({"name": "host-type-" + item["label"], "evidence": item})
                print(f"FAIL host type: {item}", file=sys.stderr, flush=True)
        try:
            report["resourceChecks"] = check_resources(engine)
        except (AssertionError, ValueError, RuntimeError, KeyError) as error:
            report["failures"].append({"name": "resource-checks", "error": str(error)})
            print(f"FAIL resources: {error}", file=sys.stderr, flush=True)
    finally:
        engine.close()
    report["summary"] = {"status": "passed" if not report["failures"] else "failed",
                         "programs": len(report["corpus"]), "modelStrategyComparisons": len(report["corpus"]) * 4,
                         "distinctPrograms": len({item["sourceSha256"] for item in report["corpus"]}),
                         "exhaustivePrograms": sum(item["category"] == "exhaustive" for item in report["corpus"]),
                         "randomPrograms": sum(item["category"] == "seeded-random" for item in report["corpus"]),
                         "witnessesIndependentlyReplayed": sum(item["witnessesReplayed"] for item in report["corpus"]),
                         "boundaryChecks": len(report["boundaries"]), "engineCalls": engine.calls,
                         "hostTypeChecks": len(report["hostTypeChecks"]),
                         "resourceChecks": len(report["resourceChecks"]),
                         "elapsedSeconds": round(time.monotonic() - started, 3)}
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    summary = report["summary"]
    markdown = f"""# LitmusLab independent implementation cross-check

Status: **{summary['status']}**. Generated at {report['generatedAt']}.

This report compares the compiled MoonBit implementation with a separately written
Python operational-semantics implementation. It is **not an external hardware or
herd7 oracle**. Programs are synthetic finite DSL inputs.

| Check | Result |
|---|---:|
| Complete program cases | {summary['programs']} |
| Distinct source programs | {summary['distinctPrograms']} |
| Exhaustive two-thread programs | {summary['exhaustivePrograms']} |
| Seeded random programs | {summary['randomPrograms']} |
| SC/TSO × BFS/DFS comparisons | {summary['modelStrategyComparisons']} |
| MoonBit witnesses independently replayed | {summary['witnessesIndependentlyReplayed']} |
| Parser, replay, and budget boundary checks | {summary['boundaryChecks']} |
| JavaScript host type checks | {summary['hostTypeChecks']} |
| Large-state resource checks | {summary['resourceChecks']} |
| Engine API calls | {summary['engineCalls']} |
| Failures | {len(report['failures'])} |

The exhaustive alphabet is `store x 1`, `store y 1`, `load r0 x`, and
`load r0 y`; each of two threads has length 0, 1, or 2, yielding 21 × 21 = 441
programs. Random seed: `{SEED}`. Named cases add fences, FIFO, forwarding,
register reuse, negative values, all instruction/register/address limits, and IRIW.
All complete searches compare final memory plus every named local register,
reachable-state counts, BFS/DFS consistency, and SC outcome inclusion in TSO.
Every MoonBit witness is independently replayed; every step's memory, PCs,
registers, buffers and terminal flag is compared with the MoonBit replay trace.
MoonBit also replays independently constructed Python witnesses.

Reproduce from the project root:

```sh
bash tools/build.sh
python3 -m unittest discover -s tests -p 'test_reference.py' -v
python3 tools/crosscheck.py
```

Python `{report['versions']['python']}`; Node `{report['versions']['node']}`.
Engine SHA-256: `{report['engineSha256']}`.
Raw MoonBit engine SHA-256: `{report.get('rawEngineSha256', 'not separate')}`.
Combined MoonBit source SHA-256: `{report['moonbitSourceSha256']}` (sorted relative
path, NUL, file bytes, NUL for each `core/*.mbt`; individual hashes are in JSON).
Reference SHA-256: `{report['referenceSha256']}`.
Structured cases, state counts, exact error evidence and failures: `crosscheck.json`.
"""
    args.report.with_suffix(".md").write_text(markdown, encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2), flush=True)
    return 0 if not report["failures"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
