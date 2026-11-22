import type { Game } from '../core/Game';
import type { GameState } from '../core/GameState';
import { UiConfig } from '../systems/ui/config';
import { CONTROLS_ON_FOOT, CONTROLS_VEHICLE, type ControlRow } from './controlsData';
import { el, setText, setVisible, type UiComponent } from './dom';
import { formatCash, formatDuration } from './format';
import './menu.css';
import { MenuNav } from './MenuNav';
import './pause-menu.css';
import { SettingsPanel } from './Settings';

export interface PauseActions {
  resume(): void;
  openMap(): void;
  quitToTitle(): void;
  notify(text: string, kind: 'info' | 'warning'): void;
  /** Re-grab the mouse; only valid from a click/Enter handler (user gesture). */
  relockPointer(): void;
}

type Panel = 'stats' | 'settings' | 'controls' | null;

interface StatRow {
  label: string;
  value: () => string;
  el?: HTMLElement;
}

/** Esc menu: left column of actions, right column for stats / settings / controls. */
export class PauseMenu implements UiComponent {
  readonly el: HTMLElement;
  readonly settings: SettingsPanel;
  visible = false;
  private readonly nav = new MenuNav();
  private readonly panels: Record<Exclude<Panel, null>, HTMLElement>;
  private readonly clockEl: HTMLElement;
  private readonly abortButton: HTMLButtonElement;
  private readonly statRows: StatRow[];
  private statsTimer = 0;
  private panel: Panel = null;

  constructor(
    private readonly game: Game,
    private readonly actions: PauseActions,
  ) {
    this.el = el('div', 'pause');
    this.el.hidden = true;
    const left = el('div', 'pause-left');
    left.append(el('h1', 'menu-heading', 'Leonida'), el('div', 'menu-subheading', 'Пауза'));
    const buttons = el('div', 'pause-buttons');
    const items: HTMLButtonElement[] = [
      this.button(buttons, 'Продолжить', () => {
        actions.resume();
        actions.relockPointer();
      }),
      this.button(buttons, 'Карта', () => actions.openMap()),
      this.button(buttons, 'Статистика', () => this.showPanel('stats')),
      this.button(buttons, 'Настройки', () => this.showPanel('settings')),
      this.button(buttons, 'Сохранить', () => this.save()),
      this.button(buttons, 'Загрузить', () => this.load()),
      this.button(buttons, 'Управление', () => this.showPanel('controls')),
      this.button(buttons, 'Прервать задание', () => {
        game.missions?.abort();
        actions.resume();
        actions.relockPointer();
      }),
      this.button(buttons, 'Выйти в меню', () => actions.quitToTitle()),
    ];
    this.abortButton = items[items.length - 2];
    this.refreshAbort();
    this.nav.setItems(items);
    this.nav.onMove = () => game.audio.play('ui.blip', { volume: 0.5 });
    this.clockEl = el('div', 'pause-clock');
    left.append(buttons, this.clockEl);

    const right = el('div', 'pause-right');
    this.settings = new SettingsPanel(game);
    this.statRows = [
      { label: 'Наличные', value: () => formatCash(game.state.cash) },
      { label: 'Заработано', value: () => formatCash(game.state.stats.cashEarned ?? 0) },
      { label: 'Потрачено', value: () => formatCash(game.state.stats.cashSpent ?? 0) },
      { label: 'Убийств', value: () => `${game.state.stats.kills ?? 0}` },
      { label: 'Выстрелов', value: () => `${game.state.stats.shotsFired ?? 0}` },
      { label: 'Заданий пройдено', value: () => `${game.state.stats.missionsPassed ?? 0}` },
      { label: 'Розыск', value: () => `${Math.round(game.wanted?.heat ?? 0)} / 100` },
      { label: 'Время в игре', value: () => formatDuration(game.time.realElapsed) },
      { label: 'День', value: () => `${game.time.day}` },
    ];
    this.panels = {
      stats: this.panelShell('Статистика', this.statsTable()),
      settings: this.panelShell('Настройки', this.settings.el),
      controls: this.panelShell('Управление', this.controlsTable()),
    };
    right.append(this.panels.stats, this.panels.settings, this.panels.controls);
    this.el.append(left, right);
  }

