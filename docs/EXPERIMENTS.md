# 指定结果查询与屏障前后对照

0.3.0 在同一 MoonBit 执行语义上增加目标查询和受限屏障插入。目标只描述最终共享内存和寄存器；不引入通用时序逻辑、真实程序自动分析或自动修复。

## 指定结果

```sh
node bin/litmuslab.mjs query examples/store-buffering.litmus \
  --model both --target 'reg.P0.r0=0 && reg.P1.r1=0'
```

语法是 1–40 个等式用 `&&` 连接：`reg.线程.寄存器=整数` 或 `mem.地址=整数`。名称必须已在程序中声明，整数范围仍为 −32768…32767；同一观测项重复、未知名字、空条件和多余操作符均报错。最多 4096 个 Unicode 码点。不执行 JavaScript 表达式，不使用 eval。

| verdict | 含义 | 查询退出码 |
|---|---|---:|
| reachable | 已找到满足条件的终态，match 包含见证 | 0 |
| unreachable | 完整搜索结束，没有满足条件的终态 | 0 |
| unknown | 尚未找到，搜索已达到预算 | 3 |

合法查询的 `status` 为 `ok`；`verdict` 是问题答案，`search.status` 单独说明结果枚举是否完成。即使枚举不完整，已找到的见证仍能确认 reachable。输入错误为 `status:error`、退出码 2。查询沿用完整/预算枚举后判定，不声称采用目标引导搜索或提前终止优化。

## 插入屏障并比较

```sh
node bin/litmuslab.mjs compare-fences examples/store-buffering.litmus \
  --model TSO --target 'reg.P0.r0=0 && reg.P1.r1=0' --fences 'P0:1,P1:1'
```

`P0:1` 表示在**原程序** P0 的第 1 条指令之后、第 2 条之前插入 fence。边界编号从 0 开始，0 是线程开头，n 是 n 条指令后的末尾。多个位置用逗号分隔；所有编号都基于原程序，不能按先前插入后偏移的编号填写。

空位置列表、重复位置、未知线程、越界位置，以及插入后每线程超过 16 条指令均报错。工具只按用户选择的合法位置插入，不搜索最小屏障数，不宣称最佳修复。`afterSource` 是可保存、可重新分析的规范化 DSL；它保留程序语义内容，注释与空白不会保留。

`before` 与 `after` 各自使用完整的一份所选预算，并分别返回 `program/search/verdict/match/outcomes`。两边搜索都完整时，`sets.removed`、`sets.added` 才是确定的结果集合差；否则为 null，`*Observed` 仅表示已观察集合。比较操作有任一侧不完整即退出 3，即便其中某个目标的 reachable 已确定。

## 为什么原见证被阻止

`mapping` 从 before.match 的那一条见证出发，保持原指令动作与原刷新动作的相对顺序，只在选定边界插入 fence：

- `preserved`：得到可在变换后程序中完整重放的见证。
- `blocked`：第一次插入 fence 时缓冲尚未排空，返回原动作序号、线程、边界、待写项和执行前状态。
- `unavailable`：原查询没有找到匹配见证，无法对这条路径作解释。

线程末尾新增的 fence 会在原见证全部动作（包括最后的刷新）完成后补齐。映射不自行添加刷新，也不重排原动作以让路径通过。

**单条路径受阻不等于该结果消失。** 结果是否仍可出现，应看 after.verdict；只有完整搜索得出 unreachable 才能排除目标。若 before.reachable 而 after.unknown，只能报告修改后尚未确定。屏障消除双零的示例与“原路径受阻但替代路径仍存在”的回归都需要保留。

## 浏览器实验

选择“指定结果查询”或“屏障前后对照”，填写目标及原始指令边界后运行。每个模型分别显示枚举完整性与目标结论；匹配结果可重放。对照中可查看规范化的修改后程序，并应用到编辑器重新运行。

配置导出采用版本 2，在原模型/策略/预算之外保存 mode、target、fences。版本 1 的旧配置仍可导入并按“枚举全部结果”运行。导入配置不接受保存的结果为证据；编辑、切换任务或应用修改后程序都会使旧结果失效。

## 复核

`node tools/check-experiments.mjs` 使用独立 Python 状态枚举、变换与见证映射核对公共 API 和 CLI，并对照保存的 herd7 SB/fence 完整结果。报告中明确区分这次重比对和外部工具重新运行。执行 `python3 tools/verify.py --live-oracle --check-dist` 会先实际重跑外部工具，再做新功能比较。

此版本仍只适用于定义好的有限 SC/TSO 模型。它不能证明任意真实并发程序正确，也不是 CPU 硬件观测。
