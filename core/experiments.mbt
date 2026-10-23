///|
priv enum TargetClause {
  MemoryEquals(Int32, Int32)
  RegisterEquals(Int32, Int32, Int32)
}

///|
priv struct FencePlacement {
  thread : Int32
  boundary : Int32
  instruction_index : Int32
}

///|
fn experiment_error(e : Diagnostic, input : String) -> String {
  jobject([
    ("status", Json::string("error")),
    ("exitCode", jnum(2)),
    (
      "error",
      jobject([
        ("code", Json::string(e.code)),
        ("message", Json::string(e.message)),
        ("line", jnum(e.line)),
        ("column", jnum(e.column)),
        ("input", Json::string(input)),
      ]),
    ),
  ]).stringify()
}

///|
/// Positions are one-based code-point offsets in the selected auxiliary input.
/// Whitespace separates tokens; it never merges parts of names or numbers.
fn experiment_tokens(text : String) -> Result[Array[Token], Diagnostic] {
  let tokens : Array[Token] = []
  let word = StringBuilder()
  let mut word_length = 0
  let mut start = 1
  let mut column = 0
  for c in text {
    column = column + 1
    if column > 4096 {
      return Err(
        problem(
          "ExperimentInputLimit", "Input exceeds 4096 Unicode code points", 0, 0,
        ),
      )
    }
    let whitespace = c == ' ' || c == '\t' || c == '\r' || c == '\n'
    let separator = c == '.' || c == '=' || c == '&' || c == ':' || c == ','
    if whitespace || separator {
      if word_length > 0 {
        tokens.push({ text: word.to_string(), column: start, })
        word.reset()
        word_length = 0
      }
      if separator {
        tokens.push({ text: c.to_string(), column, })
      }
    } else {
      if word_length == 0 {
        start = column
      }
      word.write_char(c)
      word_length = word_length + 1
    }
  }
  if word_length > 0 {
    tokens.push({ text: word.to_string(), column: start, })
  }
  Ok(tokens)
}

///|
fn thread_index(p : Program, name : String) -> Int32? {
  for t = 0; t < p.threads.length(); t = t + 1 {
    if p.threads[t].name == name {
      return Some(t)
    }
  }
  None
}

