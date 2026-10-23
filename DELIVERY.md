# LitmusLab 0.3.0 本地交付

交付日期：2026-10-23。有限 SC/TSO 并发内存模型实验室；解析、状态转移、搜索与见证由 MoonBit 实现，CLI 和浏览器共用同一编译引擎。

## 本轮改进

- 完整收尾 0.2.0：保留版本归档与验收，独立 GitHub 提交和对应 Linux CI 均已完成。
- 指定结果查询：输入寄存器或共享内存的等式合取，返回 `reachable`、`unreachable` 或 `unknown`，命中时附可重放见证。完整搜索后才能判断不存在。
- 屏障前后对照：在原程序的指定指令边界插入屏障，比较结果集合，并定位原见证首先被阻断的位置及待写缓冲。单条路径受阻与结果被排除分别报告。
- 浏览器新增查询和屏障对照模式、前后见证切换、v2 配置往返与完整结果导出；保留 v1 配置兼容。CLI、浏览器共用 MoonBit 核心。
- 继承 0.2.0 的状态共享、读值来源解释、外部 herd7 对照和证据绑定；增加查询与屏障独立参考检查，解包前后均测试新公共接口。

详见 [查询与屏障说明](docs/EXPERIMENTS.md) 和 [0.2.0 优化记录](docs/OPTIMIZATION.md)。旧版报告和归档保留在本地历史目录，没有覆盖。

## 直接运行

```sh
cd '/Users/cjy/Documents/ChatGPT/黑客松新项目/projects/litmuslab'
node bin/litmuslab.mjs analyze examples/store-buffering.litmus --model both
node bin/litmuslab.mjs query examples/store-buffering.litmus --model both --target 'reg.P0.r0=0 && reg.P1.r1=0'
node bin/litmuslab.mjs compare-fences examples/store-buffering.litmus --model TSO --target 'reg.P0.r0=0 && reg.P1.r1=0' --fences 'P0:1,P1:1'
node tools/serve.mjs
```

打开终端打印的本地 URL（默认 `http://127.0.0.1:4173/`）。ZIP 内含两个 `dist/` 模块，只需 Node.js 20+，无 npm 安装、账户或 API Key。解包后进入解包目录执行 `node` 命令即可。

Store Buffering 完整结果为 SC 3 种、TSO 4 种；TSO 多出双读零。只插入 `P0:1` 时，选中的原路径受阻，但该结果仍可达；两侧插入后，完整搜索确认双读零不可达。边界编号从 0 开始，全部相对于原程序。

搜索预算不足时保留 `search.status: incomplete`。查询已有见证仍返回 `reachable`；尚未发现目标则为 `unknown`，退出码 3。屏障对照只要任一侧不完整便退出 3，确定的 `removed`/`added` 为 `null`，避免把未发现误作排除。查询目前执行预算内枚举后筛选，未宣称提前终止加速。

## 当前验证

| 检查 | 结果 / 证据 |
|---|---|
| MoonBit 核心 | JS、Native、Wasm-GC 各 32/32；三后端 check/build/test |
| Python | 23 项独立参考 + 17 项证据链回归，共 40/40 |
| 独立交叉检查 | 584 用例、2,336 组模型/策略、3,418 条逐步见证；含每步 effect |
| 边界与资源 | 89 边界、74 宿主类型、2 大状态用例；100,000 状态上限与 128 步见证 |
| 真实外部 herd7 | 固定 12/12 + 新增 72/72；全部共同子集完整结果集合一致 |
| MoonCTL 近邻 | 上游 29/29 与三个示例；它不是内存模型 oracle |
| 查询与屏障独立检查 | 1,733/1,733；独立 Python 参考、映射重放、宿主边界及 CLI；`reports/experiments.json` |
| CLI / loopback HTTP | 104/104；`reports/interfaces.json` |
| 真实浏览器 | 44/44；`reports/browser-optimization.json`，含三模式、配置往返、竞态及 4 种宽度 |
| 固定负载性能 | 各 5 次；完整分析输出相同，见 `reports/performance.json` |
| 干净解包 | 16/16；ZIP 外 `release/acceptance.json`，含 wrapper/raw 与重建前后查询、屏障 API |

