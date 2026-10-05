/* ==========================================================================
   NEUROQUEST — LESSON VISUALS
   One illustrative figure per concept-lesson section.
   Each factory returns { html, caption, mount? } where mount(rootEl) wires up
   interactivity and may return a cleanup function.
   ========================================================================== */
import katex from 'katex';

// ---------- Palette ----------
const C = {
  violet: '#a78bfa',
  cyan: '#22d3ee',
  emerald: '#34d399',
  amber: '#fbbf24',
  rose: '#fb7185',
  blue: '#60a5fa',
  text: '#e2e8f0',
  muted: '#94a3b8',
  dim: '#475569',
  grid: 'rgba(148,163,184,0.12)',
  axis: 'rgba(148,163,184,0.45)'
};
const SUB = ['₀', '₁', '₂', '₃', '₄', '₅'];

let uid = 0;
const nextId = (p) => `${p}-${++uid}`;

// ---------- SVG primitives ----------
const ARROW_DEFS = ['cyan', 'muted', 'rose', 'emerald', 'amber', 'violet', 'blue']
  .map(k => `<marker id="lv-ar-${k}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C[k]}"/></marker>`)
  .join('');

function svg(w, h, inner, cls = '') {
  return `<svg class="lv-svg ${cls}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg"><defs>${ARROW_DEFS}</defs>${inner}</svg>`;
}

function T(x, y, s, o = {}) {
  const { size = 12, fill = C.text, anchor = 'middle', weight = 500, mono = false, italic = false, opacity = null, extra = '' } = o;
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" font-weight="${weight}" font-family="${mono ? "'JetBrains Mono', monospace" : "'Outfit', sans-serif"}" ${italic ? 'font-style="italic"' : ''} ${opacity != null ? `opacity="${opacity}"` : ''} dominant-baseline="middle" ${extra}>${s}</text>`;
}
const line = (x1, y1, x2, y2, stroke = C.axis, w = 1.2, extra = '') =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${w}" ${extra}/>`;
const arrow = (x1, y1, x2, y2, color = 'muted', w = 1.8, extra = '') =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C[color]}" stroke-width="${w}" marker-end="url(#lv-ar-${color})" stroke-linecap="round" ${extra}/>`;
const rect = (x, y, w, h, { fill = 'none', stroke = 'none', rx = 6, sw = 1.2, extra = '' } = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
const circ = (cx, cy, r, { fill = 'none', stroke = 'none', sw = 1.5, extra = '' } = {}) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
const path = (d, { stroke = C.cyan, sw = 2, fill = 'none', extra = '' } = {}) =>
  `<path d="${d}" stroke="${stroke}" stroke-width="${sw}" fill="${fill}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;

function pill(x, y, text, color, size = 11) {
  const w = text.length * size * 0.56 + 14;
  return rect(x - w / 2, y - size * 0.85, w, size * 1.7, { fill: 'rgba(7,10,19,0.85)', stroke: color, rx: size * 0.85, sw: 1 }) +
    T(x, y + 0.5, text, { size, fill: color, weight: 700, mono: true });
}

const tint = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// ---------- Plot helpers ----------
function scale(box, xr, yr) {
  return {
    sx: (x) => box.x + ((x - xr[0]) / (xr[1] - xr[0])) * box.w,
    sy: (y) => box.y + box.h - ((y - yr[0]) / (yr[1] - yr[0])) * box.h
  };
}
function fnPath(f, s, xr, n = 160) {
  let d = '';
  for (let i = 0; i <= n; i++) {
    const x = xr[0] + ((xr[1] - xr[0]) * i) / n;
    const y = f(x);
    if (!isFinite(y)) continue;
    d += `${d ? 'L' : 'M'}${s.sx(x).toFixed(1)},${s.sy(y).toFixed(1)}`;
  }
  return d;
}
function clipBox(box) {
  const id = nextId('lv-clip');
  return { id, def: `<clipPath id="${id}"><rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}"/></clipPath>`, attr: `clip-path="url(#${id})"` };
}
function axes(box, s, xr, yr, { xTicks = [], yTicks = [], xLabel = '', yLabel = '', zeroAxes = true } = {}) {
  let g = rect(box.x, box.y, box.w, box.h, { fill: 'rgba(2,6,23,0.35)', stroke: 'rgba(148,163,184,0.15)', rx: 4, sw: 1 });
  xTicks.forEach(t => { g += line(s.sx(t), box.y, s.sx(t), box.y + box.h, C.grid, 1); g += T(s.sx(t), box.y + box.h + 11, t, { size: 9.5, fill: C.dim, mono: true }); });
  yTicks.forEach(t => { g += line(box.x, s.sy(t), box.x + box.w, s.sy(t), C.grid, 1); g += T(box.x - 6, s.sy(t), t, { size: 9.5, fill: C.dim, anchor: 'end', mono: true }); });
  if (zeroAxes) {
    if (yr[0] <= 0 && yr[1] >= 0) g += line(box.x, s.sy(0), box.x + box.w, s.sy(0), C.axis, 1.2);
    if (xr[0] <= 0 && xr[1] >= 0) g += line(s.sx(0), box.y, s.sx(0), box.y + box.h, C.axis, 1.2);
  }
  if (xLabel) g += T(box.x + box.w, box.y + box.h + 24, xLabel, { size: 10.5, fill: C.muted, anchor: 'end', italic: true });
  if (yLabel) g += T(box.x + 4, box.y - 9, yLabel, { size: 10.5, fill: C.muted, anchor: 'start', italic: true });
  return g;
}

const softmax = (arr) => { const m = Math.max(...arr); const e = arr.map(v => Math.exp(v - m)); const s = e.reduce((a, b) => a + b, 0); return e.map(v => v / s); };
const tex = (src, display = false) => katex.renderToString(src, { displayMode: display, throwOnError: false, strict: 'ignore' });

/** Run cb on an interval only while the element is attached and visible. */
function visibleInterval(el, cb, ms) {
  const id = setInterval(() => {
    if (!el.isConnected) { clearInterval(id); return; }
    if (el.offsetParent === null) return; // hidden tab
    cb();
  }, ms);
  return () => clearInterval(id);
}

/* ==========================================================================
   QUEST 1 — THE NEURON
   ========================================================================== */
function q1Neuron() {
  const ins = [
    { n: 'Sugar', v: 2, w: 0.8, y: 62 },
    { n: 'Milk', v: 5, w: 0.4, y: 140 },
    { n: 'Espresso', v: 2, w: 1.5, y: 218 }
  ];
  const sx = 150, nx = 395, ny = 140, ox = 578;
  let s = '';
  s += circ(nx, 32, 16, { fill: tint(C.amber, 0.15), stroke: C.amber });
  s += T(nx, 33, 'b', { fill: C.amber, weight: 700, italic: true, size: 15 });
  s += T(nx + 26, 33, 'bias = −0.5', { anchor: 'start', size: 11, fill: C.muted });
  s += arrow(nx, 49, nx, ny - 44, 'amber', 1.6);
  ins.forEach((d, i) => {
    const p = `M${sx + 23},${d.y} L${nx - 41},${ny}`;
    s += path(p, { stroke: tint(C.cyan, 0.45), sw: (d.w * 3.4 + 1).toFixed(1) });
    s += `<circle r="4.5" fill="${C.cyan}" opacity="0.95"><animateMotion dur="2.2s" begin="${i * 0.4}s" repeatCount="indefinite" path="${p}"/></circle>`;
    s += circ(sx, d.y, 23, { fill: tint(C.cyan, 0.12), stroke: C.cyan });
    s += T(sx, d.y + 1, `x${SUB[i + 1]}`, { weight: 700, italic: true, size: 14 });
    s += T(sx - 34, d.y - 7, d.n, { anchor: 'end', size: 12.5, weight: 600 });
    s += T(sx - 34, d.y + 10, `value = ${d.v}`, { anchor: 'end', size: 10.5, fill: C.muted, mono: true });
    const mx = (sx + 23 + nx - 41) / 2, my = (d.y + ny) / 2;
    s += pill(mx, my - (i === 1 ? 14 : 0), `w${SUB[i + 1]} = ${d.w}`, C.violet, 10.5);
  });
  s += circ(nx, ny, 41, { fill: tint('#8b5cf6', 0.22), stroke: C.violet, sw: 2, extra: 'class="lv-pulse"' });
  s += T(nx, ny - 6, 'Σ', { size: 26, weight: 700, fill: '#fff' });
  s += T(nx, ny + 19, 'weighted sum', { size: 9.5, fill: C.muted });
  s += arrow(nx + 43, ny, ox - 30, ny, 'emerald', 2.4);
  s += circ(ox, ny, 26, { fill: tint(C.emerald, 0.15), stroke: C.emerald, sw: 2 });
  s += T(ox, ny + 1, 'y', { size: 16, weight: 700, italic: true });
  s += T(ox, ny + 46, 'y = 6.1', { size: 12, fill: C.emerald, weight: 700, mono: true });
  s += T(ox, ny - 42, 'output', { size: 11, fill: C.muted });
  s += T(320, 268, 'Line thickness ∝ weight — Espresso (w = 1.5) has the loudest voice', { size: 11, fill: C.muted, italic: true });
  return {
    html: svg(640, 285, s),
    caption: 'An artificial neuron: each input travels along a weighted connection, gets summed, and is shifted by the bias.'
  };
}

function q1DotProduct() {
  const rows = [
    { n: '🍬 Sugar', x: 2, w: 0.8 },
    { n: '🥛 Milk', x: 5, w: 0.4 },
    { n: '☕ Espresso', x: 2, w: 1.5 }
  ];
  const html = `
    <div class="lv-dot">
      <div class="lv-dot-head"><span>Ingredient</span><span>x</span><span></span><span>weight w</span><span></span><span>x · w</span><span>contribution</span></div>
      ${rows.map((r, i) => `
        <div class="lv-dot-row">
          <span class="lv-dot-name">${r.n}</span>
          <span class="lv-chip lv-chip-x">${r.x}</span>
          <span class="lv-op">×</span>
          <span class="lv-dot-slider"><input type="range" min="-2" max="3" step="0.1" value="${r.w}" data-i="${i}" aria-label="${r.n} weight"><b class="lv-wval">${r.w.toFixed(1)}</b></span>
          <span class="lv-op">=</span>
          <span class="lv-chip lv-chip-p" data-p="${i}">0</span>
          <span class="lv-bar-track"><span class="lv-bar-fill" data-b="${i}"></span></span>
        </div>`).join('')}
      <div class="lv-dot-row lv-dot-bias">
        <span class="lv-dot-name">⚖️ Bias b</span><span></span><span></span>
        <span class="lv-dot-slider"><input type="range" min="-3" max="3" step="0.1" value="-0.5" data-bias aria-label="bias"><b class="lv-bval">-0.5</b></span>
        <span class="lv-op">=</span>
        <span class="lv-chip lv-chip-b" data-bp>-0.5</span>
        <span class="lv-bar-track"><span class="lv-bar-fill lv-bias-fill" data-bb></span></span>
      </div>
      <div class="lv-dot-total">
        <span>Happiness score</span>
        <span class="lv-dot-eq" data-eq></span>
        <span class="lv-dot-result" data-total>0</span>
      </div>
    </div>`;
  const mount = (root) => {
    const sliders = [...root.querySelectorAll('input[data-i]')];
    const bias = root.querySelector('input[data-bias]');
    const MAX = 8;
    const setBar = (el, v) => {
      const pct = Math.min(50, (Math.abs(v) / MAX) * 50);
      el.style.width = `${pct}%`;
      el.style.left = v >= 0 ? '50%' : `${50 - pct}%`;
      el.classList.toggle('neg', v < 0);
    };
    const update = () => {
      let total = 0;
      const terms = [];
      sliders.forEach((sl, i) => {
        const w = parseFloat(sl.value);
        const p = rows[i].x * w;
        total += p;
        terms.push(p.toFixed(1));
        sl.parentElement.querySelector('.lv-wval').textContent = w.toFixed(1);
        root.querySelector(`[data-p="${i}"]`).textContent = p.toFixed(1);
        setBar(root.querySelector(`[data-b="${i}"]`), p);
      });
      const b = parseFloat(bias.value);
      total += b;
      root.querySelector('.lv-bval').textContent = b.toFixed(1);
      root.querySelector('[data-bp]').textContent = b.toFixed(1);
      setBar(root.querySelector('[data-bb]'), b);
      root.querySelector('[data-eq]').innerHTML = tex(`${terms.join(' + ')} + (${b.toFixed(1)}) =`).replace(/\+ -/g, '- ');
      const out = root.querySelector('[data-total]');
      out.textContent = total.toFixed(2);
      out.classList.toggle('neg', total < 0);
    };
    [...sliders, bias].forEach(s => s.addEventListener('input', update));
    update();
  };
  return {
    html,
    mount,
    caption: '<b>Try it:</b> drag the weight sliders — each row is one term of the dot product, and the total is the neuron\'s output.'
  };
}

function q1WeightLines() {
  const box = { x: 50, y: 22, w: 400, h: 230 };
  const xr = [-3, 3], yr = [-4, 4];
  const s = scale(box, xr, yr);
  const cl = clipBox(box);
  const lines = [
    { w: 2, c: C.amber, l: 'w = 2  → large: very sensitive' },
    { w: 0.5, c: C.cyan, l: 'w = 0.5 → positive: gentle increase' },
    { w: 0, c: C.muted, l: 'w = 0  → ignored completely' },
    { w: -1, c: C.rose, l: 'w = −1 → negative: inhibits' }
  ];
  let g = cl.def + axes(box, s, xr, yr, { xTicks: [-2, -1, 1, 2], yTicks: [-3, -2, -1, 1, 2, 3], xLabel: 'input x', yLabel: 'output w·x' });
  g += `<g ${cl.attr}>`;
  lines.forEach((L, i) => {
    g += path(fnPath(x => L.w * x, s, xr, 2), { stroke: L.c, sw: 2.6, extra: `class="lv-draw" style="animation-delay:${i * 0.15}s"` });
  });
  g += '</g>';
  lines.forEach((L, i) => {
    const y = 60 + i * 44;
    g += line(475, y, 500, y, L.c, 3);
    g += T(508, y, L.l.split('→')[0].trim(), { anchor: 'start', size: 12, fill: L.c, weight: 700, mono: true });
    g += T(508, y + 15, L.l.split('→')[1].trim(), { anchor: 'start', size: 10.5, fill: C.muted });
  });
  return {
    html: svg(640, 275, g),
    caption: 'A weight is literally the slope: bigger magnitude = steeper response; the sign decides whether the input excites or inhibits.'
  };
}

function q1Bias() {
  const box = { x: 46, y: 18, w: 560, h: 230 };
  const xr = [-5, 5], yr = [-4, 7];
  const s = scale(box, xr, yr);
  const pts = [[-4.2, 0.1], [-3.1, 0.6], [-2, 1.1], [-1.1, 2.1], [0, 2.2], [0.9, 2.9], [2.1, 3.1], [3, 4.1], [4.1, 4.4]];
  const cl = clipBox(box);
  let g = cl.def + axes(box, s, xr, yr, { xTicks: [-4, -2, 2, 4], yTicks: [-2, 2, 4, 6], xLabel: 'x', yLabel: 'y' });
  g += circ(s.sx(0), s.sy(0), 6, { stroke: C.rose, sw: 1.6, extra: 'class="lv-origin"' });
  g += T(s.sx(0) + 10, s.sy(0) + 13, 'origin (0,0)', { anchor: 'start', size: 10, fill: C.rose });
  pts.forEach(([x, y]) => { g += circ(s.sx(x), s.sy(y), 4.5, { fill: C.cyan, stroke: '#0b1222', sw: 1.2 }); });
  g += `<g ${cl.attr}><path data-line d="" stroke="${C.amber}" stroke-width="2.8" fill="none"/><g data-res></g></g>`;
  const html = `
    <div class="lv-interactive">
      ${svg(640, 268, g)}
      <div class="lv-controls">
        <label>Bias <code>b</code> <input type="range" min="-3" max="4" step="0.1" value="0" data-b aria-label="bias"> <b data-bv>0.0</b></label>
        <span class="lv-readout" data-msg></span>
      </div>
    </div>`;
  const mount = (root) => {
    const input = root.querySelector('[data-b]');
    const ln = root.querySelector('[data-line]');
    const res = root.querySelector('[data-res]');
    const msg = root.querySelector('[data-msg]');
    const update = () => {
      const b = parseFloat(input.value);
      ln.setAttribute('d', fnPath(x => 0.5 * x + b, s, xr, 2));
      let r = '', mse = 0;
      pts.forEach(([x, y]) => {
        const yh = 0.5 * x + b;
        mse += (y - yh) ** 2;
        r += line(s.sx(x), s.sy(y), s.sx(x), s.sy(yh), C.rose, 1.2, 'stroke-dasharray="3 3" opacity="0.8"');
      });
      mse /= pts.length;
      res.innerHTML = r;
      root.querySelector('[data-bv]').textContent = b.toFixed(1);
      msg.innerHTML = Math.abs(b) < 0.05
        ? `⚠️ <b>Origin trap!</b> Line forced through (0,0) — error ${mse.toFixed(2)}`
        : (mse < 0.25 ? `✅ <b>Great fit</b> — error ${mse.toFixed(2)}` : `Error (MSE): <b>${mse.toFixed(2)}</b>`);
      msg.className = `lv-readout ${mse < 0.25 ? 'good' : (Math.abs(b) < 0.05 ? 'bad' : '')}`;
    };
    input.addEventListener('input', update);
    update();
  };
  return {
    html,
    mount,
    caption: '<b>Try it:</b> the slope is fixed at 0.5. Without bias (b = 0) the line is pinned to the origin — slide <i>b</i> to lift it onto the data.'
  };
}

/* ==========================================================================
   QUEST 2 — ACTIVATIONS
   ========================================================================== */
function q2Collapse() {
  const block = (x, y, w, label, color, sub) =>
    rect(x, y - 20, w, 40, { fill: tint(color, 0.14), stroke: color, rx: 8 }) +
    T(x + w / 2, y - (sub ? 4 : 0), label, { size: 14, weight: 700, italic: true }) +
    (sub ? T(x + w / 2, y + 11, sub, { size: 9, fill: C.muted }) : '');
  let g = '';
  g += T(20, 30, 'Three linear layers, no activation…', { anchor: 'start', size: 12, fill: C.muted, weight: 600 });
  const y1 = 72;
  g += block(20, y1, 50, 'x', C.cyan);
  [0, 1, 2].forEach(i => {
    const x = 110 + i * 150;
    g += arrow(x - 38, y1, x - 4, y1, 'muted');
    g += block(x, y1, 90, `W${SUB[i + 1]}x + b${SUB[i + 1]}`, C.violet, 'linear');
    if (i < 2) g += T(x + 112, y1 - 26, 'no σ', { size: 9.5, fill: C.rose, weight: 700 });
  });
  g += arrow(532, y1, 566, y1, 'muted');
  g += block(570, y1, 50, 'y', C.emerald);
  g += T(320, 128, '⇓  multiply the matrices out  ⇓', { size: 13, fill: C.amber, weight: 700 });
  g += T(20, 160, '…are mathematically identical to ONE linear layer', { anchor: 'start', size: 12, fill: C.muted, weight: 600 });
  const y2 = 205;
  g += block(150, y2, 50, 'x', C.cyan);
  g += arrow(204, y2, 246, y2, 'muted');
  g += block(250, y2, 160, 'W* x + b*', C.rose, 'W* = W₃W₂W₁');
  g += arrow(414, y2, 456, y2, 'muted');
  g += block(460, y2, 50, 'y', C.emerald);
  return {
    html: svg(640, 240, g),
    caption: 'Depth without non-linearity is an illusion: any stack of linear layers collapses into a single matrix multiply.'
  };
}

function q2Xor() {
  let g = '';
  // Left panel: raw XOR space
  const b1 = { x: 40, y: 34, w: 200, h: 180 };
  const s1 = scale(b1, [-0.3, 1.3], [-0.3, 1.3]);
  g += T(b1.x + b1.w / 2, 16, 'Input space (x₁, x₂)', { size: 12, weight: 700 });
  g += axes(b1, s1, [-0.3, 1.3], [-0.3, 1.3], { xTicks: [0, 1], yTicks: [0, 1], zeroAxes: false });
  g += line(s1.sx(-0.3), s1.sy(1.0), s1.sx(1.3), s1.sy(0.2), C.muted, 1.5, 'stroke-dasharray="5 4"');
  g += line(s1.sx(0.2), s1.sy(-0.3), s1.sx(0.95), s1.sy(1.3), C.muted, 1.5, 'stroke-dasharray="5 4"');
  g += T(b1.x + b1.w - 14, b1.y + 16, '✗', { size: 18, fill: C.rose, weight: 800 });
  const xorPts = [[0, 0, 0], [1, 1, 0], [0, 1, 1], [1, 0, 1]];
  xorPts.forEach(([a, b, c]) => {
    g += circ(s1.sx(a), s1.sy(b), 9, { fill: c ? C.cyan : C.rose, stroke: '#0b1222', sw: 2 });
    g += T(s1.sx(a), s1.sy(b) + 0.5, c, { size: 10, weight: 800, fill: '#0b1222' });
  });
  g += T(b1.x + b1.w / 2, b1.y + b1.h + 26, 'No single straight line separates them', { size: 10.5, fill: C.rose });

  // Middle arrow
  g += arrow(262, 124, 372, 124, 'amber', 2.4);
  g += T(317, 104, 'hidden layer', { size: 11, fill: C.amber, weight: 700 });
  g += T(317, 145, 'h = ReLU(Wx + b)', { size: 10.5, fill: C.muted, mono: true });

  // Right panel: transformed space h1 = relu(x1+x2), h2 = relu(x1+x2-1)
  const b2 = { x: 400, y: 34, w: 200, h: 180 };
  const xr = [-0.3, 2.3], yr = [-0.3, 1.3];
  const s2 = scale(b2, xr, yr);
  const cl = clipBox(b2);
  g += T(b2.x + b2.w / 2, 16, 'Hidden space (h₁, h₂)', { size: 12, weight: 700 });
  g += cl.def + axes(b2, s2, xr, yr, { xTicks: [0, 1, 2], yTicks: [0, 1], zeroAxes: false });
  g += `<g ${cl.attr}>` + path(fnPath(h1 => (h1 - 0.5) / 2, s2, xr, 2), { stroke: C.emerald, sw: 2.6, extra: 'class="lv-draw"' }) + '</g>';
  const mapped = [[0, 0, 0], [2, 1, 0], [1, 0, 1]];
  mapped.forEach(([a, b, c]) => {
    g += circ(s2.sx(a), s2.sy(b), 9, { fill: c ? C.cyan : C.rose, stroke: '#0b1222', sw: 2 });
    g += T(s2.sx(a), s2.sy(b) + 0.5, c, { size: 10, weight: 800, fill: '#0b1222' });
  });
  g += T(s2.sx(1) + 18, s2.sy(0) - 14, '×2', { size: 9.5, fill: C.cyan, weight: 700 });
  g += T(b2.x + b2.w - 14, b2.y + 16, '✓', { size: 18, fill: C.emerald, weight: 800 });
  g += T(b2.x + b2.w / 2, b2.y + b2.h + 26, 'Space is folded — now one line works', { size: 10.5, fill: C.emerald });
  return {
    html: svg(640, 250, g),
    caption: 'XOR: the ReLU hidden layer folds the plane so (0,1) and (1,0) land on the same spot — then a straight cut separates the classes.'
  };
}

function q2Activations() {
  const fns = [
    { n: 'ReLU', f: x => Math.max(0, x), yr: [-1, 4], c: C.cyan, r: 'range [0, ∞)' },
    { n: 'Sigmoid', f: x => 1 / (1 + Math.exp(-x)), yr: [-0.25, 1.25], c: C.violet, r: 'range (0, 1)' },
    { n: 'Tanh', f: x => Math.tanh(x), yr: [-1.3, 1.3], c: C.emerald, r: 'range (−1, 1)' },
    { n: 'Leaky ReLU', f: x => (x > 0 ? x : 0.15 * x), yr: [-1, 4], c: C.amber, r: 'small slope for x < 0' }
  ];
  let g = '';
  fns.forEach((F, i) => {
    const box = { x: 14 + i * 157, y: 34, w: 140, h: 120 };
    const xr = [-4, 4];
    const s = scale(box, xr, F.yr);
    const cl = clipBox(box);
    g += T(box.x + box.w / 2, 16, F.n, { size: 13, weight: 800, fill: F.c });
    g += cl.def + axes(box, s, xr, F.yr, {});
    g += `<g ${cl.attr}>` + path(fnPath(F.f, s, xr), { stroke: F.c, sw: 2.8, extra: `class="lv-draw" style="animation-delay:${i * 0.12}s"` }) + '</g>';
    if (F.n === 'Sigmoid') {
      g += line(box.x, s.sy(1), box.x + box.w, s.sy(1), F.c, 1, 'stroke-dasharray="3 3" opacity="0.5"');
    }
    if (F.n === 'Tanh') {
      [1, -1].forEach(v => { g += line(box.x, s.sy(v), box.x + box.w, s.sy(v), F.c, 1, 'stroke-dasharray="3 3" opacity="0.5"'); });
    }
    g += T(box.x + box.w / 2, box.y + box.h + 16, F.r, { size: 10, fill: C.muted });
  });
  return {
    html: svg(640, 180, g),
    caption: 'The four classic activation curves. Note how Sigmoid and Tanh flatten out at the extremes — that flatness is what causes vanishing gradients.'
  };
}

function q2Cheatsheet() {
  const cards = [
    { icon: '🧱', where: 'Hidden layers', act: 'ReLU / GELU', why: 'fast, healthy gradients', c: 'cyan' },
    { icon: '🔘', where: 'Binary output', act: 'Sigmoid', why: 'one probability in (0, 1)', c: 'violet' },
    { icon: '🗂️', where: 'Multi-class output', act: 'Softmax', why: 'probabilities sum to 1', c: 'amber' },
    { icon: '📈', where: 'Regression output', act: 'Linear (none)', why: 'unbounded real numbers', c: 'emerald' }
  ];
  const html = `<div class="lv-cheat-grid">${cards.map(k => `
      <div class="lv-cheat-card lv-c-${k.c}">
        <div class="lv-cheat-icon">${k.icon}</div>
        <div class="lv-cheat-where">${k.where}</div>
        <div class="lv-cheat-act">${k.act}</div>
        <div class="lv-cheat-why">${k.why}</div>
      </div>`).join('')}</div>`;
  return { html, caption: 'Quick decision guide: where the layer sits determines which activation it should use.' };
}

/* ==========================================================================
   QUEST 3 — GRADIENT DESCENT
   ========================================================================== */
function q3Loss() {
  const box = { x: 40, y: 18, w: 400, h: 250 }; // 50px per unit on both axes → true squares
  const xr = [0, 8], yr = [0, 5];
  const s = scale(box, xr, yr);
  const fit = x => 0.5 * x + 0.6;
  const pts = [[1, 1.7], [2, 1.1], [3, 2.5], [4, 1.9], [5, 3.4], [6, 4.4], [7, 3.7]];
  let g = axes(box, s, xr, yr, { xTicks: [2, 4, 6], yTicks: [1, 2, 3, 4], xLabel: 'x', yLabel: 'y' });
  let sse = 0;
  pts.forEach(([x, y], i) => {
    const yh = fit(x), r = y - yh, side = Math.abs(r) * 50;
    sse += r * r;
    const top = Math.min(s.sy(y), s.sy(yh));
    g += rect(s.sx(x), top, side, side, { fill: tint(C.rose, 0.16), stroke: tint(C.rose, 0.5), rx: 1, sw: 1, extra: `class="lv-pop" style="animation-delay:${0.3 + i * 0.08}s"` });
    g += line(s.sx(x), s.sy(y), s.sx(x), s.sy(yh), C.rose, 1.8);
  });
  g += path(fnPath(fit, s, xr, 2), { stroke: C.amber, sw: 2.6 });
  pts.forEach(([x, y]) => { g += circ(s.sx(x), s.sy(y), 5, { fill: C.cyan, stroke: '#0b1222', sw: 1.5 }); });
  // legend
  const lx = 470;
  g += circ(lx + 6, 50, 5, { fill: C.cyan }) + T(lx + 20, 50, 'true value y', { anchor: 'start', size: 11.5 });
  g += line(lx, 78, lx + 14, 78, C.amber, 3) + T(lx + 20, 78, 'prediction ŷ', { anchor: 'start', size: 11.5 });
  g += line(lx + 7, 98, lx + 7, 116, C.rose, 2) + T(lx + 20, 107, 'error (y − ŷ)', { anchor: 'start', size: 11.5 });
  g += rect(lx, 128, 14, 14, { fill: tint(C.rose, 0.2), stroke: tint(C.rose, 0.6), rx: 1 }) + T(lx + 20, 135, 'squared error', { anchor: 'start', size: 11.5 });
  g += rect(lx - 6, 166, 160, 64, { fill: 'rgba(2,6,23,0.6)', stroke: tint(C.amber, 0.5), rx: 10 });
  g += T(lx + 74, 186, 'MSE = mean area', { size: 11, fill: C.muted });
  g += T(lx + 74, 210, (sse / pts.length).toFixed(3), { size: 20, fill: C.amber, weight: 800, mono: true });
  return {
    html: svg(640, 290, g),
    caption: 'Mean Squared Error, visualised: each red square\'s area is one squared mistake. Training shrinks the average square.'
  };
}

function q3Gradient() {
  const box = { x: 40, y: 20, w: 560, h: 220 };
  const xr = [-4, 6], yr = [0, 11];
  const s = scale(box, xr, yr);
  const L = w => 0.4 * (w - 1) ** 2;
  const dL = w => 0.8 * (w - 1);
  const w0 = -2;
  let g = axes(box, s, xr, yr, { xTicks: [-3, -1, 1, 3, 5], yTicks: [2, 4, 6, 8, 10], xLabel: 'weight w', yLabel: 'loss L(w)', zeroAxes: false });
  g += path(fnPath(L, s, xr), { stroke: C.violet, sw: 3 });
  // tangent
  const m = dL(w0);
  g += line(s.sx(w0 - 1.4), s.sy(L(w0) - 1.4 * m), s.sx(w0 + 1.4), s.sy(L(w0) + 1.4 * m), C.amber, 1.6, 'stroke-dasharray="5 4"');
  g += T(s.sx(w0 + 1.6), s.sy(L(w0) + 1.4 * m) + 2, `slope = ${m.toFixed(1)}`, { anchor: 'start', size: 11, fill: C.amber, mono: true });
  // arrows
  const ux = 0.55;
  g += arrow(s.sx(w0), s.sy(L(w0)), s.sx(w0 - ux * 1.6), s.sy(L(w0) - ux * 1.6 * m), 'rose', 2.6);
  g += T(s.sx(w0 - 1.2), s.sy(L(w0) - 1.2 * m) - 16, '∇L points uphill', { size: 11, fill: C.rose, weight: 700 });
  g += arrow(s.sx(w0), s.sy(L(w0)), s.sx(w0 + ux * 1.6), s.sy(L(w0) + ux * 1.6 * m), 'emerald', 2.6);
  g += T(s.sx(w0 + 1.15), s.sy(L(w0) + 1.15 * m) + 30, '−∇L: step downhill', { size: 11, fill: C.emerald, weight: 700 });
  g += circ(s.sx(w0), s.sy(L(w0)), 6, { fill: C.amber, stroke: '#0b1222', sw: 2 });
  // minimum
  g += line(s.sx(1), s.sy(0), s.sx(1), s.sy(0) - 8, C.emerald, 2);
  g += T(s.sx(1), s.sy(0) - 18, 'minimum', { size: 10.5, fill: C.emerald, weight: 700 });
  // rolling ball along descent path
  let ballPath = '';
  let w = -3.6;
  for (let i = 0; i < 26; i++) { ballPath += `${i ? 'L' : 'M'}${s.sx(w).toFixed(1)},${(s.sy(L(w)) - 8).toFixed(1)}`; w -= 0.12 * dL(w); }
  g += `<circle r="7" fill="${C.cyan}" stroke="#0b1222" stroke-width="2"><animateMotion dur="4s" repeatCount="indefinite" path="${ballPath}" keyPoints="0;1;1" keyTimes="0;0.75;1" calcMode="linear"/></circle>`;
  return {
    html: svg(640, 262, g),
    caption: 'The gradient is the local slope. It points uphill, so gradient descent always steps the opposite way — the ball settles at the minimum.'
  };
}

function q3LearningRate() {
  const cases = [
    { t: 'Too small (α = 0.03)', lr: 0.03, n: 10, c: C.blue, v: 'crawls… still far away' },
    { t: 'Just right (α = 0.3)', lr: 0.3, n: 6, c: C.emerald, v: 'converges smoothly ✓' },
    { t: 'Too large (α = 1.05)', lr: 1.05, n: 6, c: C.rose, v: 'overshoots & explodes ✗' }
  ];
  let g = '';
  cases.forEach((k, i) => {
    const box = { x: 14 + i * 210, y: 32, w: 192, h: 150 };
    const xr = [-3.4, 3.4], yr = [0, 11.5];
    const s = scale(box, xr, yr);
    const cl = clipBox(box);
    g += T(box.x + box.w / 2, 14, k.t, { size: 12, weight: 800, fill: k.c });
    g += cl.def + axes(box, s, xr, yr, { zeroAxes: false });
    g += `<g ${cl.attr}>`;
    g += path(fnPath(w => w * w, s, xr), { stroke: tint('#a78bfa', 0.75), sw: 2.2 });
    let w = -2.6;
    const ptsArr = [w];
    for (let j = 0; j < k.n; j++) { w = w - k.lr * 2 * w; ptsArr.push(w); }
    for (let j = 0; j < ptsArr.length - 1; j++) {
      const a = ptsArr[j], b = ptsArr[j + 1];
      g += arrow(s.sx(a), s.sy(a * a), s.sx(b), s.sy(b * b), k.lr > 1 ? 'rose' : (k.lr < 0.1 ? 'blue' : 'emerald'), 1.6, `class="lv-fade-in" style="animation-delay:${j * 0.18}s"`);
    }
    ptsArr.forEach((p, j) => { g += circ(s.sx(p), s.sy(p * p), j === 0 ? 5 : 3.5, { fill: j === 0 ? C.amber : k.c, extra: `class="lv-fade-in" style="animation-delay:${j * 0.18}s"` }); });
    g += '</g>';
    g += T(box.x + box.w / 2, box.y + box.h + 16, k.v, { size: 10.5, fill: C.muted });
  });
  return {
    html: svg(640, 210, g),
    caption: 'Same start point (orange), same valley, three learning rates. Step size alone decides between stalling, converging, and diverging.'
  };
}

function q3Loop() {
  const steps = [
    { code: 'optimizer.zero_grad()', sub: 'clear old gradients', c: C.muted },
    { code: 'out = model(x)', sub: 'forward pass', c: C.cyan },
    { code: 'loss = criterion(out, y)', sub: 'measure the mistake', c: C.rose },
    { code: 'loss.backward()', sub: 'backprop gradients', c: C.violet },
    { code: 'optimizer.step()', sub: 'update weights', c: C.emerald }
  ];
  const cx = 320, cy = 152, R = 108;
  let g = circ(cx, cy, R, { stroke: 'rgba(148,163,184,0.25)', sw: 2, extra: 'stroke-dasharray="6 6" class="lv-spin-dash"' });
  g += T(cx, cy - 8, '🔄', { size: 22 });
  g += T(cx, cy + 16, 'repeat every batch', { size: 11, fill: C.muted });
  steps.forEach((st, i) => {
    const a = (-90 + i * 72) * Math.PI / 180;
    const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
    const w = st.code.length * 6.6 + 34;
    g += `<g class="lv-cycle-node" style="animation-delay:${i * 1}s">`;
    g += rect(x - w / 2, y - 21, w, 42, { fill: '#0b1222', stroke: st.c, rx: 10, sw: 1.6 });
    g += circ(x - w / 2 + 14, y, 9, { fill: st.c });
    g += T(x - w / 2 + 14, y + 0.5, i + 1, { size: 10, weight: 800, fill: '#0b1222' });
    g += T(x - w / 2 + 28, y - 6, st.code, { anchor: 'start', size: 11, mono: true, weight: 700 });
    g += T(x - w / 2 + 28, y + 10, st.sub, { anchor: 'start', size: 9.5, fill: C.muted });
    g += '</g>';
  });
  return {
    html: svg(640, 305, g),
    caption: 'The 5-step PyTorch training ritual. The highlighted step cycles around — every batch runs the full loop once.'
  };
}

/* ==========================================================================
   QUEST 4 — CNN CAPSTONE
   ========================================================================== */
function q4Flatten() {
  let g = '';
  const cs = 26, gx = 30, gy = 40;
  g += T(gx + 2 * cs, 22, '4×4 image', { size: 12, weight: 700 });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    const idx = r * 4 + c;
    const hot = idx === 5 || idx === 9;
    g += rect(gx + c * cs, gy + r * cs, cs - 2, cs - 2, { fill: hot ? tint(C.amber, 0.55) : 'rgba(148,163,184,0.12)', stroke: hot ? C.amber : 'rgba(148,163,184,0.25)', rx: 3, sw: 1 });
    g += T(gx + c * cs + cs / 2 - 1, gy + r * cs + cs / 2 - 1, idx, { size: 9, fill: hot ? '#0b1222' : C.dim, mono: true, weight: 700 });
  }
  g += T(gx + 2 * cs, gy + 4 * cs + 14, 'pixels 5 & 9 are neighbours ↕', { size: 10, fill: C.amber });
  g += arrow(150, 92, 200, 92, 'amber', 2.2);
  g += T(175, 78, 'flatten', { size: 10.5, fill: C.amber, weight: 700 });
  const sx0 = 210, cw = 25;
  g += T(sx0 + 8 * cw, 22, '1D vector of 16', { size: 12, weight: 700 });
  for (let i = 0; i < 16; i++) {
    const hot = i === 5 || i === 9;
    g += rect(sx0 + i * cw, 80, cw - 2, 26, { fill: hot ? tint(C.amber, 0.55) : 'rgba(148,163,184,0.12)', stroke: hot ? C.amber : 'rgba(148,163,184,0.25)', rx: 3, sw: 1 });
    g += T(sx0 + i * cw + cw / 2 - 1, 93, i, { size: 9, fill: hot ? '#0b1222' : C.dim, mono: true, weight: 700 });
  }
  g += path(`M${sx0 + 5 * cw + 11},112 Q${sx0 + 7 * cw + 11},140 ${sx0 + 9 * cw + 11},112`, { stroke: C.rose, sw: 1.6, extra: 'stroke-dasharray="4 3"' });
  g += T(sx0 + 7 * cw + 11, 146, 'now 4 slots apart (28 apart in a 28×28 doodle)', { size: 10, fill: C.rose });
  // parameter comparison (log scale)
  g += line(20, 182, 620, 182, 'rgba(148,163,184,0.15)', 1);
  g += T(20, 202, 'Weights needed for a 1000×1000 RGB image (log scale)', { anchor: 'start', size: 11.5, weight: 700 });
  const maxLog = Math.log10(3e9);
  const bars = [
    { l: 'Dense layer (1,000 neurons)', v: 3e9, txt: '3,000,000,000', c: C.rose },
    { l: 'One 3×3 conv filter', v: 10, txt: '10', c: C.emerald }
  ];
  bars.forEach((b, i) => {
    const y = 222 + i * 30;
    const w = Math.max(6, (Math.log10(b.v) / maxLog) * 360);
    g += T(20, y + 9, b.l, { anchor: 'start', size: 11, fill: C.muted });
    g += rect(200, y, w, 18, { fill: tint(b.c, 0.35), stroke: b.c, rx: 4, sw: 1, extra: 'class="lv-grow"' });
    g += T(206 + w, y + 9.5, b.txt, { anchor: 'start', size: 11, fill: b.c, weight: 800, mono: true });
  });
  return {
    html: svg(640, 285, g),
    caption: 'Flattening destroys neighbourhoods, and dense layers explode in size. Convolutions keep 2D structure with a handful of shared weights.'
  };
}