///|
fn parse_target(
  p : Program,
  text : String,
) -> Result[Array[TargetClause], Diagnostic] {
  let tokens = match experiment_tokens(text) {
    Ok(tokens) => tokens
    Err(e) => return Err(e)
  }
  let clauses : Array[TargetClause] = []
  let seen : Map[String, Bool] = Map([])
  let mut i = 0
  while i < tokens.length() {
    if clauses.length() == 40 {
      return Err(
        problem(
          "TargetLimit",
          "At most 40 equality clauses are supported",
          0,
          tokens[i].column,
        ),
      )
    }
    let column = tokens[i].column
    let syntax = fn() {
      problem(
        "TargetSyntax", "Expected reg.THREAD.REGISTER=INTEGER or mem.ADDRESS=INTEGER, joined by &&",
        0, column,
      )
    }
    let scope = tokens[i].text
    let width = if scope == "mem" {
      5
    } else if scope == "reg" {
      7
    } else {
      return Err(syntax())
    }
    if i + width > tokens.length() ||
      tokens[i + 1].text != "." ||
      !identifier(tokens[i + 2].text) ||
      tokens[i + width - 2].text != "=" {
      return Err(syntax())
    }
    if scope == "reg" &&
      (tokens[i + 3].text != "." || !identifier(tokens[i + 4].text)) {
      return Err(syntax())
    }
    let value = match literal(tokens[i + width - 1].text) {
      Some(value) => value
      None =>
        return Err(
          problem(
            "InvalidInteger",
            "Target integer must be in -32768..32767",
            0,
            tokens[i + width - 1].column,
          ),
        )
    }
    let key = if scope == "mem" {
      "mem." + tokens[i + 2].text
    } else {
      "reg." + tokens[i + 2].text + "." + tokens[i + 4].text
    }
    if seen.contains(key) {
      return Err(
        problem(
          "DuplicateTarget",
          "Each observable may appear only once: " + key,
          0,
          column,
        ),
      )
    }
    seen[key] = true
    if scope == "mem" {
      let address = match index_of(p.addresses, tokens[i + 2].text) {
        Some(a) => a
        None =>
          return Err(
            problem(
              "UnknownAddress",
              "Unknown target address: " + tokens[i + 2].text,
              0,
              tokens[i + 2].column,
            ),
          )
      }
      clauses.push(MemoryEquals(address, value))
    } else {
      let t = match thread_index(p, tokens[i + 2].text) {
        Some(t) => t
        None =>
          return Err(
            problem(
              "UnknownThread",
              "Unknown target thread: " + tokens[i + 2].text,
              0,
              tokens[i + 2].column,
            ),
          )
      }
      let r = match index_of(p.threads[t].registers, tokens[i + 4].text) {
        Some(r) => r
        None =>
          return Err(
            problem(
              "UnknownRegister",
              "Unknown target register: " + tokens[i + 4].text,
              0,
              tokens[i + 4].column,
            ),
          )
      }
      clauses.push(RegisterEquals(t, r, value))
    }
    i = i + width
    if i < tokens.length() {
      if i + 2 >= tokens.length() ||
        tokens[i].text != "&" ||
        tokens[i + 1].text != "&" ||
        tokens[i + 1].column != tokens[i].column + 1 {
        return Err(
          problem(
            "TargetSyntax",
            "Expected && followed by an equality clause",
            0,
            tokens[i].column,
          ),
        )
      }
      i = i + 2
    }
  }
  if clauses.is_empty() {
    return Err(
      problem(
        "TargetSyntax", "Target must contain at least one equality clause", 0, 1,
      ),
    )
  }
  Ok(clauses)
}

///|
fn target_matches(clauses : Array[TargetClause], s : State) -> Bool {
  clauses.all(clause => {
    match clause {
      MemoryEquals(a, v) => s.memory[a] == v
      RegisterEquals(t, r, v) => s.registers[t][r] == v
    }
  })
}

///|
fn first_match(
  result : SearchResult,
  clauses : Array[TargetClause],
) -> FoundOutcome? {
  for outcome in result.outcomes {
    if target_matches(clauses, outcome.state) {
      return Some(outcome)
    }
  }
  None
}

///|
fn target_verdict(result : SearchResult, found : FoundOutcome?) -> String {
  if found is Some(_) {
    "reachable"
  } else if result.reason is None {
    "unreachable"
  } else {
    "unknown"
  }
}

///|
fn search_summary_json(result : SearchResult) -> Json {
  jobject([
    ("status", Json::string(search_status(result))),
    ("reason", search_reason_json(result)),
    ("stats", search_stats_json(result)),
  ])
}

///|
fn match_json(p : Program, found : FoundOutcome?) -> Json {
  match found {
    Some(outcome) => outcome_json(p, outcome.state, outcome.witness)
    None => Json::null()
  }
}

///|
#export_name("query")
pub fn query(
  source : String,
  model : String,
  strategy : String,
  max_states : Int32,
  max_outcomes : Int32,
  target : String,
) -> String {
  if validate_search_options(model, strategy, max_states, max_outcomes)
    is Some(e) {
    return experiment_error(e, "options")
  }
  let p = match parse_program(source) {
    Ok(p) => p
    Err(e) => return experiment_error(e, "source")
  }
  let clauses = match parse_target(p, target) {
    Ok(clauses) => clauses
    Err(e) => return experiment_error(e, "target")
  }
  let result = search_program(p, model, strategy, max_states, max_outcomes)
  let found = first_match(result, clauses)
  let verdict = target_verdict(result, found)
  jobject([
    ("status", Json::string("ok")),
    ("exitCode", jnum(if verdict == "unknown" { 3 } else { 0 })),
    ("model", Json::string(model)),
    ("strategy", Json::string(strategy)),
    ("target", Json::string(target)),
    ("program", program_json(p)),
    ("search", search_summary_json(result)),
    ("verdict", Json::string(verdict)),
    ("match", match_json(p, found)),
  ]).stringify()
}

