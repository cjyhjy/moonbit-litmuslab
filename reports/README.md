# 验证报告的使用范围

当前版本以 `verification.json` 的版本号、输入快照和引用文件为准；所有专项报告都需要验证其 `evidence`，不能只看 `passed` 字段。

- `local-verification.json`：本次完整编排及各命令日志。
- `crosscheck.json`：独立 Python 解释器与公共引擎的结果/见证对照。
- `experiments.json`：指定结果查询、屏障变换与见证映射的独立参考、公共 API 和 CLI 检查。
- `oracle-herd7.json` 与 `oracle-comparison.json`：真实外部运行及当前引擎与其完整集合比较。
- `oracle-generated.json`：固定种子生成程序的外部工具对照。
- `browser-optimization.json`：当前浏览器功能与布局验收。`browser.json` 是 0.1.0 的历史浏览器记录，不用于新版本通过判断。
- `performance.json`：固定合成负载下的受控本机测量；并非通用性能保证。`performance-sharing*.json` 是优化开发中的中间测量。
- `oracle-generated-exploration.json`：未纳入最终通过数的探索（域外整数和超时等）。
- `history/`：本地保留的既有版本快照，不重复纳入新归档。

ZIP 的精确最终验收在包外 `release/acceptance.json`，核对其中 archiveSha256；包内汇总只证明对应输入源码树，不能自引用证明 ZIP 哈希。
