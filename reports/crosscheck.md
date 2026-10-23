# LitmusLab independent implementation cross-check

Status: **passed**. Generated at 2026-10-23T15:35:12.462575+00:00.

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
Engine SHA-256: `31c92a01e7a8290c580d795a82dd51e21e711047bdfbab9cb9eed5966dd8b869`.
Raw MoonBit engine SHA-256: `47cd1f7f524ca7e44ca22c994e116e75d965aa84b821179126a349a99fe8f7a0`.
Combined MoonBit source SHA-256: `46c2c318e4fb84febf5867e9f4e143e373413d1cf86f5eff116afede12ee853a` (sorted relative
path, NUL, file bytes, NUL for each `core/*.mbt`; individual hashes are in JSON).
Reference SHA-256: `6cf99f29b11854ad487af8ee103a7a584b833760f87eabaafebb75f2a66f2b91`.
Structured cases, state counts, exact error evidence and failures: `crosscheck.json`.
