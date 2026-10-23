# API 与命令行接口

`dist/engine.mjs` 是公开 ES module，包含少量宿主类型检查并调用 MoonBit 编译的 `engine.raw.mjs`，不依赖 npm 包。公开的稳定边界是返回 JSON 字符串的函数；内部状态结构不属于 JavaScript API。

```js
import { analyze, replay } from './dist/engine.mjs';
const result = JSON.parse(analyze(source, 'TSO', 'bfs', 20000, 256));
if (result.outcomes?.length) {
  const trace = JSON.parse(replay(source, 'TSO', result.outcomes[0].witness));
}
```

`source/model/strategy/witness` 必须是字符串；预算必须是 JavaScript 安全整数。公开包装器会拒绝非字符串、NaN、Infinity、分数及字符串预算；未通过检查不会进入 MoonBit 引擎。CLI 和浏览器另会验证参数。`engine.raw.mjs` 属编译器内部产物，不是安全的公开宿主接口。

## analyze(source, model, strategy, maxStates, maxOutcomes)

model 为 `SC` 或 `TSO`；strategy 为 `bfs` 或 `dfs`。成功或预算耗尽时返回：

```json
{
  "status": "complete",
  "exitCode": 0,
  "model": "TSO",
  "strategy": "bfs",
  "reason": null,
  "program": {
    "initialMemory": {"x": 0},
    "threads": [{"name": "P0", "registers": [], "instructions": [
      {"op": "store", "address": "x", "value": 1, "line": 3}
    ]}]
  },
  "stats": {"visitedStates": 3, "expandedStates": 3, "transitions": 2, "outcomes": 1},
  "outcomes": [{"id": "1|", "memory": {"x": 1}, "registers": {"P0": {}}, "witness": "t0 f0"}]
}
```

`incomplete` 时 exitCode=3，reason 为 `max_states` 或 `max_outcomes`。错误统一为：

```json
{"status":"error","exitCode":2,"error":{"code":"UnknownAddress","message":"Undeclared address: z","line":3,"column":8}}
```

错误字符串是英文以便脚本处理；以 `code` 区分错误，不匹配 message 全文。格式错误、超资源输入不会退化成空程序。

## replay(source, model, witness)

见证用空白分隔 `t0`…`t3` 与 `f0`…`f3`；线程下标按声明顺序。重放必须走到真正终态。返回 `status: "ok"`、exitCode=0、model、program、outcome 和 `trace` 数组。

`trace[0]` 是初态（effect=null）。每项有 step、action、description、effect、memory、terminal 和 threads。线程项含 name、0-based pc、registers、队首在前的 buffer、下一条指令文本 next（结束时 null）。description 是说明文字，不作为解析协议。

## CLI

```sh
node bin/litmuslab.mjs analyze FILE --model SC --strategy bfs --max-states 20000 --max-outcomes 256
node bin/litmuslab.mjs analyze FILE --model both
node bin/litmuslab.mjs replay FILE --model TSO --witness 't0 f0'
cat FILE | node bin/litmuslab.mjs analyze - --model TSO
```

单模型直接输出引擎对象；`analyze --model both` 返回 results.SC/results.TSO 和 comparison。`comparison.definitive` 只有两个模型都完整才为 true。analyze 退出码 0 完成、3 不完整、2 错误。stdout 为单个 JSON 对象；帮助命令例外。相同程序重复运行的结果顺序确定，但调用者应按集合比较。query/compare-fences 的 both 模式返回 results.SC/results.TSO、command 和 target，没有根级 comparison；判定与退出码见下方 0.3.0 说明。

路径由 CLI 负责读取，引擎不访问文件或网络。CLI 原始输入字节上限 128 KiB，核心另设 32768 码点上限；两者含义不同。

## 0.2.0 重放 effect

这是兼容性新增字段，原有 analyze/replay 参数与结果集合没有改变。effect 中 thread 为 DSL 线程名，所有 bufferIndex 都相对**动作前**缓冲队首 0。

| kind | 额外字段 |
|---|---|
| load | address、register、value、source (`memory` / `buffer`)、bufferIndex（共享内存来源为 null） |
| store | address、value、destination (`memory` / `buffer`)、bufferIndex（入队位置，SC 为 null） |
| flush | address、value、destination=`memory`、bufferIndex=0 |
| fence | bufferEmpty=true |

实验配置文件与结果下载属于浏览器界面格式，详见教学指南；导入配置会清除旧分析，必须重新计算，结果包不能当作配置导入。


## 0.3.0 query 与 compareFences

```js
const queryResult = JSON.parse(query(source, 'TSO', 'bfs', 20000, 256,
  'reg.P0.r0=0 && reg.P1.r1=0'));
const comparison = JSON.parse(compareFences(source, 'TSO', 'bfs', 20000, 256,
  'reg.P0.r0=0 && reg.P1.r1=0', 'P0:1,P1:1'));
```

两者从 `dist/engine.mjs` 导入。target/fences 必须是字符串；所有 DSL、目标、插入和判定逻辑都在 MoonBit 中执行。

query 返回 `status:'ok'`、`exitCode`、model、strategy、target、program、search、verdict、match。search 含 status/reason/stats；verdict 是 reachable/unreachable/unknown，match 是一份完整 outcome 或 null。unknown 退出 3，其余合法答案退出 0；不要把 status=ok 当作目标已确定。

compareFences 返回 status/exitCode/model/strategy/target/fences/afterSource/before/after/sets/mapping。before/after 各含 program/search/verdict/match/outcomes。sets.complete 仅当两侧完整，removed/added 此时是结果 ID 数组，否则 null；commonObserved/beforeOnlyObserved/afterOnlyObserved 始终只是已观察集合比较。mapping.scope 为 this_ordered_witness_only，preserveOriginalActions 为 true；blocked 的 firstBlock 给出第一次屏障等待的原动作与状态。完整定义与使用示例见 [EXPERIMENTS.md](EXPERIMENTS.md)。

新函数的 MoonBit 核心输入诊断含 `error.input`，区分 source、target、fences 和 options。宿主包装器的类型及预算校验返回 InvalidType/InvalidBudget，不保证含 `error.input`；消费方不要解析自然语言 message。