///|
fn parse_fences(
  p : Program,
  text : String,
) -> Result[Array[FencePlacement], Diagnostic] {
  let tokens = match experiment_tokens(text) {
    Ok(tokens) => tokens
    Err(e) => return Err(e)
  }
  if tokens.is_empty() {
    return Err(
      problem("FenceSyntax", "Specify at least one THREAD:BOUNDARY", 0, 1),
    )
  }
  let requested : Array[Array[Int32]] = p.threads.map(_ => [])
  let mut i = 0
  while i < tokens.length() {
    if i + 3 > tokens.length() ||
      !identifier(tokens[i].text) ||
      tokens[i + 1].text != ":" {
      return Err(
        problem(
          "FenceSyntax",
          "Expected THREAD:BOUNDARY separated by commas",
          0,
          tokens[i].column,
        ),
      )
    }
    let t = match thread_index(p, tokens[i].text) {
      Some(t) => t
      None =>
        return Err(
          problem(
            "UnknownThread",
            "Unknown fence thread: " + tokens[i].text,
            0,
            tokens[i].column,
          ),
        )
    }
    let raw = tokens[i + 2].text
    for c in raw {
      if c < '0' || c > '9' {
        return Err(
          problem(
            "FenceSyntax",
            "Boundary must be an unsigned decimal integer",
            0,
            tokens[i + 2].column,
          ),
        )
      }
    }
    let boundary = match literal(raw) {
      Some(n) => n
      None =>
        return Err(
          problem(
            "FenceBoundary",
            "Boundary is outside the original thread",
            0,
            tokens[i + 2].column,
          ),
        )
    }
    if boundary > p.threads[t].instructions.length() {
      return Err(
        problem(
          "FenceBoundary",
          "Boundary is outside the original thread",
          0,
          tokens[i + 2].column,
        ),
      )
    }
    if requested[t].contains(boundary) {
      return Err(
        problem(
          "DuplicateFence",
          "Fence boundary appears more than once",
          0,
          tokens[i].column,
        ),
      )
    }
    requested[t].push(boundary)
    if p.threads[t].instructions.length() + requested[t].length() > 16 {
      return Err(
        problem(
          "InstructionLimit",
          "Inserting fences exceeds 16 instructions in a thread",
          0,
          tokens[i].column,
        ),
      )
    }
    i = i + 3
    if i < tokens.length() {
      if tokens[i].text != "," || i + 1 == tokens.length() {
        return Err(
          problem(
            "FenceSyntax",
            "Expected comma followed by THREAD:BOUNDARY",
            0,
            tokens[i].column,
          ),
        )
      }
      i = i + 1
    }
  }
  let placements : Array[FencePlacement] = []
  for t = 0; t < p.threads.length(); t = t + 1 {
    let mut offset = 0
    for boundary = 0
        boundary <= p.threads[t].instructions.length()
        boundary = boundary + 1 {
      if requested[t].contains(boundary) {
        placements.push({
          thread: t,
          boundary,
          instruction_index: boundary + offset,
        })
        offset = offset + 1
      }
    }
  }
  Ok(placements)
}

///|
fn placement_at(
  placements : Array[FencePlacement],
  thread : Int32,
  boundary : Int32,
) -> FencePlacement? {
  for placement in placements {
    if placement.thread == thread && placement.boundary == boundary {
      return Some(placement)
    }
  }
  None
}

