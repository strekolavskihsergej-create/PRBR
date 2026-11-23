/**
 * CC0 wall substrates from ambientCG (https://ambientcg.com/license, CC0 1.0).
 * They are painted *under* the procedural window grid, so the city keeps its
 * deterministic layout while walls get real masonry relief instead of flat colour.
 *
 * Nothing here is mandatory: if a file fails to load, `windowTextures` falls back
 * to the plain canvas facade and the game looks exactly like before.
 */
export type FacadeStyle = 'plaster' | 'brick' | 'siding' | 'concrete';

/** How many photo repeats span one 12.8 m texture tile (sized so bricks/planks read true). */
export const FACADE_REPEAT: Record<FacadeStyle, number> = {
  plaster: 3,
  brick: 8,
  siding: 6,
  concrete: 2,
};

const BASE = '/textures/facades';

const FILES: Record<FacadeStyle, { color: string; normal: string }> = {
  plaster: { color: `${BASE}/plaster_color.jpg`, normal: `${BASE}/plaster_normal.jpg` },
  brick: { color: `${BASE}/brick_color.jpg`, normal: `${BASE}/brick_normal.jpg` },
  siding: { color: `${BASE}/siding_color.jpg`, normal: `${BASE}/siding_normal.jpg` },
  concrete: { color: `${BASE}/concrete_color.jpg`, normal: `${BASE}/concrete_normal.jpg` },
};

interface FacadeImages {
  color: HTMLImageElement;
  normal: HTMLImageElement | null;
}

const images = new Map<FacadeStyle, FacadeImages>();

function load(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn(`[facades] could not load ${src}`);
      resolve(null);
    };
    img.src = src;
  });
}

/** Awaited once at boot, before materials and the city are built. */
export async function preloadFacades(): Promise<void> {
  await Promise.all(
    (Object.keys(FILES) as FacadeStyle[]).map(async (style) => {
      const [color, normal] = await Promise.all([load(FILES[style].color), load(FILES[style].normal)]);
      if (color) images.set(style, { color, normal });
    }),
  );
}

export function facadeImage(style: FacadeStyle): HTMLImageElement | null {
  return images.get(style)?.color ?? null;
}

export function facadeNormalImage(style: FacadeStyle): HTMLImageElement | null {
  return images.get(style)?.normal ?? null;
}
