///|
fn witness_of(nodes : Array[Node], index : Int32) -> String {
  let reverse : Array[String] = []
  let mut cursor = index
  while nodes[cursor].parent >= 0 {
    reverse.push(nodes[cursor].action)
    cursor = nodes[cursor].parent
  }
  reverse.rev().join(" ")
}

///|
priv struct FoundOutcome {
  state : State
  witness : String
}

///|
priv struct SearchResult {
  outcomes : Array[FoundOutcome]
  visited : Int32
  expanded : Int32
  transitions : Int32
  reason : String?
}

///|
fn validate_search_options(
  model : String,
  strategy : String,
  max_states : Int32,
  max_outcomes : Int32,
) -> Diagnostic? {
  if model != "SC" && model != "TSO" {
    return Some(problem("InvalidModel", "Model must be SC or TSO", 0, 0))
  }
  if strategy != "bfs" && strategy != "dfs" {
    return Some(problem("InvalidStrategy", "Strategy must be bfs or dfs", 0, 0))
  }
  if max_states < 1 ||
    max_states > 100000 ||
    max_outcomes < 1 ||
    max_outcomes > 1024 {
    return Some(
      problem(
        "InvalidBudget", "max_states must be 1..100000 and max_outcomes 1..1024",
        0, 0,
      ),
    )
  }
  None
}

///|
/// An interrupted graph yields sound witnesses but never an exclusion proof.
fn search_program(
  p : Program,
  model : String,
  strategy : String,
  max_states : Int32,
  max_outcomes : Int32,
) -> SearchResult {
  let tso = model == "TSO"
  let initial = initial_state(p)
  let nodes : Array[Node] = [{ state: initial, parent: -1, action: "", }]
  let visited : Map[String, Bool] = Map([(state_key(initial), true)])
  let frontier = [0]
  let mut head = 0
  let outcomes : Array[FoundOutcome] = []
  let outcome_ids : Map[String, Bool] = Map([])
  let mut expanded = 0
  let mut transitions = 0
  let mut reason : String? = None
  while (if strategy == "bfs" {
          head < frontier.length()
        } else {
          !frontier.is_empty()
        }) {
    let index = if strategy == "bfs" {
      let i = frontier[head]
      head = head + 1
      i
    } else {
      match frontier.pop() {
        Some(i) => i
        None => break
      }
    }
    let s = nodes[index].state
    expanded = expanded + 1
    if terminal(p, s) {
      let id = outcome_key(s)
      if !outcome_ids.contains(id) {
        if outcomes.length() == max_outcomes {
          reason = Some("max_outcomes")
          break
        }
        outcome_ids[id] = true
        outcomes.push({ state: s, witness: witness_of(nodes, index), })
      }
    } else {
      for action in enabled(p, s, tso) {
        transitions = transitions + 1
        let successor = transition(p, s, tso, action)
        let key = state_key(successor)
        if !visited.contains(key) {
          if nodes.length() == max_states {
            reason = Some("max_states")
            break
          }
          visited[key] = true
          nodes.push({
            state: successor,
            parent: index,
            action: action_text(action),
          })
          frontier.push(nodes.length() - 1)
        }
      }
      if reason is Some(_) {
        break
      }
    }
  }
  { outcomes, visited: nodes.length(), expanded, transitions, reason, }
}

///|
fn search_stats_json(result : SearchResult) -> Json {
  jobject([
    ("visitedStates", jnum(result.visited)),
    ("expandedStates", jnum(result.expanded)),
    ("transitions", jnum(result.transitions)),
    ("outcomes", jnum(result.outcomes.length())),
  ])
}

///|
fn search_reason_json(result : SearchResult) -> Json {
  match result.reason {
    Some(r) => Json::string(r)
    None => Json::null()
  }
}

///|
fn search_status(result : SearchResult) -> String {
  if result.reason is None {
    "complete"
  } else {
    "incomplete"
  }
}

///|
#export_name("analyze")
pub fn analyze(
  source : String,
  model : String,
  strategy : String,
  max_states : Int32,
  max_outcomes : Int32,
) -> String {
  if validate_search_options(model, strategy, max_states, max_outcomes)
    is Some(e) {
    return diagnostic_json(e)
  }
  let p = match parse_program(source) {
    Ok(p) => p
    Err(e) => return diagnostic_json(e)
  }
  let result = search_program(p, model, strategy, max_states, max_outcomes)
  let complete = result.reason is None
  jobject([
    ("status", Json::string(search_status(result))),
    ("exitCode", jnum(if complete { 0 } else { 3 })),
    ("model", Json::string(model)),
    ("strategy", Json::string(strategy)),
    ("reason", search_reason_json(result)),
    ("program", program_json(p)),
    ("stats", search_stats_json(result)),
    (
      "outcomes",
      Json::array(result.outcomes.map(o => outcome_json(p, o.state, o.witness))),
    ),
  ]).stringify()
}
