# 固定种子的外部模型差分输入

这组输入扩展原来的六个固定案例，原 `tests/oracle/` 和 12 组报告保持兼容。

默认命令：`python3 tools/oracle-generated.py --seed 20261022`。运行前须完成 `sh tools/oracle-bootstrap.sh` 并构建 `dist/engine.mjs`、`dist/engine.raw.mjs`。需要 Python 3、Node 和 herd7 7.58；没有付费服务或真实硬件并发测试。

输入由 32 个种子家族程序和 4 个边界程序组成。八个家族各有 1、2、3、4 线程：混合读写、寄存器覆盖写、负数、同地址连续写、屏障、部分空线程、全空线程、同地址转发。四个边界程序覆盖 DSL 的整数端点 -32768/32767、8 个寄存器、8 个内存位置及单线程 16 条指令。

`cases.json` 保存 AST、完整 DSL 源码、源码/翻译哈希和寄存器映射；同名 `.litmuslab` 和 `.litmus` 分别为实际传给 MoonBit、herd7 的输入。Python `random.Random` 的种子与 Python 版本均记录在报告中；也可用 `--seed` 指定新一轮种子。任意新种子不保证在既定预算内完成，超时或不完整会使该轮失败，而不会被跳过。

`tools/oracle-generated.py` 复用原始 oracle 的 MOV/MFENCE 翻译和完整结果解析。全空程序需要补一行空指令单元格；该行不包含指令，不增加内存事件。herd7 直接输出带符号整数，未进行值裁剪或模转换。

每个程序都检查 SC、TSO，共 72 组。所有共享内存及全部命名寄存器的最终值逐项比较，要求两侧均完整。herd7 单次限时 30 秒；引擎预算为 100000 状态、1024 结果。herd7 的非零退出、任何 stderr、缺少或损坏的 `States` 区、超时，分别分类。特别是缺少全空表格行的语法负例会产生 exit=0 和 stderr 警告，必须识别为拒绝，不能算成语义对照通过。

报告 `reports/oracle-generated.json` 记录全部外部结果、缺失/多余结果、工具与输入哈希、前后校验的 `oracle-generated` evidence 快照及覆盖统计。`reports/oracle-generated-raw/` 保存每次原始 stdout/stderr 和对应引擎输出（保留所有最终值，只省略见证路径）。运行中断会保留 `running`，失败会写 `error`，两者都不是成功。

`exploration/` 保留两个开发期探测输入。Int32 端点可被 herd7 表示，但超出当前 DSL 的整数域；另一个密集 16 指令程序导致 herd7 的 SC/TSO 各 30 秒超时。原始记录在 `reports/oracle-generated-exploration.json` 和 `reports/oracle-generated-raw/exploration-*`，这些限制没有计入 72 个成功对照。最终 16 指令案例包含 2 次写、4 次读和 10 个屏障，验证长度上限而避免该候选枚举爆炸。

这批结果扩大了有限共同子集的外部实跑覆盖，不能证明所有程序等价、完整 x86 正确或真实 CPU 行为。原固定 SB/LB/MP/fence/FIFO/forwarding 案例继续提供容易讲解的语义基线。
