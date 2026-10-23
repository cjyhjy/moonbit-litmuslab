# LitmusLab independent implementation cross-check

Status: **passed**. Generated at 2026-10-23T15:58:29.864584+00:00.

This report compares the compiled MoonBit implementation with a separately written
Python operational-semantics implementation. It is **not an external hardware or
herd7 oracle**. Programs are synthetic finite DSL inputs.

| Check | Result |
|---|---:|
| Complete program cases | 584 |
| Distinct source programs | 578 |
| Exhaustive two-thread programs | 441 |
| Seeded random programs | 128 |
| SC/TSO × BFS/DFS comparisons | 2336 |
| MoonBit witnesses independently replayed | 3418 |
| Parser, replay, and budget boundary checks | 89 |
| JavaScript host type checks | 74 |
| Large-state resource checks | 2 |
| Engine API calls | 9358 |
| Failures | 0 |

The exhaustive alphabet is `store x 1`, `store y 1`, `load r0 x`, and
`load r0 y`; each of two threads has length 0, 1, or 2, yielding 21 × 21 = 441
programs. Random seed: `20261022`. Named cases add fences, FIFO, forwarding,
register reuse, negative values, all instruction/register/address limits, and IRIW.
All complete searches compare final memory plus every named local register,
reachable-state counts, BFS/DFS consistency, and SC outcome inclusion in TSO.
Every MoonBit witness is independently replayed; every step's memory, PCs,
registers, buffers, terminal flag and structured action effect is compared with the MoonBit replay trace.
MoonBit also replays independently constructed Python witnesses.

Reproduce from the project root:

```sh
bash tools/build.sh
python3 -m unittest discover -s tests -p 'test_reference.py' -v
python3 tools/crosscheck.py
```

Python `3.9.6`; Node `v26.7.0`.
Engine SHA-256: `35d9b8294743571f3062faa8898dd029f65c7c48d3ca728107626adfe304690c`.
Raw MoonBit engine SHA-256: `f54fe630fb5c1a94cc778c93f0376c69a99df2269faba60894d8049b0ed2e2f1`.
Combined MoonBit source SHA-256: `7e8cc20f2f97c7c51a098be9a94ab80ce17d199b50d43e75e0d91a5971b4245d` (sorted relative
path, NUL, file bytes, NUL for each `core/*.mbt`; individual hashes are in JSON).
Reference SHA-256: `6cf99f29b11854ad487af8ee103a7a584b833760f87eabaafebb75f2a66f2b91`.
Structured cases, state counts, exact error evidence and failures: `crosscheck.json`.
