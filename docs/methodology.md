# Methodology

Passport strength is calculated from destination accessibility, weighted by how much friction each status represents.

## Weights

```text
vf   1.0
vo   0.7
et   0.5
ev   0.3
vr   0
```

## Formula

```text
score = (vf * 1.0) + (vo * 0.7) + (et * 0.5) + (ev * 0.3)
```

`vr` (visa required) adds nothing to the score. Rows formerly coded `ar` are included in `vr`.

Rankings are generated automatically from the latest dataset.
