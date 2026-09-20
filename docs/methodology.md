# Methodology

Passport strength is calculated from destination accessibility, weighted by how much friction each status represents.

## Weights

```text
vf   1.0
vo   0.7
et   0.5
ev   0.3
vr   0
ar   0
```

## Formula

```text
score = (vf * 1.0) + (vo * 0.7) + (et * 0.5) + (ev * 0.3)
```

`vr` (visa required) and `ar` (admission refused) add nothing to the score.

Rankings are generated automatically from the latest dataset.
