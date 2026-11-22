export const RobberyConfig = {
  /** Seconds the player must keep aiming at the clerk (gun drawn) before the hold-up starts. */
  aimSeconds: 1.0,
  /** Aim contact older than this no longer counts as continuous. */
  aimGapSeconds: 0.35,
  /** Seconds to fill the bag with nobody shooting. */
  bagSeconds: 12,
  /** Each gunshot inside removes this fraction of the remaining time... */
  shotCut: 0.4,
  /** ...at most this many times. */
  maxShots: 2,
  clerkLines: ['«Бери, бери всё!»', '«Пожалуйста, у меня кот!»', '«Сейф на таймере, честное слово!»', '«Только не стреляй, мужик».'],
} as const;
