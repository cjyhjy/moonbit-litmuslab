"""Executable semantic fixtures for the independent validation reference."""

import itertools
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
from reference import DSLParseError, ReplayError, analyze, initial_state, outcome_key, parse, replay, transitions


def program(*threads, memory="x=0 y=0"):
    return "memory " + memory + "\n" + "\n".join(
        "thread P" + str(index) + "\n" + "\n".join(instructions) + "\nend"
        for index, instructions in enumerate(threads)
    ) + "\n"


SB = program(["store x 1", "load r0 y"], ["store y 1", "load r0 x"])
SB_FENCE = program(["store x 1", "fence", "load r0 y"], ["store y 1", "fence", "load r0 x"])
LB = program(["load r0 x", "store y 1"], ["load r0 y", "store x 1"])
MP = program(["store x 1", "store y 1"], ["load flag y", "load value x"])


def register_pairs(result, first=("P0", "r0"), second=("P1", "r0")):
    return {(item["registers"][first[0]][first[1]], item["registers"][second[0]][second[1]])
            for item in result["outcomes"]}


class SemanticsTests(unittest.TestCase):
    def test_store_buffering(self):
        self.assertEqual(register_pairs(analyze(SB, "SC")), {(0, 1), (1, 0), (1, 1)})
        self.assertEqual(register_pairs(analyze(SB, "TSO")), set(itertools.product([0, 1], repeat=2)))

    def test_fences_remove_store_buffering_zero_zero(self):
        self.assertEqual(register_pairs(analyze(SB_FENCE, "SC")), register_pairs(analyze(SB_FENCE, "TSO")))
        self.assertNotIn((0, 0), register_pairs(analyze(SB_FENCE, "TSO")))

    def test_load_buffering_does_not_read_from_future(self):
        for model in ["SC", "TSO"]:
            self.assertEqual(register_pairs(analyze(LB, model)), {(0, 0), (0, 1), (1, 0)})

    def test_message_passing_preserves_fifo_order(self):
        for model in ["SC", "TSO"]:
            self.assertEqual(register_pairs(analyze(MP, model), ("P1", "flag"), ("P1", "value")),
                             {(0, 0), (0, 1), (1, 1)})

    def test_latest_own_buffer_entry_forwards(self):
        source = program(["store x 1", "store x 2", "load r0 x"])
        result = replay(source, "TSO", "t0 t0 t0 f0 f0")
        self.assertEqual(result["trace"][3]["registers"]["P0"]["r0"], 2)
        self.assertEqual(result["trace"][3]["memory"]["x"], 0)
        self.assertEqual(result["trace"][4]["memory"]["x"], 1)
        self.assertEqual(result["outcome"]["memory"]["x"], 2)
        self.assertEqual({item["registers"]["P0"]["r0"] for item in analyze(source)["outcomes"]}, {2})

    def test_other_thread_buffer_does_not_forward(self):
        source = program(["store x 1"], ["load r0 x"])
        self.assertEqual(replay(source, "TSO", "t0 t1 f0")["outcome"]["registers"]["P1"]["r0"], 0)

    def test_final_memory_and_all_registers_are_observable(self):
        source = program(["load first x", "store x 2", "load first x", "load second y"], [], memory="x=-3 y=4")
        result = analyze(source, "TSO")
        self.assertEqual(len(result["outcomes"]), 1)
        self.assertEqual(result["outcomes"][0]["registers"], {"P0": {"first": 2, "second": 4}, "P1": {}})
        self.assertEqual(result["outcomes"][0]["memory"], {"x": 2, "y": 4})
        self.assertEqual(replay(source, "TSO", result["outcomes"][0]["witness"])["trace"][0]["registers"],
                         {"P0": {"first": 0, "second": 0}, "P1": {}})

    def test_register_names_are_thread_local(self):
        source = program(["load r0 x"], ["load r0 y"], memory="x=-1 y=7")
        self.assertEqual(analyze(source)["outcomes"][0]["registers"], {"P0": {"r0": -1}, "P1": {"r0": 7}})

    def test_final_memory_distinguishes_outcomes_without_loads(self):
        source = program(["store x 1"], ["store x 2"])
        for model in ["SC", "TSO"]:
            self.assertEqual({item["memory"]["x"] for item in analyze(source, model)["outcomes"]}, {1, 2})

    def test_bfs_dfs_and_witnesses(self):
        for source, model in itertools.product([SB, SB_FENCE, LB, MP], ["SC", "TSO"]):
            bfs, dfs = analyze(source, model, "bfs"), analyze(source, model, "dfs")
            self.assertEqual({outcome_key(item) for item in bfs["outcomes"]},
                             {outcome_key(item) for item in dfs["outcomes"]})
            self.assertTrue(bfs["complete"] and dfs["complete"])
            for item in bfs["outcomes"] + dfs["outcomes"]:
                self.assertEqual(outcome_key(replay(source, model, item["witness"])["outcome"]), outcome_key(item))


