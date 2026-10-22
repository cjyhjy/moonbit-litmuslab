# LitmusLab independent implementation cross-check

Status: **passed**. Generated at 2026-10-22T15:38:18.283167+00:00.

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
registers, buffers and terminal flag is compared with the MoonBit replay trace.
MoonBit also replays independently constructed Python witnesses.

Reproduce from the project root:

```sh
bash tools/build.sh
python3 -m unittest discover -s tests -p 'test_reference.py' -v
python3 tools/crosscheck.py
```

Python `3.9.6`; Node `v26.7.0`.
Engine SHA-256: `31c92a01e7a8290c580d795a82dd51e21e711047bdfbab9cb9eed5966dd8b869`.
Raw MoonBit engine SHA-256: `be03fb3c8da97608894a701846f15b43b02f30bd74a20b27c70720a2f14c91af`.
Combined MoonBit source SHA-256: `012fa4f58c2617f0a9f974a06cc1f5e5cc42e5e69d479f58ad551c77aefcd67a` (sorted relative
path, NUL, file bytes, NUL for each `core/*.mbt`; individual hashes are in JSON).
Reference SHA-256: `974ae8e97e941e2960b4fd70218252e4a54eb059fafa6328d3c2a6fc587bcde2`.
Structured cases, state counts, exact error evidence and failures: `crosscheck.json`.
