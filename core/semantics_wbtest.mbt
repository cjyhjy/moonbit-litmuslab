///|
fn fixture(source : String) -> Program {
  match parse_program(source) {
    Ok(p) => p
    Err(_) => abort("Invalid test fixture")
  }
}

///|
fn sb() -> String {
  "memory x=0 y=0\nthread P0\nstore x 1\nload r0 y\nend\nthread P1\nstore y 1\nload r0 x\nend"
}

///|
test "SC stores are immediately visible without buffers" {
  let p = fixture("memory x=0\nthread A\nstore x 7\nload r x\nend")
  let s = transition(p, initial_state(p), false, { thread: 0, flush: false, })
  assert_eq(s.memory[0], 7)
  assert_true(s.buffers[0].is_empty())
  let finished = transition(p, s, false, { thread: 0, flush: false, })
  assert_eq(finished.registers[0][0], 7)
  assert_true(terminal(p, finished))
}

///|
test "TSO youngest matching write forwards across intervening addresses" {
  let p = fixture(
    "memory x=0 y=0\nthread A\nstore x 1\nstore x 2\nstore y 9\nload r x\nend",
  )
  let mut s = initial_state(p)
  for i = 0; i < 4; i = i + 1 {
    s = transition(p, s, true, { thread: 0, flush: false, })
  }
  assert_eq(s.registers[0][0], 2)
  assert_eq(s.memory[0], 0)
  assert_eq(s.buffers[0].length(), 3)
  assert_true(!terminal(p, s))
  let first = transition(p, s, true, { thread: 0, flush: true, })
  assert_eq(first.memory[0], 1)
  assert_eq(first.memory[1], 0)
  assert_eq(first.buffers[0][0].value, 2)
}

///|
test "loads never forward another thread's pending write" {
  let p = fixture(
    "memory x=0\nthread A\nstore x 1\nend\nthread B\nload r x\nend",
  )
  let s = transition(p, initial_state(p), true, { thread: 0, flush: false, })
  let s = transition(p, s, true, { thread: 1, flush: false, })
  assert_eq(s.registers[1][0], 0)
}

///|
test "fence waits for its own buffer; completed threads can drain" {
  let p = fixture("memory x=0\nthread A\nstore x 1\nfence\nend")
  let s = transition(p, initial_state(p), true, { thread: 0, flush: false, })
  assert_eq(enabled(p, s, true).map(action_text).join(" "), "f0")
  let s = transition(p, s, true, { thread: 0, flush: true, })
  assert_eq(enabled(p, s, true).map(action_text).join(" "), "t0")
  let s = transition(p, s, true, { thread: 0, flush: false, })
  assert_true(terminal(p, s))
}

///|
test "successor construction preserves all prior states" {
  let p = fixture(sb())
  let initial = initial_state(p)
  let original = state_key(initial)
  let a = transition(p, initial, true, { thread: 0, flush: false, })
  let b = transition(p, a, true, { thread: 0, flush: false, })
  let _ = transition(p, b, true, { thread: 0, flush: true, })
  assert_eq(state_key(initial), original)
  assert_eq(a.pcs[0], 1)
  assert_eq(a.buffers[0].length(), 1)
  assert_eq(a.memory[0], 0)
}

///|
test "parser diagnostic points to bad address token" {
  match parse_program("memory x=0\nthread A\n  load r missing\nend") {
    Err(e) => {
      assert_eq(e.code, "UnknownAddress")
      assert_eq(e.line, 3)
      assert_eq(e.column, 10)
    }
    Ok(_) => fail("Undeclared address was accepted")
  }
}

///|
test "bounded integer parser accepts signed endpoints without overflow" {
  assert_eq(literal("-32768"), Some(-32768))
  assert_eq(literal("32767"), Some(32767))
  assert_eq(literal("32768"), None)
  assert_eq(literal("-32769"), None)
  assert_eq(literal("999999999999999999999999999"), None)
  assert_eq(literal("+1"), None)
  assert_eq(literal("-"), None)
}

///|
test "empty thread is a valid already terminal program" {
  let p = fixture("#注释\r\nmemory x=-1\r\nthread A\r\nend\r\n")
  assert_true(terminal(p, initial_state(p)))
  assert_true(
    analyze("memory x=0\nthread A\nend", "TSO", "bfs", 1, 1).contains(
      "\"status\":\"complete\"",
    ),
  )
  assert_true(
    replay("memory x=0\nthread A\nend", "TSO", "").contains("\"status\":\"ok\""),
  )
}

///|
test "state budget exhaustion is explicit and exact cap may complete" {
  let p = "memory x=0\nthread A\nstore x 1\nend"
  assert_true(
    analyze(p, "SC", "bfs", 1, 1).contains("\"reason\":\"max_states\""),
  )
  assert_true(analyze(p, "SC", "bfs", 2, 1).contains("\"status\":\"complete\""))
  assert_true(
    analyze(p, "TSO", "dfs", 2, 1).contains("\"status\":\"incomplete\""),
  )
}

///|
test "outcome cap is truncation only after encountering an additional outcome" {
  assert_true(
    analyze(sb(), "SC", "bfs", 1000, 3).contains("\"status\":\"complete\""),
  )
  assert_true(
    analyze(sb(), "TSO", "bfs", 1000, 3).contains("\"reason\":\"max_outcomes\""),
  )
}

///|
test "replay rejects forbidden premature or extra actions" {
  let p = "memory x=0\nthread A\nstore x 1\nfence\nend"
  assert_true(replay(p, "TSO", "t0 t0").contains("IllegalAction"))
  assert_true(replay(p, "TSO", "t0").contains("NonterminalWitness"))
  assert_true(replay(p, "SC", "t0 f0").contains("IllegalAction"))
  assert_true(replay(p, "SC", "t0 t0 t0").contains("IllegalAction"))
  assert_true(replay(p, "TSO", "t0 f0 t0").contains("\"status\":\"ok\""))
}

///|
test "API rejects unsupported models strategies and budgets" {
  assert_true(analyze(sb(), "ARM", "bfs", 100, 4).contains("InvalidModel"))
  assert_true(analyze(sb(), "SC", "random", 100, 4).contains("InvalidStrategy"))
  assert_true(analyze(sb(), "SC", "bfs", 0, 4).contains("InvalidBudget"))
  assert_true(analyze(sb(), "SC", "bfs", 100001, 4).contains("InvalidBudget"))
  assert_true(analyze(sb(), "SC", "bfs", 100, 1025).contains("InvalidBudget"))
}
