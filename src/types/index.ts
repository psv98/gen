export type Locale = 'ru' | 'uk' | 'en';

export interface CategoryDef {
  id: string;
  names: Record<Locale, string>;
}

/** Compact registry record produced by scripts/build-registry.mjs */
export interface IconDef {
  id: string;
  slug: string;
  /** category id */
  c: string;
  /** names: [ru, uk, en] */
  n: [string, string, string];
  /** short description of the visual idea */
  d: string;
  /** keywords in all languages */
  k: string[];
  /** tags */
  t: string[];
  /** verified safe stroke range [min, max] */
  s: [number, number];
  /** inner SVG markup (24×24 grid, stroke-based) */
  b: string;
}

export type LineCap = 'round' | 'square' | 'butt';
export type LineJoin = 'round' | 'miter' | 'bevel';
export type BgType = 'none' | 'solid' | 'linear' | 'radial';
export type BgShape = 'square' | 'rounded' | 'circle' | 'squircle';
export type Align = 'start' | 'center' | 'end';

export interface StudioSettings {
  stroke: { width: number; color: string; linecap: LineCap; linejoin: LineJoin };
  background: { type: BgType; color: string; color2: string; angle: number; shape: BgShape; radius: number };
  canvas: {
    width: number;
    height: number;
    lockRatio: boolean;
    iconSize: number;
    padding: number;
    alignX: Align;
    alignY: Align;
    rotation: number;
    flipX: boolean;
    flipY: boolean;
  };
  shadow: { enabled: boolean; color: string; blur: number; opacity: number; x: number; y: number };
}

export interface Preset {
  id: string;
  name: string;
  builtIn?: boolean;
  settings: StudioSettings;
}

export interface Collection {
  id: string;
  name: string;
  icons: string[];
}
