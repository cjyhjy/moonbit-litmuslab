# LitmusLab 0.1.0 交付与验证记录

> 下表及 `reports/verification.json` 保留 2026-10-22 的本地验收快照；独立仓库的后续 Linux CI 以 [GitHub Actions](https://github.com/cjyhjy/moonbit-litmuslab/actions/workflows/ci.yml) 每次运行与下载证据为准，详情见 [公开仓库说明](docs/PUBLICATION.md)。

交付日期：2026-10-22（用户时区 America/New_York）。这是有限 SC/TSO 并发内存模型实验室的完整本地版本。所有解析、状态转移、搜索、结果与见证语义由 MoonBit 实现，CLI 和浏览器使用同一编译核心。

## 直接运行

在仓库根目录执行：

```sh
node bin/litmuslab.mjs analyze examples/store-buffering.litmus --model both
node tools/serve.mjs
```

浏览器打开终端打印的本地 URL（默认 `http://127.0.0.1:4173/`）。ZIP 内含 `dist/engine.mjs` 与 `dist/engine.raw.mjs`，只需 Node.js 20+，无 npm 安装、账户或 API Key。复制到其他目录后，改为在解包目录执行后两条命令。

Store Buffering 实际结果：SC **3** 种，TSO **4** 种；TSO 多出双读零。点击结果按钮，可查看真实引擎生成的逐步见证。预算不足返回 `incomplete`，CLI 退出码 3，不会宣称程序安全或结果完整。

## 验证结果

| 验证 | 历史本地验收结果 | 可重跑命令 / 证据 |
|---|---|---|
| MoonBit 核心 | JS、Native、Wasm-GC 各 12/12 | `./tools/moon test --target js`（另外两个 target 同名） |
| Python 独立参考单测 | 21/21 | `python3 -m unittest discover -s tests -p 'test_reference.py' -v` |
| 独立交叉检查 | 584 用例（578 不同源码）；2336 组模型/策略；3418 见证逐步一致 | `python3 tools/crosscheck.py` |
| 边界与资源 | 89 边界、74 宿主类型、2 大状态用例；最大 128 步见证 | `reports/crosscheck.json` |
| 上限压力 | 100000 状态后明确 incomplete；保留见证可重放 | `node tools/stress.mjs` |
| 外部 herd7 | 6 案例 × 2 模型，12/12 完整结果集合匹配 | `python3 tools/oracle-run.py`；`node tools/oracle-compare.mjs` |
| 近邻 MoonCTL | 上游 29/29，错误、修复、预算示例实际运行 | `python3 tools/oracle-moonctl.py` |
| CLI / 本地 HTTP | 70/70 | `node tools/check-interfaces.mjs` |
| 真实浏览器 | 18/18；320/390/768/1248 宽度 | `reports/browser.json`、`reports/screenshots/` |
| 全新 ZIP 解包 | 11/11；重建 JavaScript 逐字节相同 | `python3 tools/acceptance.py`；`release/acceptance.json` |

统一重跑：

```sh
python3 tools/bootstrap.py          # 如需源码构建，项目内安装锁定 MoonBit
python3 tools/verify.py             # 本地核心、独立对照、CLI、已记录外部集合
# 需要重跑外部工具时，先在项目内安装；这是额外依赖，不是产品运行前提
sh tools/oracle-bootstrap.sh
python3 tools/verify.py --live-oracle
```

`verify.py` 的默认外部集合检查明确使用已保存的 herd7 输出；`--live-oracle` 才实际再次运行 herd7 和 MoonCTL。上述历史本地最终统一验证使用了 `--live-oracle`；GitHub Actions 默认不安装或再次运行外部工具。在 Codex 的受限执行环境中，临时 loopback 测试服务需要执行权限，最终验证已获工具批准完成；普通本机 Node 不涉及公开监听。

上述历史验收的实际平台为 Apple Silicon macOS、Node 26.7.0、Python 3.9.6，MoonBit 编译器 `0.10.15+943464bfa`。工具版本、命令、退出码和源码/产物哈希在 `reports/verification.json`。**当前没有未解决的失败项。** 过程中发现并修复了 JS 非整数预算绕过、FIFO 文件输入阻塞、窄屏溢出和 herd7 构建元数据误取祖先 Git revision；原始失败日志与修复记录保留，不把早期失败结果当最终结果。

## 关键文件与归档

- `core/`：实质 MoonBit 核心；`core/pkg.generated.mbti`：公开函数签名。
- `docs/SEMANTICS.md`、`docs/API.md`、`docs/TUTORIAL.md`：模型范围、协议与中文教学。
- `research/COMPARISON.md`：Mooncakes/GitHub 近邻、三项差异案例、固定来源和真实外部验证。
- `reports/verification.json`：历史本地汇总；`reports/crosscheck.json`、`reports/oracle-comparison.json`：详细证据。
- `docs/DEVELOPMENT.md`、`LICENSE`、`THIRD_PARTY_NOTICES.md`：开发/AI 与许可说明。
- `.github/workflows/ci.yml`：独立仓库 Linux CI，执行三个后端、编译产物一致性、独立参考、见证、CLI/HTTP 与已记录 herd7 集合重比对。CI 证据单独上传为 artifact。

历史 ZIP 位于原本地交付目录，未作为本次 GitHub Release 发布。以下命令可在当前仓库生成新的 `release/LitmusLab-0.1.0.zip`；它不会被声称为原来验收的同一个归档。

本地打包后的 SHA-256 位于同目录 `SHA256SUMS`；精确归档的解包验收与哈希位于同目录 `acceptance.json`。包内 `MANIFEST.sha256` 逐文件列出校验和。工具链、第三方安装目录、构建缓存与 Git 元数据不在包内。

```sh
python3 tools/package.py
python3 tools/acceptance.py
```

解包验收在全新目录运行 CLI、独立解释器、已记录 oracle 对照，再使用固定的外部编译器重建包内源码，要求生成 JavaScript 与包内产物逐字节相同。编译器是明确的构建依赖，不是打包缓存。最终验收证明放在 ZIP 外，以绑定精确的 ZIP SHA-256，避免归档自引用。

## 边界与未执行事项

这些是有限程序模拟与软件对照，不是 CPU 硬件实测或所有程序的形式证明。不覆盖完整 x86/ARM/RISC-V/C++、循环、分支、指针或原子 RMW。原本地快照未覆盖 Linux/Windows；Linux 及 GitHub Actions 的后续状态见公开工作流，Windows 尚未验证。

独立 GitHub 源码仓库公开并保留实际本地开发历史；不能据此声称开发当时已公开。Mooncakes/npm 发布、网站托管和正式参赛提交尚未执行。正式规则存在日期冲突，且申报书要求本人撰写；本包仅提供实现与事实证据，不代填身份、诚信或原创性声明。项目执行聊天未操作共享 Git，也未改动全局工具链或其他候选项目。
