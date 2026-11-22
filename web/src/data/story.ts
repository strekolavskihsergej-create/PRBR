/**
 * Story data (SYSTEM_PROMPT §14): the eight missions plus the post-finale jobs.
 * Beats live in `src/missions/m*.ts`; this table holds what the phone, the map and
 * the mission list need without loading any mission code.
 */
export type ContactId = 'jason' | 'manny' | 'ray' | 'dominic';

export interface ContactDef {
  id: ContactId;
  name: string;
  /** Landmark whose door the contact hangs out at. */
  landmarkId: string;
  /** Meters from the door along the door heading where the marker sits (keeps the E prompt off the door). */
  doorOffset: number;
}

export const CONTACTS: Record<ContactId, ContactDef> = {
  jason: { id: 'jason', name: 'Джейсон', landmarkId: 'safehouse', doorOffset: 6 },
  manny: { id: 'manny', name: 'Мэнни Очоа', landmarkId: 'chop_shop', doorOffset: 7 },
  ray: { id: 'ray', name: 'Рэй Тиллман', landmarkId: 'waffle_hut', doorOffset: 6 },
  dominic: { id: 'dominic', name: 'Доминик Рейес', landmarkId: 'casino', doorOffset: 7 },
};

export interface StoryMissionDef {
  id: string;
  name: string;
  contact: ContactId;
  /** Overrides the contact's landmark for the marker (mission 1 starts at the prison gate). */
  markerLandmarkId?: string;
  markerOffset?: number;
  unlockedAfter?: string;
  /** Base cash reward; some missions compute the final amount from what happened. */
  reward: number;
  repeatable: boolean;
  /** One-line pitch for the phone contact list. */
  blurb: string;
}

export const STORY_MISSIONS: readonly StoryMissionDef[] = [
  { id: 'm1', name: 'Выход', contact: 'jason', markerLandmarkId: 'prison', markerOffset: 8, reward: 500, repeatable: false, blurb: 'Лусия выходит на свободу. Джейсон ждёт.' },
  { id: 'm2', name: 'На бензин', contact: 'jason', unlockedAfter: 'm1', reward: 300, repeatable: false, blurb: 'Мы на мели. А заправка в Геллхорне — нет.' },
  { id: 'm3', name: 'Перехват', contact: 'manny', unlockedAfter: 'm2', reward: 1500, repeatable: false, blurb: 'У спортивного купе с отеля на Вайс-Бич новый хозяин.' },
  { id: 'm4', name: 'Должок', contact: 'manny', unlockedAfter: 'm3', reward: 800, repeatable: false, blurb: 'Должник в Литл-Хабане должен Мэнни. Собери.' },
  { id: 'm5', name: 'Грязевой клуб', contact: 'ray', unlockedAfter: 'm4', reward: 2000, repeatable: false, blurb: 'Отвези посылку в «Гатор-Пит» в Грассриверсе.' },
  { id: 'm6', name: 'Крупная ставка', contact: 'dominic', unlockedAfter: 'm5', reward: 2500, repeatable: false, blurb: 'Встреться со своим человеком в «Леонида-Палмс». Выиграй много.' },
  { id: 'm7', name: 'Жара', contact: 'dominic', unlockedAfter: 'm6', reward: 1000, repeatable: false, blurb: 'Узнай, как сильно бьёт полиция Вайс-Сити.' },
  { id: 'm8', name: 'Куш', contact: 'jason', unlockedAfter: 'm7', reward: 25000, repeatable: false, blurb: 'Ювелирный «Вайс Рокс», Джейсон. Один заход.' },
  { id: 'job_chopshop', name: 'Угнанные колёса', contact: 'manny', unlockedAfter: 'm8', reward: 3000, repeatable: true, blurb: 'Пригони Мэнни машину из сегодняшнего списка.' },
  { id: 'job_robbery', name: 'За кассой', contact: 'ray', unlockedAfter: 'm8', reward: 500, repeatable: true, blurb: 'Обнеси любой магазин и уйди чистым.' },
];

export const STORY_BY_ID: ReadonlyMap<string, StoryMissionDef> = new Map(STORY_MISSIONS.map((m) => [m.id, m]));

/** Story order used for unlock checks and the "next mission" hint. */
export const STORY_ORDER: readonly string[] = STORY_MISSIONS.filter((m) => !m.repeatable).map((m) => m.id);
