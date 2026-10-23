///|
/// The deliberately finite instruction set has no branches or address arithmetic.
priv enum Instruction {
  Store(Int32, Int32)
  Load(Int32, Int32)
  Fence
}

///|
priv struct Thread {
  name : String
  registers : Array[String]
  instructions : Array[Instruction]
  lines : Array[Int32]
}

///|
priv struct Program {
  addresses : Array[String]
  initial : Array[Int32]
  threads : Array[Thread]
}

///|
priv struct Diagnostic {
  code : String
  message : String
  line : Int32
  column : Int32
}

///|
priv struct Token {
  text : String
  column : Int32
}

///|
priv struct Write {
  address : Int32
  value : Int32
}

///|
/// States share untouched arrays. Every written array is copied first; retained states are never mutated.
priv struct State {
  memory : Array[Int32]
  pcs : Array[Int32]
  registers : Array[Array[Int32]]
  buffers : Array[Array[Write]]
}

///|
priv struct Action {
  thread : Int32
  flush : Bool
}

///|
priv struct Node {
  state : State
  parent : Int32
  action : String
}

///|
fn problem(
  code : String,
  message : String,
  line : Int32,
  column : Int32,
) -> Diagnostic {
  { code, message, line, column, }
}