  private button(parent: HTMLElement, label: string, onClick: () => void): HTMLButtonElement {
    const b = el('button', 'menu-button', label);
    b.addEventListener('click', () => {
      this.game.audio.play('ui.select');
      onClick();
    });
    parent.appendChild(b);
    return b;
  }

  private panelShell(title: string, body: HTMLElement): HTMLElement {
    const panel = el('div', 'pause-panel');
    panel.hidden = true;
    panel.append(el('div', 'pause-panel-title', title), body);
    return panel;
  }

  private statsTable(): HTMLElement {
    const table = el('table', 'menu-table');
    for (const row of this.statRows) {
      const tr = el('tr');
      const value = el('td', 'value', row.value());
      row.el = value;
      tr.append(el('td', undefined, row.label), value);
      table.appendChild(tr);
    }
    return table;
  }

  private controlsTable(): HTMLElement {
    const wrap = el('div');
    wrap.append(controlsSection('Пешком', CONTROLS_ON_FOOT), controlsSection('В машине', CONTROLS_VEHICLE));
    return wrap;
  }

  private showPanel(panel: Panel): void {
    this.panel = panel;
    for (const key of ['stats', 'settings', 'controls'] as const) setVisible(this.panels[key], key === panel);
    if (panel === 'stats') this.refreshStats();
  }

  private refreshStats(): void {
    for (const row of this.statRows) if (row.el) setText(row.el, row.value());
  }

  /** "Abort mission" only exists while a mission runs; disabled too so MenuNav skips it. */
  private refreshAbort(): void {
    const show = (this.game.missions?.active ?? null) !== null;
    const b = this.abortButton;
    if (b.disabled === !show) return;
    b.disabled = !show;
    // `.menu-button` is `display: block`, which beats the `hidden` attribute.
    b.style.display = show ? '' : 'none';
  }

  private save(): void {
    if (!this.game.save.save()) this.actions.notify('Не удалось сохранить', 'warning');
    else this.game.audio.play('ui.save');
  }

  private load(): void {
    if (!this.game.save.hasSave()) {
      this.actions.notify('Сохранений нет', 'warning');
      return;
    }
    if (this.game.save.load()) {
      this.game.audio.play('ui.load');
      this.actions.notify('Игра загружена', 'info');
      this.actions.resume();
    } else this.actions.notify('Не удалось загрузить', 'warning');
  }

  show(): void {
    if (this.visible) return;
    this.visible = true;
    setVisible(this.el, true);
    this.refreshAbort();
    this.showPanel('stats');
    this.nav.select(0, false);
    setText(this.clockEl, `${this.game.time.clockLabel}  ·  День ${this.game.time.day}`);
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    setVisible(this.el, false);
  }

  /** Called by the UI system while visible and no overlay (full map) sits on top. */
  handleInput(): void {
    this.nav.handleInput(this.game.input);
  }

  update(_state: GameState, realDt: number): void {
    if (!this.visible) return;
    this.refreshAbort();
    if (this.panel !== 'stats') return;
    this.statsTimer -= realDt;
    if (this.statsTimer > 0) return;
    this.statsTimer = UiConfig.pause.statsRefreshSeconds;
    this.refreshStats();
  }

  dispose(): void {
    this.el.remove();
  }
}

function controlsSection(title: string, rows: readonly ControlRow[]): HTMLElement {
  const table = el('table', 'menu-table');
  const head = el('tr');
  const th = el('th', undefined, title);
  th.colSpan = 2;
  head.appendChild(th);
  table.appendChild(head);
  for (const row of rows) {
    const tr = el('tr');
    const keys = el('td');
    for (const k of row.keys) keys.appendChild(el('span', 'menu-key', k));
    tr.append(keys, el('td', undefined, row.action));
    table.appendChild(tr);
  }
  return table;
}
