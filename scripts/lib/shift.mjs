// Translates icon geometry by (dx, dy) by rewriting coordinates, so the output
// stays clean (no wrapper groups or extra transforms).
const PARAMS = { M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, A: 7, Z: 0 };
const fmt = (n) => String(Math.round(n * 1000) / 1000);

export function shiftPath(d, dx, dy) {
  const toks = d.match(/[a-zA-Z]|-?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?/g) || [];
  let out = '', i = 0, cmd = '', first = true;
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) { cmd = toks[i++]; out += cmd; if (cmd.toUpperCase() === 'Z') { continue; } }
    const C = cmd.toUpperCase();
    const n = PARAMS[C];
    if (!n) continue;
    const vals = toks.slice(i, i + n).map(Number);
    i += n;
    const abs = cmd === C || (first && cmd === 'm');
    if (abs) {
      if (C === 'H') vals[0] += dx;
      else if (C === 'V') vals[0] += dy;
      else if (C === 'A') { vals[5] += dx; vals[6] += dy; }
      else for (let k = 0; k < n; k += 2) { vals[k] += dx; vals[k + 1] += dy; }
      if (first && cmd === 'm') {
        // only the first pair of an initial relative moveto is absolute
        for (let k = 2; k < n; k += 2) { vals[k] -= dx; vals[k + 1] -= dy; }
      }
    }
    first = false;
    if (cmd === 'm') cmd = 'l';
    else if (cmd === 'M') cmd = 'L';
    out += (out.endsWith(cmd) || /[a-zA-Z]$/.test(out) ? '' : ' ') + vals.map(fmt).join(' ').replace(/ -/g, '-');
  }
  return out;
}

const shiftAttr = (attrs, name, by) => attrs.replace(new RegExp(`(\\s${name}=")(-?[\\d.]+)(")`), (_, a, v, b) => a + fmt(parseFloat(v) + by) + b);

export function shiftBody(body, dx, dy) {
  if (!dx && !dy) return body;
  return body.replace(/<([a-zA-Z]+)\b([^>]*?)(\/?)>/g, (m, tag, attrs, close) => {
    if (tag === 'path') attrs = attrs.replace(/\sd="([^"]*)"/, (_, d) => ` d="${shiftPath(d, dx, dy)}"`);
    else if (tag === 'circle' || tag === 'ellipse') { attrs = shiftAttr(attrs, 'cx', dx); attrs = shiftAttr(attrs, 'cy', dy); }
    else if (tag === 'rect') { attrs = shiftAttr(attrs, 'x', dx); attrs = shiftAttr(attrs, 'y', dy); }
    else if (tag === 'line') { attrs = shiftAttr(attrs, 'x1', dx); attrs = shiftAttr(attrs, 'x2', dx); attrs = shiftAttr(attrs, 'y1', dy); attrs = shiftAttr(attrs, 'y2', dy); }
    else if (tag === 'polyline' || tag === 'polygon')
      attrs = attrs.replace(/\spoints="([^"]*)"/, (_, p) => ` points="${p.trim().split(/[\s,]+/).map((v, k) => fmt(parseFloat(v) + (k % 2 ? dy : dx))).join(' ')}"`);
    attrs = attrs.replace(/rotate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)[\s,]+(-?[\d.]+)\s*\)/, (_, a, cx, cy) => `rotate(${a} ${fmt(+cx + dx)} ${fmt(+cy + dy)})`);
    return `<${tag}${attrs}${close}>`;
  });
}
