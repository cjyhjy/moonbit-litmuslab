# 调研快照来源与许可

以下文件是第三方资料的本地证据快照，不是 LitmusLab 的原创实现；项目主许可证不会改变这些资料自己的许可。检索与下载日期为 2026-10-22。

| 本地文件 | 官方来源与固定版本 | 许可 / 用途 |
|---|---|---|
| `herd-sc.cat`, `herd-x86tso.cat`, `herdtools7-7.58.opam` | [herd/herdtools7 7.58](https://github.com/herd/herdtools7/tree/1ca343e16a2038e406d1ac674e7e3a1b722b36c7)；cat 源在 `herd/libdir/`；opam 元数据来自本地安装的官方 opam 包 | CeCILL-B；原文见 `LICENSE.herdtools7.txt`。作为外部 oracle 的模型证据，未改写模型规则。 |
| `moonctl-readme.md` | [length-super/moonctl README.mbt.md](https://github.com/length-super/moonctl/blob/4174d616c4fe84236aa57782dd247f7320e20738/README.mbt.md)，包 0.2.0 | Apache-2.0；见 `LICENSE.moonctl.txt`。 |
| `moonpetri-readme.md` | [okMambaOut/moonpetri README.md](https://github.com/okMambaOut/moonpetri/blob/e5eb4ed854be19e68dcb4ddb092f8d0bf6be61f5/README.md)，该版本 README 标为 0.1.3 | MIT；见 `LICENSE.moonpetri.txt`，包含上游版权说明。 |
| `veri-readme.md` | [mizchi/veri README.md](https://github.com/mizchi/veri/blob/78d658b7434649b43e755e765462494690a072af/README.md)，Mooncakes 0.2.0 | Apache-2.0；见 `LICENSE.veri.txt`。 |
| `*-head.json`, `*-tag.json`, `*-repo.json`, `*-search.json`, `*-release.json` | [GitHub REST API](https://docs.github.com/en/rest) 公开仓库/commit/搜索元数据；原始 URL 见 `retrieval-urls.json` 与 `provenance.json` | 版本、来源和检索范围证据；不能当成第三方审核认可。 |
| `*-registry.html` | [Mooncakes](https://mooncakes.io/) 对应包文档页面；原始 URL 见 `provenance.json` | 包名、版本和来源核对快照。网页内上游 README/API 内容仍归其原作者，按对应许可处理；Mooncakes 页面样式/脚本未用于本项目功能。 |

`download-sha256.txt` 记录第三方下载归档的精确内容哈希。完整工具链和第三方源码保存在 `.tools/oracle/`，交付 ZIP 排除整个 `.tools/`。此处不分发 herd7 二进制，也没有把 MoonCTL、MoonPetri、veri 实现混入 LitmusLab 核心。

herd7 初次常规构建的版本字符串误用了祖先工作区 revision；最终最小构建只生成 `Version.ml` 元数据，写入核对过的 release commit 和 `source archive` 标记。算法与 `.cat` 文件保持上游内容。原始归档 SHA-512 与官方 opam 条目一致，详见 `../COMPARISON.md`。
