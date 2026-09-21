export const VALID_STATUSES = [
  "vf",
  "et",
  "vo",
  "ev",
  "vr",
  "ar"
] as const;

export const SCORE_WEIGHTS: Record<string, number> = {
  vf: 1.0,
  vo: 0.7,
  et: 0.5,
  ev: 0.3,
  vr: 0,
  ar: 0,
};

export const USE_OFFICIAL_POLICY = false;