///|
fn fenced_source(p : Program, placements : Array[FencePlacement]) -> String {
  let declarations : Array[String] = []
  for a = 0; a < p.addresses.length(); a = a + 1 {
    declarations.push(p.addresses[a] + "=" + p.initial[a].to_string())
  }
  let lines = ["memory " + declarations.join(" ")]
  for t = 0; t < p.threads.length(); t = t + 1 {
    lines.push("thread " + p.threads[t].name)
    for i = 0; i <= p.threads[t].instructions.length(); i = i + 1 {
      if placement_at(placements, t, i) is Some(_) {
        lines.push("fence")
      }
      if i < p.threads[t].instructions.length() {
        lines.push(instruction_text(p, t, i))
      }
    }
    lines.push("end")
  }
  lines.join("\n") + "\n"
}

///|
fn comparison_side_json(
  p : Program,
  result : SearchResult,
  clauses : Array[TargetClause],
) -> Json {
  let found = first_match(result, clauses)
  jobject([
    ("program", program_json(p)),
    ("search", search_summary_json(result)),
    ("verdict", Json::string(target_verdict(result, found))),
    ("match", match_json(p, found)),
    (
      "outcomes",
      Json::array(result.outcomes.map(o => outcome_json(p, o.state, o.witness))),
    ),
  ])
}

///|
fn outcome_sets_json(before : SearchResult, after : SearchResult) -> Json {
  let left = before.outcomes.map(o => outcome_key(o.state))
  let right = after.outcomes.map(o => outcome_key(o.state))
  let common = left.filter(id => right.contains(id)).map(Json::string)
  let removed = left.filter(id => !right.contains(id)).map(Json::string)
  let added = right.filter(id => !left.contains(id)).map(Json::string)
  let complete = before.reason is None && after.reason is None
  jobject([
    ("complete", Json::boolean(complete)),
    ("commonObserved", Json::array(common)),
    ("beforeOnlyObserved", Json::array(removed)),
    ("afterOnlyObserved", Json::array(added)),
    ("removed", if complete { Json::array(removed) } else { Json::null() }),
    ("added", if complete { Json::array(added) } else { Json::null() }),
  ])
}

///|
fn mapping_json(
  status : String,
  original : String?,
  witness : String?,
  prefix : String,
  first_block : Json,
  outcome : Json,
) -> Json {
  jobject([
    ("status", Json::string(status)),
    ("preserveOriginalActions", Json::boolean(true)),
    ("scope", Json::string("this_ordered_witness_only")),
    (
      "originalWitness",
      match original {
        Some(w) => Json::string(w)
        None => Json::null()
      },
    ),
    (
      "witness",
      match witness {
        Some(w) => Json::string(w)
        None => Json::null()
      },
    ),
    ("prefix", Json::string(prefix)),
    ("firstBlock", first_block),
    ("outcome", outcome),
    (
      "reason",
      if status == "unavailable" {
        Json::string("no_matching_witness")
      } else {
        Json::null()
      },
    ),
  ])
}

