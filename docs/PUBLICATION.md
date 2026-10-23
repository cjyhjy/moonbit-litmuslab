# 版本与发布范围

0.1.0 基线已由总控发布到 [cjyhjy/moonbit-litmuslab](https://github.com/cjyhjy/moonbit-litmuslab)。同步标识为 `publication-05dac2b`，发布 commit 为 `05dac2b5ce0c1e230e8859aeb9765f0f3b7a943e`；对应 [Linux CI 运行](https://github.com/cjyhjy/moonbit-litmuslab/actions/runs/39812566452) 已由总控报告通过。这是该发布快照的记录，不代表后续源码已验证。

0.2.0 已完成 19 项统一检查、96 项接口检查、28 项浏览器检查和 14 项干净解包验收；发布提交为 `61f55b866a19854a0c074e13945dfc7bfdc6b4d0`，[对应 Linux CI](https://github.com/cjyhjy/moonbit-litmuslab/actions/runs/39980173271) 已通过。归档及验收留在本地 `release/history/0.2.0/`。

本目录当前为 **0.3.0 查询与屏障对照版**。本地验收报告记录打包前的状态；后续公开 commit 和 CI 是独立事实，以 GitHub 对应运行和包外发布记录为准。尚未发布 Mooncakes 包、托管网站或提交赛事材料。当前测试证据见 `reports/verification.json`，精确 ZIP 的最终解包证明在包外 `release/acceptance.json`。

## 合并的 CI 修复

工作流采用 Ubuntu 24.04、Node 22、Python 3.12，安装校验过的固定 MoonBit 工具链。`tools/verify.py --check-dist --output-dir .ci-evidence` 检查三后端并将本轮日志与结果集中到独立目录，工作流上传名为 `litmuslab-ci-<SHA>` 的 artifact。脚本只在项目本身是 Git 根目录时记录 commit，避免误记上级协调仓库。

固定工具链不能构建 Native `foreign_library` 动态库，因此 Native 构建步骤使用 `moon test --build-only --target native --release`，随后执行完整 Native 测试。JS 与 Wasm-GC 仍直接 release build；没有删除或缩减语义测试。

`--check-dist` 比较运行开始时的两个 `dist/` 模块与源码重建结果，缺失或不一致均失败。该检查无需 Git，可用于干净解包；在 CI 的正常 checkout 中，它验证提交的产物。默认外部对照使用保存的 herd7 结果，只有 `--live-oracle` 才重新执行外部工具。

总控独立仓库保留原开发历史及其提取映射。本轮在独立仓库追加真实阶段提交，未改写既有历史，未操作共享协调仓库 Git 状态。首次公开时间与本地提交时间是不同事实。

最初公开发布的历史说明保留于 [HISTORY-0.1.0.md](HISTORY-0.1.0.md)，逐条提取映射为 [history-extraction.json](history-extraction.json)。
