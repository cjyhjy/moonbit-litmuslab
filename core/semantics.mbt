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

///|
/// Find the youngest matching write. -1 denotes a shared-memory read.
fn read_value(s : State, thread : Int32, address : Int32) -> (Int32, Int32) {
  let buffer = s.buffers[thread]
  for i = buffer.length() - 1; i >= 0; i = i - 1 {
    if buffer[i].address == address {
      return (buffer[i].value, i)
    }
  }
  (s.memory[address], -1)
}

///| This is the only production transition relation. Supply an enabled action.

///|
/// Retained states are immutable: share untouched arrays and copy before writing.
fn transition(p : Program, s : State, tso : Bool, a : Action) -> State {
  let t = a.thread
  if a.flush {
    let write = s.buffers[t][0]
    let memory = s.memory.copy()
    memory[write.address] = write.value
    let buffers = s.buffers.copy()
    let tail : Array[Write] = []
    for i = 1; i < s.buffers[t].length(); i = i + 1 {
      tail.push(s.buffers[t][i])
    }
    buffers[t] = tail
    { memory, pcs: s.pcs, registers: s.registers, buffers, }
  } else {
    let pcs = s.pcs.copy()
    pcs[t] = pcs[t] + 1
    match p.threads[t].instructions[s.pcs[t]] {
      Store(addr, value) =>
        if tso {
          let buffers = s.buffers.copy()
          let buffer = s.buffers[t].copy()
          buffer.push({ address: addr, value, })
          buffers[t] = buffer
          { memory: s.memory, pcs, registers: s.registers, buffers, }
        } else {
          let memory = s.memory.copy()
          memory[addr] = value
          { memory, pcs, registers: s.registers, buffers: s.buffers, }
        }
      Load(reg, addr) => {
        let registers = s.registers.copy()
        let thread_registers = s.registers[t].copy()
        let (value, _) = read_value(s, t, addr)
        thread_registers[reg] = value
        registers[t] = thread_registers
        { memory: s.memory, pcs, registers, buffers: s.buffers, }
      }
      Fence =>
        { memory: s.memory, pcs, registers: s.registers, buffers: s.buffers, }
    }
  }
}

///|
fn action_text(a : Action) -> String {
  (if a.flush { "f" } else { "t" }) + a.thread.to_string()
}

///|
/// Separators and numeric-only data make this encoding injective for a program.
fn state_key(s : State) -> String {
  let key = StringBuilder()
  write_numbers(key, s.memory)
  key.write_char('|')
  write_numbers(key, s.pcs)
  for r in s.registers {
    key.write_char('|')
    write_numbers(key, r)
  }
  key.write_string("|b")
  for buffer in s.buffers {
    key.write_char('|')
    for i = 0; i < buffer.length(); i = i + 1 {
      if i > 0 {
        key.write_char(',')
      }
      key.write_object(buffer[i].address)
      key.write_char(':')
      key.write_object(buffer[i].value)
    }
  }
  key.to_string()
}

///|
fn write_numbers(key : StringBuilder, values : Array[Int32]) -> Unit {
  for i = 0; i < values.length(); i = i + 1 {
    if i > 0 {
      key.write_char(',')
    }
    key.write_object(values[i])
  }
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
