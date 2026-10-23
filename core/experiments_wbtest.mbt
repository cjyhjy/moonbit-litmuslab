///|
fn target_fixture(p : Program, text : String) -> Array[TargetClause] {
  match parse_target(p, text) {
    Ok(target) => target
    Err(_) => abort("Invalid target fixture")
  }
}

///|
fn fences_fixture(p : Program, text : String) -> Array[FencePlacement] {
  match parse_fences(p, text) {
    Ok(fences) => fences
    Err(_) => abort("Invalid fence fixture")
  }
}

///|
fn field(json : Json, key : String) -> Json {
  match json {
    Object(fields) =>
      match fields.get(key) {
        Some(value) => value
        None => abort("Missing JSON field " + key)
      }
    _ => abort("Expected JSON object")
  }
}

///|
fn string_field(json : Json, key : String) -> String {
  match field(json, key) {
    String(value) => value
    _ => abort("Expected JSON string " + key)
  }
}

///|
fn replay_fixture(p : Program, tso : Bool, witness : String) -> FoundOutcome {
  let mut state = initial_state(p)
  for token in tokenize(witness) {
    let mut selected : Action? = None
    for action in enabled(p, state, tso) {
      if action_text(action) == token.text {
        selected = Some(action)
      }
    }
    let action = match selected {
      Some(a) => a
      None => abort("Illegal test witness action")
    }
    state = transition(p, state, tso, action)
  }
  if !terminal(p, state) {
    abort("Nonterminal test witness")
  }
  { state, witness, }
}

///|
test "query separates a positive witness from incomplete graph coverage" {
  let result = query(sb(), "TSO", "bfs", 1000, 1, "mem.x=1")
  assert_true(result.contains("\"verdict\":\"reachable\""))
  assert_true(result.contains("\"exitCode\":0"))
  assert_true(result.contains("\"status\":\"incomplete\""))
  assert_true(result.contains("\"reason\":\"max_outcomes\""))
}

///|
test "query exclusion requires complete search and missing bounded evidence is unknown" {
  let impossible = "reg.P0.r0=0 && reg.P1.r0=0"
  assert_true(
    query(sb(), "SC", "bfs", 1000, 4, impossible).contains(
      "\"verdict\":\"unreachable\"",
    ),
  )
  assert_true(
    query(sb(), "TSO", "dfs", 1000, 4, impossible).contains(
      "\"verdict\":\"reachable\"",
    ),
  )
  let unknown = query(sb(), "SC", "bfs", 1, 4, impossible)
  assert_true(unknown.contains("\"verdict\":\"unknown\""))
  assert_true(unknown.contains("\"match\":null"))
  assert_true(unknown.contains("\"exitCode\":3"))
  assert_true(
    query(sb(), "TSO", "bfs", 1000, 1, "mem.x=2").contains(
      "\"verdict\":\"unknown\"",
    ),
  )
}

///|
test "target scopes allow program names memory mem and reg without ambiguity" {
  let source = "memory mem=-32768 reg=32767\nthread mem\nload reg mem\nend\nthread reg\nload mem reg\nend\nthread memory\nload r mem\nend"
  let target = "reg.mem.reg=-32768 && reg.reg.mem=32767 && reg.memory.r=-32768 && mem.mem=-32768 && mem.reg=32767"
  assert_true(
    query(source, "SC", "bfs", 100, 1, target).contains(
      "\"verdict\":\"reachable\"",
    ),
  )
}

///|
test "target whitespace is lexical and empty or malformed predicates are rejected" {
  let p = fixture(sb())
  assert_true(
    parse_target(p, " \n reg . P0 . r0 = -0\t&&\r mem . x = 1 ") is Ok(_),
  )
  for
    target in [
      "", " ", "P0.r0=0", "memory.x=0", "reg.P0.r0==0", "reg.P0.r0=0 || mem.x=0",
      "reg.P0.r0=0 & & mem.x=0", "mem.x=1 &&", "mem.x=1 && && mem.y=1", "mem.x=+1",
      "mem.x=32768", "mem.x=-32769", "mem.x=1 0", "mem.x=1#comment", "mem.x=0\u00a0&&mem.y=0",
    ] {
    assert_true(parse_target(p, target) is Err(_))
  }
}

///|
test "target rejects unknown names and repeated observables including contradictions" {
  let p = fixture(sb())
  for
    (target, code) in [
      ("mem.missing=0", "UnknownAddress"),
      ("reg.Absent.r0=0", "UnknownThread"),
      ("reg.P0.missing=0", "UnknownRegister"),
      ("mem.x=1 && mem.x=1", "DuplicateTarget"),
      ("reg.P0.r0=0 && reg.P0.r0=1", "DuplicateTarget"),
    ] {
    match parse_target(p, target) {
      Err(e) => assert_eq(e.code, code)
      Ok(_) => fail("Invalid target was accepted")
    }
  }
}

