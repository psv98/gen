import type { Preset, StudioSettings } from '../types/index.ts';
import { DEFAULT_SETTINGS, cloneSettings } from './compose.ts';

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export function withOverrides(o: DeepPartial<StudioSettings>): StudioSettings {
  const s = cloneSettings(DEFAULT_SETTINGS);
  return {
    stroke: { ...s.stroke, ...o.stroke },
    background: { ...s.background, ...o.background },
    canvas: { ...s.canvas, ...o.canvas },
    shadow: { ...s.shadow, ...o.shadow },
  } as StudioSettings;
}

export const BUILT_IN_PRESETS: Preset[] = [
  { id: 'minimal-outline', name: 'Minimal Outline', builtIn: true, settings: withOverrides({ stroke: { width: 1.5, color: '#18181B' } }) },
  {
    id: 'soft-rounded', name: 'Soft Rounded', builtIn: true,
    settings: withOverrides({ stroke: { width: 2, color: '#5B3FD9' }, background: { type: 'solid', color: '#EFEAFF', shape: 'rounded', radius: 28 }, shadow: { enabled: true, color: '#5B3FD9', blur: 10, opacity: 0.18, y: 6 } }),
  },
  {
    id: 'sharp-geometry', name: 'Sharp Geometry', builtIn: true,
    settings: withOverrides({ stroke: { width: 2, color: '#0A0A0A', linecap: 'square', linejoin: 'miter' }, background: { type: 'solid', color: '#FFFFFF', shape: 'square' } }),
  },
  { id: 'monochrome', name: 'Monochrome', builtIn: true, settings: withOverrides({ stroke: { width: 1.8, color: '#FFFFFF' }, background: { type: 'solid', color: '#111113', shape: 'circle' } }) },
  {
    id: 'gradient-background', name: 'Gradient Background', builtIn: true,
    settings: withOverrides({ stroke: { width: 2, color: '#FFFFFF' }, background: { type: 'linear', color: '#8B5CF6', color2: '#2F6BFF', angle: 135, shape: 'squircle', radius: 26 } }),
  },
  {
    id: 'dark-interface', name: 'Dark Interface', builtIn: true,
    settings: withOverrides({ stroke: { width: 1.6, color: '#B4A5FF' }, background: { type: 'solid', color: '#17171C', shape: 'rounded', radius: 18 } }),
  },
  { id: 'corporate', name: 'Corporate', builtIn: true, settings: withOverrides({ stroke: { width: 1.8, color: '#FFFFFF' }, background: { type: 'solid', color: '#1E4FD8', shape: 'rounded', radius: 12 } }) },
  {
    id: 'editorial', name: 'Editorial', builtIn: true,
    settings: withOverrides({ stroke: { width: 1.4, color: '#1A1A1A', linecap: 'butt', linejoin: 'miter' }, background: { type: 'solid', color: '#F3EEE3', shape: 'square' } }),
  },
];

export const COLOR_SWATCHES = ['#18181B', '#FFFFFF', '#7C5CFF', '#2F6BFF', '#22B8F0', '#12B76A', '#F79009', '#F04438', '#E04F9F', '#475467'];

export const BACKGROUND_PRESETS: { name: string; type: 'solid' | 'linear' | 'radial'; color: string; color2: string; angle?: number }[] = [
  { name: 'Lavender', type: 'solid', color: '#EFEAFF', color2: '#EFEAFF' },
  { name: 'Graphite', type: 'solid', color: '#17171C', color2: '#17171C' },
  { name: 'Paper', type: 'solid', color: '#F3EEE3', color2: '#F3EEE3' },
  { name: 'Violet → Blue', type: 'linear', color: '#8B5CF6', color2: '#2F6BFF', angle: 135 },
  { name: 'Ice', type: 'linear', color: '#E0F2FE', color2: '#C7D2FE', angle: 160 },
  { name: 'Night', type: 'linear', color: '#1E1B4B', color2: '#0B0B12', angle: 180 },
  { name: 'Aurora', type: 'linear', color: '#22D3EE', color2: '#7C3AED', angle: 120 },
  { name: 'Glow', type: 'radial', color: '#4C3A9E', color2: '#0E0B1F' },
  { name: 'Mint', type: 'radial', color: '#ECFDF3', color2: '#A6F4C5' },
  { name: 'Sunset', type: 'linear', color: '#FDBA74', color2: '#F43F5E', angle: 145 },
];
