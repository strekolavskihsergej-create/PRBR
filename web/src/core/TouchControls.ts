import type { Game } from './Game';
import '../ui/touch-controls.css';

/**
 * On-screen controls for touch devices. It never touches game systems: everything is
 * written into the same `Input` the keyboard uses (scripted keys, fire/aim flags and
 * camera deltas), so movement, camera and UI code stay unchanged.
 *
 * Layout: a virtual stick bottom-left, a full-screen look layer (drag to orbit the
 * camera) and action buttons bottom-right. The whole overlay hides itself while a
 * menu, map or shop owns the input.
 */

const STICK_RADIUS = 52;
/** Mouse look is 0.0022 rad/px; a finger drag needs a much larger factor to feel right. */
const LOOK_SCALE = 4;
const DEAD_ZONE = 0.25;
const TAP_MS = 140;

type ButtonSpec = {
  id: string;
  label: string;
  /** Hold-type buttons get `on`/`off`; tap-type buttons only `on`. */
  on: () => void;
  off?: () => void;
};

export class TouchControls {
  private readonly root: HTMLDivElement;
  private readonly knob: HTMLDivElement;
  private readonly stick: HTMLDivElement;
  private readonly buttons: { el: HTMLButtonElement; spec: ButtonSpec }[] = [];
  private readonly heldCodes = new Set<string>();

  private stickPointer: number | null = null;
  private lookPointer: number | null = null;
  private stickCenterX = 0;
  private stickCenterY = 0;
  private lookX = 0;
  private lookY = 0;
  private fireOn = false;
  private aimOn = false;
  private weaponHeld = 0;
  private hidden = false;
  private raf = 0;
  private disposed = false;

  static isSupported(): boolean {
    return 'ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0;
  }

  constructor(private readonly game: Game) {
    document.documentElement.classList.add('touch-ui');
    this.root = document.createElement('div');
    this.root.className = 'tc';

    const look = document.createElement('div');
    look.className = 'tc-look';

    this.stick = document.createElement('div');
    this.stick.className = 'tc-stick';
    this.knob = document.createElement('div');
    this.knob.className = 'tc-knob';
    this.stick.appendChild(this.knob);

    this.root.append(look, this.stick);
    for (const spec of this.buildButtons()) this.addButton(spec);
    document.body.appendChild(this.root);

    look.addEventListener('pointerdown', this.onLookDown);
    look.addEventListener('pointermove', this.onLookMove);
    look.addEventListener('pointerup', this.onLookUp);
    look.addEventListener('pointercancel', this.onLookUp);

    this.stick.addEventListener('pointerdown', this.onStickDown);
    this.stick.addEventListener('pointermove', this.onStickMove);
    this.stick.addEventListener('pointerup', this.onStickUp);
    this.stick.addEventListener('pointercancel', this.onStickUp);

    this.raf = requestAnimationFrame(() => this.tick());
  }

  // --- Buttons --------------------------------------------------------------

  private buildButtons(): ButtonSpec[] {
    return [
      { id: 'fire', label: 'ОГОНЬ', on: () => this.setFire(true), off: () => this.setFire(false) },
      { id: 'jump', label: 'ПРЫЖОК', on: () => this.tap('Space') },
      { id: 'use', label: 'ДЕЙСТВ.', on: () => this.tap('KeyE') },
      { id: 'car', label: 'МАШИНА', on: () => this.tap('KeyF') },
      { id: 'aim', label: 'ПРИЦЕЛ', on: () => this.setAim(true), off: () => this.setAim(false) },
      { id: 'sprint', label: 'БЕГ', on: () => this.setHeld('ShiftLeft'), off: () => this.clearHeld('ShiftLeft') },
      { id: 'map', label: 'КАРТА', on: () => this.tap('KeyM') },
      { id: 'weapon', label: 'ОРУЖИЕ', on: () => this.cycleWeapon() },
      { id: 'pause', label: 'МЕНЮ', on: () => this.tap('Escape') },
    ];
  }

