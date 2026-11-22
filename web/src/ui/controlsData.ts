/** Controls table shown in the pause menu (SYSTEM_PROMPT §18). Keys are display labels. */
export interface ControlRow {
  keys: string[];
  action: string;
}

export const CONTROLS_ON_FOOT: readonly ControlRow[] = [
  { keys: ['W', 'A', 'S', 'D'], action: 'Движение' },
  { keys: ['Мышь'], action: 'Обзор' },
  { keys: ['Shift'], action: 'Бег' },
  { keys: ['Space'], action: 'Прыжок' },
  { keys: ['ПКМ'], action: 'Прицел' },
  { keys: ['ЛКМ'], action: 'Огонь / удар' },
  { keys: ['R'], action: 'Перезарядка' },
  { keys: ['Tab'], action: 'Колесо оружия (удерживать)' },
  { keys: ['1', '\u2026', '7'], action: 'Быстрое оружие' },
  { keys: ['Колесо'], action: 'Сменить оружие' },
  { keys: ['F'], action: 'Сесть в машину' },
  { keys: ['E'], action: 'Действие / ограбление' },
  { keys: ['Q'], action: 'Колесо персонажей' },
  { keys: ['Caps'], action: 'Способность' },
  { keys: ['M'], action: 'Карта' },
  { keys: ['\u2191'], action: 'Телефон' },
  { keys: ['V'], action: 'Дальность камеры' },
  { keys: ['Esc'], action: 'Пауза' },
  { keys: ['P'], action: 'Быстрое сохранение' },
];

export const CONTROLS_VEHICLE: readonly ControlRow[] = [
  { keys: ['W', 'S'], action: 'Газ / тормоз и назад' },
  { keys: ['A', 'D'], action: 'Руль' },
  { keys: ['Space'], action: 'Ручник' },
  { keys: ['F'], action: 'Выйти из машины' },
  { keys: ['H'], action: 'Сигнал' },
  { keys: ['L'], action: 'Фары' },
  { keys: ['C'], action: 'Камера' },
  { keys: ['ЛКМ'], action: 'Стрельба из окна' },
  { keys: ['Мышь'], action: 'Обзор (камера возвращается)' },
];
