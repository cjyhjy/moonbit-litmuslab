///| Columns count Unicode code points, not bytes or UTF-16 code units.
fn tokenize(line : String) -> Array[Token] {
  let tokens : Array[Token] = []
  let mut word = ""
  let mut start = 1
  let mut column = 1
  for c in line {
    if c == '#' { break }
    if c == ' ' || c == '\t' || c == '\r' {
      if word != "" {
        tokens.push({ text: word, column: start })
        word = ""
      }
    } else {
      if word == "" { start = column }
      word = word + c.to_string()
    }
    column = column + 1
  }
  if word != "" { tokens.push({ text: word, column: start }) }
  tokens
}

///|
fn identifier(s : String) -> Bool {
  let mut count = 0
  for c in s {
    let letter = (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')
    if !letter && !(count > 0 && ((c >= '0' && c <= '9') || c == '_')) {
      return false
    }
    count = count + 1
    if count > 32 { return false }
  }
  count > 0
}

///| Bounded decimal parsing avoids overflow even for malicious long literals.
fn literal(s : String) -> Int? {
  let mut sign = 1
  let mut value = 0
  let mut digits = 0
  let mut index = 0
  for c in s {
    if index == 0 && c == '-' {
      sign = -1
    } else {
      if c < '0' || c > '9' { return None }
      value = value * 10 + c.to_int() - '0'.to_int()
      digits = digits + 1
      if value > 32768 { return None }
    }
    index = index + 1
  }
  if digits == 0 || value * sign > 32767 { None } else { Some(value * sign) }
}

///|
fn index_of(names : Array[String], value : String) -> Int? {
  for i = 0; i < names.length(); i = i + 1 {
    if names[i] == value { return Some(i) }
  }
  None
}

///|
fn parse_program(source : String) -> Result[Program, Diagnostic] {
  let mut char_count = 0
  for _ in source {
    char_count = char_count + 1
    if char_count > 32768 {
      return Err(problem("InputLimit", "Source exceeds 32768 Unicode code points", 0, 0))
    }
  }
  let addresses : Array[String] = []
  let initial : Array[Int] = []
  let threads : Array[Thread] = []
  let mut current : Thread? = None
  let mut seen_memory = false
  let mut line_number = 0
  for line in source.split("\n") {
    line_number = line_number + 1
    let tokens = tokenize(line.to_string())
    if tokens.length() == 0 { continue }
    let first = tokens[0]
    let at = fn(code, msg, column) { problem(code, msg, line_number, column) }
    if !seen_memory && first.text != "memory" {
      return Err(at("ExpectedMemory", "First declaration must be memory x=0 ...", first.column))
    }
    match first.text {
      "memory" => {
        if seen_memory { return Err(at("DuplicateMemory", "Only one memory declaration is allowed", first.column)) }
        if tokens.length() < 2 || tokens.length() > 9 {
          return Err(at("MemoryLimit", "Declare between 1 and 8 addresses", first.column))
        }
        for i = 1; i < tokens.length(); i = i + 1 {
          let token = tokens[i]
          let pair = token.text.split("=").to_array()
          if pair.length() != 2 || !identifier(pair[0].to_string()) {
            return Err(at("MemorySyntax", "Expected ASCII name=value (name at most 32 characters)", token.column))
          }
          let name = pair[0].to_string()
          if addresses.contains(name) { return Err(at("DuplicateAddress", "Duplicate address: " + name, token.column)) }
          let value = match literal(pair[1].to_string()) {
            Some(v) => v
            None => return Err(at("InvalidInteger", "Integer must be in -32768..32767", token.column + name.length() + 1))
          }
          addresses.push(name)
          initial.push(value)
        }
        seen_memory = true
      }
      "thread" => {
        if current is Some(_) { return Err(at("NestedThread", "Close the previous thread with end", first.column)) }
        if tokens.length() != 2 { return Err(at("ThreadSyntax", "Expected thread NAME", first.column)) }
        let name = tokens[1].text
        if !identifier(name) { return Err(at("InvalidName", "Thread name must be an ASCII identifier of at most 32 characters", tokens[1].column)) }
        if threads.any(t => t.name == name) { return Err(at("DuplicateThread", "Duplicate thread: " + name, tokens[1].column)) }
        if threads.length() == 4 { return Err(at("ThreadLimit", "At most 4 threads are supported", first.column)) }
        current = Some({ name, registers: [], instructions: [], lines: [] })
      }
      "end" => {
        if tokens.length() != 1 { return Err(at("EndSyntax", "end takes no operands", tokens[1].column)) }
        match current {
          Some(t) => { threads.push(t); current = None }
          None => return Err(at("UnexpectedEnd", "end is outside a thread", first.column))
        }
      }
      "store" | "load" | "fence" => {
        let t = match current {
          Some(t) => t
          None => return Err(at("OutsideThread", "Instruction is outside a thread", first.column))
        }
        if t.instructions.length() == 16 { return Err(at("InstructionLimit", "At most 16 instructions per thread", first.column)) }
        if first.text == "fence" {
          if tokens.length() != 1 { return Err(at("FenceSyntax", "fence takes no operands", tokens[1].column)) }
          t.instructions.push(Fence)
        } else {
          if tokens.length() != 3 {
            return Err(at("InstructionSyntax", "Expected store ADDRESS INTEGER or load REGISTER ADDRESS", first.column))
          }
          let address_token = if first.text == "store" { tokens[1] } else { tokens[2] }
          let addr = match index_of(addresses, address_token.text) {
            Some(a) => a
            None => return Err(at("UnknownAddress", "Undeclared address: " + address_token.text, address_token.column))
          }
          if first.text == "store" {
            let value = match literal(tokens[2].text) {
              Some(v) => v
              None => return Err(at("InvalidInteger", "Store requires an integer in -32768..32767", tokens[2].column))
            }
            t.instructions.push(Store(addr, value))
          } else {
            let reg = tokens[1]
            if !identifier(reg.text) { return Err(at("InvalidName", "Register must be an ASCII identifier of at most 32 characters", reg.column)) }
            let ri = match index_of(t.registers, reg.text) {
              Some(r) => r
              None => {
                if t.registers.length() == 8 { return Err(at("RegisterLimit", "At most 8 registers per thread", reg.column)) }
                t.registers.push(reg.text)
                t.registers.length() - 1
              }
            }
            t.instructions.push(Load(ri, addr))
          }
        }
        t.lines.push(line_number)
      }
      _ => return Err(at("UnknownCommand", "Unknown command: " + first.text, first.column))
    }
  }
  if !seen_memory { return Err(problem("ExpectedMemory", "Missing memory declaration", 1, 1)) }
  if current is Some(_) { return Err(problem("MissingEnd", "Thread requires a closing end", line_number, 1)) }
  if threads.length() == 0 { return Err(problem("MissingThread", "At least one thread is required", line_number, 1)) }
  Ok({ addresses, initial, threads })
}
