# 许可与参考来源

本项目新增实现采用 Apache-2.0，完整条款见 `LICENSE`。项目没有声称拥有参考论文、外部工具或工具链的权利。

- **MoonBit 编译器与 core**：官方工具链 `moonc 0.10.15+943464bfa`、moon `0.1.20261012`。编译引擎包含所用标准库代码；core 的 Apache-2.0 条款保存在 `licenses/MoonBit-core-LICENSE`。来源 <https://github.com/moonbitlang/core> 与 <https://cli.moonbitlang.com/>；锁定归档和校验和见 `toolchain.lock.json`。工具链仅在本地 `.tools/moon/`，不随 ZIP 分发。
- **MoonCTL / herdtools7 与其他近邻**：名称、固定版本、许可证、引用链接与实际运行边界见 `research/COMPARISON.md`。仅作为参考与外部软件对照，不构成本项目依赖。第三方工具的安装与源码目录不随 ZIP 分发。保留的少量原始研究材料遵循各自许可与 `research/sources/NOTICE.md`。
- **既有安装器**：`tools/bootstrap.py` 由用户已有 Apache-2.0 URI Template 项目的安装器适配，改为本项目隔离目标 `.tools/moon/`。锁定档案的 SHA-256 与当前版本检查均保留。它是安装工具，不属于新增 SC/TSO 语义成果。

核心模型是对公开并发内存模型概念的独立实现。没有嵌入 herd7 的算法、运行时或 MoonCTL 源码，也没有把他人的测试运行记为自有新增测试代码。
