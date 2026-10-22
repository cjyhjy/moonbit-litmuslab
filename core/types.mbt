///| The deliberately finite instruction set has no branches or address arithmetic.
enum Instruction {
  Store(Int, Int)
  Load(Int, Int)
  Fence
} derive(Eq, Show)

///|
struct Thread {
  name : String
  registers : Array[String]
  instructions : Array[Instruction]
  lines : Array[Int]
}

///|
struct Program {
  addresses : Array[String]
  initial : Array[Int]
  threads : Array[Thread]
}

///|
struct Diagnostic {
  code : String
  message : String
  line : Int
  column : Int
} derive(Eq, Show)

///|
struct Token {
  text : String
  column : Int
}

///|
struct Write {
  address : Int
  value : Int
} derive(Eq, Show)

///| Every successor owns its arrays; states retained by search are never mutated.
struct State {
  memory : Array[Int]
  pcs : Array[Int]
  registers : Array[Array[Int]]
  buffers : Array[Array[Write]]
}

///|
struct Action {
  thread : Int
  flush : Bool
}

///|
struct Node {
  state : State
  parent : Int
  action : String
}

///|
fn problem(code : String, message : String, line : Int, column : Int) -> Diagnostic {
  { code, message, line, column }
}
