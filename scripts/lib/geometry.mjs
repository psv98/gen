// Minimal SVG geometry toolkit used by the registry builder and the validator.
// Parses the primitives used by the icon set and samples them into point lists.

const ATTR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g;
const EL_RE = /<([a-zA-Z]+)\b([^>]*?)\/?>/g;

export function parseElements(body) {
  const out = [];
  for (const m of body.matchAll(EL_RE)) {
    const tag = m[1];
    if (tag === 'svg' || tag === 'g') continue;
    const attrs = {};
    for (const a of m[2].matchAll(ATTR_RE)) attrs[a[1]] = a[2];
    out.push({ tag, attrs });
  }
  return out;
}

const num = (v, d = 0) => (v === undefined ? d : parseFloat(v));

function sampleLine(a, b, pts, step = 0.25) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(1, Math.ceil(len / step));
  for (let i = 0; i <= n; i++) pts.push([a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);
  return len;
}

function sampleCubic(p0, p1, p2, p3, pts) {
  let len = 0, prev = p0;
  for (let i = 1; i <= 24; i++) {
    const t = i / 24, u = 1 - t;
    const p = [
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ];
    len += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    pts.push(p); prev = p;
  }
  return len;
}

function sampleQuad(p0, p1, p2, pts) {
  return sampleCubic(p0, [p0[0] + (2 / 3) * (p1[0] - p0[0]), p0[1] + (2 / 3) * (p1[1] - p0[1])],
    [p2[0] + (2 / 3) * (p1[0] - p2[0]), p2[1] + (2 / 3) * (p1[1] - p2[1])], p2, pts);
}

