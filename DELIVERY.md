# LitmusLab 0.2.0 本地交付

交付日期：2026-10-23。有限 SC/TSO 并发内存模型实验室；解析、状态转移、搜索与见证由 MoonBit 实现，CLI 和浏览器共用同一编译引擎。

## 本轮改进

- 状态按动作复制、未改变数组只读共享，状态键减少临时分配。三个本机固定合成负载的五次中位数：耗时减少 24.9%–37.5%，进程峰值 RSS 减少 17.7%–21.1%；分析结果 JSON 与旧版完全相同。此数字不是所有程序的普遍性能保证。
- 重放显示读值来自共享内存还是 FIFO 中的哪一笔待写，独立解释器逐步核对 effect。
- 浏览器可导入/导出实验配置、下载结果，拒绝无效配置并防止导出过期结果。
- 增加 72 组真实 herd7 对照；报告绑定运行时输入，拒绝过期证据。解包重建同时比对公共 wrapper 与编译模块。
- 合并 Native 构建与独立 CI 日志修复。live 外部验证直接运行新对照，避免先后两次报告同名覆盖导致证据哈希失配。

详见 [优化记录](docs/OPTIMIZATION.md)。旧版报告和归档保留在本地历史目录，没有覆盖。

## 直接运行

```sh
cd '/Users/cjy/Documents/ChatGPT/黑客松新项目/projects/litmuslab'
node bin/litmuslab.mjs analyze examples/store-buffering.litmus --model both
node tools/serve.mjs
```

打开终端打印的本地 URL（默认 `http://127.0.0.1:4173/`）。ZIP 内含两个 `dist/` 模块，只需 Node.js 20+，无 npm 安装、账户或 API Key。解包后在解包目录执行后两条命令即可。

Store Buffering 完整结果为 SC 3 种、TSO 4 种；TSO 多出双读零。预算不足明确返回 `incomplete`，CLI 退出码 3；缺少结果不能解释为不可能。

## 当前验证

| 检查 | 结果 / 证据 |
|---|---|
| MoonBit 核心 | JS、Native、Wasm-GC 各 15/15；三后端 check/build/test |
| Python | 23 项独立参考 + 15 项证据链回归，共 38/38 |
| 独立交叉检查 | 584 用例、2,336 组模型/策略、3,418 条逐步见证；含每步 effect |
| 边界与资源 | 89 边界、74 宿主类型、2 大状态用例；100,000 状态上限与 128 步见证 |
| 真实外部 herd7 | 固定 12/12 + 新增 72/72；全部共同子集完整结果集合一致 |
| MoonCTL 近邻 | 上游 29/29 与三个示例；它不是内存模型 oracle |
| CLI / loopback HTTP | 96/96；`reports/interfaces.json` |
| 真实浏览器 | 28/28；`reports/browser-optimization.json`，含配置往返、竞态及 4 种宽度 |
| 固定负载性能 | 各 5 次；完整分析输出相同，见 `reports/performance.json` |
| 干净解包 | 14/14；ZIP 外 `release/acceptance.json`，含 wrapper/raw 与重建后公共 API |

当前统一汇总为 `reports/verification.json`，命令、退出码及日志为 `reports/local-verification.json`。报告的输入快照需要与当前文件一致；修改后必须重跑对应生产脚本，不能简单替换哈希。浏览器、性能、外部工具是各自独立的实际验收记录。

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

- `release/LitmusLab-0.2.0.zip`：运行产物、源码、文档、测试与证据。
- `release/SHA256SUMS`：当前 ZIP 校验和；ZIP 内 `MANIFEST.sha256` 覆盖每个文件。
- `release/acceptance.json`：最终精确 ZIP 的独立验收，核对其 `archiveSha256` 与 ZIP。
- `reports/verification.json`：当前源码树的汇总；不声称包内汇总能自证所在 ZIP 哈希。
- `docs/SEMANTICS.md`、`docs/API.md`、`docs/TUTORIAL.md`：模型与使用说明。
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

0.1.0 基线已由总控发布到独立 GitHub 仓库，旧 Linux CI 已通过。本轮 0.2.0 优化尚未推送或运行远端 CI；旧绿灯不代表新改动通过。发布 commit、运行链接及同步范围见 [PUBLICATION.md](docs/PUBLICATION.md)。项目执行聊天没有操作共享 Git 或独立发布仓库。

以上是有限程序的模拟与软件对照，不是 CPU 硬件实测或所有程序的证明。不覆盖完整 x86/ARM/RISC-V/C++、循环、分支、指针或原子 RMW。此版本尚未在 Linux/Windows 实际运行；包发布、网站托管及正式参赛尚未执行。
