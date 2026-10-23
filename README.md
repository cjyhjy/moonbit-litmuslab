# LitmusLab · 并发内存模型实验室

用一段小程序，比较 **SC** 和 **FIFO 写缓冲 TSO** 的允许结果；选择一个结果，逐步查看它如何发生。

核心解析、状态转移、去重搜索、预算判定、见证生成与重放均由 **MoonBit** 实现。CLI 和浏览器共用同一份编译引擎。浏览器使用 Worker，计算期间可以取消。无需账户、模型 API 或网络服务。

## 0.3.0：查询与屏障实验

- 指定 `reg.P0.r0=0 && reg.P1.r1=0`，得到可达、不可达或尚未确定的答案。
- 按原始指令边界插入 fence，对比结果集合并解释原见证的第一处阻断。
- 枚举完整性、目标结论和单条路径解释分别呈现，配置可以保存后重跑。

操作与边界见 [实验指南](docs/EXPERIMENTS.md)。

## 已验收的 0.2.0 改进

- 搜索只复制被修改的状态数组，减少大图内存分配；结果与旧版保持一致。
- 重放直接解释读取来自共享内存还是 FIFO 中的某笔待写。
- 可下载/导入实验配置、下载带源程序的结果 JSON；导入后重新运行。
- 验收报告绑定实际测试的输入文件，修改后会拒绝沿用旧通过记录。

具体测量、额外外部对照与限制见 [优化记录](docs/OPTIMIZATION.md)。

## 30 秒运行

环境：Node.js 20+。交付包含 `dist/engine.mjs`，运行演示无需安装 MoonBit。

```sh
node bin/litmuslab.mjs analyze examples/store-buffering.litmus --model both
node tools/serve.mjs
```

打开终端显示的本地 URL。选择 Store Buffering，点“运行分析”，再选择 TSO 中两个寄存器都为 0 的结果，逐步观察两个写缓冲如何晚于读取刷新。

> 交付验收的准确命令、通过/失败/未测项目见 [DELIVERY.md](DELIVERY.md)。

## 一段可解释的程序

```text
memory x=0 y=0
thread P0
store x 1
load r0 y
end
thread P1
store y 1
load r1 x
end
```

SC：每条指令按某种线程交错原子执行，写入立即对所有线程可见。

TSO：写入进入本线程 FIFO 缓冲，另有刷新步骤将队首写入共享内存。读取先找本线程缓冲里最近的同地址写入，没有才读共享内存。`fence` 等待本线程写缓冲清空。

上述程序的完整结果是 SC 3 种、TSO 4 种。TSO 额外允许 `P0.r0=0, P1.r1=0`。这些是此有限模型的可达性结论，不是本机 CPU 实测。

## 你能用它做什么

- 对比 Store Buffering、Load Buffering、Message Passing、屏障、FIFO 保序和同地址转发。
- 编辑程序，选择 BFS / DFS 与状态、结果预算。
- 保存机器可读结果；每个已找到结果包含可重放的 `t0 f0 ...` 见证。
- 查看每步 PC、寄存器、共享内存和写缓冲；验证为什么某个屏障此刻不能执行。
- 通过独立 Python 解释器和已运行的外部工具对照复核实现。证据和实际覆盖见 [research/COMPARISON.md](research/COMPARISON.md) 与 [reports/verification.json](reports/verification.json)。

## 完整性是一等结果

- `complete`：搜索穷尽了当前有限程序的所有可达状态，结果集合完整。
- `incomplete`：遇到状态或结果上限。已找到的见证有效，**未找到不等于不可能**。
- `error`：输入或参数不合法，不执行搜索。

`analyze` CLI 分别返回退出码 0、3、2。两模型对照只在两者都完整时把集合差异解释为模型差异。查询另外返回目标判定：已有见证时可确认 `reachable`，未找到且预算耗尽时为 `unknown`；具体退出码见[实验指南](docs/EXPERIMENTS.md)。不会输出“程序安全”。

## 范围

支持有限、直线式程序：1–4 线程、1–8 个共享地址、每线程最多 16 条指令和 8 个寄存器，整数 −32768…32767。没有循环、分支、指针别名、混合宽度、原子 RMW、依赖图或 C/C++ 数据竞争语义。`store` 只接受立即整数，不支持把寄存器值写回。

这是一个定义明确的 SC/TSO 教学与实验模型；不能替代完整 x86、ARM、RISC-V 或 C++ 内存模型工具。herd7 是更成熟的已知替代品，MoonCTL 是通用 CTL 模型检查近邻。我们的重点是用 MoonBit 提供可编辑指令语义和可见的写缓冲见证。

## 从源码构建和验证

```sh
python3 tools/bootstrap.py       # 项目内安装锁定工具链；已有匹配版本则复用
bash tools/build.sh              # MoonBit → dist/engine.mjs
./tools/moon test --target js
python3 tools/crosscheck.py
```

固定工具链见 `toolchain.lock.json`。安装器只写 `.tools/moon/`，不改 shell 配置或全局工具链。预编译引擎为普通 ES module；Linux x86_64 引导配置已提供，当前交付实际执行平台以验证记录为准。

进一步阅读：[语义与 DSL](docs/SEMANTICS.md) · [API](docs/API.md) · [实现结构](docs/ARCHITECTURE.md) · [教学案例](docs/TUTORIAL.md) · [开发与 AI 说明](docs/DEVELOPMENT.md) · [第三方来源](THIRD_PARTY_NOTICES.md)。

0.1.0 基线已由总控发布到 [独立仓库](https://github.com/cjyhjy/moonbit-litmuslab)；0.2.0 优化也已完成验收并发布。本目录的 0.3.0 增加目标查询与屏障对照，具体发布提交和 CI 以发布说明及独立运行记录为准。版本与发布范围见 [发布说明](docs/PUBLICATION.md)，正式参赛尚未提交。
