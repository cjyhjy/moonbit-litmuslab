# 固定性能比较基线

这里保留的是 LitmusLab 0.1.0 本地验收版本的公开 JS 包装器与 MoonBit 编译产物，供 `tools/benchmark.py` 在独立 Node 进程中与当前版比较。它们不参与当前 CLI/浏览器运行。

基线原始核心 SHA-256：`be03fb3c8da97608894a701846f15b43b02f30bd74a20b27c70720a2f14c91af`。

基线包装器 SHA-256：`31c92a01e7a8290c580d795a82dd51e21e711047bdfbab9cb9eed5966dd8b869`。

原始本地 ZIP 和验收报告保留在本工作目录 `release/history/0.1.0/`、`reports/history/0.1.0/`，不再次装入新 ZIP。基线由本项目 Apache-2.0 源码和同许可 MoonBit core 编译，保留项目 `LICENSE` 及 `licenses/MoonBit-core-LICENSE` 即可查阅许可。
