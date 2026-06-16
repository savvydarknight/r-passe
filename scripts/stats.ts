import fs from "fs";

const matrix = JSON.parse(
fs.readFileSync("./data/passport_matrix.json", "utf8")
);

const scores: Record<string, number> = {};
const visaFreeCounts: Record<string, number> = {};

for (const passport of Object.keys(matrix)) {
let score = 0;
let vf = 0;

for (const destination of Object.keys(matrix[passport])) {
const [status] = matrix[passport][destination];

```
if (["vf", "vo", "ev", "et"].includes(status)) {
  score++;
}

if (status === "vf") {
  vf++;
}
```

}

scores[passport] = score;
visaFreeCounts[passport] = vf;
}

const rankings = Object.entries(scores)
.sort((a, b) => b[1] - a[1])
.map(([passport, score], index) => ({
rank: index + 1,
passport,
score
}));

fs.writeFileSync(
"./generated/scores.json",
JSON.stringify(scores, null, 2)
);

fs.writeFileSync(
"./generated/visa-free-counts.json",
JSON.stringify(visaFreeCounts, null, 2)
);

fs.writeFileSync(
"./generated/rankings.json",
JSON.stringify(rankings, null, 2)
);

console.log("✓ Statistics generated");