  private addButton(spec: ButtonSpec): void {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `tc-btn tc-${spec.id}`;
    el.textContent = spec.label;
    const release = (): void => {
      el.classList.remove('on');
      spec.off?.();
    };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      el.classList.add('on');
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* older WebViews */
      }
      spec.on();
    });
    for (const type of ['pointerup', 'pointercancel', 'pointerleave'] as const) {
      el.addEventListener(type, release);
    }
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    this.root.appendChild(el);
    this.buttons.push({ el, spec });
  }

  // --- Actions --------------------------------------------------------------

  private tap(code: string): void {
    this.game.input.press(code, TAP_MS);
  }

  private setHeld(code: string): void {
    if (this.heldCodes.has(code)) return;
    this.heldCodes.add(code);
    this.game.input.hold(code);
  }

  private clearHeld(code: string): void {
    if (!this.heldCodes.delete(code)) return;
    this.game.input.release(code);
  }

  private setFire(on: boolean): void {
    this.fireOn = on;
    this.game.input.setFire(on);
  }

  private setAim(on: boolean): void {
    this.aimOn = on;
    this.game.input.setAim(on);
  }

  /** Cycles through the number-key weapon slots; taps the next one each press. */
  private cycleWeapon(): void {
    this.weaponHeld = (this.weaponHeld % 6) + 1;
    this.tap(`Digit${this.weaponHeld}`);
  }

  // --- Stick ----------------------------------------------------------------

  private axisKeys(x: number, y: number): void {
    const dead = DEAD_ZONE;
    this.toggle('KeyD', x > dead);
    this.toggle('KeyA', x < -dead);
    this.toggle('KeyW', y < -dead);
    this.toggle('KeyS', y > dead);
  }

  private toggle(code: string, on: boolean): void {
    if (on) this.setHeld(code);
    else this.clearHeld(code);
  }

  private readonly onStickDown = (e: PointerEvent): void => {
    if (this.stickPointer !== null) return;
    e.preventDefault();
    this.stickPointer = e.pointerId;
    try {
      this.stick.setPointerCapture(e.pointerId);
    } catch {
      /* older WebViews */
    }
    const rect = this.stick.getBoundingClientRect();
    this.stickCenterX = rect.left + rect.width / 2;
    this.stickCenterY = rect.top + rect.height / 2;
    this.stick.classList.add('active');
    this.onStickMove(e);
  };

  private readonly onStickMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.stickPointer) return;
    e.preventDefault();
    let dx = e.clientX - this.stickCenterX;
    let dy = e.clientY - this.stickCenterY;
    const len = Math.hypot(dx, dy);
    if (len > STICK_RADIUS) {
      dx = (dx / len) * STICK_RADIUS;
      dy = (dy / len) * STICK_RADIUS;
    }
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    this.axisKeys(dx / STICK_RADIUS, dy / STICK_RADIUS);
  };

  private readonly onStickUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.stickPointer) return;
    this.stickPointer = null;
    this.stick.classList.remove('active');
    this.knob.style.transform = 'translate(0px, 0px)';
    this.axisKeys(0, 0);
  };

  // --- Camera look ----------------------------------------------------------

  private readonly onLookDown = (e: PointerEvent): void => {
    if (this.lookPointer !== null) return;
    this.lookPointer = e.pointerId;
    this.lookX = e.clientX;
    this.lookY = e.clientY;
  };

  private readonly onLookMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.lookPointer) return;
    const dx = e.clientX - this.lookX;
    const dy = e.clientY - this.lookY;
    this.lookX = e.clientX;
    this.lookY = e.clientY;
    if (dx !== 0 || dy !== 0) this.game.input.look(dx * LOOK_SCALE, dy * LOOK_SCALE);
  };

  private readonly onLookUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.lookPointer) return;
    this.lookPointer = null;
  };

  // --- Overlay lifecycle ----------------------------------------------------

  private tick(): void {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(() => this.tick());
    // The overlay must follow `isBlocked`: visible in gameplay, hidden under menus.
    const blocked = this.game.input.isBlocked;
    if (blocked !== this.hidden) {
      this.hidden = blocked;
      this.root.classList.toggle('tc-hidden', blocked);
      if (blocked) this.releaseAll();
    }
  }

  private releaseAll(): void {
    for (const code of Array.from(this.heldCodes)) this.game.input.release(code);
    this.heldCodes.clear();
    this.knob.style.transform = 'translate(0px, 0px)';
    this.stickPointer = null;
    this.lookPointer = null;
    if (this.fireOn) this.setFire(false);
    if (this.aimOn) this.setAim(false);
    for (const btn of this.buttons) btn.el.classList.remove('on');
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.releaseAll();
    this.root.remove();
  }
}