function sampleArc(p0, rx, ry, phi, fa, fs, p1, pts) {
  if (rx === 0 || ry === 0) return sampleLine(p0, p1, pts);
  rx = Math.abs(rx); ry = Math.abs(ry);
  const r = (phi * Math.PI) / 180, cos = Math.cos(r), sin = Math.sin(r);
  const dx = (p0[0] - p1[0]) / 2, dy = (p0[1] - p1[1]) / 2;
  const x1 = cos * dx + sin * dy, y1 = -sin * dx + cos * dy;
  const lam = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
  const sgn = fa === fs ? -1 : 1;
  const sq = Math.max(0, (rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1) / (rx * rx * y1 * y1 + ry * ry * x1 * x1));
  const co = sgn * Math.sqrt(sq);
  const cx1 = (co * rx * y1) / ry, cy1 = (-co * ry * x1) / rx;
  const cx = cos * cx1 - sin * cy1 + (p0[0] + p1[0]) / 2, cy = sin * cx1 + cos * cy1 + (p0[1] + p1[1]) / 2;
  const ang = (ux, uy, vx, vy) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const t1 = ang(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry);
  let dt = ang((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry);
  if (!fs && dt > 0) dt -= 2 * Math.PI;
  if (fs && dt < 0) dt += 2 * Math.PI;
  const n = Math.max(8, Math.ceil(Math.abs(dt) * 12));
  let len = 0, prev = p0;
  for (let i = 1; i <= n; i++) {
    const t = t1 + (dt * i) / n;
    const x = rx * Math.cos(t), y = ry * Math.sin(t);
    const p = [cos * x - sin * y + cx, sin * x + cos * y + cy];
    len += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    pts.push(p); prev = p;
  }
  return len;
}

/** Splits path data into subpaths, each sampled into points. Returns [{points, length}] */
export function samplePath(d) {
  const toks = d.match(/[a-zA-Z]|-?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?/g) || [];
  const subs = [];
  let i = 0, cmd = '', cur = [0, 0], start = [0, 0], lastCtrl = null, lastCmd = '';
  let sub = null;
  const n = () => parseFloat(toks[i++]);
  const begin = (p) => { sub = { points: [p.slice()], length: 0 }; subs.push(sub); };
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const ox = rel ? cur[0] : 0, oy = rel ? cur[1] : 0;
    if (C === 'Z') { if (sub) sub.length += sampleLine(cur, start, sub.points); cur = start.slice(); lastCtrl = null; lastCmd = 'Z'; continue; }
    if (C === 'M') { cur = [ox + n(), oy + n()]; start = cur.slice(); begin(cur); cmd = rel ? 'l' : 'L'; lastCtrl = null; lastCmd = 'M'; continue; }
    if (!sub) begin(cur);
    if (C === 'L') { const p = [ox + n(), oy + n()]; sub.length += sampleLine(cur, p, sub.points); cur = p; lastCtrl = null; }
    else if (C === 'H') { const p = [(rel ? cur[0] : 0) + n(), cur[1]]; sub.length += sampleLine(cur, p, sub.points); cur = p; lastCtrl = null; }
    else if (C === 'V') { const p = [cur[0], (rel ? cur[1] : 0) + n()]; sub.length += sampleLine(cur, p, sub.points); cur = p; lastCtrl = null; }
    else if (C === 'C') { const a = [ox + n(), oy + n()], b = [ox + n(), oy + n()], p = [ox + n(), oy + n()]; sub.length += sampleCubic(cur, a, b, p, sub.points); lastCtrl = b; cur = p; }
    else if (C === 'S') {
      const a = lastCtrl && /[CS]/.test(lastCmd) ? [2 * cur[0] - lastCtrl[0], 2 * cur[1] - lastCtrl[1]] : cur.slice();
      const b = [ox + n(), oy + n()], p = [ox + n(), oy + n()]; sub.length += sampleCubic(cur, a, b, p, sub.points); lastCtrl = b; cur = p;
    } else if (C === 'Q') { const a = [ox + n(), oy + n()], p = [ox + n(), oy + n()]; sub.length += sampleQuad(cur, a, p, sub.points); lastCtrl = a; cur = p; }
    else if (C === 'T') {
      const a = lastCtrl && /[QT]/.test(lastCmd) ? [2 * cur[0] - lastCtrl[0], 2 * cur[1] - lastCtrl[1]] : cur.slice();
      const p = [ox + n(), oy + n()]; sub.length += sampleQuad(cur, a, p, sub.points); lastCtrl = a; cur = p;
    } else if (C === 'A') {
      const rx = n(), ry = n(), phi = n(), fa = n(), fs = n(); const p = [ox + n(), oy + n()];
      sub.length += sampleArc(cur, rx, ry, phi, fa, fs, p, sub.points); cur = p; lastCtrl = null;
    } else throw new Error(`Unsupported path command "${cmd}" in: ${d.slice(0, 60)}`);
    lastCmd = C;
  }
  return subs;
}

function sampleEllipse(cx, cy, rx, ry) {
  const pts = [];
  const n = Math.max(24, Math.ceil(Math.max(rx, ry) * 12));
  for (let i = 0; i <= n; i++) { const t = (i / n) * Math.PI * 2; pts.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]); }
  return { points: pts, length: Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry))) };
}

function polyline(points, close) {
  const arr = points.trim().split(/[\s,]+/).map(Number);
  const ps = [];
  for (let i = 0; i + 1 < arr.length; i += 2) ps.push([arr[i], arr[i + 1]]);
  if (close && ps.length) ps.push(ps[0]);
  const pts = []; let length = 0;
  for (let i = 1; i < ps.length; i++) length += sampleLine(ps[i - 1], ps[i], pts);
  if (ps.length === 1) pts.push(ps[0]);
  return { points: pts, length };
}

