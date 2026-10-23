///| Replay is independent from graph traversal but shares the defined step relation.

///|
/// tools/reference.py supplies a separately implemented replay oracle in tests.
#export_name("replay")
pub fn replay(source : String, model : String, witness : String) -> String {
  if model != "SC" && model != "TSO" {
    return diagnostic_json(
      problem("InvalidModel", "Model must be SC or TSO", 0, 0),
    )
  }
  let p = match parse_program(source) {
    Ok(p) => p
    Err(e) => return diagnostic_json(e)
  }
  let mut length = 0
  for c in witness {
    length = length + 1
    if length > 1024 {
      return diagnostic_json(
        problem("WitnessLimit", "Witness exceeds 1024 characters", 0, 0),
      )
    }
    if !((c >= '0' && c <= '3') ||
      c == 't' ||
      c == 'f' ||
      c == ' ' ||
      c == '\t' ||
      c == '\r' ||
      c == '\n') {
      return diagnostic_json(
        problem(
          "WitnessSyntax", "Witness uses only t0..t3 / f0..f3 separated by whitespace",
          0, length,
        ),
      )
    }
  }
  let mut s = initial_state(p)
  let trace = [snapshot_json(p, s, 0, Json::null(), "initial", Json::null())]
  let canonical : Array[String] = []
  let tso = model == "TSO"
  let mut step = 0
  for line in witness.split("\n") {
    for token in tokenize(line.to_owned()) {
      step = step + 1
      if step > 128 {
        return diagnostic_json(
          problem("WitnessLimit", "Witness exceeds 128 steps", 0, step),
        )
      }
      let actions = enabled(p, s, tso)
      let mut selected : Action? = None
      for a in actions {
        if action_text(a) == token.text {
          selected = Some(a)
        }
      }
      let a = match selected {
        Some(a) => a
        None =>
          return diagnostic_json(
            problem(
              "IllegalAction",
              "Action \{step} (\{token.text}) is not enabled",
              0,
              step,
            ),
          )
      }
      let t = a.thread
      let description = if a.flush {
        let w = s.buffers[t][0]
        "\{p.threads[t].name}: flush \{p.addresses[w.address]}=\{w.value}"
      } else {
        "\{p.threads[t].name}: " + instruction_text(p, t, s.pcs[t])
      }
      let effect = effect_json(p, s, tso, a)
      s = transition(p, s, tso, a)
      canonical.push(token.text)
      trace.push(
        snapshot_json(p, s, step, Json::string(token.text), description, effect),
      )
    }
  }
  if !terminal(p, s) {
    return diagnostic_json(
      problem(
        "NonterminalWitness", "Witness ends before all instructions and pending stores finish",
        0, step,
      ),
    )
  }
  jobject([
    ("status", Json::string("ok")),
    ("exitCode", jnum(0)),
    ("model", Json::string(model)),
    ("program", program_json(p)),
    ("trace", Json::array(trace)),
    ("outcome", outcome_json(p, s, canonical.join(" "))),
  ]).stringify()
}