///|
test "auxiliary input limit is exact and rejects oversized whitespace too" {
  let p = fixture(sb())
  let target = "mem.x=0" + " ".repeat(4089)
  assert_true(parse_target(p, target) is Ok(_))
  match parse_target(p, target + " ") {
    Err(e) => assert_eq(e.code, "ExperimentInputLimit")
    Ok(_) => fail("Oversized target accepted")
  }
  assert_true(parse_fences(p, "P0:1" + " ".repeat(4092)) is Ok(_))
  assert_true(parse_fences(p, "P0:1" + " ".repeat(4093)) is Err(_))
}

///|
test "query validates options and reports the failing input before searching" {
  for
    (model, strategy, states, outcomes, code) in [
      ("ARM", "bfs", 10, 4, "InvalidModel"),
      ("SC", "random", 10, 4, "InvalidStrategy"),
      ("SC", "bfs", 0, 4, "InvalidBudget"),
      ("SC", "bfs", 100001, 4, "InvalidBudget"),
      ("SC", "bfs", 10, 0, "InvalidBudget"),
      ("SC", "bfs", 10, 1025, "InvalidBudget"),
    ] {
    let result = query(sb(), model, strategy, states, outcomes, "mem.x=0")
    assert_true(result.contains(code))
    assert_true(result.contains("\"input\":\"options\""))
    assert_true(
      compare_fences(sb(), model, strategy, states, outcomes, "mem.x=0", "P0:1").contains(
        code,
      ),
    )
  }
  assert_true(
    query("bad", "SC", "bfs", 10, 4, "mem.x=0").contains("\"input\":\"source\""),
  )
  assert_true(
    query(sb(), "SC", "bfs", 10, 4, "bad").contains("\"input\":\"target\""),
  )
  assert_true(
    compare_fences(sb(), "SC", "bfs", 10, 4, "mem.x=0", "bad").contains(
      "\"input\":\"fences\"",
    ),
  )
}

///|
test "fence parsing rejects empty malformed duplicate unknown and out of range inputs" {
  let p = fixture(sb())
  for
    fences in [
      "", " ", ",", "P0:", "P0:-1", "P0:+1", "P0:1.0", "P0:3", "P0:32768", "P0:99999999999999999",
      "P0:1,", "P0:1,,P1:1", "P0:1 P1:1", "P0:1,P0:01", "missing:1", "P0:1#x", "P0:1\u00a0",
    ] {
    assert_true(parse_fences(p, fences) is Err(_))
  }
  assert_true(parse_fences(p, " \tP1 : 02 ,\n P0 : 0\r") is Ok(_))
}

///|
test "fences are sorted and all insertion boundaries refer to the original program" {
  let p = fixture(sb())
  let placements = fences_fixture(p, "P1:2,P0:2,P0:0,P0:1")
  assert_eq(placements.length(), 4)
  assert_eq(placements[0].thread, 0)
  assert_eq(placements[0].boundary, 0)
  assert_eq(placements[0].instruction_index, 0)
  assert_eq(placements[1].boundary, 1)
  assert_eq(placements[1].instruction_index, 2)
  assert_eq(placements[2].boundary, 2)
  assert_eq(placements[2].instruction_index, 4)
  assert_eq(placements[3].thread, 1)
  assert_eq(placements[3].instruction_index, 2)
  let after = fixture(fenced_source(p, placements))
  assert_eq(after.threads[0].instructions.length(), 5)
  assert_eq(instruction_text(after, 0, 1), "store x 1")
  assert_eq(instruction_text(after, 0, 3), "load r0 y")
  assert_eq(after.threads[0].lines[1], 4)
}

///|
test "insertion enforces the final per-thread instruction limit" {
  let p = fixture("memory x=0\nthread P0\n" + "fence\n".repeat(15) + "end")
  assert_true(parse_fences(p, "P0:15") is Ok(_))
  match parse_fences(p, "P0:15,P0:0") {
    Err(e) => assert_eq(e.code, "InstructionLimit")
    Ok(_) => fail("Seventeen instructions accepted")
  }
  let full = fixture("memory x=0\nthread P0\n" + "fence\n".repeat(16) + "end")
  assert_true(parse_fences(full, "P0:16") is Err(_))
}

///|
test "complete two-sided SB fences exclude zero-zero with a real set difference" {
  let p = fixture(sb())
  let target = target_fixture(p, "reg.P0.r0=0 && reg.P1.r0=0")
  let placements = fences_fixture(p, "P0:1,P1:1")
  let after = fixture(fenced_source(p, placements))
  for strategy in ["bfs", "dfs"] {
    let before_result = search_program(p, "TSO", strategy, 10000, 10)
    let after_result = search_program(after, "TSO", strategy, 10000, 10)
    assert_eq(before_result.outcomes.length(), 4)
    assert_eq(after_result.outcomes.length(), 3)
    assert_eq(
      target_verdict(before_result, first_match(before_result, target)),
      "reachable",
    )
    assert_eq(
      target_verdict(after_result, first_match(after_result, target)),
      "unreachable",
    )
    let sets = outcome_sets_json(before_result, after_result)
    assert_true(field(sets, "complete") == Json::boolean(true))
    assert_true(field(sets, "added") == Json::array([]))
    assert_true(
      field(sets, "removed") == Json::array([Json::string("1,1|0|0")]),
    )
  }
}