function q4Sliding() {
  const N = 8, cs = 24, gx = 40, gy = 34;
  // a little "curve" motif drawn twice: top-left and bottom-right
  const on = new Set(['1,2', '2,1', '2,3', '3,2', '4,5', '5,4', '5,6', '6,5']);
  let g = T(gx + N * cs / 2, 16, 'Input doodle (8×8)', { size: 12, weight: 700 });
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    g += rect(gx + c * cs, gy + r * cs, cs - 2, cs - 2, { fill: on.has(`${r},${c}`) ? C.text : 'rgba(148,163,184,0.1)', rx: 2 });
  }
  // animated window raster scan over 6x6 positions
  const xs = [], ys = [];
  for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) { xs.push(gx + c * cs - 2); ys.push(gy + r * cs - 2); }
  g += `<rect width="${3 * cs + 2}" height="${3 * cs + 2}" rx="4" fill="${tint(C.cyan, 0.12)}" stroke="${C.cyan}" stroke-width="2.4">
    <animate attributeName="x" dur="9s" repeatCount="indefinite" calcMode="discrete" values="${xs.join(';')}"/>
    <animate attributeName="y" dur="9s" repeatCount="indefinite" calcMode="discrete" values="${ys.join(';')}"/>
  </rect>`;
  // kernel
  const kx = 290, ky = 80;
  g += T(kx + 36, 52, 'Same 3×3 filter', { size: 12, weight: 700, fill: C.cyan });
  const K = [[0, 1, 0], [1, 0, 1], [0, 1, 0]];
  K.forEach((row, r) => row.forEach((v, c) => {
    g += rect(kx + c * 24, ky + r * 24, 22, 22, { fill: v ? tint(C.cyan, 0.5) : 'rgba(148,163,184,0.08)', stroke: tint(C.cyan, 0.4), rx: 3, sw: 1 });
  }));
  g += T(kx + 36, ky + 92, '9 shared weights', { size: 10.5, fill: C.muted });
  g += arrow(kx + 90, 116, kx + 130, 116, 'cyan', 2);
  // feature map (6x6)
  const fx = 440, fy = 46, fs = 26;
  g += T(fx + 3 * fs, 22, 'Feature map', { size: 12, weight: 700 });
  for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) {
    const hit = (r === 1 && c === 1) || (r === 4 && c === 4);
    g += rect(fx + c * fs, fy + r * fs, fs - 3, fs - 3, { fill: hit ? C.amber : 'rgba(148,163,184,0.08)', rx: 3, extra: hit ? 'class="lv-pulse"' : '' });
  }
  g += T(fx + 3 * fs, fy + 6 * fs + 14, 'pattern found top-left AND bottom-right', { size: 10, fill: C.amber });
  return {
    html: svg(640, 245, g),
    caption: 'One filter slides everywhere (weight sharing), so the same motif lights up the feature map wherever it appears — translation invariance.'
  };
}

