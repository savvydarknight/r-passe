# Methodology

Passport strength is calculated from destination accessibility, weighted by how much friction each status represents.

## Weights

```text
vf   1.0
vo   0.7
ev   0.5
et   0.3
vr  -1.0
```

## Formula

```text
score = (vf * 1.0) + (vo * 0.7) + (ev * 0.5) + (et * 0.3) + (vr * -1.0)
```

`vr` (visa required) counts against the score, symmetric with `vf`: each visa-required destination cancels out one visa-free destination's worth of score.

Rankings are generated automatically from the latest dataset.
