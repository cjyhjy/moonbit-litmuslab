# 独立公开仓库与证据边界

公开源码仓库：[cjyhjy/moonbit-litmuslab](https://github.com/cjyhjy/moonbit-litmuslab)。包发布、网站部署、GitHub Release 与正式赛事提交尚未执行。

## 实际历史

从协调工作区的 `projects/litmuslab` 使用 `git subtree split` 提取 8 条实际开发提交，没有 squash、改写作者/提交时间、重排历史或补造提交。提取保留各阶段项目文件树；因为根路径与父提交关系变化，提取提交 SHA 与原提交 SHA 不同。完整映射见 [history-extraction.json](history-extraction.json)。原协调提交不属于此独立仓库，公开可查询的是映射中的 `extracted` 提交。发布配置和真实 CI 修复在保留历史之后追加。

本地提交时间不是首次公开时间，不能把此次公开推送说成此前一直公开开发。

## Linux 持续集成

[LitmusLab checks](https://github.com/cjyhjy/moonbit-litmuslab/actions/workflows/ci.yml) 在 `push`、`pull_request` 和手动触发时执行：

- 通过 SHA-256 校验的固定 MoonBit 工具链与标准库安装。
- JS、Native、Wasm-GC 三个后端的检查、构建与语义测试。
- 由源码重建 JavaScript，并要求与已提交的 `dist/` 逐字节一致。
- 独立 Python 参考单测、穷举/种子语料交叉对照和每条见证逐步重放。
- 状态预算上限压力、CLI 及 loopback HTTP 接口检查。
- 当前 MoonBit 引擎与已记录 herd7 完整结果集合的 12 组重比对。

每次运行上传 `litmuslab-ci-<SHA>` artifact，包含当前命令日志、平台/commit、检查状态和本轮生成的详细结果。没有把提交时已存在的历史日志冒充新 CI 输出。工作流链接中的最新结论为准；仓库内不写会立即过期的“最新成功 SHA”循环收据。

Native 构建使用 `moon test --build-only --target native --release` 生成包含实际核心的测试可执行文件，并另行运行完整 Native 测试。固定工具链的 `foreign_library` 不能输出可供 C 链接的原生库；这也与 [MoonBit 官方包配置说明](https://docs.moonbitlang.com/en/latest/toolchain/moon/package.html) 的限制一致。JS/Wasm-GC 则直接 `moon build`。此项目不声称提供 Native 动态库产品。

## 历史验收

`reports/verification.json`、`reports/local-verification.json` 及已有的 `reports/verification-logs/` 是最初 Apple Silicon macOS 交付快照。`reports/oracle-herd7.json`、`reports/oracle-moonctl.json` 和原始外部日志记录当时真实软件执行；浏览器截图/结果及 ZIP 验收也属于该历史阶段。后续 CI 仅在临时 runner 工作树生成新报告，上传独立 artifact，不覆盖已提交的历史快照。

CI 中的 herd7 比较不是新一次 herd7 执行，不代表 CPU 硬件观测，也不扩展本有限 SC/TSO 模型的适用范围。需要真实重跑时，使用 `tools/oracle-bootstrap.sh` 与 `python3 tools/verify.py --live-oracle`。本次公开发布不重新制作原组合 ZIP。
