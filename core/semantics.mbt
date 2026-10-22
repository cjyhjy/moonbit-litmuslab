///|
fn initial_state(p : Program) -> State {
  {
    memory: p.initial.copy(),
    pcs: Array::make(p.threads.length(), 0),
    registers: p.threads.map(t => Array::make(t.registers.length(), 0)),
    buffers: p.threads.map(_ => []),
  }
}

///|
fn copy_state(s : State) -> State {
  {
    memory: s.memory.copy(),
    pcs: s.pcs.copy(),
    registers: s.registers.map(r => r.copy()),
    buffers: s.buffers.map(b => b.copy()),
  }
}

///|
fn terminal(p : Program, s : State) -> Bool {
  for t = 0; t < p.threads.length(); t = t + 1 {
    if s.pcs[t] != p.threads[t].instructions.length() ||
      !s.buffers[t].is_empty() {
      return false
    }
  }
  true
}

///|
fn enabled(p : Program, s : State, tso : Bool) -> Array[Action] {
  let actions : Array[Action] = []
  for t = 0; t < p.threads.length(); t = t + 1 {
    if s.pcs[t] < p.threads[t].instructions.length() {
      let can_issue = match p.threads[t].instructions[s.pcs[t]] {
        Fence => s.buffers[t].is_empty()
        _ => true
      }
      if can_issue {
        actions.push({ thread: t, flush: false, })
      }
    }
    if tso && !s.buffers[t].is_empty() {
      actions.push({ thread: t, flush: true, })
    }
  }
  actions
}

///| This is the only state transition relation used by the production engine.

///|
/// Callers must supply an enabled action. Replay validates that precondition.
fn transition(p : Program, s : State, tso : Bool, a : Action) -> State {
  let next = copy_state(s)
  let t = a.thread
  if a.flush {
    let write = s.buffers[t][0]
    next.memory[write.address] = write.value
    next.buffers[t] = []
    for i = 1; i < s.buffers[t].length(); i = i + 1 {
      next.buffers[t].push(s.buffers[t][i])
    }
  } else {
    match p.threads[t].instructions[s.pcs[t]] {
      Store(addr, value) =>
        if tso {
          next.buffers[t].push({ address: addr, value, })
        } else {
          next.memory[addr] = value
        }
      Load(reg, addr) => {
        let mut value = s.memory[addr]
        // FIFO order: overwriting picks the youngest pending same-address write.
        for write in s.buffers[t] {
          if write.address == addr {
            value = write.value
          }
        }
        next.registers[t][reg] = value
      }
      Fence => ()
    }
    next.pcs[t] = next.pcs[t] + 1
  }
  next
}

///|
fn action_text(a : Action) -> String {
  (if a.flush { "f" } else { "t" }) + a.thread.to_string()
}

///|
/// Separators and numeric-only data make this encoding injective for a program.
fn state_key(s : State) -> String {
  let pieces : Array[String] = []
  pieces.push(s.memory.map(v => v.to_string()).join(","))
  pieces.push(s.pcs.map(v => v.to_string()).join(","))
  for r in s.registers {
    pieces.push(r.map(v => v.to_string()).join(","))
  }
  pieces.push("b")
  for b in s.buffers {
    pieces.push(b.map(w => "\{w.address}:\{w.value}").join(","))
  }
  pieces.join("|")
}

///|
fn outcome_key(s : State) -> String {
  let pieces = [s.memory.map(v => v.to_string()).join(",")]
  for r in s.registers {
    pieces.push(r.map(v => v.to_string()).join(","))
  }
  pieces.join("|")
}

///|
fn instruction_text(p : Program, t : Int32, i : Int32) -> String {
  match p.threads[t].instructions[i] {
    Store(a, v) => "store \{p.addresses[a]} \{v}"
    Load(r, a) => "load \{p.threads[t].registers[r]} \{p.addresses[a]}"
    Fence => "fence"
  }
}