///|
/// Keep every original action in order. In particular, defer trailing fences
/// until the original terminal witness has drained all pending stores.
fn map_fenced_witness(
  original : Program,
  after : Program,
  tso : Bool,
  placements : Array[FencePlacement],
  found : FoundOutcome?,
) -> Json {
  let witness = match found {
    Some(outcome) => outcome.witness
    None =>
      return mapping_json(
        "unavailable",
        None,
        None,
        "",
        Json::null(),
        Json::null(),
      )
  }
  let mut state = initial_state(after)
  let old_pcs = Array::make(original.threads.length(), 0)
  let mapped : Array[String] = []
  let mut original_step = 0
  for token in tokenize(witness) {
    original_step = original_step + 1
    let mut action : Action = { thread: 0, flush: false, }
    for t = 0; t < original.threads.length(); t = t + 1 {
      if token.text == "t" + t.to_string() {
        action = { thread: t, flush: false, }
      }
      if token.text == "f" + t.to_string() {
        action = { thread: t, flush: true, }
      }
    }
    let t = action.thread
    if !action.flush {
      if placement_at(placements, t, old_pcs[t]) is Some(placement) {
        if !state.buffers[t].is_empty() {
          let block = jobject([
            ("originalStep", jnum(original_step)),
            ("originalAction", Json::string(token.text)),
            ("thread", Json::string(original.threads[t].name)),
            ("boundary", jnum(placement.boundary)),
            ("instructionIndex", jnum(placement.instruction_index)),
            ("reason", Json::string("fence_requires_empty_buffer")),
            (
              "pendingWrites",
              Json::array(
                state.buffers[t].map(w => {
                  jobject([
                    ("address", Json::string(after.addresses[w.address])),
                    ("value", jnum(w.value)),
                  ])
                }),
              ),
            ),
            (
              "stateBefore",
              snapshot_json(
                after,
                state,
                mapped.length(),
                Json::null(),
                "before blocked fence",
                Json::null(),
              ),
            ),
          ])
          return mapping_json(
            "blocked",
            Some(witness),
            None,
            mapped.join(" "),
            block,
            Json::null(),
          )
        }
        state = transition(after, state, tso, { thread: t, flush: false, })
        mapped.push("t" + t.to_string())
      }
      old_pcs[t] = old_pcs[t] + 1
    }
    state = transition(after, state, tso, action)
    mapped.push(token.text)
  }
  for t = 0; t < original.threads.length(); t = t + 1 {
    if placement_at(placements, t, original.threads[t].instructions.length())
      is Some(_) {
      state = transition(after, state, tso, { thread: t, flush: false, })
      mapped.push("t" + t.to_string())
    }
  }
  let mapped_witness = mapped.join(" ")
  mapping_json(
    "preserved",
    Some(witness),
    Some(mapped_witness),
    mapped_witness,
    Json::null(),
    outcome_json(after, state, mapped_witness),
  )
}

///|
#export_name("compareFences")
pub fn compare_fences(
  source : String,
  model : String,
  strategy : String,
  max_states : Int32,
  max_outcomes : Int32,
  target : String,
  fences : String,
) -> String {
  if validate_search_options(model, strategy, max_states, max_outcomes)
    is Some(e) {
    return experiment_error(e, "options")
  }
  let before_program = match parse_program(source) {
    Ok(p) => p
    Err(e) => return experiment_error(e, "source")
  }
  let clauses = match parse_target(before_program, target) {
    Ok(clauses) => clauses
    Err(e) => return experiment_error(e, "target")
  }
  let placements = match parse_fences(before_program, fences) {
    Ok(placements) => placements
    Err(e) => return experiment_error(e, "fences")
  }
  let after_source = fenced_source(before_program, placements)
  let after_program = match parse_program(after_source) {
    Ok(p) => p
    Err(e) => return experiment_error(e, "fences")
  }
  let before = search_program(
    before_program, model, strategy, max_states, max_outcomes,
  )
  let after = search_program(
    after_program, model, strategy, max_states, max_outcomes,
  )
  let complete = before.reason is None && after.reason is None
  jobject([
    ("status", Json::string(if complete { "complete" } else { "incomplete" })),
    ("exitCode", jnum(if complete { 0 } else { 3 })),
    ("model", Json::string(model)),
    ("strategy", Json::string(strategy)),
    ("target", Json::string(target)),
    (
      "fences",
      Json::array(
        placements.map(f => {
          jobject([
            ("thread", Json::string(before_program.threads[f.thread].name)),
            ("boundary", jnum(f.boundary)),
            ("instructionIndex", jnum(f.instruction_index)),
          ])
        }),
      ),
    ),
    ("afterSource", Json::string(after_source)),
    ("before", comparison_side_json(before_program, before, clauses)),
    ("after", comparison_side_json(after_program, after, clauses)),
    ("sets", outcome_sets_json(before, after)),
    (
      "mapping",
      map_fenced_witness(
        before_program,
        after_program,
        model == "TSO",
        placements,
        first_match(before, clauses),
      ),
    ),
  ]).stringify()
}
