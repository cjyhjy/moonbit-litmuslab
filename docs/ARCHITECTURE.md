# 实现结构

生产计算全部落在 MoonBit 核心，JavaScript 不生成允许结果，也不模拟写缓冲。

```text
DSL 文件 / 浏览器编辑器
          │
CLI 文件读取 / Web Worker / JS 类型检查
          │
  dist/engine.raw.mjs（MoonBit 编译）
          │
  parser → Program → initial State
                    │
       enabled + transition（SC / TSO）
                    │
          BFS/DFS + 全状态去重
                    │
        结果集合 + 前驱链见证
                    │
     replay → 逐步验证与状态快照
```

| 文件 | 职责 |
|---|---|
| `core/parser.mbt` | 限定 DSL、资源检查、行列诊断、编译为地址/寄存器索引 |
| `core/semantics.mbt` | 初态、启用动作、SC/TSO 转移、终态、无碰撞状态编码 |
| `core/search.mbt` | BFS/DFS、去重、状态和结果上限、前驱见证 |
| `core/replay.mbt` | 校验每个动作启用条件、生成全步骤快照、拒绝非终态见证 |
| `core/json.mbt` | 稳定 JSON 输出格式 |
| `core/types.mbt` | 内部状态与指令数据类型 |
| `tools/engine-wrapper.mjs` | 宿主类型检查，拦截 NaN 等非 MoonBit 类型值 |
| `bin/litmuslab.mjs` | 有界 UTF-8 输入、参数、退出码、两模型集合汇总 |
| `web/engine-worker.mjs` | 异步调用实际引擎；取消通过终止 Worker 实现 |
| `tools/reference.py` | 独立不可变 Python 参考；仅用于验证，不参与产品运行 |
| `tools/oracle-run.py` | 把共同子集翻译为 herd7 X86 litmus，实际调用外部工具 |

状态索引与最终结果 id 只在同一解析后程序中有意义。状态前驱链每步增加执行动作；产物只保存一个见证，而非全部路径。共享状态复制和完整编码是去重搜索正确性的关键；详细定义在 `SEMANTICS.md`。

依赖分成三层：运行演示只需 Node 和交付的 ES modules；重建源码需要锁定 MoonBit；重新跑外部 oracle 还需项目内 OCaml/opam/herd7/MoonCTL。第三层不会混入默认产品运行，也不打包庞大工具链。