export function parseTransform(t) {
  let m = [1, 0, 0, 1, 0, 0];
  const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
  for (const [, fn, raw] of (t || '').matchAll(/(\w+)\(([^)]*)\)/g)) {
    const v = raw.split(/[\s,]+/).filter(Boolean).map(Number);
    if (fn === 'translate') m = mul(m, [1, 0, 0, 1, v[0], v[1] || 0]);
    else if (fn === 'scale') m = mul(m, [v[0], 0, 0, v[1] ?? v[0], 0, 0]);
    else if (fn === 'rotate') {
      const r = (v[0] * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
      const [cx = 0, cy = 0] = v.slice(1);
      m = mul(m, [1, 0, 0, 1, cx, cy]); m = mul(m, [c, s, -s, c, 0, 0]); m = mul(m, [1, 0, 0, 1, -cx, -cy]);
    } else if (fn === 'matrix') m = mul(m, v);
  }
  return m;
}

/** Returns sampled components (one per element or subpath). */
export function sampleBody(body) {
  const all = [];
  for (const el of parseElements(body)) {
    const comps = sampleElement(el);
    if (el.attrs.transform) {
      const m = parseTransform(el.attrs.transform);
      for (const c of comps) c.points = c.points.map(([x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]);
    }
    all.push(...comps);
  }
  return all;
}

function sampleElement({ tag, attrs: a }) {
  const comps = [];
  {
    if (tag === 'path') for (const s of samplePath(a.d || '')) comps.push({ ...s, tag });
    else if (tag === 'circle') comps.push({ ...sampleEllipse(num(a.cx), num(a.cy), num(a.r), num(a.r)), tag });
    else if (tag === 'ellipse') comps.push({ ...sampleEllipse(num(a.cx), num(a.cy), num(a.rx), num(a.ry)), tag });
    else if (tag === 'line') { const pts = []; const length = sampleLine([num(a.x1), num(a.y1)], [num(a.x2), num(a.y2)], pts); comps.push({ points: pts, length, tag }); }
    else if (tag === 'polyline' || tag === 'polygon') comps.push({ ...polyline(a.points || '', tag === 'polygon'), tag });
    else if (tag === 'rect') {
      const x = num(a.x), y = num(a.y), w = num(a.width), h = num(a.height);
      let rx = num(a.rx, a.ry !== undefined ? num(a.ry) : 0), ry = num(a.ry, rx);
      rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2);
      const d = rx || ry
        ? `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`
        : `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
      for (const s of samplePath(d)) comps.push({ ...s, tag });
    } else comps.push({ points: [], length: 0, tag, unsupported: true });
  }
  return comps;
}

export function bbox(comps) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of comps) for (const [x, y] of c.points) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return { x0, y0, x1, y1 };
}

function minDist(a, b) {
  let m = Infinity;
  for (const p of a) for (const q of b) { const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; if (d < m) m = d; }
  return Math.sqrt(m);
}

/**
 * Heuristic stroke-range analysis. Two separate components visually merge when
 * stroke width >= the gap between them. Returns the smallest gap between
 * components that do not touch, plus a safe [min, max] stroke range.
 */
export function strokeRange(comps, opts = {}) {
  const { min = 0.75, max = 3.5, touch = 0.35 } = opts;
  let gap = Infinity;
  const parts = comps.filter((c) => c.points.length);
  for (let i = 0; i < parts.length; i++)
    for (let j = i + 1; j < parts.length; j++) {
      const d = minDist(parts[i].points, parts[j].points);
      if (d > touch && d < gap) gap = d;
    }
  const b = bbox(parts);
  const margin = Math.min(b.x0, b.y0, 24 - b.x1, 24 - b.y1);
  let hi = Math.min(max, gap, margin * 2);
  hi = Math.max(1.8, Math.floor(hi * 20) / 20);
  return { gap: gap === Infinity ? null : +gap.toFixed(2), margin: +margin.toFixed(2), range: [min, +Math.min(max, hi).toFixed(2)] };
}

export function normalizeBody(body) {
  return body.replace(/\s+/g, ' ').replace(/(\d*\.\d+|\d+)/g, (m) => String(+parseFloat(m).toFixed(2))).trim();
}
