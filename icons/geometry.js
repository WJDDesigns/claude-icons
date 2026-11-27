// Small helpers for the few icons that are easier to compute than to hand-write.
// Every result is plain SVG markup drawn on the shared 24 x 24 grid.

const f = (n) => Number(n.toFixed(2)).toString();
const pt = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];

export function gear(cx = 12, cy = 12, ro = 9, ri = 6.9, teeth = 8) {
  const step = (Math.PI * 2) / teeth;
  const top = step * 0.16;
  const base = step * 0.26;
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const a = i * step - Math.PI / 2;
    const p1 = pt(cx, cy, ri, a - base);
    const p2 = pt(cx, cy, ro, a - top);
    const p3 = pt(cx, cy, ro, a + top);
    const p4 = pt(cx, cy, ri, a + base);
    const next = pt(cx, cy, ri, a + step - base);
    d += `${i === 0 ? 'M' : 'L'}${f(p1[0])} ${f(p1[1])}L${f(p2[0])} ${f(p2[1])}`;
    d += `A${ro} ${ro} 0 0 1 ${f(p3[0])} ${f(p3[1])}L${f(p4[0])} ${f(p4[1])}`;
    d += `A${ri} ${ri} 0 0 1 ${f(next[0])} ${f(next[1])}`;
  }
  return `<path d="${d}Z"/>`;
}

export function star(cx = 12, cy = 12.5, ro = 9.2, ri = 4.1, points = 5) {
  let d = '';
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? ro : ri;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const [x, y] = pt(cx, cy, r, a);
    d += `${i === 0 ? 'M' : 'L'}${f(x)} ${f(y)}`;
  }
  return `<path d="${d}Z"/>`;
}

export function polygon(cx, cy, r, sides, rotate = -Math.PI / 2) {
  let d = '';
  for (let i = 0; i < sides; i++) {
    const [x, y] = pt(cx, cy, r, rotate + (i * Math.PI * 2) / sides);
    d += `${i === 0 ? 'M' : 'L'}${f(x)} ${f(y)}`;
  }
  return `<path d="${d}Z"/>`;
}

// A scalloped seal, used for "verified" and certificate style badges.
export function seal(cx = 12, cy = 12, ro = 9.6, ri = 8, bumps = 10) {
  const step = (Math.PI * 2) / bumps;
  const a0 = -Math.PI / 2;
  const [sx, sy] = pt(cx, cy, ri, a0);
  let d = `M${f(sx)} ${f(sy)}`;
  for (let j = 0; j < bumps; j++) {
    const [qx, qy] = pt(cx, cy, ro, a0 + (j + 0.5) * step);
    const [ex, ey] = pt(cx, cy, ri, a0 + (j + 1) * step);
    d += `Q${f(qx)} ${f(qy)} ${f(ex)} ${f(ey)}`;
  }
  return `<path d="${d}Z"/>`;
}

export function snowflake(cx = 12, cy = 12, r = 9) {
  let out = '';
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 3;
    const [x, y] = pt(cx, cy, r, a);
    out += `<path d="M${cx} ${cy}L${f(x)} ${f(y)}"/>`;
    const [bx, by] = pt(cx, cy, r * 0.55, a);
    const [l1x, l1y] = pt(bx, by, 2.6, a - Math.PI * 0.27);
    const [l2x, l2y] = pt(bx, by, 2.6, a + Math.PI * 0.27);
    out += `<path d="M${f(l1x)} ${f(l1y)}L${f(bx)} ${f(by)}L${f(l2x)} ${f(l2y)}"/>`;
  }
  return out;
}
