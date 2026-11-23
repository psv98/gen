import type { IconDef, StudioSettings } from '../types/index.ts';
import { composeSvg } from './compose.ts';
import { toSprite } from './codegen.ts';

export type ExportFormat = 'svg' | 'png' | 'jpeg' | 'sprite';
export const RASTER_SIZES = [64, 128, 256, 512, 1024, 2048, 4096];
export const MAX_RASTER = 8192;

export interface ExportOptions {
  format: ExportFormat;
  /** Longest side in px for raster formats. */
  size: number;
  quality: number;
  /** JPEG has no alpha: transparent pixels are flattened onto this colour. */
  matte: string;
  useCurrentColor: boolean;
}

export function outputSize(s: StudioSettings, longest: number) {
  const { width: W, height: H } = s.canvas;
  const k = longest / Math.max(W, H);
  return { w: Math.max(1, Math.round(W * k)), h: Math.max(1, Math.round(H * k)) };
}

export function svgBlob(svg: string): Blob {
  return new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n' + svg], { type: 'image/svg+xml;charset=utf-8' });
}

function loadImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG render failed')); };
    img.src = url;
  });
}

/**
 * Rasterises from vector source: the SVG is recomposed with width/height equal
 * to the target pixel size, so the browser renders geometry at full resolution.
 */
export async function rasterize(body: string, s: StudioSettings, longest: number, type: 'image/png' | 'image/jpeg', quality = 0.92, matte = '#FFFFFF'): Promise<Blob> {
  const { w, h } = outputSize(s, longest);
  const svg = composeSvg(body, s, { outWidth: w, outHeight: h, idPrefix: 'r' });
  const img = await loadImage(svg);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context is unavailable');
  if (type === 'image/jpeg') {
    ctx.fillStyle = matte;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encoding failed'))), type, quality));
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function fileName(icon: IconDef, o: ExportOptions, s: StudioSettings): string {
  if (o.format === 'svg' || o.format === 'sprite') return `${icon.slug}.svg`;
  const { w, h } = outputSize(s, o.size);
  return `${icon.slug}-${w}x${h}.${o.format === 'png' ? 'png' : 'jpg'}`;
}

export async function exportOne(icon: IconDef, s: StudioSettings, o: ExportOptions): Promise<Blob> {
  if (o.format === 'sprite') return svgBlob(toSprite([icon], s, o.useCurrentColor));
  if (o.format === 'svg') return svgBlob(composeSvg(icon.b, s, { idPrefix: icon.slug, useCurrentColor: o.useCurrentColor, title: icon.n[2] }));
  return rasterize(icon.b, s, o.size, o.format === 'png' ? 'image/png' : 'image/jpeg', o.quality, o.matte);
}

export async function exportZip(list: IconDef[], s: StudioSettings, o: ExportOptions, onProgress?: (done: number, total: number) => void): Promise<Blob> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  let done = 0;
  for (const icon of list) {
    zip.file(`${icon.c}/${fileName(icon, o, s)}`, await exportOne(icon, s, o));
    onProgress?.(++done, list.length);
  }
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

export function canCopyImage(): boolean {
  return typeof window !== 'undefined' && 'ClipboardItem' in window && !!navigator.clipboard?.write;
}

export async function copyPng(body: string, s: StudioSettings, longest = 512): Promise<void> {
  const blob = rasterize(body, s, longest, 'image/png');
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

export function exportSprite(list: IconDef[], s: StudioSettings, useCurrentColor: boolean): Blob {
  return new Blob([toSprite(list, s, useCurrentColor)], { type: 'image/svg+xml;charset=utf-8' });
}

/** Lets an icon be dragged out of the browser as an .svg file (Chromium) or as markup. */
export function setDragData(e: DragEvent | { dataTransfer: DataTransfer | null }, name: string, svg: string) {
  const dt = e.dataTransfer;
  if (!dt) return;
  const url = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  dt.effectAllowed = 'copy';
  dt.setData('DownloadURL', `image/svg+xml:${name}:${url}`);
  dt.setData('text/plain', svg);
  dt.setData('text/html', svg);
}
