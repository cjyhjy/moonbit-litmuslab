///|
fn jnum(n : Int32) -> Json {
  Json::number(n.to_double())
}

///|
fn jobject(fields : Array[(String, Json)]) -> Json {
  Json::object(Map(fields))
}

///|
fn named_values(names : Array[String], values : Array[Int32]) -> Json {
  let fields : Map[String, Json] = Map([])
  for i = 0; i < names.length(); i = i + 1 {
    fields[names[i]] = jnum(values[i])
  }
  Json::object(fields)
}

///|
fn diagnostic_json(e : Diagnostic) -> String {
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
      ]),
    ),
  ]).stringify()
}

///|
fn program_json(p : Program) -> Json {
  jobject([
    ("initialMemory", named_values(p.addresses, p.initial)),
    (
      "threads",
      Json::array(
        p.threads.map(t => {
          let instructions : Array[Json] = []
          for i = 0; i < t.instructions.length(); i = i + 1 {
            let fields : Map[String, Json] = { "line": jnum(t.lines[i]) }
            match t.instructions[i] {
              Store(a, v) => {
                fields["op"] = Json::string("store")
                fields["address"] = Json::string(p.addresses[a])
                fields["value"] = jnum(v)
              }
              Load(r, a) => {
                fields["op"] = Json::string("load")
                fields["address"] = Json::string(p.addresses[a])
                fields["register"] = Json::string(t.registers[r])
              }
              Fence => fields["op"] = Json::string("fence")
            }
            instructions.push(Json::object(fields))
          }
          jobject([
            ("name", Json::string(t.name)),
            ("registers", Json::array(t.registers.map(Json::string))),
            ("instructions", Json::array(instructions)),
          ])
        }),
      ),
    ),
  ])
}

///|
fn outcome_json(p : Program, s : State, witness : String) -> Json {
  let registers : Map[String, Json] = Map([])
  for t = 0; t < p.threads.length(); t = t + 1 {
    registers[p.threads[t].name] = named_values(
      p.threads[t].registers,
      s.registers[t],
    )
  }
  jobject([
    ("id", Json::string(outcome_key(s))),
    ("memory", named_values(p.addresses, s.memory)),
    ("registers", Json::object(registers)),
    ("witness", Json::string(witness)),
  ])
}

///|
fn snapshot_json(
  p : Program,
  s : State,
  step : Int32,
  action : Json,
  description : String,
  effect : Json,
) -> Json {
  let threads : Array[Json] = []
  for t = 0; t < p.threads.length(); t = t + 1 {
    threads.push(
      jobject([
        ("name", Json::string(p.threads[t].name)),
        ("pc", jnum(s.pcs[t])),
        ("registers", named_values(p.threads[t].registers, s.registers[t])),
        (
          "buffer",
          Json::array(
            s.buffers[t].map(w => {
              jobject([
                ("address", Json::string(p.addresses[w.address])),
                ("value", jnum(w.value)),
              ])
            }),
          ),
        ),
        (
          "next",
          if s.pcs[t] < p.threads[t].instructions.length() {
            Json::string(instruction_text(p, t, s.pcs[t]))
          } else {
            Json::null()
          },
        ),
      ]),
    )
  }
  jobject([
    ("step", jnum(step)),
    ("action", action),
    ("description", Json::string(description)),
    ("effect", effect),
    ("memory", named_values(p.addresses, s.memory)),
    ("threads", Json::array(threads)),
    ("terminal", Json::boolean(terminal(p, s))),
  ])
}

///| Explain the actual enabled operation before it executes. Indices refer to

///|
/// the pre-step FIFO, with 0 at the head; no UI-side memory-model inference.
fn effect_json(p : Program, s : State, tso : Bool, a : Action) -> Json {
  let t = a.thread
  let fields : Map[String, Json] = { "thread": Json::string(p.threads[t].name) }
  if a.flush {
    let w = s.buffers[t][0]
    fields["kind"] = Json::string("flush")
    fields["address"] = Json::string(p.addresses[w.address])
    fields["value"] = jnum(w.value)
    fields["destination"] = Json::string("memory")
    fields["bufferIndex"] = jnum(0)
  } else {
    match p.threads[t].instructions[s.pcs[t]] {
      Store(addr, value) => {
        fields["kind"] = Json::string("store")
        fields["address"] = Json::string(p.addresses[addr])
        fields["value"] = jnum(value)
        fields["destination"] = Json::string(
          if tso {
            "buffer"
          } else {
            "memory"
          },
        )
        fields["bufferIndex"] = if tso {
          jnum(s.buffers[t].length())
        } else {
          Json::null()
        }
      }
      Load(reg, addr) => {
        let (value, index) = read_value(s, t, addr)
        fields["kind"] = Json::string("load")
        fields["address"] = Json::string(p.addresses[addr])
        fields["register"] = Json::string(p.threads[t].registers[reg])
        fields["value"] = jnum(value)
        fields["source"] = Json::string(
          if index >= 0 {
            "buffer"
          } else {
            "memory"
          },
        )
        fields["bufferIndex"] = if index >= 0 {
          jnum(index)
        } else {
          Json::null()
        }
      }
      Fence => {
        fields["kind"] = Json::string("fence")
        fields["bufferEmpty"] = Json::boolean(true)
      }
    }
  }
  Json::object(fields)
}
