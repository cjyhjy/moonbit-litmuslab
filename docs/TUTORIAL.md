# LitmusLab 中文实验指南

LitmusLab 使用 MoonBit 核心枚举有限程序在 SC / TSO 操作语义下的可达状态。CLI 与浏览器共用 `dist/engine.mjs`；JavaScript 只负责文件、参数、界面和 Worker 通信。

## 1. 在本机运行

需要 Node.js 20+。交付包包含编译后的核心，首次体验不需要安装 MoonBit 工具链或 npm 依赖。

```sh
npm run serve
```

打开终端输出的本地地址，默认 `http://127.0.0.1:4173/`。如端口已占用：

```sh
npm run serve -- --port 4174
```

服务只监听本机 loopback；只提供 `web/`、`dist/`、`examples/` 与本指南，不需要账号或远端 API。页面不自动运行搜索。选择案例、修改预算后，点击“运行分析”，或使用 Command/Ctrl + Enter。

只有在修改 MoonBit 源码或希望从源码重建时，才需要先按项目构建说明下载项目隔离工具链，再执行构建：

```sh
python3 tools/bootstrap.py
npm run build
```

工具链下载需要网络；已有交付包的本地体验和 CLI 分析不需要这一步。

## 2. 第一次实验：Store Buffering

选择“01 · Store Buffering”，使用 SC + TSO、BFS、20,000 状态、256 结果。

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

搜索完整时，SC 有 3 个最终结果，TSO 有 4 个。TSO 额外允许 `P0.r0=0, P1.r1=0`：两个线程先把写入放入自己的缓冲，随后都从尚未更新的共享内存中读到 0。

点击这个结果的 TSO 按钮。重放起点显示初态；点击“下一步”，同时观察线程 PC、局部寄存器、FIFO 缓冲与共享内存。缓冲最左端是队头。`tN` 执行线程 N 的下一条指令，`fN` 将该线程队头的写入公开到共享内存。最终状态要求线程结束，且所有写缓冲排空。

“可复现见证与命令”中包含完整调度串，可以直接交给 CLI 的 replay。自定义程序应先保存为相应文件，再执行展示的命令。

## 3. 六个案例的观察重点

| 案例 | 要检查的现象 |
| --- | --- |
| Store Buffering | TSO 允许两个读取同时为 0；SC 不允许。 |
| Load Buffering | 两个模型都不允许两个读取同时为 1；不能凭空产生尚未执行的写入。 |
| Message Passing | Reader 先读 flag 再读 data；不能看到 flag=1 但 data=0。 |
| Fence | 为 Store Buffering 的两个线程各加一个 fence 后，同时读到 0 的结果消失。 |
| FIFO | 同一线程的第二个写入不能越过第一个写入排空。 |
| Forwarding | Local 对 x 先写 1、再写 2、再读，own 必为 2；它能从自身缓冲取得同地址最新值。 |

这些结论仅针对这里定义的程序与模型。TSO 不等于任意现实处理器、编译器或语言的完整语义。

## 4. 编辑 DSL

一行一条指令，`#` 后是注释。`memory` 声明初始共享内存，`thread` 与 `end` 包围一个线程。

```text
memory data=0 flag=0
thread Writer
store data 1
store flag 1
end
thread Reader
load seen flag
load value data
end
```

`store 地址 整数` 写入常量；`load 寄存器 地址` 读取到线程局部寄存器；`fence` 等待本线程的写缓冲排空。SC 中写入立即生效，fence 不增加额外约束。TSO 中读取优先查询本线程缓冲内同地址的最新值，否则读取共享内存。

源文本由核心限制为 32,768 个 Unicode 码点；CLI 在读取时另有 128 KiB 字节上限。名称最多 32 字符。其他程序规模和语法限制以核心/API 规范为准。解析错误包含从 1 开始的行号与码点列号，界面会定位到错误附近。

## 5. 理解预算与 incomplete

`max-states` 合法范围为 1–100,000，默认 20,000；`max-outcomes` 为 1–1,024，默认 256。比较两个模型时，每个模型分别使用该预算。

将最多状态数调为 `1` 后运行，可以观察明确的 `incomplete` 状态。此时未发现的结果显示“未确定”，不是“不允许”。已经发现的结果和见证仍然有效，但结果集合可能缺项。取消搜索也不会给出完整性结论。

只有搜索返回 `complete`，才能在这个有限程序与模型的范围内将缺失结果解释为不允许。完整搜索不表示现实程序安全，也不证明模型之外的性质。

BFS 和 DFS 改变搜索顺序及选取的见证；预算充足、搜索完整时，它们应产生相同的最终结果集合。遇到预算截断时，已发现的部分集合可能不同。

## 6. CLI 与机器 JSON

```sh
# 两个模型分别分析并比较结果 ID。
node bin/litmuslab.mjs analyze examples/store-buffering.litmus --model both

# 单模型与搜索预算。
node bin/litmuslab.mjs analyze examples/store-buffering.litmus --model TSO --strategy dfs --max-states 20000 --max-outcomes 256

# 从 stdin 读取。
cat examples/store-buffering.litmus | node bin/litmuslab.mjs analyze - --model SC

# 独立重放 TSO 的同时读到 0 见证。
node bin/litmuslab.mjs replay examples/store-buffering.litmus --model TSO --witness 't0 t0 t1 t1 f0 f1'

# 人工触发不完整搜索；该命令预期退出码 3。
node bin/litmuslab.mjs analyze examples/store-buffering.litmus --model TSO --max-states 1
```

除 `--help` 外，stdout 始终输出一个 JSON 对象。退出码 `0` 表示 complete / replay ok，`2` 表示参数、输入、解析或重放错误，`3` 表示 incomplete。空见证可用 `--witness ''` 明确传入，是否为有效终止见证由核心判断。

单模型 analyze 与 replay 直接返回核心 JSON。`--model both` 返回 `results.SC`、`results.TSO` 和 `comparison`。`comparison.common`、`scOnly`、`tsoOnly` 为已发现结果的 ID 集合；只有 `comparison.definitive=true`（两个搜索均完整）时，单边集合才可作为模型允许结果的确定差异。

## 7. 页面中的证据边界

界面不实现自己的模型解释器。分析和重放均调用编译后的 MoonBit 核心；每次选择结果都会重新调用 replay 校验见证。示例是教学小程序，并非真实硬件测量。外部 oracle、差分测试和局限说明参见项目其他文档与报告。
