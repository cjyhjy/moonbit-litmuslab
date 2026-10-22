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

///| A complete result means the whole reachable state graph was exhausted.

///|
/// An interrupted graph yields sound witnesses but never an exclusion proof.
#export_name("analyze")
pub fn analyze(
  source : String,
  model : String,
  strategy : String,
  max_states : Int32,
  max_outcomes : Int32,
) -> String {
  if model != "SC" && model != "TSO" {
    return diagnostic_json(
      problem("InvalidModel", "Model must be SC or TSO", 0, 0),
    )
  }
  if strategy != "bfs" && strategy != "dfs" {
    return diagnostic_json(
      problem("InvalidStrategy", "Strategy must be bfs or dfs", 0, 0),
    )
  }
  if max_states < 1 ||
    max_states > 100000 ||
    max_outcomes < 1 ||
    max_outcomes > 1024 {
    return diagnostic_json(
      problem(
        "InvalidBudget", "max_states must be 1..100000 and max_outcomes 1..1024",
        0, 0,
      ),
    )
  }
  let p = match parse_program(source) {
    Ok(p) => p
    Err(e) => return diagnostic_json(e)
  }
  let tso = model == "TSO"
  let initial = initial_state(p)
  let nodes : Array[Node] = [{ state: initial, parent: -1, action: "", }]
  let visited : Map[String, Bool] = Map([(state_key(initial), true)])
  let frontier = [0]
  let mut head = 0
  let outcomes : Array[Json] = []
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
        outcomes.push(outcome_json(p, s, witness_of(nodes, index)))
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
  let complete = reason is None
  jobject([
    ("status", Json::string(if complete { "complete" } else { "incomplete" })),
    ("exitCode", jnum(if complete { 0 } else { 3 })),
    ("model", Json::string(model)),
    ("strategy", Json::string(strategy)),
    (
      "reason",
      match reason {
        Some(r) => Json::string(r)
        None => Json::null()
      },
    ),
    ("program", program_json(p)),
    (
      "stats",
      jobject([
        ("visitedStates", jnum(nodes.length())),
        ("expandedStates", jnum(expanded)),
        ("transitions", jnum(transitions)),
        ("outcomes", jnum(outcomes.length())),
      ]),
    ),
    ("outcomes", Json::array(outcomes)),
  ]).stringify()
}
