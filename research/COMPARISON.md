# LitmusLab 外部调研与真实对照

核查日期：2026-10-22。资料来自项目官方仓库、Mooncakes 包页面、herdtools7 官方文档和 x86-TSO 论文。保存的检索结果只反映本次范围，不能据此宣称“生态唯一”或“首个”。本轮没有公开发布、包发布或赛事提交。

## 已知替代品与固定版本

| 项目 | 本次固定来源 | 已确认功能与关系 | 本次实际运行 |
|---|---|---|---|
| MoonCTL | [length-super/moonctl 0.2.0](https://mooncakes.io/docs/length-super/moonctl@0.2.0)，[commit 4174d616c4fe84236aa57782dd247f7320e20738](https://github.com/length-super/moonctl/tree/4174d616c4fe84236aa57782dd247f7320e20738) | 显式有限图的 CTL 检查、最短有限反例、循环见证、带预算状态探索。与本项目的状态去重、预算、路径解释明显重叠。调用者须自行定义完整状态及转移；其现有 API 不提供 SC/TSO 指令或 FIFO 写缓冲语义。 | 原样源码 native 上游测试 29/29；错误/修复工作流各一次；wasm-gc 预算示例一次。 |
| herdtools7 / herd7 | [官方 7.58](https://github.com/herd/herdtools7/releases/tag/7.58)，[tag commit 1ca343e16a2038e406d1ac674e7e3a1b722b36c7](https://github.com/herd/herdtools7/tree/1ca343e16a2038e406d1ac674e7e3a1b722b36c7) | 成熟内存模型模拟器，接受架构 litmus 程序和 `.cat` 公理模型，枚举允许结果，支持大量架构与关系图。对于本项目的真实专业用途，它是更完整的既有替代品。 | 本地从官方归档编译；SC `sc.cat` 与 TSO `x86tso.cat` 对 6 个共同子集案例运行 12 次。 |
| MoonPetri | [Mooncakes 0.1.3](https://mooncakes.io/docs/okMambaOut/moonpetri@0.1.3)，[commit e5eb4ed854be19e68dcb4ddb092f8d0bf6be61f5](https://github.com/okMambaOut/moonpetri/tree/e5eb4ed854be19e68dcb4ddb092f8d0bf6be61f5) | 加权 Petri 网、firing、有限 BFS、最短轨迹、死锁和受限 PNML。可自行编码并发系统；其输入抽象不是读写指令与内存模型。 | 仅读官方源码/包资料，未实际运行。 |
| veri | [Mooncakes 0.2.0](https://mooncakes.io/docs/mizchi/veri@0.2.0)，[commit 78d658b7434649b43e755e765462494690a072af](https://github.com/mizchi/veri/tree/78d658b7434649b43e755e765462494690a072af) | 逻辑模型、契约、运行时差分检查，另有 Z3 / Apalache 时序验证工作流；能力范围比本项目宽，但用途和输入接口不同。 | 仅读官方源码/包资料，未实际运行。 |

同名辨析：[moonbitstack/moonctl](https://github.com/moonbitstack/moonctl) 是 API 规格代码生成器，与这里的 CTL 项目无关。本次 GitHub API 查询 `MoonCTL` 找到上述两个同名项目；`language:MoonBit model-checking` 找到 length-super/moonctl；`language:MoonBit memory model` 与 `language:MoonBit litmus` 本次返回零项。这些搜索不覆盖私有仓库、未索引内容或所有近义词。原始响应保存在 `research/sources/`。

## 三个可复现的差异案例

### 1. 从读写程序直接得到 SC/TSO 差异：Store Buffering

输入为 `tests/oracle/SB.litmuslab`：P0 先写 x=1 再读 y；P1 先写 y=1 再读 x。herd7 实跑得到 SC 的读寄存器对 `{(0,1),(1,0),(1,1)}`，TSO 额外允许 `(0,0)`；所有终态 x=y=1。

MoonCTL 能对已构造并标注的 SC 图或 TSO 图检查 `EF both_zero`，但该图的写入、读取、缓冲入队及刷出规则要由调用者实现。LitmusLab 的贡献在这层专门语义及自动对比；如果只有图 BFS 和可点击反例，它与 MoonCTL 已有功能并无足够区别。herd7 已经能完成结果集合分析，本项目不主张这一理论能力是新发明。[官方 herd7 教程](https://diy.inria.fr/doc/herd.html)

### 2. 同地址转发和 FIFO 都必须正确

`tests/oracle/forwarding.litmuslab` 中 P0 连续写 x=1、x=2，再读自身 x 和 y；P1 写 y=1 后读 x。herd7 得到 SC 4 种、TSO 6 种完整结果；P0 对 x 的读始终为 2，即尚未刷出时也应优先读本线程最新同地址缓冲项。`tests/oracle/FIFO.litmuslab` 中连续写 x=1、x=2，另一线程连读 x 两次；两模型均有 6 种结果，禁止先读到 2 再读到 1，最终 x=2。

通用图工具可以检查这些性质，但不会自动阻止用户把写缓冲写成栈、从队尾错误刷出、或绕过最新同地址条目。LitmusLab 应把这些规则做成引擎状态转移，并在见证中显示入队、转发和刷出；herd7 使用公理关系计算同一子集的允许集合，提供独立算法的外部对照。两个工具展示的中间步骤不要求一一相同。[x86-TSO 原始论文](https://www.cl.cam.ac.uk/~pes20/weakmemory/x86tso-paper.tphols.pdf)

### 3. 屏障语义与不完整搜索是两种不同保证

`tests/oracle/fence.litmuslab` 在 SB 两个线程的写和读之间都插入 fence，herd7 的 SC/TSO 都只剩 3 种结果，禁止 `(0,0)`。这检查的是 fence 等本线程写缓冲清空的指令规则。与此同时，实际执行 MoonCTL 的 `examples/explore`，小预算输出 `incomplete StateBudgetReached states=2 edges=1`；完整探索才输出带反例的检查结果。

因此“预算不够时不宣称证明成功”已经是 MoonCTL 的成熟做法，LitmusLab 应继承这种边界意识。它新增的是专门程序搜索、完整/不完整结果集合以及可重放内存状态，不能把低预算只看见 3 个结果解释为 TSO 与 SC 等价。

## herd7 实跑结果

下面是外部 oracle 自己计算的完整最终结果数；具体值在 `reports/oracle-herd7.json`，原始 stdout/stderr 在 `reports/oracle-raw/herd7-*`。原始文本不是从 LitmusLab 或自写参考解释器生成。

| 案例 | SC | TSO | 主要针对的规则 |
|---|---:|---:|---|
| SB | 3 | 4 | 不同地址的写后读可越过待刷出写 |
| LB | 3 | 3 | 读先于后续写；禁止双方读到未来的 1 |
| MP | 3 | 3 | 写 FIFO 及读顺序；禁止先见旗标却不见数据 |
| fence | 3 | 3 | 双方 fence 消除 SB 的双零结果 |
| FIFO | 6 | 6 | 连续同地址写顺序及单位置读的一致性 |
| forwarding | 4 | 6 | 读取本线程最新同地址待写值 |

共享子集翻译明确写在 `tools/oracle-run.py`：立即数 store → `MOV [x],$n`，load → `MOV EAX,[x]` 等，fence → `MFENCE`；寄存器从 0 初始化。`locations [...]` 显式观察所有共享内存和所有已命名寄存器，不只对比某个断言的 Yes/No 或状态数。herd7 的条件只用于其观察统计，最终状态列表由脚本完整解析。对没有寄存器的线程，标准化输出保留空寄存器对象。

外部集合与 LitmusLab 的一致性验收由 `tools/oracle-compare.mjs` 执行，结果保存在 `reports/oracle-comparison.json`。本轮 12/12 组全部匹配，包括全部共享内存和已命名寄存器，并要求两侧都完整。报告绑定本次引擎文件及外部报告的 SHA-256；代码变更后应重新执行，不能把旧报告当成新引擎已经验证的证据。

## 构建、复现和证据边界

```sh
# macOS arm64；依赖全部安装在本项目 .tools/oracle，不调用全局安装
sh tools/oracle-bootstrap.sh
python3 tools/oracle-run.py
node tools/oracle-compare.mjs

# 下载固定 commit 并核对 SHA-256；运行 MoonCTL 官方例子及测试
python3 tools/oracle-moonctl.py
```

本次实际环境为 Apple Silicon macOS、OCaml 4.14.2、opam 2.6.1、GMP 6.3.0、pkgconf 2.5.1；其余精确版本见 `reports/oracle-raw/opam-packages.txt`。官方 opam 中 7.58 归档 SHA-512 与实际下载完全相同：

`a8acfafe1b95867f50cfac41ec5f5d46f10a14babe3c6a34fcb412b89cbeb163de539f19a7f35690cf4ba1420480b0aaa17a7f4429f8482a810b1405bc224f94`

所有下载的 SHA-256 在 `research/sources/download-sha256.txt`。初次常规构建记录保留于 `reports/oracle-raw/bootstrap*.log`。曾遇到沙箱网络 DNS 失败、opam 要求全局 brew 依赖（退出后改为本地编译依赖）、无权限读取 `sysctl` 导致上游 Makefile 并行数为空、屏蔽 Git 后上游整套安装失败。上述失败均保留原始日志，没有把失败说成完成。

最终流程只通过 opam 安装已固定版本的 OCaml 依赖，然后对已核验的官方 7.58 归档执行 `dune build --root . -j 4 --profile release herd/herd.exe`，复制 herd7 与未修改的上游模型库到项目隔离前缀。上游 `defs.sh` 会在 tar 没有 `.git` 时误取祖先工作区 revision，因此最终流程直接生成同等用途的 `Version.ml` 构建元数据，填入官方 tag 的 commit，并明确标为 `source archive`；没有修改模拟器语义或模型。最终实跑版本为 `7.58, Rev: 1ca343e16a2038e406d1ac674e7e3a1b722b36c7 (source archive)`。成功日志是 `reports/oracle-raw/herd7-bootstrap-final.log`，此流程已在沙箱内成功执行，绕过了无关工具安装和 CPU 数探测问题。

这是 **herd7 模型模拟实跑**，不是在这台 ARM Mac 上运行 x86 并发指令的硬件观测。它支持有限案例的共同子集差分，不能证明所有程序等价，更不能证明完整 x86、ARM 或 C/C++ 原子内存模型正确。MoonCTL 实跑只证实近邻工具可用和功能重叠，不能充当 memory-model oracle。独立参考解释器也属于项目内交叉检查，不能替代外部 herd7 证据。

herdtools7 使用 CeCILL-B，MoonCTL/veri 使用 Apache-2.0，MoonPetri 使用 MIT；原始许可文本存于 `research/sources/LICENSE.*.txt`，源文件映射见同目录 `NOTICE.md`。项目没有把这些实现的算法源码作为自身 MoonBit 引擎；`.tools/oracle` 中的第三方源码与工具链用于可复现比较，不应整包塞进参赛源码包。研究目录中保存的短模型文件是带来源的验证输入，请保留来源及上游许可。