function q4Hierarchy() {
  let g = '';
  const panels = [
    { x: 20, t: 'Layer 1 · Edges', c: C.cyan },
    { x: 232, t: 'Layer 2 · Parts', c: C.violet },
    { x: 444, t: 'Layer 3 · Objects', c: C.amber }
  ];
  panels.forEach((p, i) => {
    g += rect(p.x, 30, 176, 160, { fill: tint(p.c, 0.06), stroke: tint(p.c, 0.45), rx: 12 });
    g += T(p.x + 88, 16, p.t, { size: 12.5, weight: 800, fill: p.c });
    if (i < 2) g += arrow(p.x + 182, 110, p.x + 206, 110, 'muted', 2);
  });
  // edges: small oriented strokes
  const angles = [0, 45, 90, 135, 20, 160, 70, 110, 0];
  angles.forEach((a, i) => {
    const cx = 50 + (i % 3) * 58, cy = 62 + Math.floor(i / 3) * 46;
    const r = 14, rad = a * Math.PI / 180;
    g += line(cx - r * Math.cos(rad), cy - r * Math.sin(rad), cx + r * Math.cos(rad), cy + r * Math.sin(rad), C.cyan, 3.2, 'stroke-linecap="round"');
  });
  // parts
  const px = 232;
  g += path(`M${px + 30},90 Q${px + 55},50 ${px + 80},90`, { stroke: C.violet, sw: 3.2 });
  g += path(`M${px + 110},60 L${px + 110},95 L${px + 145},95`, { stroke: C.violet, sw: 3.2 });
  g += circ(px + 55, 145, 20, { stroke: C.violet, sw: 3.2 });
  g += path(`M${px + 110},165 L${px + 128},125 L${px + 146},165 Z`, { stroke: C.violet, sw: 3.2 });
  g += T(px + 55, 105, 'curve', { size: 9.5, fill: C.muted });
  g += T(px + 128, 108, 'corner', { size: 9.5, fill: C.muted });
  // object: cat face
  const ox = 532, oy = 118;
  g += path(`M${ox - 38},${oy - 18} L${ox - 30},${oy - 62} L${ox - 8},${oy - 36}`, { stroke: C.amber, sw: 3 });
  g += path(`M${ox + 38},${oy - 18} L${ox + 30},${oy - 62} L${ox + 8},${oy - 36}`, { stroke: C.amber, sw: 3 });
  g += circ(ox, oy, 42, { stroke: C.amber, sw: 3, fill: '#0b1222' });
  g += circ(ox - 15, oy - 8, 4, { fill: C.amber }) + circ(ox + 15, oy - 8, 4, { fill: C.amber });
  g += path(`M${ox - 5},${oy + 6} L${ox + 5},${oy + 6} L${ox},${oy + 12} Z`, { stroke: C.amber, sw: 2, fill: C.amber });
  [-1, 1].forEach(d => { [-6, 2, 10].forEach(dy => { g += line(ox + d * 12, oy + 10, ox + d * 52, oy + dy, C.amber, 1.6); }); });
  g += T(ox, 180, '“Cat 🐱” — 97%', { size: 11, fill: C.amber, weight: 700 });
  return {
    html: svg(640, 205, g),
    caption: 'Each layer composes the previous one: edges → curves & corners → whole objects. Depth = increasingly abstract features.'
  };
}

function q4Pool() {
  const M = [[1, 3, 2, 1], [4, 8, 0, 5], [2, 1, 7, 3], [0, 6, 2, 9]];
  const qc = [C.cyan, C.violet, C.amber, C.emerald];
  const quad = (r, c) => (r < 2 ? 0 : 2) + (c < 2 ? 0 : 1);
  const cs = 44, gx = 60, gy = 40;
  let g = T(gx + 2 * cs, 20, '4×4 feature map', { size: 12, weight: 700 });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    const q = quad(r, c), col = qc[q];
    const qv = [];
    for (let rr = 0; rr < 4; rr++) for (let cc = 0; cc < 4; cc++) if (quad(rr, cc) === q) qv.push(M[rr][cc]);
    const isMax = M[r][c] === Math.max(...qv);
    g += rect(gx + c * cs, gy + r * cs, cs - 4, cs - 4, { fill: tint(col, isMax ? 0.45 : 0.12), stroke: isMax ? col : tint(col, 0.35), rx: 6, sw: isMax ? 2.2 : 1 });
    g += T(gx + c * cs + cs / 2 - 2, gy + r * cs + cs / 2 - 2, M[r][c], { size: 15, weight: isMax ? 800 : 500, fill: isMax ? '#fff' : C.muted, mono: true });
  }
  g += arrow(250, 124, 340, 124, 'amber', 2.4);
  g += T(295, 104, 'MaxPool2d(2, 2)', { size: 11, fill: C.amber, weight: 700, mono: true });
  g += T(295, 144, 'keep the max of each 2×2', { size: 10, fill: C.muted });
  const ox = 380, oy = 62, os = 60;
  g += T(ox + os, 20, '2×2 output', { size: 12, weight: 700 });
  [[8, 5], [6, 9]].forEach((row, r) => row.forEach((v, c) => {
    const col = qc[r * 2 + c];
    g += rect(ox + c * os, oy + r * os, os - 6, os - 6, { fill: tint(col, 0.4), stroke: col, rx: 8, sw: 2, extra: `class="lv-pop" style="animation-delay:${0.2 + (r * 2 + c) * 0.15}s"` });
    g += T(ox + c * os + os / 2 - 3, oy + r * os + os / 2 - 3, v, { size: 20, weight: 800, fill: '#fff', mono: true });
  }));
  g += T(ox + os, oy + 2 * os + 18, '75% fewer values', { size: 10.5, fill: C.emerald, weight: 700 });
  return {
    html: svg(640, 230, g),
    caption: 'Max pooling summarises each 2×2 block by its strongest activation — the image halves in each direction, the important signals survive.'
  };
}

function q4Softmax() {
  const cls = ['Cat 🐱', 'Bicycle 🚲', 'Star ⭐', 'Pizza 🍕', 'Umbrella ☂️'];
  const z = [2.5, -0.8, 8.1, 1.2, 0.4];
  const p = softmax(z);
  let g = '';
  g += T(160, 16, 'Raw logits z (any real number)', { size: 12, weight: 700, fill: C.violet });
  g += T(480, 16, 'Softmax probabilities (sum = 1)', { size: 12, weight: 700, fill: C.emerald });
  const zx0 = 140; // zero line for logits
  cls.forEach((c, i) => {
    const y = 40 + i * 34;
    g += T(70, y + 10, c, { size: 11.5, anchor: 'middle' });
    const w = z[i] * 18;
    g += rect(w >= 0 ? zx0 : zx0 + w, y, Math.abs(w), 20, { fill: tint(z[i] >= 0 ? '#a78bfa' : '#fb7185', 0.45), stroke: z[i] >= 0 ? C.violet : C.rose, rx: 3, sw: 1, extra: 'class="lv-grow"' });
    g += T(w >= 0 ? zx0 + w + 6 : zx0 + w - 6, y + 10.5, z[i].toFixed(1), { size: 10.5, anchor: w >= 0 ? 'start' : 'end', mono: true, fill: C.text });
    const pw = Math.max(2, p[i] * 190);
    g += rect(380, y, pw, 20, { fill: tint(C.emerald, i === 2 ? 0.6 : 0.3), stroke: C.emerald, rx: 3, sw: 1, extra: 'class="lv-grow"' });
    g += T(386 + pw, y + 10.5, `${(p[i] * 100).toFixed(p[i] > 0.1 ? 1 : 2)}%`, { size: 10.5, anchor: 'start', mono: true, weight: i === 2 ? 800 : 500, fill: i === 2 ? C.emerald : C.muted });
  });
  g += line(zx0, 34, zx0, 214, C.axis, 1);
  g += arrow(320, 120, 360, 120, 'amber', 2.2);
  g += T(340, 102, 'eᶻ / Σeᶻ', { size: 11, fill: C.amber, weight: 700 });
  return {
    html: svg(640, 225, g),
    caption: 'Softmax exponentiates and normalises the logits: the Star score of 8.1 dominates and becomes ~99.5% confidence.'
  };
}

/* ==========================================================================
   QUEST 5 — KERNEL DETECTIVE
   ========================================================================== */
function q5Conv() {
  const X = [[0, 0, 0, 0, 0], [0, 1, 1, 1, 0], [0, 1, 1, 1, 0], [0, 1, 1, 1, 0], [0, 0, 0, 0, 0]];
  const K = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
  const out = [0, 1, 2].map(i => [0, 1, 2].map(j => {
    let s = 0; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) s += K[r][c] * X[i + r][j + c]; return s;
  }));
  const html = `
    <div class="lv-conv">
      <div class="lv-conv-row">
        <div class="lv-conv-block"><div class="lv-conv-title">Input (5×5)</div>
          <div class="lv-grid g5">${X.flat().map((v, k) => `<div class="lv-cell ${v ? 'on' : ''}" data-in="${k}">${v}</div>`).join('')}</div></div>
        <div class="lv-conv-op">⊛</div>
        <div class="lv-conv-block"><div class="lv-conv-title">Sobel-H kernel</div>
          <div class="lv-grid g3">${K.flat().map(v => `<div class="lv-cell k ${v > 0 ? 'pos' : v < 0 ? 'neg' : ''}">${v}</div>`).join('')}</div></div>
        <div class="lv-conv-op">=</div>
        <div class="lv-conv-block"><div class="lv-conv-title">Output (3×3)</div>
          <div class="lv-grid g3">${out.flat().map((_, k) => `<div class="lv-cell o" data-out="${k}">?</div>`).join('')}</div></div>
      </div>
      <div class="lv-conv-math" data-math></div>
      <div class="lv-controls">
        <button class="lv-btn" data-play>⏸ Pause</button>
        <button class="lv-btn" data-step>Step ➜</button>
        <span class="lv-readout">Top edge → <b style="color:#22d3ee">positive</b>, bottom edge → <b style="color:#fb7185">negative</b>, flat area → 0</span>
      </div>
    </div>`;
  const mount = (root) => {
    let pos = -1, playing = true;
    const ins = [...root.querySelectorAll('[data-in]')];
    const outs = [...root.querySelectorAll('[data-out]')];
    const math = root.querySelector('[data-math]');
    const step = () => {
      pos = (pos + 1) % 9;
      if (pos === 0) outs.forEach(o => { o.textContent = '?'; o.className = 'lv-cell o'; });
      const i = Math.floor(pos / 3), j = pos % 3;
      ins.forEach(c => c.classList.remove('win'));
      const terms = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        ins[(i + r) * 5 + (j + c)].classList.add('win');
        const xv = X[i + r][j + c];
        if (K[r][c] !== 0 && xv !== 0) terms.push(`(${K[r][c]})\\cdot ${xv}`);
      }
      const v = out[i][j];
      outs.forEach(o => o.classList.remove('cur'));
      const o = outs[pos];
      o.textContent = v;
      o.className = `lv-cell o done cur ${v > 0 ? 'pos' : v < 0 ? 'neg' : ''}`;
      math.innerHTML = tex(`\\text{out}(${i},${j}) = ${terms.length ? terms.join(' + ') : '\\text{all products are } 0'} = \\mathbf{${v}}`);
    };
    step();
    const stop = visibleInterval(root, () => { if (playing) step(); }, 1500);
    const playBtn = root.querySelector('[data-play]');
    playBtn.addEventListener('click', () => { playing = !playing; playBtn.textContent = playing ? '⏸ Pause' : '▶ Play'; });
    root.querySelector('[data-step]').addEventListener('click', () => { playing = false; playBtn.textContent = '▶ Play'; step(); });
    return stop;
  };
  return { html, mount, caption: 'Watch the kernel slide: at each position, multiply overlapping cells, add them up, and write one output pixel. Only non-zero products are shown.' };
}

function q5Filters() {
  const F = [
    { n: 'Sobel Horizontal', k: [[-1, -2, -1], [0, 0, 0], [1, 2, 1]], f: 'horizontal edges' },
    { n: 'Sobel Vertical', k: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], f: 'vertical edges' },
    { n: 'Laplacian', k: [[0, 1, 0], [1, -4, 1], [0, 1, 0]], f: 'outlines (all directions)' },
    { n: 'Gaussian Blur', k: [[1, 2, 1], [2, 4, 2], [1, 2, 1]], f: 'smoothing (÷16)', blur: true }
  ];
  const cell = (v, blur) => {
    const a = blur ? 0.15 + v / 4 * 0.6 : Math.min(0.85, 0.2 + Math.abs(v) / 4 * 0.65);
    const bg = blur ? `rgba(52,211,153,${a})` : v > 0 ? `rgba(34,211,238,${a})` : v < 0 ? `rgba(251,113,133,${a})` : 'rgba(148,163,184,0.08)';
    return `<div class="lv-cell k" style="background:${bg}">${v}</div>`;
  };
  const html = `<div class="lv-filter-grid">${F.map(f => `
      <div class="lv-filter-card">
        <div class="lv-filter-name">${f.n}</div>
        <div class="lv-grid g3 sm">${f.k.flat().map(v => cell(v, f.blur)).join('')}</div>
        <div class="lv-filter-find">finds: <b>${f.f}</b></div>
      </div>`).join('')}</div>
      <div class="lv-legend"><span class="sw pos"></span> positive weight <span class="sw neg"></span> negative weight <span class="sw zero"></span> zero</div>`;
  return { html, caption: 'Hand-crafted kernels as heatmaps. Edge detectors balance positive against negative weights so flat regions cancel out to zero.' };
}

function q5Calculator() {
  const html = `
    <div class="lv-calc">
      <div class="lv-calc-controls">
        <label>Input <b>W</b> <input type="range" min="4" max="14" value="7" data-k="W"><span data-v="W"></span></label>
        <label>Kernel <b>K</b> <input type="range" min="1" max="7" step="2" value="3" data-k="K"><span data-v="K"></span></label>
        <label>Padding <b>P</b> <input type="range" min="0" max="3" value="0" data-k="P"><span data-v="P"></span></label>
        <label>Stride <b>S</b> <input type="range" min="1" max="3" value="1" data-k="S"><span data-v="S"></span></label>
      </div>
      <div class="lv-calc-formula" data-formula></div>
      <div class="lv-calc-strip" data-strip></div>
    </div>`;
  const mount = (root) => {
    const get = k => parseInt(root.querySelector(`[data-k="${k}"]`).value, 10);
    const update = () => {
      const W = get('W'), K = get('K'), P = get('P'), S = get('S');
      ['W', 'K', 'P', 'S'].forEach(k => { root.querySelector(`[data-v="${k}"]`).textContent = get(k); });
      const raw = (W - K + 2 * P) / S;
      const O = Math.floor(raw) + 1;
      const valid = W + 2 * P >= K;
      root.querySelector('[data-formula]').innerHTML = valid
        ? tex(`O = \\left\\lfloor \\frac{${W} - ${K} + 2\\cdot ${P}}{${S}} \\right\\rfloor + 1 = \\left\\lfloor ${+raw.toFixed(2)} \\right\\rfloor + 1 = \\mathbf{${O}}`, true)
        : `<span class="lv-warn">Kernel is larger than the padded input — no valid output.</span>`;
      // strip: padded input with kernel windows
      const total = W + 2 * P;
      const cw = Math.min(34, Math.floor(600 / total));
      const x0 = (640 - total * cw) / 2;
      let g = T(x0, 12, 'one row of the input (padding shown hatched)', { anchor: 'start', size: 10.5, fill: C.muted });
      for (let i = 0; i < total; i++) {
        const pad = i < P || i >= P + W;
        g += rect(x0 + i * cw, 24, cw - 3, 28, { fill: pad ? 'url(#lv-hatch)' : tint(C.cyan, 0.18), stroke: pad ? C.dim : tint(C.cyan, 0.5), rx: 3, sw: 1 });
        if (pad) g += T(x0 + i * cw + (cw - 3) / 2, 38, '0', { size: 10, fill: C.muted, mono: true });
      }
      const colors = [C.amber, C.violet, C.emerald];
      if (valid) {
        for (let o = 0; o < O; o++) {
          const start = o * S;
          const lvl = o % 3, y = 62 + lvl * 14;
          g += rect(x0 + start * cw, y, K * cw - 3, 9, { fill: tint(colors[lvl], 0.45), stroke: colors[lvl], rx: 4, sw: 1, extra: `class="lv-pop" style="animation-delay:${o * 0.05}s"` });
          g += T(x0 + start * cw - 4, y + 5, o + 1, { size: 8.5, anchor: 'end', fill: colors[lvl], mono: true, weight: 700 });
        }
      }
      g += T(320, 118, valid ? `${O} kernel position${O > 1 ? 's' : ''} per row → output is ${O}×${O}` : '', { size: 12, fill: C.amber, weight: 700 });
      const hatch = `<pattern id="lv-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="rgba(148,163,184,0.06)"/><line x1="0" y1="0" x2="0" y2="6" stroke="rgba(148,163,184,0.35)" stroke-width="2"/></pattern>`;
      root.querySelector('[data-strip]').innerHTML = svg(640, 130, `<defs>${hatch}</defs>${g}`);
    };
    root.querySelectorAll('input').forEach(i => i.addEventListener('input', update));
    update();
  };
  return { html, mount, caption: '<b>Try it:</b> change W, K, P and S. Each coloured bar is one place the kernel can sit — count them and you get the output size.' };
}

function q5PadStride() {
  let g = '';
  const cs = 22;
  // Left: same padding
  const lx = 40, ly = 40;
  g += T(lx + 3.5 * cs, 18, 'Padding = 1 (“same”)', { size: 12.5, weight: 800, fill: C.cyan });
  for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
    const pad = r === 0 || c === 0 || r === 6 || c === 6;
    g += rect(lx + c * cs, ly + r * cs, cs - 2, cs - 2, { fill: pad ? 'rgba(148,163,184,0.05)' : tint(C.cyan, 0.2), stroke: pad ? 'rgba(148,163,184,0.35)' : tint(C.cyan, 0.45), rx: 2, sw: 1, extra: pad ? 'stroke-dasharray="2 2"' : '' });
    if (pad) g += T(lx + c * cs + 10, ly + r * cs + 10, '0', { size: 8.5, fill: C.dim, mono: true });
  }
  g += rect(lx - 2, ly - 2, 3 * cs + 2, 3 * cs + 2, { stroke: C.amber, sw: 2.4, rx: 4, extra: 'class="lv-pulse"' });
  g += T(lx + 3.5 * cs, ly + 7 * cs + 16, 'kernel can centre on corner pixels', { size: 10, fill: C.muted });
  g += T(lx + 3.5 * cs, ly + 7 * cs + 32, '5×5 in → 5×5 out', { size: 12, fill: C.emerald, weight: 800, mono: true });
  // Right: stride 2
  const rx0 = 360, ry = 40;
  g += T(rx0 + 3.5 * cs, 18, 'Stride = 2 (skip pixels)', { size: 12.5, weight: 800, fill: C.violet });
  for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
    g += rect(rx0 + c * cs, ry + r * cs, cs - 2, cs - 2, { fill: tint(C.violet, 0.14), stroke: tint(C.violet, 0.35), rx: 2, sw: 1 });
  }
  const cols = [C.amber, C.emerald, C.rose];
  [0, 2, 4].forEach((c, i) => {
    g += rect(rx0 + c * cs - 2 + i * 1.5, ry - 2 + i * 1.5, 3 * cs + 2 - i * 3, 3 * cs + 2 - i * 3, { stroke: cols[i], sw: 2, rx: 4, extra: `class="lv-blink" style="animation-delay:${i * 0.6}s"` });
  });
  g += path(`M${rx0 + cs},${ry - 8} Q${rx0 + 2 * cs},${ry - 22} ${rx0 + 3 * cs},${ry - 8}`, { stroke: C.amber, sw: 1.5, extra: 'marker-end="url(#lv-ar-amber)"' });
  g += path(`M${rx0 + 3 * cs},${ry - 8} Q${rx0 + 4 * cs},${ry - 22} ${rx0 + 5 * cs},${ry - 8}`, { stroke: C.emerald, sw: 1.5, extra: 'marker-end="url(#lv-ar-emerald)"' });
  g += T(rx0 + 7 * cs + 10, ry - 12, 'jump 2', { size: 10, fill: C.muted, anchor: 'start' });
  g += T(rx0 + 3.5 * cs, ry + 7 * cs + 16, 'only 3 positions fit per row', { size: 10, fill: C.muted });
  g += T(rx0 + 3.5 * cs, ry + 7 * cs + 32, '7×7 in → 3×3 out', { size: 12, fill: C.emerald, weight: 800, mono: true });
  return {
    html: svg(640, 240, g),
    caption: 'Padding adds a border of zeros so output size is preserved; stride makes the kernel hop, shrinking the output.'
  };
}

/* ==========================================================================
   QUEST 6 — OVERFITTING
   ========================================================================== */