class ReplayTests(unittest.TestCase):
    def test_fence_blocks_only_its_own_pending_writes(self):
        source = program(["store x 1", "fence"], ["fence"])
        state = dict(transitions(parse(source), initial_state(parse(source)), "TSO"))["t0"]
        self.assertEqual(set(dict(transitions(parse(source), state, "TSO"))), {"f0", "t1"})
        self.assertTrue(replay(source, "TSO", "t0 t1 f0 t0")["ok"])

    def test_bad_witnesses_are_rejected(self):
        source = program(["store x 1", "fence"])
        for witness in ["", "t0", "t0 t0", "f0 t0 t0", "t9", "T0", "t-1", "t00", "t0,", "t0 f0 t0 t0"]:
            with self.subTest(witness=witness), self.assertRaises(ReplayError):
                replay(source, "TSO", witness)
        with self.assertRaises(ReplayError):
            replay(program(["store x 1"]), "SC", "t0 f0")

    def test_empty_thread_empty_witness(self):
        result = replay(program([]), "TSO", "")
        self.assertEqual(len(result["trace"]), 1)
        self.assertTrue(result["trace"][0]["terminal"])

    def test_ended_threads_still_need_flushes(self):
        source = program(["store x 1"])
        with self.assertRaises(ReplayError):
            replay(source, "TSO", "t0")
        self.assertTrue(replay(source, "TSO", "t0 f0")["ok"])


class ParserTests(unittest.TestCase):
    def test_comments_whitespace_and_distinct_namespaces(self):
        parsed = parse("# comment\n\n memory x=-32768 y=32767 # init\nthread x\n\tload x y\nend # done\n")
        self.assertEqual(parsed.initial, (-32768, 32767))
        self.assertEqual(parsed.threads[0].registers, ("x",))

    def test_limits_are_inclusive(self):
        source = program(*[[f"load r{index % 8} a{index % 8}" for index in range(16)] for _ in range(4)],
                         memory=" ".join(f"a{index}=0" for index in range(8)))
        parsed = parse(source)
        self.assertEqual(sum(len(thread.instructions) for thread in parsed.threads), 64)
        self.assertEqual(len(parse(program([], memory="x" * 32 + "=0")).addresses[0]), 32)
        self.assertEqual(parse(program(["store x -00032768"])).threads[0].instructions[0].value, -32768)

    def test_invalid_programs(self):
        invalid = [
            "", "# empty", "thread P0\nend", "memory\nthread P0\nend", "memory x=0",
            "memory x=0 x=1\nthread P0\nend", "memory x=0\nmemory y=0\nthread P0\nend",
            "memory x=0\nend", "memory x=0\nthread P0\nthread P1\nend\nend",
            "memory x=0\nthread P0", "memory x=0\nthread P0\nend\nthread P0\nend",
            "memory x=0\nstore x 1\nthread P0\nend", "memory x=0\nthread P0 extra\nend",
            "memory x=0\nthread P0\nend extra", "memory x=0 y =1\nthread P0\nend",
            program(["noop"]), program(["load r0 z"]), program(["store z 1"]),
            program(["load _r x"]), program(["load ré x"]), program(["load r0 x extra"]),
            program(["fence x"]), program(["store x"]), program(["store x 32768"]),
            program(["store x -32769"]), program(["store x 1.0"]), program(["store x +1"]),
            program(["store x r0"]), program([], memory="_x=0"), program([], memory="é=0"),
            program([], memory="x==1"), program([], memory="x=1e2"), program([], memory="x=32768"),
            program([], memory="x" * 33 + "=0"), program(["load " + "r" * 33 + " x"]),
            program([], [], [], [], []), program(["fence"] * 17),
            program([f"load r{index} x" for index in range(9)]),
            program([], memory=" ".join(f"a{index}=0" for index in range(9))),
            program([]) + "#" * 32768,
            program([]).replace("memory ", "memory\u00a0"),
            program([]).replace("\n", "\v"), program([]).replace("\n", "\r"),
        ]
        for source in invalid:
            with self.subTest(source=source[:100]), self.assertRaises(DSLParseError):
                parse(source)

    def test_error_line(self):
        with self.assertRaises(DSLParseError) as context:
            parse("# header\nmemory x=0\nthread P0\nload r0 missing\nend")
        self.assertEqual(context.exception.line, 4)
        self.assertEqual(context.exception.column, 9)


class BudgetTests(unittest.TestCase):
    def test_state_budget_exact_boundary(self):
        self.assertTrue(analyze(program([]), "SC", max_states=1)["complete"])
        self.assertTrue(analyze(program(["store x 1"]), "SC", max_states=2)["complete"])
        limited = analyze(program(["store x 1"]), "SC", max_states=1)
        self.assertEqual((limited["status"], limited["reason"], limited["states"]), ("incomplete", "max_states", 1))

    def test_outcome_budget_exact_boundary(self):
        self.assertTrue(analyze(program(["store x 1"]), "SC", max_outcomes=1)["complete"])
        source = program(["store x 1"], ["store x 2"])
        self.assertTrue(analyze(source, "SC", max_outcomes=2)["complete"])
        limited = analyze(source, "SC", max_outcomes=1)
        self.assertEqual((limited["status"], limited["reason"], len(limited["outcomes"])), ("incomplete", "max_outcomes", 1))

    def test_invalid_search_options(self):
        for options in [{"max_states": 0}, {"max_states": 100001}, {"max_outcomes": 0},
                        {"max_outcomes": 1025}, {"max_states": True}, {"model": "ARM"}, {"strategy": "random"}]:
            with self.subTest(options=options), self.assertRaises(ValueError):
                analyze(program([]), **options)


if __name__ == "__main__":
    unittest.main()
