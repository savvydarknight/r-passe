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

    if (["vf", "vo", "ev", "et"].includes(status)) {
      score++;
    }

    if (status === "vf") {
      vf++;
    }
  }

  scores[passport] = score;
  visaFreeCounts[passport] = vf;
}

// Sort by score desc, using visa-free count as a documented tiebreaker
// before falling back to alphabetical order for full determinism.
const sorted = Object.entries(scores).sort((a, b) => {
  const [passportA, scoreA] = a;
  const [passportB, scoreB] = b;

  if (scoreB !== scoreA) return scoreB - scoreA;

  const vfA = visaFreeCounts[passportA] ?? 0;
  const vfB = visaFreeCounts[passportB] ?? 0;
  if (vfB !== vfA) return vfB - vfA;

  return passportA.localeCompare(passportB);
});

// Equal score AND equal visa-free count => equal (competition-style) rank.
// e.g. scores [211, 211, 210] => ranks [1, 1, 3]
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