function q6BiasVariance() {
  const xs = [0, 1, 2, 3, 4, 5, 6, 7];
  const truth = x => Math.sin(x * 0.85) * 1.2;
  const noise = [0.25, -0.3, 0.35, -0.2, 0.3, -0.35, 0.2, -0.25];
  const pts = xs.map((x, i) => [x, truth(x) + noise[i]]);
  const lagrange = x => pts.reduce((acc, [xi, yi], i) => {
    let t = yi; pts.forEach(([xj], j) => { if (j !== i) t *= (x - xj) / (xi - xj); }); return acc + t;
  }, 0);
  const n = pts.length, mx = xs.reduce((a, b) => a + b) / n, my = pts.reduce((a, p) => a + p[1], 0) / n;
  const slope = pts.reduce((a, [x, y]) => a + (x - mx) * (y - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  const linear = x => my + slope * (x - mx);
  const panels = [
    { t: 'Underfitting', sub: 'high bias — too simple', f: linear, c: C.blue },
    { t: 'Good fit', sub: 'captures the signal', f: truth, c: C.emerald },
    { t: 'Overfitting', sub: 'high variance — memorises noise', f: lagrange, c: C.rose }
  ];
  let g = '';
  panels.forEach((p, i) => {
    const box = { x: 14 + i * 210, y: 30, w: 192, h: 150 };
    const xr = [-0.5, 7.5], yr = [-2.4, 2.4];
    const s = scale(box, xr, yr);
    const cl = clipBox(box);
    g += T(box.x + box.w / 2, 14, p.t, { size: 13, weight: 800, fill: p.c });
    g += cl.def + axes(box, s, xr, yr, { zeroAxes: false });
    g += `<g ${cl.attr}>` + path(fnPath(p.f, s, xr, 240), { stroke: p.c, sw: 2.6, extra: `class="lv-draw" style="animation-delay:${i * 0.2}s"` }) + '</g>';
    pts.forEach(([x, y]) => { g += circ(s.sx(x), s.sy(y), 4, { fill: C.text, stroke: '#0b1222', sw: 1.2 }); });
    g += T(box.x + box.w / 2, box.y + box.h + 16, p.sub, { size: 10.5, fill: C.muted });
  });
  return { html: svg(640, 205, g), caption: 'Same noisy data, three models. The overfit curve hits every point exactly — and would be wildly wrong on any new point.' };
}

function q6LossCurves() {
  const box = { x: 50, y: 22, w: 540, h: 200 };
  const xr = [0, 40], yr = [0, 2.8];
  const s = scale(box, xr, yr);
  const train = x => 2.4 * Math.exp(-x / 8) + 0.06;
  const val = x => 2.1 * Math.exp(-x / 7) + 0.42 + (x > 17 ? 0.0032 * (x - 17) ** 2 : 0);
  let best = 0, bv = Infinity;
  for (let x = 0; x <= 40; x += 0.25) if (val(x) < bv) { bv = val(x); best = x; }
  let g = axes(box, s, xr, yr, { xTicks: [10, 20, 30, 40], yTicks: [0.5, 1, 1.5, 2, 2.5], xLabel: 'epoch', yLabel: 'loss', zeroAxes: false });
  g += rect(s.sx(best), box.y, s.sx(40) - s.sx(best), box.h, { fill: tint(C.rose, 0.07), rx: 0 });
  g += T(s.sx(33), box.y + 16, 'overfitting zone', { size: 11, fill: C.rose, weight: 700 });
  g += path(fnPath(train, s, xr), { stroke: C.cyan, sw: 2.8, extra: 'class="lv-draw"' });
  g += path(fnPath(val, s, xr), { stroke: C.amber, sw: 2.8, extra: 'class="lv-draw" style="animation-delay:.2s"' });
  g += line(s.sx(best), box.y, s.sx(best), box.y + box.h, C.emerald, 1.8, 'stroke-dasharray="6 4"');
  g += circ(s.sx(best), s.sy(bv), 6, { fill: C.emerald, stroke: '#0b1222', sw: 2, extra: 'class="lv-pulse"' });
  g += T(s.sx(best) - 8, s.sy(bv) + 22, `⏱ early stop (epoch ${Math.round(best)})`, { size: 11, fill: C.emerald, weight: 700, anchor: 'end' });
  g += line(box.x + 330, 60, box.x + 352, 60, C.cyan, 3) + T(box.x + 358, 60, 'training loss', { anchor: 'start', size: 11.5 });
  g += line(box.x + 330, 80, box.x + 352, 80, C.amber, 3) + T(box.x + 358, 80, 'validation loss', { anchor: 'start', size: 11.5 });
  return { html: svg(640, 255, g), caption: 'The tell-tale split: training loss keeps falling while validation loss turns upward. Stop at the green line.' };
}

function q6Dropout() {
  const layers = [3, 5, 5, 2];
  const X = [70, 230, 390, 550];
  const nodes = [];
  layers.forEach((n, li) => {
    for (let k = 0; k < n; k++) nodes.push({ id: `${li}-${k}`, li, x: X[li], y: 120 + (k - (n - 1) / 2) * 42 });
  });
  let edges = '';
  nodes.forEach(a => nodes.forEach(b => {
    if (b.li === a.li + 1) edges += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${C.cyan}" stroke-opacity="0.35" stroke-width="1.3" data-a="${a.id}" data-b="${b.id}" class="lv-edge"/>`;
  }));
  let ns = '';
  nodes.forEach(n => {
    const col = n.li === 0 ? C.cyan : n.li === 3 ? C.emerald : C.violet;
    ns += `<g class="lv-node" data-n="${n.id}" data-hidden="${n.li === 1 || n.li === 2}">
      ${circ(n.x, n.y, 15, { fill: tint(col, 0.2), stroke: col, sw: 2 })}
      <text x="${n.x}" y="${n.y + 1}" class="lv-x" text-anchor="middle" dominant-baseline="middle" font-size="16" font-weight="800" fill="${C.rose}">✕</text>
    </g>`;
  });
  let labels = ['input', 'hidden 1 (p = 0.5)', 'hidden 2 (p = 0.5)', 'output'].map((l, i) => T(X[i], 236, l, { size: 10.5, fill: C.muted })).join('');
  const html = `
    <div class="lv-interactive lv-dropout" data-mode="train">
      ${svg(640, 250, edges + ns + labels)}
      <div class="lv-controls">
        <button class="lv-btn active" data-mode-btn="train">🎲 model.train()</button>
        <button class="lv-btn" data-mode-btn="eval">🔒 model.eval()</button>
        <span class="lv-readout" data-msg>Every step, a fresh random half of the hidden neurons is silenced.</span>
      </div>
    </div>`;
  const mount = (root) => {
    let mode = 'train';
    const hidden = [...root.querySelectorAll('.lv-node[data-hidden="true"]')];
    const edgesEl = [...root.querySelectorAll('.lv-edge')];
    const shuffle = () => {
      const dropped = new Set();
      if (mode === 'train') hidden.forEach(h => { if (Math.random() < 0.5) dropped.add(h.dataset.n); });
      hidden.forEach(h => h.classList.toggle('dropped', dropped.has(h.dataset.n)));
      edgesEl.forEach(e => e.classList.toggle('faded', dropped.has(e.dataset.a) || dropped.has(e.dataset.b)));
    };
    root.querySelectorAll('[data-mode-btn]').forEach(btn => btn.addEventListener('click', () => {
      mode = btn.dataset.modeBtn;
      root.querySelectorAll('[data-mode-btn]').forEach(b => b.classList.toggle('active', b === btn));
      root.querySelector('[data-msg]').textContent = mode === 'train'
        ? 'Every step, a fresh random half of the hidden neurons is silenced.'
        : 'Inference: all neurons active, outputs scaled — fully deterministic.';
      shuffle();
    }));
    shuffle();
    return visibleInterval(root, shuffle, 1300);
  };
  return { html, mount, caption: 'Dropout in action. No neuron can rely on a specific neighbour, so each one learns robust, independent features.' };
}

function q6WeightDecay() {
  const before = [3.8, -4.2, 2.9, -3.5, 4.4, -2.6, 3.2];
  const after = before.map(w => w * 0.28);
  let g = '';
  const zeroY = 120;
  const drawBars = (x0, ws, title, col) => {
    let s = T(x0 + 70, 16, title, { size: 12, weight: 800, fill: col });
    s += line(x0 - 4, zeroY, x0 + 146, zeroY, C.axis, 1);
    ws.forEach((w, i) => {
      const h = w * 20;
      s += rect(x0 + i * 21, h >= 0 ? zeroY - h : zeroY, 15, Math.abs(h), { fill: tint(w >= 0 ? '#22d3ee' : '#fb7185', 0.5), stroke: w >= 0 ? C.cyan : C.rose, rx: 2, sw: 1, extra: 'class="lv-grow-y"' });
    });
    return s;
  };
  g += drawBars(30, before, 'Weights without L2', C.rose);
  g += arrow(196, zeroY, 240, zeroY, 'amber', 2.2);
  g += T(218, zeroY - 16, '× (1 − αλ)', { size: 10.5, fill: C.amber, weight: 700, mono: true });
  g += T(218, zeroY + 18, 'every step', { size: 9.5, fill: C.muted });
  g += drawBars(256, after, 'Weights with L2', C.emerald);
  // curves
  const box = { x: 440, y: 30, w: 180, h: 170 };
  const xr = [0, 6], yr = [-2, 2];
  const s = scale(box, xr, yr);
  const cl = clipBox(box);
  g += T(box.x + box.w / 2, 16, 'Resulting decision curve', { size: 12, weight: 800 });
  g += cl.def + axes(box, s, xr, yr, { zeroAxes: false });
  g += `<g ${cl.attr}>`;
  g += path(fnPath(x => Math.sin(x * 1.2) * 0.8 + Math.sin(x * 7.3) * 0.6 + Math.sin(x * 13) * 0.3, s, xr, 300), { stroke: C.rose, sw: 1.8, extra: 'opacity="0.85"' });
  g += path(fnPath(x => Math.sin(x * 1.2) * 0.9, s, xr), { stroke: C.emerald, sw: 3 });
  g += '</g>';
  g += line(box.x + 6, box.y + box.h + 14, box.x + 22, box.y + box.h + 14, C.rose, 2.4) + T(box.x + 26, box.y + box.h + 14, 'big weights', { anchor: 'start', size: 10, fill: C.muted });
  g += line(box.x + 96, box.y + box.h + 14, box.x + 112, box.y + box.h + 14, C.emerald, 3) + T(box.x + 116, box.y + box.h + 14, 'decayed', { anchor: 'start', size: 10, fill: C.muted });
  return { html: svg(640, 225, g), caption: 'Weight decay continuously shrinks every weight toward zero. Smaller weights → smoother, more general decision curves.' };
}

function q6Augment() {
  const umbrella = `<path d="M-30,0 Q-30,-30 0,-30 Q30,-30 30,0 Q22.5,-7 15,0 Q7.5,-7 0,0 Q-7.5,-7 -15,0 Q-22.5,-7 -30,0 Z" fill="${tint(C.cyan, 0.25)}" stroke="${C.cyan}" stroke-width="2.4" stroke-linejoin="round"/><path d="M0,0 L0,26 Q0,32 -6,32 Q-11,32 -11,27" fill="none" stroke="${C.cyan}" stroke-width="2.4" stroke-linecap="round"/>`;
  const tiles = [
    { l: 'Original', tr: '' },
    { l: 'Flip ↔', tr: 'scale(-1,1) rotate(-12)' },
    { l: 'Rotate 15°', tr: 'rotate(15)' },
    { l: 'Scale 0.7', tr: 'scale(0.7)' },
    { l: 'Noise + dim', tr: '', noise: true }
  ];
  let g = '';
  // seeded noise
  let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  tiles.forEach((t, i) => {
    const x = 18 + i * 124, cx = x + 52, cy = 78;
    g += rect(x, 24, 104, 104, { fill: i === 0 ? tint(C.amber, 0.06) : 'rgba(2,6,23,0.45)', stroke: i === 0 ? C.amber : 'rgba(148,163,184,0.25)', rx: 10 });
    g += `<g transform="translate(${cx},${cy - 2}) ${t.tr}" ${t.noise ? 'opacity="0.6"' : ''}>${umbrella}</g>`;
    if (t.noise) for (let k = 0; k < 40; k++) g += circ(x + 6 + rnd() * 92, 30 + rnd() * 92, 1.2, { fill: C.text, extra: 'opacity="0.55"' });
    g += T(cx, 144, t.l, { size: 11.5, weight: 700, fill: i === 0 ? C.amber : C.text });
    g += T(cx, 160, 'label: Umbrella ☂️', { size: 9.5, fill: C.muted });
  });
  return { html: svg(640, 175, g), caption: 'One real drawing becomes many training examples. The label never changes, so the network learns to ignore orientation, size and noise.' };
}

/* ==========================================================================
   QUEST 7 — ATTENTION
   ========================================================================== */
function q7Sequential() {
  const toks = ['The', 'animal', "didn't", 'cross', 'the', 'street'];
  const bx = i => 30 + i * 100;
  let g = T(20, 16, 'RNN — one word at a time', { anchor: 'start', size: 12, weight: 800, fill: C.rose });
  toks.forEach((t, i) => {
    g += rect(bx(i), 32, 80, 30, { fill: tint(C.rose, 0.1), stroke: tint(C.rose, 0.5), rx: 7 });
    g += T(bx(i) + 40, 47, t, { size: 12, weight: 600 });
    if (i < toks.length - 1) g += arrow(bx(i) + 82, 47, bx(i) + 98, 47, 'rose', 1.6);
    const mem = 1 - i * 0.17;
    g += rect(bx(i) + 6, 70, 68 * mem, 7, { fill: C.amber, rx: 3, extra: `opacity="${0.25 + mem * 0.7}"` });
  });
  g += T(bx(5) + 84, 74, 'memory of “The”', { anchor: 'start', size: 9.5, fill: C.amber });
  g += T(320, 98, '⏳ step 6 must wait for steps 1–5 · early words fade', { size: 10.5, fill: C.muted });

  g += T(20, 128, 'Transformer — every word sees every word, in parallel', { anchor: 'start', size: 12, weight: 800, fill: C.emerald });
  const by = 250;
  let arcs = '';
  for (let i = 0; i < toks.length; i++) for (let j = i + 1; j < toks.length; j++) {
    const x1 = bx(i) + 40, x2 = bx(j) + 40, h = 14 + (j - i) * 19;
    arcs += path(`M${x1},${by - 16} Q${(x1 + x2) / 2},${by - 16 - h * 1.6} ${x2},${by - 16}`, { stroke: C.emerald, sw: 1.2, extra: `opacity="0.4" class="lv-fade-in" style="animation-delay:${(i + j) * 0.05}s"` });
  }
  g += arcs;
  toks.forEach((t, i) => {
    g += rect(bx(i), by - 15, 80, 30, { fill: tint(C.emerald, 0.12), stroke: tint(C.emerald, 0.55), rx: 7 });
    g += T(bx(i) + 40, by, t, { size: 12, weight: 600 });
  });
  return { html: svg(640, 280, g), caption: 'RNNs pass a single memory along a chain; Transformers connect all token pairs at once with one matrix multiply.' };
}

function q7QKV() {
  let g = '';
  const vec = (x, y, vals, col) => vals.map((v, i) => rect(x + i * 18, y - 8, 16, 16, { fill: tint(col, 0.15 + v * 0.7), stroke: tint(col, 0.6), rx: 3, sw: 1 })).join('');
  g += rect(20, 118, 70, 40, { fill: tint(C.blue, 0.15), stroke: C.blue, rx: 8 });
  g += T(55, 138, '“it”', { size: 14, weight: 700 });
  g += vec(22, 178, [0.9, 0.3, 0.6, 0.2], C.blue);
  g += T(55, 198, 'embedding xᵢ', { size: 9.5, fill: C.muted });
  const rows = [
    { y: 58, n: 'Q', m: 'W_Q', c: C.amber, cn: 'amber', q: 'Query: “what am I looking for?”', v: [0.8, 0.2, 0.9, 0.4] },
    { y: 138, n: 'K', m: 'W_K', c: C.cyan, cn: 'cyan', q: 'Key: “what do I offer?”', v: [0.3, 0.7, 0.4, 0.8] },
    { y: 218, n: 'V', m: 'W_V', c: C.emerald, cn: 'emerald', q: 'Value: “my actual content”', v: [0.6, 0.5, 0.2, 0.9] }
  ];
  rows.forEach(r => {
    g += path(`M92,138 C130,138 120,${r.y} 160,${r.y}`, { stroke: r.c, sw: 1.8, extra: `marker-end="url(#lv-ar-${r.cn})"` });
    g += rect(164, r.y - 16, 60, 32, { fill: '#0b1222', stroke: r.c, rx: 6 });
    g += T(194, r.y, `× ${r.m.replace('_', '')}`, { size: 11, mono: true, weight: 700, fill: r.c });
    g += arrow(226, r.y, 252, r.y, r.cn, 1.6);
    g += vec(258, r.y, r.v, r.c);
    g += T(338, r.y, r.n, { size: 15, weight: 800, fill: r.c, italic: true });
    g += T(258, r.y + 20, r.q, { size: 9.5, fill: C.muted, anchor: 'start' });
  });
  // scores
  const sx0 = 420;
  g += rect(sx0 - 10, 24, 220, 230, { fill: 'rgba(2,6,23,0.45)', stroke: 'rgba(148,163,184,0.2)', rx: 10 });
  g += T(sx0 + 100, 44, 'scores  q(it) · k(j)', { size: 12, weight: 800, fill: C.amber });
  const sc = [['The', 0.12], ['animal', 0.92], ["didn't", 0.18], ['cross', 0.22], ['street', 0.35], ['tired', 0.58]];
  sc.forEach(([t, v], i) => {
    const y = 68 + i * 30;
    g += T(sx0 + 46, y + 8, t, { size: 11, anchor: 'end', fill: v > 0.8 ? C.amber : C.text, weight: v > 0.8 ? 800 : 500 });
    g += rect(sx0 + 54, y, v * 130, 16, { fill: tint(C.amber, 0.2 + v * 0.5), stroke: C.amber, rx: 3, sw: 1, extra: 'class="lv-grow"' });
    g += T(sx0 + 60 + v * 130, y + 8.5, v.toFixed(2), { size: 9.5, anchor: 'start', mono: true, fill: C.muted });
  });
  return { html: svg(640, 270, g), caption: 'Each token is projected three ways. Its Query is compared against every Key — “it” matches “animal” best, so it will absorb that Value.' };
}

function q7Scale() {
  const toks = ['animal', 'tired', 'street', 'the'];
  const raw = [24, 16, 8, 4];
  const scaled = raw.map(v => v / 8);
  const pr = softmax(raw), ps = softmax(scaled);
  let g = '';
  const chart = (x0, probs, title, sub, col) => {
    let s = T(x0 + 125, 16, title, { size: 12.5, weight: 800, fill: col });
    s += T(x0 + 125, 34, sub, { size: 10, fill: C.muted, mono: true });
    const base = 190;
    s += line(x0, base, x0 + 250, base, C.axis, 1);
    probs.forEach((p, i) => {
      const h = Math.max(1.5, p * 130);
      s += rect(x0 + 14 + i * 60, base - h, 40, h, { fill: tint(col, 0.45), stroke: col, rx: 4, sw: 1, extra: 'class="lv-grow-y"' });
      s += T(x0 + 34 + i * 60, base - h - 10, `${(p * 100).toFixed(p > 0.01 ? 0 : 2)}%`, { size: 10.5, mono: true, weight: 700, fill: col });
      s += T(x0 + 34 + i * 60, base + 13, toks[i], { size: 10.5, fill: C.text });
    });
    return s;
  };
  g += chart(20, pr, 'Without scaling', 'softmax([24, 16, 8, 4])', C.rose);
  g += chart(360, ps, 'Divided by √dₖ = 8', 'softmax([3, 2, 1, 0.5])', C.emerald);
  g += T(145, 226, 'saturated spike → gradient ≈ 0', { size: 10.5, fill: C.rose, weight: 700 });
  g += T(485, 226, 'smooth distribution → healthy gradients', { size: 10.5, fill: C.emerald, weight: 700 });
  return { html: svg(640, 240, g), caption: 'With dₖ = 64, raw dot products are large and softmax collapses into a one-hot spike. Dividing by √dₖ keeps it soft and trainable.' };
}

function q7Bank() {
  const sents = [
    { toks: ['The', 'river', 'bank', 'was', 'muddy'], w: [0.05, 0.55, 0, 0.1, 0.3], c: C.cyan, cn: 'cyan', tag: '🌊 water meaning', y: 70 },
    { toks: ['The', 'investment', 'bank', 'approved', 'the', 'loan'], w: [0.04, 0.45, 0, 0.16, 0.05, 0.3], c: C.amber, cn: 'amber', tag: '💰 finance meaning', y: 190 }
  ];
  let g = '';
  sents.forEach(S => {
    const widths = S.toks.map(t => t.length * 8 + 22);
    let x = 20; const xs = widths.map(w => { const c = x + w / 2; x += w + 10; return c; });
    const bi = S.toks.indexOf('bank');
    S.toks.forEach((t, i) => {
      if (i === bi) return;
      const wv = S.w[i];
      const h = 22 + Math.abs(i - bi) * 9;
      g += path(`M${xs[bi]},${S.y - 15} Q${(xs[bi] + xs[i]) / 2},${S.y - 15 - h * 1.5} ${xs[i]},${S.y - 15}`, { stroke: S.c, sw: (1 + wv * 12).toFixed(1), extra: `opacity="${0.25 + wv * 1.3}" class="lv-draw"` });
      g += T((xs[bi] + xs[i]) / 2, S.y - 15 - h * 0.78 - 6, wv.toFixed(2), { size: 9, mono: true, fill: S.c, opacity: 0.9 });
    });
    S.toks.forEach((t, i) => {
      const isB = i === bi;
      g += rect(xs[i] - widths[i] / 2, S.y - 15, widths[i], 30, { fill: isB ? tint(S.c, 0.35) : 'rgba(2,6,23,0.5)', stroke: isB ? S.c : 'rgba(148,163,184,0.3)', rx: 7, sw: isB ? 2 : 1 });
      g += T(xs[i], S.y, t, { size: 12, weight: isB ? 800 : 500, fill: isB ? '#fff' : C.text });
    });
    g += arrow(x + 4, S.y, x + 36, S.y, S.cn, 2);
    g += rect(x + 40, S.y - 15, 130, 30, { fill: tint(S.c, 0.12), stroke: S.c, rx: 15 });
    g += T(x + 105, S.y, S.tag, { size: 11.5, weight: 700, fill: S.c });
  });
  return { html: svg(640, 220, g), caption: 'Arc thickness = attention weight from “bank”. The same word pulls in different neighbours, so its output vector carries a different meaning.' };
}

function q7MultiHead() {
  const toks = ['The', 'animal', 'was', 'tired', 'because', 'it'];
  const n = toks.length;
  const mk = (fn) => {
    const M = [];
    for (let i = 0; i < n; i++) { const row = []; for (let j = 0; j < n; j++) row.push(0.04 + fn(i, j)); const s = row.reduce((a, b) => a + b); M.push(row.map(v => v / s)); }
    return M;
  };
  const heads = [
    { t: 'Head 1 · syntax', c: '#22d3ee', M: mk((i, j) => ((i === 1 && j === 2) || (i === 2 && j === 1) || (i === 3 && j === 2) || (i === 2 && j === 3)) ? 0.9 : 0) },
    { t: 'Head 2 · coreference', c: '#fbbf24', M: mk((i, j) => (i === 5 && j === 1) ? 1.6 : (i === 1 && j === 5) ? 0.8 : (i === j ? 0.3 : 0)) },
    { t: 'Head 3 · local order', c: '#a78bfa', M: mk((i, j) => (i === j ? 0.6 : (j === i - 1 ? 0.5 : 0))) }
  ];
  let g = '';
  const cs = 22;
  heads.forEach((h, k) => {
    const x0 = 70 + k * 195, y0 = 40;
    g += T(x0 + n * cs / 2, 16, h.t, { size: 12, weight: 800, fill: h.c });
    h.M.forEach((row, i) => row.forEach((v, j) => {
      g += rect(x0 + j * cs, y0 + i * cs, cs - 2, cs - 2, { fill: tint(h.c, Math.min(0.95, 0.05 + v * 1.6)), rx: 3 });
    }));
    toks.forEach((t, j) => {
      g += T(x0 + j * cs + cs / 2 - 1, y0 + n * cs + 6, t, { size: 8.5, anchor: 'end', fill: C.muted, extra: `transform="rotate(-50 ${x0 + j * cs + cs / 2 - 1} ${y0 + n * cs + 6})"` });
      if (k === 0) g += T(x0 - 6, y0 + j * cs + cs / 2 - 1, t, { size: 9, anchor: 'end', fill: C.muted });
    });
  });
  g += T(320, 236, 'rows = query token · columns = key token · brighter = more attention', { size: 10.5, fill: C.muted, italic: true });
  g += T(70 + 195 + n * cs + 6, 40 + 5 * cs + 10, '← “it” → “animal”', { size: 9.5, anchor: 'start', fill: '#fbbf24', weight: 700 });
  return { html: svg(640, 250, g), caption: 'Three heads, three specialisations. Concatenating them gives the model several complementary views of the same sentence.' };
}

// ==========================================
// QUEST 8: WORDS INTO VECTORS & EMBEDDINGS
// ==========================================

function q8Subwords() {
  let g = '';
  // Top: Three Paradigms
  const cards = [
    { title: 'Character-Level', sub: 'Tiny Vocab (~256)', desc: 'Essay = 3,000 tokens\nQuadratic O(N²) memory explodes!', col: C.rose, x: 20 },
    { title: 'Whole-Word', sub: 'Infinite Vocab (1M+)', desc: 'Rare words & typos crash!\nFatal Out-Of-Vocabulary (OOV)', col: C.amber, x: 230 },
    { title: 'Byte-Pair Encoding (BPE)', sub: 'Golden Balance (32k - 128k)', desc: 'Decomposes words into morphemes.\nZero OOV + optimal compression!', col: C.emerald, x: 440 }
  ];

  cards.forEach(c => {
    g += rect(c.x, 20, 180, 85, { fill: tint(c.col, 0.1), stroke: c.col, rx: 8, sw: 1.5 });
    g += T(c.x + 90, 38, c.title, { size: 11.5, weight: 700, fill: c.col });
    g += T(c.x + 90, 54, c.sub, { size: 9.5, fill: C.muted, italic: true });
    const lines = c.desc.split('\n');
    g += T(c.x + 90, 74, lines[0], { size: 9, fill: C.text });
    g += T(c.x + 90, 88, lines[1], { size: 9, fill: c.col, weight: 600 });
  });

  // Bottom: BPE Merge Cascade Example: "unbelievable"
  g += rect(30, 125, 580, 80, { fill: 'rgba(15, 23, 42, 0.65)', stroke: 'rgba(148,163,184,0.25)', rx: 8 });
  g += T(320, 142, 'BPE Merge Cascade: “unbelievable” ➔ [ “un”, “believ”, “able” ]', { size: 11.5, weight: 700, fill: C.cyan });

  const tokens = [
    { text: 'un', id: 'ID: 412', x: 120, col: C.violet },
    { text: 'believ', id: 'ID: 8931', x: 320, col: C.cyan },
    { text: 'able', id: 'ID: 642', x: 500, col: C.emerald }
  ];

  tokens.forEach(t => {
    g += rect(t.x - 55, 158, 110, 34, { fill: tint(t.col, 0.22), stroke: t.col, rx: 6, sw: 1.5 });
    g += T(t.x, 170, `“${t.text}”`, { size: 13, weight: 700, fill: '#ffffff' });
    g += T(t.x, 184, t.id, { size: 9, mono: true, fill: t.col, weight: 600 });
  });

  g += arrow(180, 175, 260, 175, 'muted', 1.5);
  g += arrow(380, 175, 440, 175, 'muted', 1.5);

  return {
    html: svg(640, 220, g),
    caption: 'BPE merges frequent byte pairs. Common roots, prefixes, and suffixes are tokenized cleanly, eliminating unseen word crashes.'
  };
}

function q8EmbeddingMatrix() {
  let g = '';
  // Left: Token IDs
  g += rect(20, 25, 110, 160, { fill: 'rgba(15,23,42,0.7)', stroke: C.dim, rx: 8 });
  g += T(75, 45, 'Token IDs', { size: 12, weight: 700, fill: C.cyan });
  const ids = [
    { t: 'king', id: '4291', col: C.violet, y: 72 },
    { t: 'man', id: '1302', col: C.blue, y: 102 },
    { t: 'woman', id: '1540', col: C.rose, y: 132 },
    { t: 'queen', id: '4883', col: C.amber, y: 162 }
  ];
  ids.forEach(i => {
    g += pill(75, i.y, `${i.id} (${i.t})`, i.col, 9);
  });

  // Arrow to Embedding Table
  g += arrow(135, 105, 175, 105, 'cyan', 2);

  // Center: Embedding Table (V x d)
  g += rect(180, 25, 140, 160, { fill: 'rgba(30,41,59,0.5)', stroke: C.cyan, rx: 6 });
  g += T(250, 42, 'Embedding Table W_E', { size: 10.5, weight: 700, fill: '#fff' });
  g += T(250, 56, 'V × d (e.g. 128k × 4096)', { size: 9, mono: true, fill: C.muted });
  // Simulated row highlights
  [75, 105, 135, 165].forEach((y, idx) => {
    g += rect(186, y - 7, 128, 16, { fill: tint(ids[idx].col, 0.25), stroke: ids[idx].col, rx: 3, sw: 1 });
    g += T(250, y + 1, `row[${ids[idx].id}] ➔ [0.82, -0.41, ...]`, { size: 8, mono: true, fill: ids[idx].col });
  });

  // Arrow to Vector Space
  g += arrow(325, 105, 365, 105, 'emerald', 2);

  // Right: 2D Semantic Space Vector Arithmetic
  g += rect(370, 20, 250, 175, { fill: 'rgba(15,23,42,0.8)', stroke: C.emerald, rx: 8 });
  g += T(495, 36, 'Vector Arithmetic Space', { size: 11, weight: 700, fill: C.emerald });
  g += line(390, 170, 600, 170, C.axis, 1);
  g += line(390, 170, 390, 50, C.axis, 1);

  // Points & Vectors
  const pts = {
    king: { x: 530, y: 70, label: 'king', c: C.violet },
    man: { x: 440, y: 130, label: 'man', c: C.blue },
    woman: { x: 490, y: 145, label: 'woman', c: C.rose },
    queen: { x: 580, y: 85, label: 'queen', c: C.amber }
  };
  // Vector arrow from man to king (royalty vector)
  g += arrow(pts.man.x, pts.man.y, pts.king.x, pts.king.y, 'violet', 1.8);
  // Vector arrow from woman to queen (parallel royalty vector!)
  g += arrow(pts.woman.x, pts.woman.y, pts.queen.x, pts.queen.y, 'amber', 1.8);
  // Dashed parallel relation
  g += line(pts.man.x, pts.man.y, pts.woman.x, pts.woman.y, C.dim, 1, 'stroke-dasharray="3,3"');
  g += line(pts.king.x, pts.king.y, pts.queen.x, pts.queen.y, C.dim, 1, 'stroke-dasharray="3,3"');

  Object.values(pts).forEach(p => {
    g += circ(p.x, p.y, 5, { fill: p.c, stroke: '#fff', sw: 1.5 });
    g += T(p.x + 8, p.y - 8, p.label, { size: 10, weight: 700, fill: p.c, anchor: 'start' });
  });

  g += T(495, 185, 'king − man + woman ≈ queen', { size: 10.5, mono: true, weight: 700, fill: '#facc15' });

  return {
    html: svg(640, 210, g),
    caption: 'Each token ID extracts a dense row vector from the embedding table. In high-dimensional space, linear vector directions encode semantic concepts like gender and royalty.'
  };
}

function q8Permutation() {
  let g = '';
  // Contrast two sentences that have opposite meaning but identical words
  g += T(320, 25, 'The Permutation Equivariance Problem in Pure Self-Attention', { size: 13, weight: 700, fill: C.text });

  // Sentence 1
  g += rect(30, 48, 580, 58, { fill: 'rgba(34, 211, 238, 0.08)', stroke: C.cyan, rx: 8 });
  g += T(50, 77, 'Sentence A:', { size: 11, weight: 700, fill: C.cyan, anchor: 'start' });
  ['The (1)', 'chef (2)', 'ate (3)', 'the (4)', 'mushroom (5)'].forEach((w, idx) => {
    g += rect(140 + idx * 95, 62, 85, 30, { fill: 'rgba(2,6,23,0.6)', stroke: C.cyan, rx: 6 });
    g += T(182 + idx * 95, 77, w, { size: 10, fill: '#fff', weight: 600 });
  });

  // Sentence 2
  g += rect(30, 118, 580, 58, { fill: 'rgba(251, 113, 133, 0.08)', stroke: C.rose, rx: 8 });
  g += T(50, 147, 'Sentence B:', { size: 11, weight: 700, fill: C.rose, anchor: 'start' });
  ['The (1)', 'mushroom (2)', 'ate (3)', 'the (4)', 'chef (5)'].forEach((w, idx) => {
    g += rect(140 + idx * 95, 132, 85, 30, { fill: 'rgba(2,6,23,0.6)', stroke: C.rose, rx: 6 });
    g += T(182 + idx * 95, 147, w, { size: 10, fill: '#fff', weight: 600 });
  });

  g += T(320, 196, '⚠️ Without positional encoding, pure attention treats both sentences identically: same bag of words!', { size: 10.5, fill: C.amber, weight: 600 });

  return {
    html: svg(640, 215, g),
    caption: 'Self-attention processes all tokens in parallel. Order must be explicitly injected so the network knows who ate whom.'
  };
}

function q8RoPE() {
  let g = '';
  // RoPE Rotary Compass Diagram
  g += T(320, 22, 'Rotary Position Embedding (RoPE) in the 2D Complex Plane', { size: 13, weight: 700, fill: C.text });

  // Left circle: Position m (Query)
  const cx1 = 180, cy1 = 115, r = 60;
  g += circ(cx1, cy1, r, { fill: 'rgba(15,23,42,0.6)', stroke: 'rgba(148,163,184,0.3)', sw: 1.5 });
  g += line(cx1 - r - 10, cy1, cx1 + r + 10, cy1, C.axis, 1);
  g += line(cx1, cy1 - r - 10, cx1, cy1 + r + 10, C.axis, 1);
  // Rotated vector q_m
  const ang1 = -Math.PI / 4; // 45 deg
  const qx = cx1 + r * 0.9 * Math.cos(ang1);
  const qy = cy1 + r * 0.9 * Math.sin(ang1);
  g += arrow(cx1, cy1, qx, qy, 'cyan', 2.5);
  g += T(qx + 12, qy - 6, 'R_{m} · q', { size: 11, mono: true, weight: 700, fill: C.cyan, anchor: 'start' });
  g += T(cx1, cy1 + r + 24, 'Token at Position m', { size: 11, weight: 700, fill: C.cyan });
  g += T(cx1, cy1 + r + 38, 'Rotated by angle m·θ', { size: 9.5, fill: C.muted });

  // Center: Dot Product Interaction
  g += rect(275, 80, 90, 70, { fill: 'rgba(30,41,59,0.7)', stroke: C.emerald, rx: 8 });
  g += T(320, 98, 'Inner Product', { size: 10, weight: 700, fill: C.emerald });
  g += T(320, 114, '⟨R_m q, R_n k⟩', { size: 9.5, mono: true, fill: '#fff' });
  g += line(285, 126, 355, 126, C.axis, 1);
  g += T(320, 138, '= f(q, k, m - n)', { size: 9.5, mono: true, fill: '#facc15', weight: 700 });

  // Right circle: Position n (Key)
  const cx2 = 460, cy2 = 115;
  g += circ(cx2, cy2, r, { fill: 'rgba(15,23,42,0.6)', stroke: 'rgba(148,163,184,0.3)', sw: 1.5 });
  g += line(cx2 - r - 10, cy2, cx2 + r + 10, cy2, C.axis, 1);
  g += line(cx2, cy2 - r - 10, cx2, cy2 + r + 10, C.axis, 1);
  // Rotated vector k_n
  const ang2 = -Math.PI / 1.5; // 120 deg
  const kx = cx2 + r * 0.9 * Math.cos(ang2);
  const ky = cy2 + r * 0.9 * Math.sin(ang2);
  g += arrow(cx2, cy2, kx, ky, 'rose', 2.5);
  g += T(kx - 12, ky - 6, 'R_{n} · k', { size: 11, mono: true, weight: 700, fill: C.rose, anchor: 'end' });
  g += T(cx2, cy2 + r + 24, 'Token at Position n', { size: 11, weight: 700, fill: C.rose });
  g += T(cx2, cy2 + r + 38, 'Rotated by angle n·θ', { size: 9.5, fill: C.muted });

  g += T(320, 198, 'Key Property: Absolute coordinates cancel out; attention score depends purely on relative distance (m − n)!', { size: 10, fill: C.emerald, weight: 600 });

  return {
    html: svg(640, 215, g),
    caption: 'RoPE rotates vector pairs in 2D planes. The dot product preserves relative distance (m − n), enabling context length scaling up to 128k tokens.'
  };
}

// ==========================================
// QUEST 9: INSIDE THE GPT DECODER BLOCK
// ==========================================

function q9CausalMask() {
  let g = '';
  const toks = ['The', 'future', 'of', 'AI', 'is'];
  const n = toks.length;
  const cs = 26;
  const x0 = 150, y0 = 40;

  g += T(320, 20, 'Causal Attention Masking (Lower Triangular Matrix)', { size: 13, weight: 700, fill: C.text });

  // Column header tokens (Key)
  toks.forEach((t, j) => {
    g += T(x0 + j * cs + cs / 2, y0 - 8, t, { size: 10, weight: 700, fill: C.cyan });
  });

  // Grid
  for (let i = 0; i < n; i++) {
    // Row header token (Query)
    g += T(x0 - 10, y0 + i * cs + cs / 2 + 1, toks[i], { size: 10, weight: 700, fill: C.amber, anchor: 'end' });
    for (let j = 0; j < n; j++) {
      const allowed = j <= i;
      const col = allowed ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.15)';
      const stroke = allowed ? C.emerald : 'rgba(239,68,68,0.4)';
      g += rect(x0 + j * cs, y0 + i * cs, cs - 3, cs - 3, { fill: col, stroke, rx: 4, sw: 1 });
      g += T(x0 + j * cs + cs / 2 - 1, y0 + i * cs + cs / 2 + 1, allowed ? '✓' : '−∞', {
        size: allowed ? 12 : 9,
        weight: 700,
        fill: allowed ? C.emerald : C.rose,
        mono: !allowed
      });
    }
  }

  // Explanatory callout card on the right
  g += rect(315, 38, 290, 130, { fill: 'rgba(15,23,42,0.85)', stroke: C.dim, rx: 8 });
  g += T(460, 58, 'Why Upper Triangle = −∞?', { size: 11.5, weight: 700, fill: C.amber });
  g += T(460, 80, '1. Mask adds −∞ to future token logits.', { size: 9.5, fill: C.text });
  g += T(460, 98, '2. Softmax: e^(−∞) = 0.00% probability.', { size: 9.5, mono: true, fill: C.emerald, weight: 600 });
  g += T(460, 118, '3. Forbids the model from peeking ahead', { size: 9.5, fill: C.text });
  g += T(460, 134, '   at the answer it must predict!', { size: 9.5, fill: C.rose, weight: 700 });

  g += T(320, 190, 'Query token i can only attend to past Keys j ≤ i · Future keys are strictly blinded', { size: 10.5, fill: C.muted, italic: true });

  return {
    html: svg(640, 205, g),
    caption: 'The lower-triangular causal mask forces the model to predict the next word using only past information, guaranteeing valid autoregressive generation.'
  };
}

function q9ResidualHighway() {
  let g = '';
  g += T(320, 22, 'The Residual Highway & Pre-RMSNorm Architecture', { size: 13, weight: 700, fill: C.text });

  // Main horizontal highway line (Residual Stream)
  g += line(30, 95, 610, 95, C.emerald, 4);
  g += T(60, 75, 'Input x', { size: 11, mono: true, weight: 700, fill: C.emerald });
  g += T(570, 75, 'Output x_next', { size: 11, mono: true, weight: 700, fill: C.emerald });

  // Stage 1: Attention Loop
  // Diverge down to RMSNorm + Attention
  g += path('M 120,95 L 120,140 L 160,140', { stroke: C.cyan, sw: 2 });
  g += rect(160, 125, 75, 30, { fill: 'rgba(34,211,238,0.15)', stroke: C.cyan, rx: 6 });
  g += T(197, 140, 'RMSNorm', { size: 9.5, weight: 700, fill: C.cyan });

  g += arrow(235, 140, 260, 140, 'cyan', 1.5);
  g += rect(260, 125, 80, 30, { fill: 'rgba(167,139,250,0.2)', stroke: C.violet, rx: 6 });
  g += T(300, 140, 'Causal MHA', { size: 9.5, weight: 700, fill: C.violet });

  // Merge back to highway (+)
  g += path('M 340,140 L 370,140 L 370,105', { stroke: C.violet, sw: 2 });
  g += circ(370, 95, 10, { fill: '#0f172a', stroke: C.emerald, sw: 2 });
  g += T(370, 95, '+', { size: 14, weight: 700, fill: C.emerald });

  // Stage 2: SwiGLU Loop
  g += path('M 390,95 L 390,140 L 415,140', { stroke: C.amber, sw: 2 });
  g += rect(415, 125, 75, 30, { fill: 'rgba(251,191,36,0.15)', stroke: C.amber, rx: 6 });
  g += T(452, 140, 'RMSNorm', { size: 9.5, weight: 700, fill: C.amber });

  g += arrow(490, 140, 510, 140, 'amber', 1.5);
  g += rect(510, 125, 70, 30, { fill: 'rgba(251,113,133,0.2)', stroke: C.rose, rx: 6 });
  g += T(545, 140, 'SwiGLU', { size: 9.5, weight: 700, fill: C.rose });

  // Merge back to highway (+)
  g += path('M 580,140 L 595,140 L 595,105', { stroke: C.rose, sw: 2 });
  g += circ(595, 95, 10, { fill: '#0f172a', stroke: C.emerald, sw: 2 });
  g += T(595, 95, '+', { size: 14, weight: 700, fill: C.emerald });

  // Reverse Gradient Arrow along main highway
  g += arrow(550, 45, 80, 45, 'rose', 2, 'stroke-dasharray="4,4"');
  g += T(320, 38, 'Unimpeded Backward Gradient Flow: ∂x_{l+1}/∂x_l = I + ∂F/∂x', { size: 10, mono: true, fill: C.rose, weight: 700 });

  g += T(320, 192, 'Features are added onto the uninterrupted residual stream, preventing vanishing gradients across 80+ layers.', { size: 10, fill: C.muted, italic: true });

  return {
    html: svg(640, 205, g),
    caption: 'The Residual Stream acts as an expressway. Sub-layers (Attention and SwiGLU) compute additive deltas without replacing the baseline representation.'
  };
}

function q9RMSNorm() {
  let g = '';
  g += T(320, 20, 'LayerNorm vs. RMSNorm Efficiency Comparison', { size: 13, weight: 700, fill: C.text });

  // Left: LayerNorm (4 steps)
  g += rect(40, 45, 255, 135, { fill: 'rgba(15,23,42,0.7)', stroke: C.dim, rx: 8 });
  g += T(167, 65, 'Traditional LayerNorm (2016)', { size: 11, weight: 700, fill: C.muted });
  const lnSteps = [
    '1. Compute Mean: μ = (1/d) ∑ x_i',
    '2. Subtract Mean: x - μ (Centering)',
    '3. Compute Variance: σ² = (1/d) ∑ (x - μ)²',
    '4. Scale & Shift: ((x - μ)/σ) · γ + β'
  ];
  lnSteps.forEach((s, idx) => {
    g += T(167, 90 + idx * 20, s, { size: 9, mono: true, fill: C.muted });
  });

  // Right: RMSNorm (Lean & Fast)
  g += rect(345, 45, 255, 135, { fill: 'rgba(34, 197, 94, 0.08)', stroke: C.emerald, rx: 8, sw: 1.5 });
  g += T(472, 65, 'Modern RMSNorm (Llama / Mistral)', { size: 11, weight: 700, fill: C.emerald });
  const rmsSteps = [
    '1. Root Mean Square: RMS(x) = √( (1/d) ∑ x_i² + ε )',
    '2. Direct Scaling: (x / RMS(x)) · γ',
    '✓ Zero mean-centering passes needed!',
    '⚡ Up to 20% faster memory bandwidth on GPU'
  ];
  rmsSteps.forEach((s, idx) => {
    const isSpecial = idx >= 2;
    g += T(472, 90 + idx * 20, s, { size: 9, mono: !isSpecial, fill: isSpecial ? C.emerald : '#fff', weight: isSpecial ? 700 : 400 });
  });

  g += T(320, 196, 'Dropping mean-centering preserves 100% of training stability while saving memory passes.', { size: 10, fill: C.muted, italic: true });

  return {
    html: svg(640, 210, g),
    caption: 'RMSNorm scales activations by their root-mean-square without mean-centering, cutting GPU memory overhead and accelerating LLM training.'
  };
}

function q9SwiGLU() {
  let g = '';
  g += T(320, 20, 'SwiGLU Gated Feed-Forward Architecture', { size: 13, weight: 700, fill: C.text });

  // Input x (d_model = 4096)
  g += rect(30, 85, 110, 36, { fill: 'rgba(15,23,42,0.8)', stroke: C.cyan, rx: 6 });
  g += T(85, 98, 'Input Tensor x', { size: 10, weight: 700, fill: C.cyan });
  g += T(85, 112, '[Batch, S, 4096]', { size: 8.5, mono: true, fill: C.muted });

  // Branch 1: Gate (Linear + SiLU/Swish)
  g += path('M 140,103 L 180,65 L 205,65', { stroke: C.amber, sw: 2 });
  g += rect(205, 50, 95, 30, { fill: 'rgba(251,191,36,0.15)', stroke: C.amber, rx: 6 });
  g += T(252, 65, 'W_gate + SiLU', { size: 9.5, weight: 700, fill: C.amber });

  // Branch 2: Up (Linear)
  g += path('M 140,103 L 180,140 L 205,140', { stroke: C.violet, sw: 2 });
  g += rect(205, 125, 95, 30, { fill: 'rgba(167,139,250,0.15)', stroke: C.violet, rx: 6 });
  g += T(252, 140, 'W_up (Linear)', { size: 9.5, weight: 700, fill: C.violet });

  // Elementwise multiplication (odot)
  g += arrow(300, 65, 345, 95, 'amber', 1.5);
  g += arrow(300, 140, 345, 110, 'violet', 1.5);
  g += circ(355, 103, 14, { fill: '#0f172a', stroke: C.emerald, sw: 2 });
  g += T(355, 103, '⊙', { size: 14, weight: 700, fill: C.emerald });
  g += T(355, 128, 'Gated Multiply', { size: 8.5, fill: C.emerald });

  // Projection down (W_down)
  g += arrow(370, 103, 415, 103, 'emerald', 2);
  g += rect(415, 85, 95, 36, { fill: 'rgba(34,197,94,0.15)', stroke: C.emerald, rx: 6 });
  g += T(462, 98, 'W_down (Linear)', { size: 9.5, weight: 700, fill: C.emerald });
  g += T(462, 112, '14336 ➔ 4096', { size: 8.5, mono: true, fill: C.muted });

  // Output
  g += arrow(510, 103, 545, 103, 'cyan', 2);
  g += rect(545, 85, 75, 36, { fill: 'rgba(15,23,42,0.8)', stroke: C.cyan, rx: 6 });
  g += T(582, 98, 'Output', { size: 10, weight: 700, fill: C.cyan });
  g += T(582, 112, 'dim = 4096', { size: 8.5, mono: true, fill: C.muted });

  g += T(320, 192, 'SwiGLU = (SiLU(x · W_gate) ⊙ (x · W_up)) · W_down · Factual memory is stored in these weights', { size: 10, mono: true, fill: '#facc15', weight: 600 });

  return {
    html: svg(640, 205, g),
    caption: 'SwiGLU expands activations to 14k dimensions with a non-linear gate before compressing back down. This is where encyclopedic facts are retrieved.'
  };
}

function q9KVCache() {
  let g = '';
  g += T(320, 20, 'Key-Value (KV) Caching: Slashing Quadratic O(N²) Inference', { size: 13, weight: 700, fill: C.text });

  // Left: Naive Recomputation (Slow)
  g += rect(30, 45, 260, 135, { fill: 'rgba(239, 68, 68, 0.08)', stroke: C.rose, rx: 8 });
  g += T(160, 65, 'Naive Recomputation: O(N²)', { size: 11, weight: 700, fill: C.rose });
  g += T(160, 88, 'At step 100: Recomputes tokens 1 to 99', { size: 9, fill: C.text });
  g += T(160, 106, 'At step 101: Recomputes tokens 1 to 100', { size: 9, fill: C.text });
  g += T(160, 126, 'Total Attention FLOPs: ~N² / 2', { size: 9.5, mono: true, fill: C.rose, weight: 700 });
  g += T(160, 150, '🐢 100x slower on long paragraphs!', { size: 9.5, fill: C.rose });

  // Right: With KV Cache (Fast)
  g += rect(340, 45, 270, 135, { fill: 'rgba(34, 197, 94, 0.08)', stroke: C.emerald, rx: 8, sw: 1.5 });
  g += T(475, 65, 'With KV Caching: O(N) Linear Time', { size: 11, weight: 700, fill: C.emerald });
  g += T(475, 88, 'Store past K and V tensors in GPU memory.', { size: 9, fill: C.text });
  g += T(475, 106, 'Step 101: Compute ONLY token 101’s Query!', { size: 9, fill: C.emerald, weight: 600 });
  g += T(475, 126, 'New FLOPs per token: Exactly O(1)', { size: 9.5, mono: true, fill: C.emerald, weight: 700 });
  g += T(475, 150, '⚡ Real-time instant token streaming', { size: 9.5, fill: C.emerald, weight: 700 });

  g += T(320, 196, 'KV Cache trades a small amount of GPU VRAM for massive 10x - 100x generation speedups.', { size: 10, fill: C.muted, italic: true });

  return {
    html: svg(640, 210, g),
    caption: 'Past token Keys and Values are saved in VRAM. Each generation step only calculates the Query vector for the newest token, delivering linear scaling.'
  };
}

// ==========================================
// QUEST 10: THE GENERATION ENGINE (SAMPLING)
// ==========================================

function q10Unembedding() {
  let g = '';
  g += T(320, 20, 'The Un-Embedding Projection: Hidden States to Vocabulary Logits', { size: 13, weight: 700, fill: C.text });

  // 1. Hidden State Vector h
  g += rect(30, 65, 110, 80, { fill: 'rgba(56, 189, 248, 0.12)', stroke: C.cyan, rx: 8 });
  g += T(85, 88, 'Final Hidden State h', { size: 10, weight: 700, fill: C.cyan });
  g += T(85, 106, 'Vector [1, 4096]', { size: 9, mono: true, fill: C.muted });
  g += T(85, 126, 'Contextualized Token', { size: 8.5, fill: C.text });

  // Arrow x W_U
  g += arrow(145, 105, 195, 105, 'cyan', 2);
  g += T(170, 92, '× W_U', { size: 10, mono: true, weight: 700, fill: C.cyan });

  // 2. Un-Embedding Matrix W_U (4096 x 128k)
  g += rect(200, 50, 140, 110, { fill: 'rgba(167, 139, 250, 0.12)', stroke: C.violet, rx: 8 });
  g += T(270, 72, 'Un-Embedding Matrix', { size: 10.5, weight: 700, fill: C.violet });
  g += T(270, 88, 'W_U ∈ ℝ^{d × V}', { size: 9.5, mono: true, fill: '#fff' });
  g += T(270, 108, '4,096 × 128,000 Vocab', { size: 8.5, mono: true, fill: C.muted });
  g += T(270, 128, '(Tied to Embedding Table)', { size: 8, fill: C.muted, italic: true });

  // Arrow -> Logits
  g += arrow(345, 105, 390, 105, 'emerald', 2);

  // 3. Raw Logits Vector
  g += rect(395, 45, 215, 120, { fill: 'rgba(15, 23, 42, 0.85)', stroke: C.emerald, rx: 8 });
  g += T(502, 64, 'Raw Vocabulary Logits (z)', { size: 11, weight: 700, fill: C.emerald });
  
  const sampleLogits = [
    { tok: '"alien"', val: '+4.2', bar: 75, col: C.cyan },
    { tok: '"glowing"', val: '+3.7', bar: 62, col: C.cyan },
    { tok: '"city"', val: '+3.3', bar: 54, col: C.cyan },
    { tok: '"sandwich"', val: '+0.4', bar: 15, col: C.amber },
    { tok: '"banana"', val: '−0.8', bar: 5, col: C.rose }
  ];

  sampleLogits.forEach((l, idx) => {
    const y = 86 + idx * 14;
    g += T(430, y, l.tok, { size: 8.5, mono: true, anchor: 'end', fill: C.text });
    g += rect(436, y - 5, l.bar, 8, { fill: tint(l.col, 0.7), rx: 2 });
    g += T(442 + l.bar, y, l.val, { size: 7.5, mono: true, anchor: 'start', fill: l.col });
  });

  g += T(320, 196, 'Logits are unconstrained real scores (−∞ to +∞). Softmax normalizes them into probabilities.', { size: 10, fill: C.muted, italic: true });

  return {
    html: svg(640, 210, g),
    caption: 'The final token representation is multiplied by the transposed embedding matrix, producing 128,000 raw logit scores.'
  };
}

function q10Temperature() {
  let g = '';
  g += T(320, 20, 'The Temperature Dial: Modulating Probability Entropy', { size: 13, weight: 700, fill: C.text });

  const modes = [
    {
      title: 'Cold: T = 0.2',
      sub: 'Rigid / Factual / Greedy',
      col: C.cyan,
      x: 30,
      bars: [{ t: 'alien', p: 0.94 }, { t: 'glow', p: 0.04 }, { t: 'city', p: 0.02 }, { t: 'human', p: 0.00 }]
    },
    {
      title: 'Balanced: T = 0.7',
      sub: 'Natural / Human Variety',
      col: C.emerald,
      x: 230,
      bars: [{ t: 'alien', p: 0.48 }, { t: 'glow', p: 0.28 }, { t: 'city', p: 0.16 }, { t: 'human', p: 0.08 }]
    },
    {
      title: 'Hot: T = 1.8',
      sub: 'Erratic / Hallucinatory',
      col: C.rose,
      x: 430,
      bars: [{ t: 'alien', p: 0.28 }, { t: 'glow', p: 0.26 }, { t: 'city', p: 0.24 }, { t: 'human', p: 0.22 }]
    }
  ];

  modes.forEach(m => {
    g += rect(m.x, 45, 180, 135, { fill: 'rgba(15, 23, 42, 0.7)', stroke: m.col, rx: 8 });
    g += T(m.x + 90, 64, m.title, { size: 11, weight: 700, fill: m.col });
    g += T(m.x + 90, 78, m.sub, { size: 8.5, fill: C.muted, italic: true });

    m.bars.forEach((b, idx) => {
      const by = 100 + idx * 16;
      g += T(m.x + 45, by, b.t, { size: 8.5, mono: true, anchor: 'end', fill: C.text });
      const barW = Math.round(b.p * 90);
      g += rect(m.x + 50, by - 6, barW, 9, { fill: tint(m.col, 0.75), rx: 2 });
      g += T(m.x + 54 + barW, by, `${Math.round(b.p * 100)}%`, { size: 8, mono: true, anchor: 'start', fill: m.col, weight: 600 });
    });
  });

  g += T(320, 198, 'Low T magnifies logit gaps (Argmax spike); High T flattens distribution toward equal random chance.', { size: 10, fill: C.muted, italic: true });

  return {
    html: svg(640, 215, g),
    caption: 'Temperature divides logits before Softmax. T=0.2 is best for code and math; T=0.7 for conversation; T>1.5 produces hallucinations.'
  };
}

function q10TopKvsTopP() {
  let g = '';
  g += T(320, 20, 'Top-K vs. Top-P (Nucleus) Sampling Comparison', { size: 13, weight: 700, fill: C.text });

  // Left: Top-K (Static count)
  g += rect(40, 45, 260, 135, { fill: 'rgba(15, 23, 42, 0.7)', stroke: C.amber, rx: 8 });
  g += T(170, 65, 'Static Top-K (e.g. K = 4)', { size: 11, weight: 700, fill: C.amber });
  g += T(170, 80, 'Always keeps fixed K candidates', { size: 8.5, fill: C.muted });
  
  const tkBars = [
    { t: 'Paris', p: 0.94, keep: true },
    { t: 'Rome', p: 0.03, keep: true },
    { t: 'Lyon', p: 0.02, keep: true },
    { t: 'Pizza', p: 0.01, keep: true },
    { t: 'Banana', p: 0.00, keep: false }
  ];
  tkBars.forEach((b, idx) => {
    const by = 100 + idx * 14;
    g += T(95, by, b.t, { size: 8, mono: true, anchor: 'end', fill: b.keep ? C.text : C.dim });
    g += rect(100, by - 5, b.p * 110, 8, { fill: b.keep ? C.amber : C.dim, rx: 2 });
    g += T(235, by, b.keep ? '✓ Kept' : '✗ Cut', { size: 8, mono: true, fill: b.keep ? C.amber : C.rose });
  });

  // Right: Top-P (Dynamic Cumulative Mass)
  g += rect(340, 45, 260, 135, { fill: 'rgba(34, 197, 94, 0.08)', stroke: C.emerald, rx: 8, sw: 1.5 });
  g += T(470, 65, 'Dynamic Top-P Nucleus (p = 0.90)', { size: 11, weight: 700, fill: C.emerald });
  g += T(470, 80, 'Slices cumulative probability mass', { size: 8.5, fill: C.muted });

  const tpBars = [
    { t: 'Paris', p: 0.94, cum: '94% >= 90%', keep: true },
    { t: 'Rome', p: 0.03, cum: 'cut off', keep: false },
    { t: 'Lyon', p: 0.02, cum: 'cut off', keep: false },
    { t: 'Pizza', p: 0.01, cum: 'cut off', keep: false },
    { t: 'Banana', p: 0.00, cum: 'cut off', keep: false }
  ];
  tpBars.forEach((b, idx) => {
    const by = 100 + idx * 14;
    g += T(395, by, b.t, { size: 8, mono: true, anchor: 'end', fill: b.keep ? C.text : C.dim });
    g += rect(400, by - 5, b.p * 110, 8, { fill: b.keep ? C.emerald : C.dim, rx: 2 });
    g += T(535, by, b.keep ? '✓ 1 Token!' : '✗ Cut off', { size: 8, mono: true, fill: b.keep ? C.emerald : C.dim });
  });

  g += T(320, 196, 'Top-P adapts dynamically: when confident, candidate set shrinks to 1; when creative, it widens smoothly.', { size: 10, fill: C.emerald, weight: 600 });

  return {
    html: svg(640, 210, g),
    caption: 'Top-K rigidly keeps K items regardless of confidence. Top-P dynamically preserves the smallest set of words summing to 90% probability.'
  };
}

function q10AutoregressiveLoop() {
  let g = '';
  g += T(320, 20, 'The Autoregressive Feedback Loop', { size: 13, weight: 700, fill: C.text });

  // Box 1: Prompt Tokens
  g += rect(30, 65, 120, 75, { fill: 'rgba(56, 189, 248, 0.1)', stroke: C.cyan, rx: 8 });
  g += T(90, 85, 'Context Tokens', { size: 10.5, weight: 700, fill: C.cyan });
  g += T(90, 102, '["The", "future", "is"]', { size: 8.5, mono: true, fill: '#fff' });
  g += T(90, 122, 'Length = t', { size: 8.5, mono: true, fill: C.muted });

  // Arrow to Decoder
  g += arrow(150, 102, 195, 102, 'cyan', 2);

  // Box 2: Transformer Blocks
  g += rect(200, 55, 130, 95, { fill: 'rgba(167, 139, 250, 0.12)', stroke: C.violet, rx: 8 });
  g += T(265, 78, 'Transformer', { size: 11, weight: 700, fill: C.violet });
  g += T(265, 94, 'Decoder Stack', { size: 10, weight: 700, fill: C.violet });
  g += T(265, 114, 'Causal Attention', { size: 8.5, fill: C.muted });
  g += T(265, 130, '+ SwiGLU FFN', { size: 8.5, fill: C.muted });

  // Arrow to Sampling
  g += arrow(330, 102, 375, 102, 'amber', 2);

  // Box 3: Temperature & Top-P Sampler
  g += rect(380, 60, 110, 85, { fill: 'rgba(251, 191, 36, 0.12)', stroke: C.amber, rx: 8 });
  g += T(435, 82, 'Sampler (T, Top-P)', { size: 9.5, weight: 700, fill: C.amber });
  g += T(435, 100, 'Multinomial', { size: 9, mono: true, fill: '#fff' });
  g += T(435, 122, '🎲 Pick Token', { size: 9.5, fill: C.amber });

  // Arrow to New Token
  g += arrow(490, 102, 530, 102, 'emerald', 2);

  // Box 4: Sampled Token
  g += rect(535, 75, 80, 55, { fill: 'rgba(34, 197, 94, 0.2)', stroke: C.emerald, rx: 6 });
  g += T(575, 94, 'Token t+1', { size: 9, mono: true, fill: C.muted });
  g += T(575, 112, '“bright”', { size: 11, weight: 700, fill: '#fff' });

  // Big Feedback Loop Arrow back to Prompt
  g += path('M 575,130 L 575,175 L 90,175 L 90,140', { stroke: C.emerald, sw: 2 });
  g += arrow(90, 145, 90, 140, 'emerald', 2);
  g += T(330, 168, 'Append Token t+1 to Context and Repeat Loop ↺', { size: 9.5, mono: true, fill: C.emerald, weight: 600 });

  return {
    html: svg(640, 205, g),
    caption: 'Each generation cycle produces exactly one new token, which is appended to the prompt to condition the next prediction.'
  };
}

function q10RepetitionPenalty() {
  let g = '';
  g += T(320, 20, 'Breaking Echo-Chambers with Repetition Penalty', { size: 13, weight: 700, fill: C.text });

  // Left: Stuck in Loop
  g += rect(40, 45, 260, 135, { fill: 'rgba(239, 68, 68, 0.08)', stroke: C.rose, rx: 8 });
  g += T(170, 65, 'Without Penalty (α = 1.0)', { size: 11, weight: 700, fill: C.rose });
  g += T(170, 85, '“and then and then and then...”', { size: 9.5, mono: true, fill: '#fff' });
  g += T(170, 105, 'Past tokens self-reinforce logits!', { size: 8.5, fill: C.text });
  g += T(170, 125, 'Attention latches onto recent words.', { size: 8.5, fill: C.muted });
  g += T(170, 150, '🔁 Degenerate Infinite Loop', { size: 9.5, fill: C.rose, weight: 700 });

  // Right: With Repetition Penalty
  g += rect(340, 45, 260, 135, { fill: 'rgba(34, 197, 94, 0.08)', stroke: C.emerald, rx: 8, sw: 1.5 });
  g += T(470, 65, 'With Repetition Penalty (α = 1.15)', { size: 11, weight: 700, fill: C.emerald });
  g += T(470, 85, '“and then suddenly, the door...”', { size: 9.5, mono: true, fill: '#fff' });
  g += T(470, 105, 'z_i ➔ z_i / 1.15 for recently used words', { size: 8.5, mono: true, fill: C.emerald });
  g += T(470, 125, 'Pushes down duplicate token logits.', { size: 8.5, fill: C.text });
  g += T(470, 150, '✓ Diverse, Engaging Vocabulary', { size: 9.5, fill: C.emerald, weight: 700 });

  g += T(320, 196, 'Repetition penalty gently depresses recently used logits, forcing the model to explore new words.', { size: 10, fill: C.muted, italic: true });

  return {
    html: svg(640, 210, g),
    caption: 'By dividing previously generated logits by α > 1.0, the generation engine prevents runaway self-reinforcing phrase loops.'
  };
}

// ============================================================================
// QUEST 11: POST-TRAINING & ALIGNMENT (SFT, ChatML & DPO)
// ============================================================================

function q11PretrainVsSFT() {
  let g = T(320, 22, 'From Web Text Predictor to Conversational Assistant', { size: 14, weight: 800, fill: '#fff' });

  // Left: Raw Base Model
  g += rect(30, 42, 275, 148, { fill: 'rgba(244, 63, 94, 0.08)', stroke: C.rose, rx: 8, sw: 1.5 });
  g += T(167, 64, 'Raw Base Model (Pre-Trained)', { size: 11.5, weight: 700, fill: C.rose });
  g += rect(42, 74, 251, 30, { fill: 'rgba(2, 6, 23, 0.6)', stroke: 'rgba(148,163,184,0.15)', rx: 4 });
  g += T(48, 92, 'Prompt: “Write Python code for binary search”', { size: 9, mono: true, fill: C.muted, anchor: 'start' });
  g += rect(42, 110, 251, 48, { fill: 'rgba(244, 63, 94, 0.12)', stroke: 'rgba(244, 63, 94, 0.3)', rx: 4 });
  g += T(48, 126, '“...and please reply by 5pm. Also check out', { size: 8.5, mono: true, fill: '#fca5a5', anchor: 'start' });
  g += T(48, 142, 'our shoe sale at cheapshoes.com! #python”', { size: 8.5, mono: true, fill: '#fca5a5', anchor: 'start' });
  g += T(167, 178, '❌ Unconstrained Internet Completion', { size: 9.5, fill: C.rose, weight: 700 });

  // Right: SFT + Aligned Model
  g += rect(335, 42, 275, 148, { fill: 'rgba(16, 185, 129, 0.08)', stroke: C.emerald, rx: 8, sw: 1.5 });
  g += T(472, 64, 'Instruction-Tuned (SFT + DPO)', { size: 11.5, weight: 700, fill: C.emerald });
  g += rect(347, 74, 251, 30, { fill: 'rgba(2, 6, 23, 0.6)', stroke: 'rgba(148,163,184,0.15)', rx: 4 });
  g += T(353, 92, '<|im_start|>user\\nWrite binary search...<|im_end|>', { size: 9, mono: true, fill: C.cyan, anchor: 'start' });
  g += rect(347, 110, 251, 48, { fill: 'rgba(16, 185, 129, 0.12)', stroke: 'rgba(16, 185, 129, 0.3)', rx: 4 });
  g += T(353, 126, '“def binary_search(arr, target):', { size: 8.5, mono: true, fill: '#86efac', anchor: 'start' });
  g += T(353, 142, '    low, high = 0, len(arr) - 1 ...”', { size: 8.5, mono: true, fill: '#86efac', anchor: 'start' });
  g += T(472, 178, '✓ Helpful, Direct, Conversational Partner', { size: 9.5, fill: C.emerald, weight: 700 });

  g += T(320, 208, 'Post-training constrains open-ended next-token prediction into structured, obedient turn-taking dialogue.', { size: 10, fill: C.muted, italic: true });

  return {
    html: svg(640, 222, g),
    caption: 'Base models merely complete internet text patterns. SFT and Alignment enforce conversational roles and helpful assistance.'
  };
}

function q11ChatMLTemplate() {
  let g = T(320, 22, 'ChatML Formatting & Selective Loss Masking', { size: 14, weight: 800, fill: '#fff' });

  // 3 Sequence blocks
  const blocks = [
    {
      role: 'SYSTEM',
      tokens: '<|im_start|>system\\nYou are a helpful AI.<|im_end|>',
      mask: 'Loss Mask = 0 (Ignored)',
      color: C.violet,
      sub: 'Sets persona & safety guardrails'
    },
    {
      role: 'USER',
      tokens: '<|im_start|>user\\nCalculate 15 * 8.<|im_end|>',
      mask: 'Loss Mask = 0 (Ignored)',
      color: C.cyan,
      sub: 'User question (Do NOT compute gradients)'
    },
    {
      role: 'ASSISTANT',
      tokens: '<|im_start|>assistant\\n15 * 8 = 120.<|im_end|>',
      mask: 'Loss Mask = 1 (Trained with Cross-Entropy)',
      color: C.emerald,
      sub: 'Model learns ONLY to predict this output!'
    }
  ];

  blocks.forEach((b, i) => {
    const y = 46 + i * 46;
    g += rect(30, y, 580, 40, { fill: tint(b.color, 0.08), stroke: b.color, rx: 6, sw: 1.2 });
    g += rect(36, y + 6, 75, 28, { fill: tint(b.color, 0.25), rx: 4 });
    g += T(73, y + 23, b.role, { size: 9.5, weight: 800, fill: b.color });
    g += T(120, y + 17, b.tokens, { size: 9, mono: true, fill: '#f1f5f9', anchor: 'start' });
    g += T(120, y + 31, b.sub, { size: 8, fill: C.muted, anchor: 'start' });
    g += rect(410, y + 8, 192, 24, { fill: i === 2 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.1)', rx: 4 });
    g += T(506, y + 23, b.mask, { size: 8.5, weight: 700, fill: i === 2 ? C.emerald : C.muted });
  });

  g += T(320, 198, 'Key Insight: Training on user tokens teaches the model to ask questions rather than answering them!', { size: 10, fill: C.amber, weight: 700 });

  return {
    html: svg(640, 212, g),
    caption: 'During SFT, special delimiters structure the dialogue, and loss masking ensures gradients are only calculated on the assistant’s response.'
  };
}

function q11RlhfPipeline() {
  let g = T(320, 20, 'Alignment Architecture: Traditional RLHF (PPO) vs DPO', { size: 14, weight: 800, fill: '#fff' });

  // Top: Traditional PPO (Complex, 4 models)
  g += rect(25, 36, 590, 80, { fill: 'rgba(244, 63, 94, 0.06)', stroke: C.rose, rx: 8, sw: 1.2 });
  g += T(40, 52, 'Classic RLHF Pipeline (PPO - 2022)', { size: 10.5, weight: 800, fill: C.rose, anchor: 'start' });
  g += rect(40, 60, 110, 44, { fill: 'rgba(15, 23, 42, 0.8)', stroke: 'rgba(148,163,184,0.2)', rx: 4 });
  g += T(95, 78, '1. SFT Model', { size: 9, weight: 700, fill: '#fff' });
  g += T(95, 94, 'Turn-taking', { size: 8, fill: C.muted });
  g += arrow(154, 82, 178, 82, 'rose', 1.5);

  g += rect(182, 60, 140, 44, { fill: 'rgba(15, 23, 42, 0.8)', stroke: 'rgba(148,163,184,0.2)', rx: 4 });
  g += T(252, 78, '2. Reward Model R_ψ', { size: 9, weight: 700, fill: C.amber });
  g += T(252, 94, 'Trained on (y_w > y_l)', { size: 8, fill: C.muted });
  g += arrow(326, 82, 350, 82, 'rose', 1.5);

  g += rect(354, 60, 245, 44, { fill: 'rgba(244, 63, 94, 0.15)', stroke: C.rose, rx: 4 });
  g += T(476, 76, '3. PPO Policy Optimization Loop', { size: 9, weight: 800, fill: C.rose });
  g += T(476, 92, '⚠️ 4 Models in VRAM: Actor + Critic + Reward + Ref', { size: 7.8, fill: '#fca5a5' });

  // Bottom: DPO (Streamlined, 2 models)
  g += rect(25, 126, 590, 74, { fill: 'rgba(16, 185, 129, 0.08)', stroke: C.emerald, rx: 8, sw: 1.5 });
  g += T(40, 142, 'Direct Preference Optimization (DPO - Rafailov et al., 2023)', { size: 10.5, weight: 800, fill: C.emerald, anchor: 'start' });
  g += rect(40, 150, 150, 40, { fill: 'rgba(15, 23, 42, 0.8)', stroke: 'rgba(148,163,184,0.2)', rx: 4 });
  g += T(115, 166, 'Preference Data (x, y_w, y_l)', { size: 8.5, weight: 700, fill: C.cyan });
  g += T(115, 180, 'Winner vs Loser Pairs', { size: 7.8, fill: C.muted });
  g += arrow(194, 170, 222, 170, 'emerald', 2);

  g += rect(226, 150, 375, 40, { fill: 'rgba(16, 185, 129, 0.18)', stroke: C.emerald, rx: 4 });
  g += T(413, 166, 'Closed-Form DPO Loss: Policy π_θ directly optimized against π_ref', { size: 9, weight: 800, fill: C.emerald });
  g += T(413, 180, '✓ No Reward Model • No RL Critic • 50%+ Less VRAM • 100% Stable', { size: 8, fill: '#86efac' });

  return {
    html: svg(640, 214, g),
    caption: 'DPO eliminates the unstable PPO reinforcement learning loop and separate reward network, replacing them with a closed-form preference loss.'
  };
}

function q11DpoLossDynamics() {
  let g = T(320, 20, 'DPO Implicit Reward Mechanics & KL Regularization', { size: 14, weight: 800, fill: '#fff' });

  // Center Math Formula
  g += rect(120, 36, 400, 30, { fill: 'rgba(2, 6, 23, 0.8)', stroke: C.cyan, rx: 5 });
  g += T(320, 55, 'Implicit Reward: r_θ(x, y) = β · [ log π_θ(y|x) - log π_ref(y|x) ]', { size: 9.5, mono: true, fill: C.cyan, weight: 700 });

  // Left Box: Chosen Response (y_w)
  g += rect(35, 78, 260, 96, { fill: 'rgba(16, 185, 129, 0.08)', stroke: C.emerald, rx: 8, sw: 1.5 });
  g += T(165, 96, 'Chosen Response (y_w)', { size: 11, weight: 800, fill: C.emerald });
  g += T(165, 114, 'Helpful • Accurate • Safe', { size: 9, fill: C.muted });
  g += rect(55, 124, 220, 24, { fill: 'rgba(16, 185, 129, 0.2)', rx: 4 });
  g += T(165, 139, '▲ Policy log π_θ(y_w|x) INCREASES', { size: 8.5, weight: 800, fill: C.emerald });
  g += T(165, 160, 'Gradient pushes policy TOWARD winner', { size: 8, fill: C.text });

  // Right Box: Rejected Response (y_l)
  g += rect(345, 78, 260, 96, { fill: 'rgba(244, 63, 94, 0.08)', stroke: C.rose, rx: 8, sw: 1.5 });
  g += T(475, 96, 'Rejected Response (y_l)', { size: 11, weight: 800, fill: C.rose });
  g += T(475, 114, 'Toxic • Deceitful • Lazy', { size: 9, fill: C.muted });
  g += rect(365, 124, 220, 24, { fill: 'rgba(244, 63, 94, 0.2)', rx: 4 });
  g += T(475, 139, '▼ Policy log π_θ(y_l|x) DECREASES', { size: 8.5, weight: 800, fill: C.rose });
  g += T(475, 160, 'Gradient pushes policy AWAY from loser', { size: 8, fill: C.text });

  // Bottom Anchor Explanation
  g += T(320, 194, 'The hyperparameter β anchors π_θ to π_ref, preventing the model from collapsing or drifting away from its foundation.', { size: 9.5, fill: C.muted, italic: true });

  return {
    html: svg(640, 210, g),
    caption: 'DPO increases the probability of chosen responses and depresses rejected responses, with β acting as a KL divergence elastic band.'
  };
}

function q11SafetyTaxTradeoff() {
  let g = T(320, 20, 'The HHH Alignment Triad & The Alignment Tax', { size: 14, weight: 800, fill: '#fff' });

  // 3 Pillar Cards
  const pillars = [
    { title: 'HELPFUL (H1)', desc: 'Clear, exhaustive, actionable answers. Solves user problem directly.', color: C.cyan, x: 30 },
    { title: 'HONEST (H2)', desc: 'Well-calibrated uncertainty. Acknowledges knowledge limits; no hallucinations.', color: C.amber, x: 230 },
    { title: 'HARMLESS (H3)', desc: 'Refuses biological/cyber harm without preachiness or false refusals.', color: C.emerald, x: 430 }
  ];

  pillars.forEach(p => {
    g += rect(p.x, 42, 180, 85, { fill: tint(p.color, 0.08), stroke: p.color, rx: 6, sw: 1.2 });
    g += T(p.x + 90, 62, p.title, { size: 11, weight: 800, fill: p.color });
    g += T(p.x + 90, 84, p.desc.slice(0, 32), { size: 8, fill: C.text });
    g += T(p.x + 90, 98, p.desc.slice(32), { size: 8, fill: C.muted });
  });

  // Bottom Tradeoff Box
  g += rect(30, 138, 580, 52, { fill: 'rgba(2, 6, 23, 0.7)', stroke: 'rgba(148,163,184,0.2)', rx: 6 });
  g += T(320, 156, '⚠️ The Alignment Tax Tradeoff: Harmlessness vs Utility', { size: 10, weight: 800, fill: C.rose });
  g += T(320, 174, 'Over-aligned models suffer “False Refusal Syndrome” (e.g. refusing: “How do I kill a bash script?”)', { size: 8.5, fill: C.muted });

  return {
    html: svg(640, 200, g),
    caption: 'Modern alignment balances the HHH triad (Helpful, Honest, Harmless) while avoiding the Alignment Tax of lazy over-refusals.'
  };
}

function q12VramExplosion() {
  let g = T(320, 20, 'The VRAM Wall: Full Fine-Tuning vs. LoRA Memory Footprint', { size: 14, weight: 800, fill: '#fff' });

  // Full Fine-Tuning Block (72+ GB)
  g += rect(30, 42, 275, 150, { fill: 'rgba(244, 63, 94, 0.08)', stroke: C.rose, rx: 8, sw: 1.5 });
  g += T(167, 60, 'Full Fine-Tuning (8B Model)', { size: 12, weight: 800, fill: C.rose });
  g += T(167, 76, 'Total VRAM: ~72+ GB (Requires A100 80GB)', { size: 9, fill: C.muted, weight: 700 });

  // VRAM breakdown bars - Full
  const fullBars = [
    { label: 'Model Weights (FP16)', size: '16 GB', color: C.blue, w: 235 },
    { label: 'Gradients (FP16)', size: '16 GB', color: C.amber, w: 235 },
    { label: 'Adam States (FP32)', size: '32 GB', color: C.rose, w: 235 },
    { label: 'Activations & Buffers', size: '8+ GB', color: C.violet, w: 235 }
  ];
  fullBars.forEach((b, i) => {
    const y = 92 + i * 22;
    g += rect(50, y, b.w, 18, { fill: tint(b.color, 0.2), stroke: b.color, rx: 4, sw: 1 });
    g += T(60, y + 9, b.label, { size: 8, fill: '#fff', anchor: 'start', weight: 600 });
    g += T(275, y + 9, b.size, { size: 8, fill: b.color, anchor: 'end', weight: 800, mono: true });
  });

  // LoRA Block (18-20 GB)
  g += rect(335, 42, 275, 150, { fill: 'rgba(16, 185, 129, 0.08)', stroke: C.emerald, rx: 8, sw: 1.5 });
  g += T(472, 60, 'LoRA Fine-Tuning (r=16)', { size: 12, weight: 800, fill: C.emerald });
  g += T(472, 76, 'Total VRAM: ~20 GB (Fits on RTX 3090/4090 24GB)', { size: 9, fill: '#86efac', weight: 700 });

  // VRAM breakdown bars - LoRA
  const loraBars = [
    { label: 'Frozen Weights (FP16)', size: '16 GB', color: C.blue, w: 235 },
    { label: 'LoRA Adapter Weights', size: '< 0.08 GB', color: C.cyan, w: 20 },
    { label: 'LoRA Adam States', size: '< 0.16 GB', color: C.emerald, w: 25 },
    { label: 'Activations (LoRA)', size: '~3.8 GB', color: C.violet, w: 60 }
  ];
  loraBars.forEach((b, i) => {
    const y = 92 + i * 22;
    g += rect(355, y, 235, 18, { fill: 'rgba(15, 23, 42, 0.6)', stroke: 'rgba(148,163,184,0.15)', rx: 4, sw: 1 });
    g += rect(355, y, Math.max(b.w, 8), 18, { fill: tint(b.color, 0.35), stroke: b.color, rx: 4, sw: 1 });
    g += T(365, y + 9, b.label, { size: 8, fill: '#fff', anchor: 'start', weight: 600 });
    g += T(580, y + 9, b.size, { size: 8, fill: b.color, anchor: 'end', weight: 800, mono: true });
  });

  // Bottom Savings Badge
  g += rect(140, 200, 360, 24, { fill: 'rgba(6, 182, 212, 0.15)', stroke: C.cyan, rx: 6 });
  g += T(320, 212, '⚡ 99.8% fewer trainable weights • 75% VRAM saved • Identical task accuracy', { size: 8.5, weight: 800, fill: C.cyan });

  return {
    html: svg(640, 232, g),
    caption: 'Full fine-tuning requires over 72GB VRAM due to Adam optimizer states and gradients. LoRA freezes base weights and trains lightweight adapters, fitting on consumer GPUs.'
  };
}

function q12MatrixDecomposition() {
  let g = T(320, 20, 'The Low-Rank Bypass Architecture: h = W₀x + (α/r)·B·A·x', { size: 14, weight: 800, fill: '#fff' });

  // Input Token Vector x
  g += rect(20, 85, 60, 50, { fill: tint(C.text, 0.1), stroke: C.muted, rx: 6 });
  g += T(50, 105, 'x', { size: 16, weight: 800, fill: '#fff', mono: true });
  g += T(50, 122, 'dim = d_in', { size: 8, fill: C.muted, mono: true });

  // Split Arrow
  g += arrow(80, 110, 120, 110, 'muted');
  g += line(120, 70, 120, 150, C.dim, 1.5);
  g += arrow(120, 70, 160, 70, 'blue');
  g += arrow(120, 150, 160, 150, 'cyan');

  // Upper Branch: Frozen W0
  g += rect(160, 45, 170, 50, { fill: 'rgba(30, 41, 59, 0.8)', stroke: C.blue, rx: 6, sw: 1.5 });
  g += T(245, 62, '🔒 Frozen W₀ (d_out × d_in)', { size: 10, weight: 800, fill: C.blue });
  g += T(245, 80, '4096 × 4096 = 16.7M params (No Gradients)', { size: 7.5, fill: C.muted, mono: true });

  // Lower Branch: Matrix A and Matrix B
  // Matrix A: Down-projection to rank r
  g += rect(160, 125, 110, 50, { fill: 'rgba(6, 182, 212, 0.15)', stroke: C.cyan, rx: 6, sw: 1.5 });
  g += T(215, 142, 'Matrix A (r × d_in)', { size: 9.5, weight: 800, fill: C.cyan });
  g += T(215, 160, 'Kaiming Normal Init', { size: 7.5, fill: '#a5f3fc', mono: true });

  g += arrow(270, 150, 300, 150, 'cyan');
  g += T(285, 138, 'rank r', { size: 7.5, fill: C.amber, mono: true });

  // Matrix B: Up-projection back to d_out
  g += rect(300, 125, 110, 50, { fill: 'rgba(16, 185, 129, 0.15)', stroke: C.emerald, rx: 6, sw: 1.5 });
  g += T(355, 142, 'Matrix B (d_out × r)', { size: 9.5, weight: 800, fill: C.emerald });
  g += T(355, 160, 'Zero Init (zeros_)', { size: 7.5, fill: '#86efac', mono: true });

  // Scaling Factor alpha / r
  g += arrow(410, 150, 445, 150, 'emerald');
  g += rect(445, 135, 55, 30, { fill: 'rgba(251, 191, 36, 0.2)', stroke: C.amber, rx: 4 });
  g += T(472, 150, '× (α / r)', { size: 9, weight: 800, fill: C.amber, mono: true });

  // Paths join into Add circle (+)
  g += arrow(330, 70, 530, 95, 'blue');
  g += arrow(500, 150, 530, 115, 'amber');

  // Sum Circle
  g += circ(545, 105, 18, { fill: 'rgba(15, 23, 42, 0.9)', stroke: '#fff', sw: 2 });
  g += T(545, 105, '⊕', { size: 16, fill: '#fff', weight: 800 });

  // Output vector h
  g += arrow(563, 105, 595, 105, 'cyan');
  g += rect(595, 85, 35, 40, { fill: tint(C.cyan, 0.15), stroke: C.cyan, rx: 4 });
  g += T(612, 105, 'h', { size: 14, weight: 800, fill: C.cyan, mono: true });

  // Zero-init explanation footnote
  g += rect(30, 190, 580, 26, { fill: 'rgba(2, 6, 23, 0.65)', stroke: 'rgba(148,163,184,0.2)', rx: 4 });
  g += T(320, 203, 'Why B is initialized to 0: ΔW = B · A = 0 · A = 0 at step 0. Base performance is perfectly preserved!', { size: 8.5, weight: 600, fill: '#e2e8f0' });

  return {
    html: svg(640, 226, g),
    caption: 'LoRA freezes W₀ and adds a parallel low-rank bottleneck path (A then B). Zero-initializing B ensures the adapter starts as an exact identity operation.'
  };
}

function q12AdapterSwitching() {
  let g = T(320, 20, 'Multi-Tenant Serving: 1 Base LLM + Hot-Swappable Adapters', { size: 14, weight: 800, fill: '#fff' });

  // Central Base LLM (16GB Frozen)
  g += rect(40, 50, 180, 130, { fill: 'rgba(30, 41, 59, 0.7)', stroke: C.blue, rx: 8, sw: 2 });
  g += T(130, 80, 'Base LLaMA 3', { size: 14, weight: 800, fill: '#fff' });
  g += T(130, 100, '8 Billion Parameters', { size: 9.5, fill: C.muted });
  g += T(130, 120, 'VRAM: 16.0 GB (Frozen 🔒)', { size: 9, fill: C.blue, mono: true, weight: 700 });
  g += T(130, 145, 'Single GPU in Memory', { size: 8.5, fill: C.dim });

  // Switching Routing Hub
  g += arrow(220, 115, 270, 115, 'blue');
  g += circ(290, 115, 18, { fill: 'rgba(2, 6, 23, 0.9)', stroke: C.cyan, sw: 1.5 });
  g += T(290, 115, '⇄', { size: 14, fill: C.cyan, weight: 800 });

  // 3 Swappable Domain Adapters on Right
  const adapters = [
    { title: 'Medical Diagnosis LoRA', tag: 'r=16 • 32 MB', color: C.rose, y: 48, icon: '🩺' },
    { title: 'Code Copilot Python LoRA', tag: 'r=32 • 64 MB', color: C.emerald, y: 98, icon: '💻' },
    { title: 'Legal Contract Review LoRA', tag: 'r=8 • 16 MB', color: C.amber, y: 148, icon: '⚖️' }
  ];

  adapters.forEach(a => {
    g += arrow(308, 115, 340, a.y + 18, 'muted');
    g += rect(340, a.y, 260, 36, { fill: tint(a.color, 0.12), stroke: a.color, rx: 6, sw: 1.2 });
    g += T(355, a.y + 18, a.icon, { size: 14 });
    g += T(430, a.y + 12, a.title, { size: 9.5, weight: 800, fill: '#fff' });
    g += T(430, a.y + 26, a.tag, { size: 8, fill: a.color, mono: true, weight: 700 });
  });

  // Callout banner
  g += rect(40, 195, 560, 24, { fill: 'rgba(6, 182, 212, 0.1)', stroke: C.cyan, rx: 4 });
  g += T(320, 207, '💡 Serve hundreds of enterprise clients by swapping tiny ~32MB adapter files in milliseconds!', { size: 8.5, weight: 700, fill: C.cyan });

  return {
    html: svg(640, 230, g),
    caption: 'Instead of hosting separate 16GB models for each task, one frozen base model can dynamically serve hundreds of specialized 32MB LoRA adapters.'
  };
}

function q12WeightMerging() {
  let g = T(320, 20, 'Production Zero-Latency Deployment: W_merged = W₀ + (α/r)·B·A', { size: 14, weight: 800, fill: '#fff' });

  // Two columns: Left = Inference with Separate Adapter, Right = Inference Merged
  // Left Box
  g += rect(30, 45, 275, 140, { fill: 'rgba(30, 41, 59, 0.4)', stroke: 'rgba(148,163,184,0.3)', rx: 8 });
  g += T(167, 65, 'During Development (LoRA Active)', { size: 11, weight: 700, fill: C.muted });
  g += rect(50, 80, 100, 30, { fill: 'rgba(59, 130, 246, 0.15)', stroke: C.blue, rx: 4 });
  g += T(100, 95, 'W₀ (Frozen)', { size: 8.5, fill: C.blue, weight: 700 });
  g += T(165, 95, '+', { size: 12, fill: C.muted, weight: 800 });
  g += rect(180, 80, 105, 30, { fill: 'rgba(6, 182, 212, 0.15)', stroke: C.cyan, rx: 4 });
  g += T(232, 95, '(α/r)·B·A (LoRA)', { size: 8, fill: C.cyan, weight: 700, mono: true });

  g += T(167, 130, '⚠️ 2 Matrix Multiplications per Layer', { size: 8.5, fill: C.amber, weight: 600 });
  g += T(167, 146, 'Slightly higher compute & memory latency', { size: 7.5, fill: C.dim });
  g += T(167, 168, 'Great for prototyping & multi-tenancy', { size: 8, fill: C.muted, italic: true });

  // Center Merge Arrow
  g += arrow(305, 115, 335, 115, 'emerald', 2.5);

  // Right Box
  g += rect(335, 45, 275, 140, { fill: 'rgba(16, 185, 129, 0.08)', stroke: C.emerald, rx: 8, sw: 1.5 });
  g += T(472, 65, 'Production Deployed (Merged)', { size: 11, weight: 800, fill: C.emerald });
  g += rect(365, 80, 215, 32, { fill: 'rgba(16, 185, 129, 0.25)', stroke: C.emerald, rx: 4, sw: 1.2 });
  g += T(472, 96, 'W_merged = W₀ + (α/r)·BA', { size: 9.5, fill: '#86efac', weight: 800, mono: true });

  g += T(472, 130, '⚡ Exact Same Architecture & Shapes', { size: 8.5, fill: C.emerald, weight: 800 });
  g += T(472, 146, 'ZERO added compute • ZERO latency penalty', { size: 8, fill: '#fff', weight: 700 });
  g += T(472, 168, 'Works with vLLM, TensorRT-LLM, llama.cpp', { size: 8, fill: C.muted, italic: true });

  // Merge code snippet preview
  g += rect(80, 196, 480, 22, { fill: 'rgba(2, 6, 23, 0.8)', stroke: 'rgba(148,163,184,0.2)', rx: 4 });
  g += T(320, 207, 'Python: model = model.merge_and_unload() # Folds adapters into base weights permanently', { size: 8, fill: '#a5f3fc', mono: true });

  return {
    html: svg(640, 228, g),
    caption: 'By adding (α/r)·B·A directly to W₀ prior to deployment, LoRA introduces zero latency penalty in production serving.'
  };
}

function q12QloraQuantization() {
  let g = T(320, 20, 'QLoRA: 4-Bit NormalFloat (NF4), Double Quantization & Paged Optimizers', { size: 14, weight: 800, fill: '#fff' });

  // 3 Pillar Columns
  const pillars = [
    {
      title: '1. NF4 Data Type',
      subtitle: 'Information-Theoretic Optimal',
      desc: 'Weights follow a normal distribution. NF4 bins have equal probability area under the Gaussian bell curve.',
      color: C.cyan,
      x: 30
    },
    {
      title: '2. Double Quantization',
      subtitle: 'Quantizing Quant Constants',
      desc: 'Quantizes 32-bit block scales to 8-bit, saving 0.37 bits per parameter (~3GB VRAM savings on 65B model).',
      color: C.amber,
      x: 230
    },
    {
      title: '3. Paged Optimizers',
      subtitle: 'Zero CUDA OOM Spikes',
      desc: 'Uses CUDA Unified Memory to automatically page memory spikes to CPU RAM during long sequence training.',
      color: C.emerald,
      x: 430
    }
  ];

  pillars.forEach(p => {
    g += rect(p.x, 44, 180, 120, { fill: tint(p.color, 0.08), stroke: p.color, rx: 6, sw: 1.2 });
    g += T(p.x + 90, 64, p.title, { size: 10.5, weight: 800, fill: p.color });
    g += T(p.x + 90, 80, p.subtitle, { size: 7.5, fill: '#fff', weight: 600 });
    g += T(p.x + 90, 102, p.desc.slice(0, 30), { size: 7.5, fill: C.muted });
    g += T(p.x + 90, 116, p.desc.slice(30, 62), { size: 7.5, fill: C.muted });
    g += T(p.x + 90, 130, p.desc.slice(62), { size: 7.5, fill: C.muted });
  });

  // Bottom impact box
  g += rect(30, 175, 580, 42, { fill: 'rgba(16, 185, 129, 0.15)', stroke: C.emerald, rx: 6 });
  g += T(320, 190, '🏆 The Result: Fine-tune a 70B parameter LLM on a single 48GB GPU (or 8B on a 12GB laptop!)', { size: 9.5, weight: 800, fill: C.emerald });
  g += T(320, 205, 'Maintains 99.3%+ full 16-bit fine-tuning task performance with zero accuracy compromise.', { size: 8, fill: '#86efac' });

  return {
    html: svg(640, 226, g),
    caption: 'QLoRA compresses the base model into 4-bit NormalFloat while training full 16-bit LoRA adapters, enabling LLM fine-tuning on consumer hardware.'
  };
}

function q13System1VsSystem2() {
  let g = T(320, 20, 'System 1 (Instant Guess) vs. System 2 (Deliberate Thinking)', { size: 14, weight: 800, fill: '#fff' });

  // Left Box: System 1 (Autoregressive fast shoot)
  g += rect(30, 42, 275, 148, { fill: 'rgba(244, 63, 94, 0.08)', stroke: C.rose, rx: 8, sw: 1.5 });
  g += T(167, 60, 'System 1: Fast & Instinctive', { size: 12, weight: 800, fill: C.rose });
  g += T(167, 76, 'Direct Next-Token Probability (0 Thinking Time)', { size: 8.5, fill: C.muted });

  g += rect(48, 90, 239, 28, { fill: 'rgba(2, 6, 23, 0.8)', stroke: 'rgba(148,163,184,0.2)', rx: 4 });
  g += T(167, 104, 'Prompt: "How many \'r\' in strawberry?"', { size: 8, fill: '#fff', mono: true });

  g += arrow(167, 118, 167, 134, 'rose');
  g += rect(48, 134, 239, 36, { fill: 'rgba(244, 63, 94, 0.2)', stroke: C.rose, rx: 4 });
  g += T(167, 146, 'Output: "The word has 2 \'r\'s."', { size: 9, weight: 800, fill: '#fecdd3', mono: true });
  g += T(167, 160, '❌ Hallucination (Error Rate = (1 - ε)^N)', { size: 7.5, fill: C.rose, weight: 700 });

  // Right Box: System 2 (Deliberate Thinking)
  g += rect(335, 42, 275, 148, { fill: 'rgba(16, 185, 129, 0.08)', stroke: C.emerald, rx: 8, sw: 1.5 });
  g += T(472, 60, 'System 2: Slow & Deliberate', { size: 12, weight: 800, fill: C.emerald });
  g += T(472, 76, 'Private <think> Scratchpad (Test-Time Compute)', { size: 8.5, fill: '#86efac' });

  // Chain of thought step blocks
  const steps = [
    { text: '1. Deconstruct letters: s-t-r-a-w-b-e-r-r-y', color: C.cyan },
    { text: '2. Index matching \'r\': index 3, 8, 9', color: C.amber },
    { text: '3. Aha! 1 + 2 = 3 \'r\'s! Verified.', color: C.emerald }
  ];
  steps.forEach((s, idx) => {
    const y = 90 + idx * 22;
    g += rect(353, y, 239, 18, { fill: tint(s.color, 0.15), stroke: s.color, rx: 3 });
    g += T(472, y + 9, s.text, { size: 7.5, fill: '#fff', weight: 600 });
  });

  g += arrow(472, 156, 472, 168, 'emerald');
  g += T(472, 178, '✓ Final Answer: Exactly 3 \'r\'s! (100% Accuracy)', { size: 8, weight: 800, fill: C.emerald });

  // Bottom Banner
  g += rect(80, 198, 480, 24, { fill: 'rgba(6, 182, 212, 0.12)', stroke: C.cyan, rx: 4 });
  g += T(320, 210, '💡 Test-Time Compute: Spending tokens to think unlocks superhuman reasoning!', { size: 8.5, weight: 700, fill: C.cyan });

  return {
    html: svg(640, 230, g),
    caption: 'System 1 produces instant answers with compounding error rates. System 2 generates internal Chain-of-Thought tokens to verify logic before responding.'
  };
}

function q13TreeOfThoughts() {
  let g = T(320, 20, 'Reasoning Tree Search: Branching, Pruning & Backtracking', { size: 14, weight: 800, fill: '#fff' });

  // Root Node
  g += circ(320, 52, 18, { fill: 'rgba(59, 130, 246, 0.25)', stroke: C.blue, sw: 2 });
  g += T(320, 52, 'S₀', { size: 11, weight: 800, fill: '#fff', mono: true });

  // 3 Branches: Left (Pruned), Middle (Dead-end), Right (Success)
  // Left branch (pruned at step 1)
  g += arrow(306, 62, 140, 95, 'rose');
  g += rect(90, 95, 100, 36, { fill: 'rgba(244, 63, 94, 0.15)', stroke: C.rose, rx: 4 });
  g += T(140, 108, 'Branch A (PRM=0.15)', { size: 7.5, weight: 700, fill: C.rose });
  g += T(140, 122, '❌ Pruned (Dead End)', { size: 7, fill: '#fca5a5' });

  // Middle branch (fails at step 2)
  g += arrow(320, 70, 320, 95, 'amber');
  g += rect(270, 95, 100, 36, { fill: 'rgba(251, 191, 36, 0.15)', stroke: C.amber, rx: 4 });
  g += T(320, 108, 'Step B₁ (PRM=0.65)', { size: 7.5, weight: 700, fill: C.amber });
  g += T(320, 122, 'Exploring line...', { size: 7, fill: C.muted });

  g += arrow(320, 131, 320, 150, 'rose');
  g += rect(270, 150, 100, 32, { fill: 'rgba(244, 63, 94, 0.15)', stroke: C.rose, rx: 4 });
  g += T(320, 161, 'Step B₂ (PRM=0.20)', { size: 7.5, weight: 700, fill: C.rose });
  g += T(320, 173, '↩ Backtracked!', { size: 7, fill: '#fca5a5', weight: 700 });

  // Right branch (Success path)
  g += arrow(334, 62, 500, 95, 'emerald');
  g += rect(450, 95, 100, 36, { fill: 'rgba(16, 185, 129, 0.15)', stroke: C.emerald, rx: 4 });
  g += T(500, 108, 'Step C₁ (PRM=0.92)', { size: 7.5, weight: 700, fill: C.emerald });
  g += T(500, 122, 'Sound deduction ✓', { size: 7, fill: '#86efac' });

  g += arrow(500, 131, 500, 150, 'emerald');
  g += rect(450, 150, 100, 32, { fill: 'rgba(16, 185, 129, 0.25)', stroke: C.emerald, rx: 4, sw: 1.5 });
  g += T(500, 161, 'Step C₂ (PRM=0.99)', { size: 7.5, weight: 800, fill: C.emerald });
  g += T(500, 173, '🏆 Optimal Solution', { size: 7, fill: '#fff', weight: 700 });

  // Bottom Summary Footnote
  g += rect(60, 195, 520, 24, { fill: 'rgba(2, 6, 23, 0.8)', stroke: 'rgba(148,163,184,0.2)', rx: 4 });
  g += T(320, 207, 'MCTS & Tree-of-Thoughts evaluate nodes with PRMs, abandoning dead ends and expanding verified lines.', { size: 8, fill: C.muted });

  return {
    html: svg(640, 228, g),
    caption: 'Tree search allows the reasoning model to explore multiple hypotheses, prune flawed paths, and backtrack to successful solution trajectories.'
  };
}

function q13OrmVsPrm() {
  let g = T(320, 20, 'Credit Assignment: Outcome (ORM) vs. Process (PRM) Supervision', { size: 14, weight: 800, fill: '#fff' });

  // Left: ORM Box
  g += rect(30, 44, 275, 142, { fill: 'rgba(30, 41, 59, 0.4)', stroke: 'rgba(148,163,184,0.3)', rx: 8 });
  g += T(167, 62, 'Outcome Reward Model (ORM)', { size: 11, weight: 800, fill: C.muted });
  g += T(167, 76, 'Single binary score on final answer (+1 or 0)', { size: 8, fill: C.dim });

  g += rect(48, 88, 239, 20, { fill: 'rgba(15, 23, 42, 0.8)', rx: 3 });
  g += T(167, 98, 'Step 1 ➔ Step 2 ➔ Step 3 ➔ Step 4', { size: 8, fill: C.muted, mono: true });

  g += arrow(167, 108, 167, 122, 'rose');
  g += rect(85, 122, 164, 24, { fill: 'rgba(244, 63, 94, 0.15)', stroke: C.rose, rx: 4 });
  g += T(167, 134, 'Outcome Reward: R = 0', { size: 9, weight: 800, fill: C.rose, mono: true });

  g += T(167, 164, '⚠️ Blind to where the error occurred! Punishes sound steps.', { size: 7.5, fill: C.rose, weight: 600 });
  g += T(167, 176, 'Also rewards lucky guesses with false positive logic.', { size: 7, fill: C.dim });

  // Right: PRM Box
  g += rect(335, 44, 275, 142, { fill: 'rgba(16, 185, 129, 0.08)', stroke: C.emerald, rx: 8, sw: 1.5 });
  g += T(472, 62, 'Process Reward Model (PRM)', { size: 11, weight: 800, fill: C.emerald });
  g += T(472, 76, 'Continuous score per deduction step r_t ∈ [0, 1]', { size: 8, fill: '#86efac' });

  // Step-by-step scoring pills
  const prmSteps = [
    { label: 'Step 1: Formula Setup', score: 'r₁ = 0.98 ✓', color: C.emerald },
    { label: 'Step 2: Substitution', score: 'r₂ = 0.95 ✓', color: C.emerald },
    { label: 'Step 3: Arithmetic Slip', score: 'r₃ = 0.12 ✗', color: C.rose }
  ];
  prmSteps.forEach((s, idx) => {
    const y = 88 + idx * 24;
    g += rect(353, y, 239, 20, { fill: tint(s.color, 0.12), stroke: s.color, rx: 3 });
    g += T(365, y + 10, s.label, { size: 7.5, fill: '#fff', anchor: 'start', weight: 600 });
    g += T(580, y + 10, s.score, { size: 7.5, fill: s.color, anchor: 'end', weight: 800, mono: true });
  });

  g += T(472, 172, '✓ Precise Credit Assignment: Pinpoints the exact bug in Step 3!', { size: 7.5, fill: C.emerald, weight: 800 });

  // Footnote
  g += rect(40, 196, 560, 22, { fill: 'rgba(2, 6, 23, 0.8)', stroke: 'rgba(148,163,184,0.2)', rx: 4 });
  g += T(320, 207, 'PRMs enable step-level guidance, active beam search, and reliable reinforcement learning signals.', { size: 8, fill: C.muted });

  return {
    html: svg(640, 226, g),
    caption: 'Outcome Reward Models only grade the final answer (+1 or 0), while Process Reward Models grade every intermediate deduction step.'
  };
}

function q13GrpoArchitecture() {
  let g = T(320, 20, 'DeepSeek-R1 GRPO: Group Relative Policy Optimization', { size: 14, weight: 800, fill: '#fff' });

  // Left: Prompt Node
  g += rect(25, 75, 75, 55, { fill: 'rgba(30, 41, 59, 0.8)', stroke: C.blue, rx: 6 });
  g += T(62, 95, 'Prompt q', { size: 11, weight: 800, fill: '#fff', mono: true });
  g += T(62, 114, 'Hard Math', { size: 7.5, fill: C.muted });

  // Fan-out arrow to 4 rollouts
  g += arrow(100, 102, 140, 102, 'blue');

  // Group of G=4 Rollouts Box
  g += rect(140, 42, 230, 130, { fill: 'rgba(15, 23, 42, 0.7)', stroke: 'rgba(148,163,184,0.25)', rx: 6 });
  g += T(255, 58, 'Sample Group of G=4 Rollouts', { size: 9, weight: 800, fill: C.cyan });

  const rollouts = [
    { name: 'o₁: Sound Proof', r: 'R₁ = 1.0', adv: 'A₁ = +0.86', col: C.emerald },
    { name: 'o₂: Hallucination', r: 'R₂ = 0.0', adv: 'A₂ = -1.05', col: C.rose },
    { name: 'o₃: Verified Path', r: 'R₃ = 1.0', adv: 'A₃ = +0.86', col: C.emerald },
    { name: 'o₄: Calculation Error', r: 'R₄ = 0.2', adv: 'A₄ = -0.67', col: C.amber }
  ];
  rollouts.forEach((ro, idx) => {
    const y = 68 + idx * 24;
    g += rect(150, y, 210, 20, { fill: tint(ro.col, 0.12), stroke: ro.col, rx: 3 });
    g += T(158, y + 10, ro.name, { size: 7.5, fill: '#fff', anchor: 'start', weight: 600 });
    g += T(280, y + 10, ro.r, { size: 7.5, fill: ro.col, anchor: 'middle', weight: 700, mono: true });
    g += T(350, y + 10, ro.adv, { size: 7.5, fill: ro.col, anchor: 'end', weight: 800, mono: true });
  });

  // Group Normalization Formula Box
  g += arrow(370, 102, 410, 102, 'cyan');
  g += rect(410, 52, 205, 100, { fill: 'rgba(6, 182, 212, 0.1)', stroke: C.cyan, rx: 6, sw: 1.5 });
  g += T(512, 70, 'Group Advantage Formula', { size: 10, weight: 800, fill: C.cyan });
  g += T(512, 92, 'A_i = (R_i - μ) / (σ + ε)', { size: 9.5, weight: 800, fill: '#fff', mono: true });
  g += T(512, 112, 'μ = mean(R) • σ = std(R)', { size: 8, fill: C.muted, mono: true });
  g += T(512, 134, '⚡ Zero Critic Network in VRAM!', { size: 8.5, weight: 800, fill: '#86efac' });

  // Bottom Savings Badge
  g += rect(40, 185, 560, 26, { fill: 'rgba(16, 185, 129, 0.15)', stroke: C.emerald, rx: 4 });
  g += T(320, 198, '🏆 Memory Breakthrough: GRPO saves >50% VRAM by discarding the Value/Critic model used in PPO.', { size: 8.5, weight: 700, fill: C.emerald });

  return {
    html: svg(640, 222, g),
    caption: 'DeepSeek-R1 uses GRPO to estimate baseline advantages directly from group rollout statistics, completely eliminating the Critic model.'
  };
}

function q13TestTimeComputeScaling() {
  let g = T(320, 20, 'Test-Time Compute Scaling Law: Reasoning Tokens vs. Accuracy', { size: 14, weight: 800, fill: '#fff' });

  // Plot box
  const box = { x: 90, y: 44, w: 490, h: 125 };
  const xr = [100, 10000]; // log tokens
  const yr = [30, 100]; // % accuracy

  // Axes and Grid
  g += rect(box.x, box.y, box.w, box.h, { fill: 'rgba(2, 6, 23, 0.6)', stroke: 'rgba(148,163,184,0.2)', rx: 4 });
  g += line(box.x, box.y + box.h, box.x + box.w, box.y + box.h, C.axis, 1.5);
  g += line(box.x, box.y, box.x, box.y + box.h, C.axis, 1.5);

  // X ticks (Log scale simulation: 100, 500, 1000, 5000, 10000)
  const xPoints = [
    { val: '100 (Direct)', px: 0 },
    { val: '500 (Short CoT)', px: 110 },
    { val: '2,000 (R1 Deliberation)', px: 260 },
    { val: '5,000', px: 380 },
    { val: '10,000+ (MCTS & Voting)', px: 490 }
  ];
  xPoints.forEach(p => {
    const x = box.x + p.px;
    g += line(x, box.y, x, box.y + box.h, C.grid, 1);
    g += T(x, box.y + box.h + 12, p.val, { size: 7.5, fill: C.dim, mono: true });
  });

  // Y ticks (40%, 60%, 80%, 100%)
  [40, 60, 80, 100].forEach(p => {
    const y = box.y + box.h - ((p - 30) / 70) * box.h;
    g += line(box.x, y, box.x + box.w, y, C.grid, 1);
    g += T(box.x - 8, y, `${p}%`, { size: 7.5, fill: C.dim, anchor: 'end', mono: true });
  });

  // Scaling curve: Starts at ~42%, ascends in log-linear fashion to ~94%
  const pathD = `M ${box.x},${box.y + box.h - (12/70)*box.h} ` +
    `C ${box.x + 80},${box.y + box.h - (24/70)*box.h} ${box.x + 180},${box.y + box.h - (45/70)*box.h} ${box.x + 260},${box.y + box.h - (54/70)*box.h} ` +
    `S ${box.x + 400},${box.y + box.h - (62/70)*box.h} ${box.x + 490},${box.y + box.h - (66/70)*box.h}`;
  g += path(pathD, { stroke: C.emerald, sw: 3 });

  // Key Milestones dots
  const milestones = [
    { x: box.x, y: box.y + box.h - (12/70)*box.h, lbl: 'System 1 (42%)', col: C.rose },
    { x: box.x + 110, y: box.y + box.h - (30/70)*box.h, lbl: 'CoT (60%)', col: C.amber },
    { x: box.x + 260, y: box.y + box.h - (54/70)*box.h, lbl: 'DeepSeek-R1 (84%)', col: C.cyan },
    { x: box.x + 490, y: box.y + box.h - (66/70)*box.h, lbl: 'Verified (96%)', col: C.emerald }
  ];
  milestones.forEach(m => {
    g += circ(m.x, m.y, 4, { fill: m.col, stroke: '#fff', sw: 1.5 });
    g += T(m.x, m.y - 10, m.lbl, { size: 7.5, weight: 700, fill: m.col });
  });

  // Footnote
  g += rect(50, 186, 540, 22, { fill: 'rgba(2, 6, 23, 0.8)', stroke: 'rgba(148,163,184,0.2)', rx: 4 });
  g += T(320, 197, 'As test-time compute scales, models dynamically branch, self-correct, and verify with PRMs to achieve peak accuracy.', { size: 7.8, fill: C.muted });

  return {
    html: svg(640, 218, g),
    caption: 'The Test-Time Scaling Law: Spending more tokens on deliberate search and verification yields log-linear accuracy gains on hard tasks.'
  };
}

// ---------- Registry ----------
const VISUALS = {
  'quest-1': [q1Neuron, q1DotProduct, q1WeightLines, q1Bias],
  'quest-2': [q2Collapse, q2Xor, q2Activations, q2Cheatsheet],
  'quest-3': [q3Loss, q3Gradient, q3LearningRate, q3Loop],
  'quest-4': [q4Flatten, q4Sliding, q4Hierarchy, q4Pool, q4Softmax],
  'quest-5': [q5Conv, q5Filters, q5Calculator, q5PadStride],
  'quest-6': [q6BiasVariance, q6LossCurves, q6Dropout, q6WeightDecay, q6Augment],
  'quest-7': [q7Sequential, q7QKV, q7Scale, q7Bank, q7MultiHead],
  'quest-8': [q8Subwords, q8EmbeddingMatrix, q8Permutation, q8RoPE],
  'quest-9': [q9CausalMask, q9ResidualHighway, q9RMSNorm, q9SwiGLU, q9KVCache],
  'quest-10': [q10Unembedding, q10Temperature, q10TopKvsTopP, q10AutoregressiveLoop, q10RepetitionPenalty],
  'quest-11': [q11PretrainVsSFT, q11ChatMLTemplate, q11RlhfPipeline, q11DpoLossDynamics, q11SafetyTaxTradeoff],
  'quest-12': [q12VramExplosion, q12MatrixDecomposition, q12AdapterSwitching, q12WeightMerging, q12QloraQuantization],
  'quest-13': [q13System1VsSystem2, q13TreeOfThoughts, q13OrmVsPrm, q13GrpoArchitecture, q13TestTimeComputeScaling]
};

let activeCleanups = [];

/** Returns { html, caption, mount? } for a lesson section, or null if none exists. */
export function getSectionVisual(questId, sectionIdx) {
  const factory = VISUALS[questId] && VISUALS[questId][sectionIdx];
  if (!factory) return null;
  try { return factory(); } catch (err) { console.warn('Lesson visual failed:', questId, sectionIdx, err); return null; }
}

/** Run a visual's mount function and remember its cleanup. */
export function mountVisual(visual, el) {
  if (!visual || typeof visual.mount !== 'function') return;
  try {
    const cleanup = visual.mount(el);
    if (typeof cleanup === 'function') activeCleanups.push(cleanup);
  } catch (err) { console.warn('Lesson visual mount failed:', err); }
}

/** Stop timers from previously rendered visuals. */
export function disposeVisuals() {
  activeCleanups.forEach(fn => { try { fn(); } catch { /* noop */ } });
  activeCleanups = [];
}
