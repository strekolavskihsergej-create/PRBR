import {
  Color,
  DoubleSide,
  FrontSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Vector2,
  type Texture,
} from 'three';
import {
  concreteTexture,
  grassTexture,
  plankTexture,
  roadTexture,
  sandTexture,
  windowTextures,
  type SignAtlas,
  type WindowTextures,
} from './Textures';

/**
 * Shared materials for the static city. Everything uses vertex colors so one material
 * covers a whole chunk; `setNight(n)` ramps window emissive and neon brightness.
 */
export class CityMaterials {
  readonly concreteWindows: WindowTextures;
  readonly decoWindows: WindowTextures;
  readonly brickWindows: WindowTextures;
  readonly sidingWindows: WindowTextures;
  readonly glassWindows: WindowTextures;

  readonly walls: MeshStandardMaterial;
  readonly deco: MeshStandardMaterial;
  readonly brick: MeshStandardMaterial;
  readonly siding: MeshStandardMaterial;
  readonly glass: MeshStandardMaterial;
  readonly flat: MeshStandardMaterial;
  readonly concrete: MeshStandardMaterial;
  readonly grass: MeshStandardMaterial;
  readonly sand: MeshStandardMaterial;
  readonly planks: MeshStandardMaterial;
  readonly neon: MeshBasicMaterial;
  readonly lampGlow: MeshBasicMaterial;
  /** Instance-colored traffic signal lamps (no vertex colors). */
  readonly signal: MeshBasicMaterial;
  readonly roads: Record<'street' | 'avenue' | 'highway' | 'dirt' | 'bridge' | 'asphalt', MeshStandardMaterial>;
  readonly signs: MeshBasicMaterial;
  private readonly neonColor = new Color(1, 1, 1);

  constructor(seed: string, signAtlasTexture: SignAtlas['texture']) {
    // Each district style gets its own CC0 substrate (plaster / brick / siding / concrete).
    this.concreteWindows = windowTextures(seed, 'concrete', 'concrete');
    this.decoWindows = windowTextures(seed, 'deco', 'plaster');
    this.brickWindows = windowTextures(seed, 'concrete', 'brick');
    this.sidingWindows = windowTextures(seed, 'deco', 'siding');
    this.glassWindows = windowTextures(seed, 'glass');

    const windowMat = (t: WindowTextures, roughness: number, metalness: number): MeshStandardMaterial =>
      new MeshStandardMaterial({
        map: t.map,
        emissiveMap: t.emissiveMap,
        emissive: new Color(1, 1, 1),
        emissiveIntensity: 0,
        vertexColors: true,
        normalMap: t.normalMap,
        normalScale: new Vector2(0.85, 0.85),
        roughness,
        metalness,
        side: FrontSide,
      });
    this.walls = windowMat(this.concreteWindows, 0.9, 0.0);
    this.deco = windowMat(this.decoWindows, 0.85, 0.0);
    this.brick = windowMat(this.brickWindows, 0.92, 0.0);
    this.siding = windowMat(this.sidingWindows, 0.88, 0.0);
    this.glass = windowMat(this.glassWindows, 0.35, 0.6);

    this.flat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0.0 });
    this.concrete = textured(concreteTexture(), 0.95);
    // Lot slabs sit 4 cm above the ground plane; offset them so distant slabs never z-fight.
    this.concrete.polygonOffset = true;
    this.concrete.polygonOffsetFactor = -1;
    this.concrete.polygonOffsetUnits = -1;
    this.grass = textured(grassTexture(), 1.0);
    this.sand = textured(sandTexture(), 1.0);
    this.planks = textured(plankTexture(), 0.9);
    this.neon = new MeshBasicMaterial({ vertexColors: true, color: this.neonColor, side: DoubleSide, toneMapped: false });
    this.lampGlow = new MeshBasicMaterial({ color: 0xfff1c0, toneMapped: false });
    this.signal = new MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    this.signs = new MeshBasicMaterial({ map: signAtlasTexture, side: DoubleSide, toneMapped: false, transparent: false });

    const road = (kind: 'street' | 'avenue' | 'highway' | 'dirt' | 'bridge' | 'asphalt'): MeshStandardMaterial =>
      new MeshStandardMaterial({
        map: roadTexture(kind),
        roughness: 0.95,
        metalness: 0.0,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -2,
      });
    this.roads = {
      street: road('street'),
      avenue: road('avenue'),
      highway: road('highway'),
      dirt: road('dirt'),
      bridge: road('bridge'),
      asphalt: road('asphalt'),
    };
    this.setNight(0);
  }

  /** 0 = day (windows dark, neon dim), 1 = night (windows lit, neon full). */
  setNight(night01: number): void {
    const n = Math.max(0, Math.min(1, night01));
    this.walls.emissiveIntensity = n * 1.4;
    this.deco.emissiveIntensity = n * 1.6;
    this.brick.emissiveIntensity = n * 1.4;
    this.siding.emissiveIntensity = n * 1.5;
    this.glass.emissiveIntensity = n * 1.1;
    // Neon reads as "off" plastic tubes by day and bright saturated light at night.
    const k = 0.18 + 0.82 * n;
    this.neon.color.setScalar(k * 1.6);
    this.lampGlow.color.setRGB(0.45 + 0.55 * n, 0.42 + 0.5 * n, 0.32 + 0.4 * n).multiplyScalar(0.5 + 1.5 * n);
    this.signs.color.setScalar(0.35 + 0.65 * n);
  }

  dispose(): void {
    for (const t of [this.concreteWindows, this.decoWindows, this.brickWindows, this.sidingWindows, this.glassWindows]) {
      t.map.dispose();
      t.emissiveMap.dispose();
      t.normalMap?.dispose();
    }
    for (const m of [
      this.walls,
      this.deco,
      this.brick,
      this.siding,
      this.glass,
      this.flat,
      this.concrete,
      this.grass,
      this.sand,
      this.planks,
      this.neon,
      this.lampGlow,
      this.signal,
      this.signs,
    ]) {
      m.dispose();
    }
    for (const m of Object.values(this.roads)) {
      m.map?.dispose();
      m.dispose();
    }
  }
}

function textured(map: Texture, roughness: number): MeshStandardMaterial {
  return new MeshStandardMaterial({ map, vertexColors: true, roughness, metalness: 0 });
}
