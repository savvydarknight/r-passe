import fs from "fs";

const matrix = JSON.parse(
  fs.readFileSync("./data/passport_matrix.json", "utf8")
);

const { codes: territoryCodes } = JSON.parse(
  fs.readFileSync("./data/territories.json", "utf8")
);
const territories = new Set<string>(territoryCodes);

const scores: Record<string, number> = {};
const visaFreeCounts: Record<string, number> = {};

const WEIGHTS: Record<string, number> = {
  vf: 1.0,
  vo: 0.7,
  ev: 0.2,
  et: 0.1,
  vr: -1.0,
};

for (const passport of Object.keys(matrix)) {
  if (territories.has(passport)) continue;

  let score = 0;
  let vf = 0;

  for (const destination of Object.keys(matrix[passport])) {
    if (territories.has(destination)) continue;

    const [status] = matrix[passport][destination];

    score += WEIGHTS[status] ?? 0;

    if (status === "vf") {
      vf++;
    }
  }

  scores[passport] = Math.round(score * 100) / 100;
  visaFreeCounts[passport] = vf;
}

const sorted = Object.entries(scores).sort((a, b) => {
  const [passportA, scoreA] = a;
  const [passportB, scoreB] = b;

  if (scoreB !== scoreA) return scoreB - scoreA;

  const vfA = visaFreeCounts[passportA] ?? 0;
  const vfB = visaFreeCounts[passportB] ?? 0;
  if (vfB !== vfA) return vfB - vfA;

  return passportA.localeCompare(passportB);
});

const rankings: { rank: number; passport: string; score: number }[] = [];

for (let index = 0; index < sorted.length; index++) {
  const [passport, score] = sorted[index];

  if (index > 0) {
    const [prevPassport, prevScore] = sorted[index - 1];
    const tied =
      prevScore === score &&
      visaFreeCounts[prevPassport] === visaFreeCounts[passport];

    if (tied) {
      rankings.push({ rank: rankings[index - 1].rank, passport, score });
      continue;
    }
  }

  rankings.push({ rank: index + 1, passport, score });
}

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