///|
test "one blocked SB witness does not imply the target is eliminated" {
  let p = fixture(sb())
  let placements = fences_fixture(p, "P0:1")
  let after = fixture(fenced_source(p, placements))
  let original = replay_fixture(p, true, "t0 t0 t1 t1 f0 f1")
  let mapped = map_fenced_witness(p, after, true, placements, Some(original))
  assert_eq(string_field(mapped, "status"), "blocked")
  assert_eq(string_field(mapped, "prefix"), "t0")
  let block = field(mapped, "firstBlock")
  assert_true(field(block, "originalStep") == jnum(2))
  assert_true(field(block, "boundary") == jnum(1))
  assert_true(field(block, "instructionIndex") == jnum(1))
  assert_true(
    field(block, "pendingWrites") ==
    Json::array([jobject([("address", Json::string("x")), ("value", jnum(1))])]),
  )
  let result = search_program(after, "TSO", "bfs", 10000, 10)
  let target = target_fixture(p, "reg.P0.r0=0 && reg.P1.r0=0")
  assert_eq(target_verdict(result, first_match(result, target)), "reachable")
}

///|
test "a preceding original flush can enable an inserted fence without reordering" {
  let p = fixture(sb())
  let placements = fences_fixture(p, "P0:1")
  let after = fixture(fenced_source(p, placements))
  let original = replay_fixture(p, true, "t1 t1 t0 f0 t0 f1")
  let mapped = map_fenced_witness(p, after, true, placements, Some(original))
  assert_eq(string_field(mapped, "status"), "preserved")
  let witness = string_field(mapped, "witness")
  assert_eq(witness, "t1 t1 t0 f0 t0 t0 f1")
  let finished = replay_fixture(after, true, witness)
  assert_eq(outcome_key(original.state), outcome_key(finished.state))
}

///|
test "trailing fences wait until every original action including ended-thread flushes" {
  let p = fixture("memory x=0\nthread A\nstore x 1\nend\nthread B\nend")
  let placements = fences_fixture(p, "B:0,A:1")
  let after_source = fenced_source(p, placements)
  let after = fixture(after_source)
  let original = replay_fixture(p, true, "t0 f0")
  let mapped = map_fenced_witness(p, after, true, placements, Some(original))
  assert_eq(string_field(mapped, "status"), "preserved")
  let witness = string_field(mapped, "witness")
  assert_eq(witness, "t0 f0 t0 t1")
  assert_true(
    replay(after_source, "TSO", witness).contains("\"status\":\"ok\""),
  )
  assert_eq(outcome_key(replay_fixture(after, true, witness).state), "1||")
}

///|
test "all-empty programs have a valid empty original witness and trailing fences" {
  let p = fixture("memory x=0\nthread A\nend")
  let placements = fences_fixture(p, "A:0")
  let after = fixture(fenced_source(p, placements))
  let original = replay_fixture(p, true, "")
  let mapped = map_fenced_witness(p, after, true, placements, Some(original))
  assert_eq(string_field(mapped, "originalWitness"), "")
  assert_eq(string_field(mapped, "witness"), "t0")
  assert_eq(string_field(mapped, "status"), "preserved")
}

///|
test "SC inserted fences preserve every complete outcome and each retained witness" {
  let p = fixture(sb())
  let placements = fences_fixture(p, "P0:0,P0:1,P0:2,P1:0,P1:1,P1:2")
  let after = fixture(fenced_source(p, placements))
  let before_result = search_program(p, "SC", "bfs", 10000, 10)
  let after_result = search_program(after, "SC", "bfs", 10000, 10)
  let sets = outcome_sets_json(before_result, after_result)
  assert_true(field(sets, "removed") == Json::array([]))
  assert_true(field(sets, "added") == Json::array([]))
  for original in before_result.outcomes {
    let mapped = map_fenced_witness(p, after, false, placements, Some(original))
    assert_eq(string_field(mapped, "status"), "preserved")
    let finished = replay_fixture(after, false, string_field(mapped, "witness"))
    assert_eq(outcome_key(original.state), outcome_key(finished.state))
  }
}

///|
test "incomplete comparisons expose observed differences without claiming removed sets" {
  let p = fixture(sb())
  let before = search_program(p, "TSO", "bfs", 10000, 1)
  let after = search_program(p, "TSO", "bfs", 10000, 4)
  let sets = outcome_sets_json(before, after)
  assert_true(field(sets, "complete") == Json::boolean(false))
  assert_true(field(sets, "removed") == Json::null())
  assert_true(field(sets, "added") == Json::null())
  let response = compare_fences(sb(), "TSO", "bfs", 1, 4, "mem.x=1", "P0:1")
  assert_true(response.contains("\"status\":\"incomplete\""))
  assert_true(response.contains("\"status\":\"unavailable\""))
  assert_true(response.contains("\"reason\":\"no_matching_witness\""))
  assert_true(response.contains("\"verdict\":\"unknown\""))
}