当前统一汇总为 `reports/verification.json`，20 项统一检查的命令、退出码及日志为 `reports/local-verification.json`。报告的输入快照需要与当前文件一致；修改后必须重跑对应生产脚本，不能简单替换哈希。浏览器、性能、外部工具是各自独立的实际验收记录。本轮浏览器核对了 5 个下载 payload，未确认文件落盘；完整范围见浏览器报告。

```sh
python3 tools/bootstrap.py
python3 tools/verify.py --check-dist
# 可选外部工具；不是运行产品的依赖
sh tools/oracle-bootstrap.sh
python3 tools/verify.py --check-dist --live-oracle
# CI 风格输出目录；默认只重比对保存的 herd7 结果
python3 tools/verify.py --check-dist --output-dir .ci-evidence
```

本次实际平台为 Apple Silicon macOS、Node 26.7.0、Python 3.9.6，固定 MoonBit 编译器 `0.10.15+943464bfa`。Native 使用 release 模式构建测试可执行文件，并完整执行 Native 测试；固定工具链的 foreign_library 不能作为 Native 动态库产品构建。JS/Wasm-GC 正常 release build。

## 归档与证据

- `release/LitmusLab-0.3.0.zip`：运行产物、源码、文档、测试与证据。
- `release/SHA256SUMS`：当前 ZIP 校验和；ZIP 内 `MANIFEST.sha256` 覆盖每个文件。
- `release/acceptance.json`：最终精确 ZIP 的独立验收，核对其 `archiveSha256` 与 ZIP。
- `reports/verification.json`：当前源码树的汇总；不声称包内汇总能自证所在 ZIP 哈希。
- `docs/SEMANTICS.md`、`docs/API.md`、`docs/EXPERIMENTS.md`、`docs/TUTORIAL.md`：模型与使用说明。
- `research/COMPARISON.md`、`docs/DEVELOPMENT.md`、`THIRD_PARTY_NOTICES.md`：外部工具、AI 辅助与许可范围。

工具链、第三方安装目录、构建缓存、Git、CI 临时输出和历史整包不在新 ZIP 内。`tests/performance-baseline/` 则有意携带旧版的两个编译模块，用于复现同负载性能比较。

制作归档先运行所有必要验收并汇总，再执行下列步骤；第一次干净源码验收后更新汇总、重打包并再次验收，以使包内汇总和包外精确 ZIP 证明都完整：

```sh
python3 tools/summarize.py
python3 tools/package.py
python3 tools/acceptance.py
python3 tools/summarize.py
python3 tools/package.py
python3 tools/acceptance.py
```

## 发布与适用范围

0.2.0 已发布到独立 GitHub 仓库，提交 `61f55b866a19854a0c074e13945dfc7bfdc6b4d0` 的 [Linux CI](https://github.com/cjyhjy/moonbit-litmuslab/actions/runs/39980173271) 已通过。此文档与包内报告记录 0.3.0 推送前的本地验收；后续 0.3.0 提交与远端运行以 [独立仓库](https://github.com/cjyhjy/moonbit-litmuslab)、[Actions](https://github.com/cjyhjy/moonbit-litmuslab/actions) 及包外 `release/publication.json` 为准。发布范围见 [PUBLICATION.md](docs/PUBLICATION.md)。共享协调仓库未执行 Git 写操作。

以上是有限程序的模拟与软件对照，不是 CPU 硬件实测或所有程序的证明。不覆盖完整 x86/ARM/RISC-V/C++、循环、分支、指针或原子 RMW。本地验收在 macOS 执行；Linux 以发布后的对应 CI 为准，Windows 未测试。Mooncakes 包发布、网站托管及正式参赛尚未执行。
