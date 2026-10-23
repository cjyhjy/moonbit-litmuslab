# LitmusLab 0.2.0 独立语义与证据链审计

本轮先独立实现 Python effect 解释，再对优化后的 MoonBit 核心进行源码审计和交叉验证。旧版审计与测试报告保留在 `reports/history/0.1.0/`，不作为本版当前验证结果。

## 核心语义与优化

- `core/semantics.mbt` 按动作复制会被修改的数组，其余数组共享。flush 复制内存、缓冲外层和当前缓冲尾；store 复制 PC 及目标内存或缓冲；load 复制 PC、寄存器外层和当前线程寄存器；fence 只复制 PC。所有后续写入均发生于新数组，未发现保留状态或兄弟状态被修改的路径。
- 最新同址写转发从本线程缓冲末尾向前搜索，返回的 FIFO 索引以动作执行前的队首为 0。SC 状态始终没有写缓冲。屏障、结束后刷新和最终清空要求保持原语义。
- 状态键改为 StringBuilder，字段顺序与分隔符保持不变；同一 Program 的固定维度使编码仍可唯一解码。独立参考解释器使用元组状态去重，不复用该编码。
- replay 在 transition 前计算 `effect`，因此 load 来源与索引、store 入队索引、flush 队首与 fence 空缓冲条件均对应动作前状态。Python 独立推导这些信息，逐步对照内存、PC、寄存器、缓冲、终止标志及 effect。

当前 `crosscheck.json` 记录 584 个测试用例（578 个不同源码）、2,336 组 SC/TSO × BFS/DFS 比较，以及 3,418 条逐步独立重放的见证，全部通过。89 项边界、74 项宿主类型检查和两个大图资源检查也通过；包含 83,521 状态完整搜索、100,000 状态明确截断和最大 128 步见证。运行前后验证输入快照，版本和精确源码/引擎哈希均在结构化报告中。

## 证据链修复

原汇总器仅校验 local-verification 的核心哈希；它可能给旧浏览器通过报告附上新网页哈希，也没有核对 crosscheck/oracle 自身执行输入。旧 clean-copy 状态仅判断 passed，且重建只比较 raw engine。这些都是报告工具的真实缺口，不表示旧报告在生成当时已失配。

现已采用测试前捕获、测试后核验的 profile 输入快照。汇总器逐一核对 local、crosscheck、固定与生成 oracle、interfaces、browser 和 performance 的当前文件集合与内容哈希；新增、删除、修改文件均会使相关证据失效。

解包验收使用当前 package.json 版本，检查 manifest 的精确文件覆盖，记录解包后的运行/构建输入树，比较重建前后的公开 wrapper 与 raw engine，并重跑公开 API/CLI。最终外部 `release/acceptance.json` 绑定精确 ZIP SHA-256。包内汇总只声明当前输入树的 clean-copy 结果，明确 `embeddedReportClaimsExactArchive: false`，避免重新打包后把旧 ZIP 的通过状态当成新 ZIP 证明。

15 项隔离的证据链回归测试全部通过，覆盖旧报告复用、输入文件增删改、参考实现/CLI/网页/oracle 变更、ZIP 更换、包装器重建失配与 manifest 缺失覆盖。详见 `evidence-audit.json`。

## 证据范围

这些结果是有限合成程序的内部独立实现复核；外部 herd7 对照与本机固定工作负载性能测量分别记录于自己的报告。状态数量预算不是墙钟时间或进程内存上限。没有声称完整 x86/ARM/C/C++ 模型、真实硬件验证或一般性能保证。
