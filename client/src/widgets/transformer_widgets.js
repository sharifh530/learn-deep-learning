import { soundFx } from '../sound_effects.js';
import confetti from 'canvas-confetti';
import { marked } from 'marked';
import katex from 'katex';
import { escapeHtml } from './utils.js';

function solveLinearSystem(A, b) {
  const n = b.length;
  const M = Array.from({ length: n }, (_, i) => {
    const row = new Float64Array(n + 1);
    for (let j = 0; j < n; j++) row[j] = A[i][j];
    row[n] = b[i];
    return row;
  });

  for (let p = 0; p < n; p++) {
    let maxRow = p;
    for (let i = p + 1; i < n; i++) {
      if (Math.abs(M[i][p]) > Math.abs(M[maxRow][p])) maxRow = i;
    }
    const temp = M[p];
    M[p] = M[maxRow];
    M[maxRow] = temp;

    const pivot = M[p][p];
    if (Math.abs(pivot) < 1e-12) continue;

    for (let j = p; j <= n; j++) M[p][j] /= pivot;

    for (let i = 0; i < n; i++) {
      if (i !== p) {
        const factor = M[i][p];
        for (let j = p; j <= n; j++) {
          M[i][j] -= factor * M[p][j];
        }
      }
    }
  }

  const res = new Float64Array(n);
  for (let i = 0; i < n; i++) res[i] = isNaN(M[i][n]) ? 0 : M[i][n];
  return res;
}

function evalPoly(W, x) {
  let y = 0;
  let px = 1;
  for (let d = 0; d < W.length; d++) {
    y += W[d] * px;
    px *= x;
  }
  return y;
}

function groundTruthFn(x) {
  return Math.sin(2.4 * x) + 0.25 * x;
}

function fitPolynomial(points, degree, lambda, dropout = 0) {
  const n = degree + 1;
  const N = points.length;
  if (N === 0) return new Float64Array(n);

  // Precompute power sums of x up to 2 * degree
  const S = new Float64Array(2 * degree + 1);
  for (let i = 0; i < N; i++) {
    const x = points[i].x;
    let px = 1;
    for (let p = 0; p <= 2 * degree; p++) {
      S[p] += px;
      px *= x;
    }
  }

  // Precompute b_j = sum(y_i * x_i^j)
  const b = new Float64Array(n);
  for (let i = 0; i < N; i++) {
    const x = points[i].x;
    const y = points[i].y;
    let px = 1;
    for (let j = 0; j < n; j++) {
      b[j] += y * px;
      px *= x;
    }
  }

  // Build normal equation matrix A
  const A = Array.from({ length: n }, () => new Float64Array(n));
  for (let j = 0; j < n; j++) {
    for (let k = 0; k < n; k++) {
      A[j][k] = S[j + k];
    }
    // Regularization (L2 Weight Decay) applied to non-bias weights (j > 0)
    if (j > 0) {
      A[j][j] += N * lambda * 10.0;
      // Dropout effect: progressively damps higher order polynomial co-adaptations
      if (dropout > 0) {
        A[j][j] += N * dropout * Math.pow(j, 1.8) * 0.15;
      }
    }
  }

  return solveLinearSystem(A, b);
}

export function renderRegularizationArenaWidget(quest, context) {
  const { state, dom, awardXp } = context;

  const container = document.createElement('div');
  container.className = 'regularization-arena-container';

  container.innerHTML = `
    <!-- Top Diagnostic Banner -->
    <div class="reg-diagnostic-banner">
      <div class="reg-status-col">
        <span class="reg-status-badge" id="reg-status-badge">🚨 Severe Overfitting</span>
        <div class="reg-status-desc" id="reg-status-desc">
          Model capacity is too high for this dataset size. It connects random training noise, causing validation error to explode!
        </div>
      </div>
      <div class="reg-score-col">
        <div class="reg-score-label">Generalization Score</div>
        <div class="reg-score-val" id="reg-score-val">34%</div>
        <div class="reg-score-bar-bg">
          <div class="reg-score-bar-fill" id="reg-score-bar-fill" style="width: 34%;"></div>
        </div>
      </div>
    </div>

    <!-- Presets Bar -->
    <div class="reg-presets-bar" id="reg-presets-bar">
      <span class="reg-presets-label">Battle Scenarios:</span>
      <button class="btn-reg-preset active" data-preset="monster">🚨 Overfitting Monster</button>
      <button class="btn-reg-preset" data-preset="underfit">⚠️ Rigid Underfitter</button>
      <button class="btn-reg-preset" data-preset="dropout">🛡️ Tamed by Dropout</button>
      <button class="btn-reg-preset" data-preset="decay">⚖️ Tamed by L2 Decay</button>
      <button class="btn-reg-preset" data-preset="optimal">🏆 Optimal Improv Master</button>
    </div>

    <!-- 2-Column Canvas Stage -->
    <div class="reg-stage-grid">
      <!-- Col 1: Curve Fitting & Decision Boundary -->
      <div class="reg-panel-card">
        <div class="reg-panel-header">
          <span>📈 Curve Fitting & Decision Boundary</span>
          <div class="reg-legend">
            <span class="legend-item"><span class="legend-dot blue"></span> Train (N=<span id="legend-train-n">18</span>)</span>
            <span class="legend-item"><span class="legend-dot orange"></span> Val / Test</span>
            <span class="legend-item"><span class="legend-line green"></span> Ground Truth</span>
          </div>
        </div>
        <div class="reg-canvas-wrapper">
          <canvas id="reg-curve-canvas" width="500" height="280" class="reg-canvas"></canvas>
        </div>
        <div class="reg-metrics-row">
          <div class="metric-pill">Train MSE: <strong id="metric-train-mse" style="color: #38bdf8;">0.004</strong></div>
          <div class="metric-pill">Val MSE: <strong id="metric-val-mse" style="color: #f97316;">0.582</strong></div>
          <div class="metric-pill">Gap (Variance): <strong id="metric-gap" style="color: #f43f5e;">+0.578</strong></div>
        </div>
      </div>

      <!-- Col 2: Dual Loss Telemetry Curve -->
      <div class="reg-panel-card">
        <div class="reg-panel-header">
          <span>📉 Training vs. Validation Loss (Epochs 0–40)</span>
          <div class="reg-legend">
            <span class="legend-item"><span class="legend-line cyan"></span> Train Loss</span>
            <span class="legend-item"><span class="legend-line orange"></span> Val Loss</span>
          </div>
        </div>
        <div class="reg-canvas-wrapper">
          <canvas id="reg-loss-canvas" width="500" height="280" class="reg-canvas"></canvas>
        </div>
        <div class="reg-callout-footer" id="reg-loss-insight">
          Notice the U-shaped orange curve: Validation loss bottoms out around Epoch 14 and begins climbing, proving memorization of noise!
        </div>
      </div>
    </div>

    <!-- Bottom: Weapons & Regularization Controls Rack -->
    <div class="reg-controls-rack">
      <div class="reg-control-box">
        <div class="control-header">
          <span>🎚️ Model Capacity (Degree)</span>
          <strong id="val-complexity" style="color: var(--accent-cyan); font-family: var(--font-mono);">Degree 8</strong>
        </div>
        <input type="range" id="slider-complexity" min="1" max="12" step="1" value="8" class="cyber-slider" />
        <span class="control-hint">Degree 1 = Linear; Degree 8+ = High polynomial capacity</span>
      </div>

      <div class="reg-control-box">
        <div class="control-header">
          <span>📊 Training Dataset Size</span>
          <strong id="val-datasize" style="color: var(--accent-amber); font-family: var(--font-mono);">18 Points</strong>
        </div>
        <input type="range" id="slider-datasize" min="10" max="45" step="1" value="18" class="cyber-slider" />
        <span class="control-hint">Smaller datasets are exponentially easier to memorize</span>
      </div>

      <div class="reg-control-box">
        <div class="control-header">
          <span>🛡️ Dropout Weapon (p)</span>
          <strong id="val-dropout" style="color: #c4b5fd; font-family: var(--font-mono);">p = 0.0</strong>
        </div>
        <div class="reg-segmented-btn-group" id="reg-dropout-group">
          <button class="param-btn active" data-p="0.0">Off (0.0)</button>
          <button class="param-btn" data-p="0.2">Light (0.2)</button>
          <button class="param-btn" data-p="0.5">Heavy (0.5)</button>
        </div>
        <span class="control-hint">Randomly drops activations to eliminate co-adaptation</span>
      </div>

      <div class="reg-control-box">
        <div class="control-header">
          <span>⚖️ L2 Weight Decay (λ)</span>
          <strong id="val-weightdecay" style="color: #34d399; font-family: var(--font-mono);">λ = 0.000</strong>
        </div>
        <input type="range" id="slider-weightdecay" min="0" max="0.04" step="0.002" value="0.0" class="cyber-slider" />
        <span class="control-hint">Penalizes large weights: pulls curve toward smooth trajectory</span>
      </div>

      <div class="reg-control-box" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div class="control-header">
          <span>🔄 Data Augmentation</span>
          <span class="badge-status" id="badge-augment-status" style="font-size: 0.72rem; color: var(--text-muted);">Disabled</span>
        </div>
        <button class="btn-reg-action" id="btn-toggle-augment" style="margin-top: 0.3rem;">
          <span>✨ Synthesize +12 Points</span>
        </button>
        <span class="control-hint" style="margin-top: 0.3rem;">Artificially expands dataset to boost invariance</span>
      </div>
    </div>
  `;

  dom.interactiveContainer.appendChild(container);

  // References
  const curveCanvas = container.querySelector('#reg-curve-canvas');
  const curveCtx = curveCanvas.getContext('2d');
  const lossCanvas = container.querySelector('#reg-loss-canvas');
  const lossCtx = lossCanvas.getContext('2d');

  const statusBadge = container.querySelector('#reg-status-badge');
  const statusDesc = container.querySelector('#reg-status-desc');
  const scoreVal = container.querySelector('#reg-score-val');
  const scoreBarFill = container.querySelector('#reg-score-bar-fill');

  const metricTrain = container.querySelector('#metric-train-mse');
  const metricVal = container.querySelector('#metric-val-mse');
  const metricGap = container.querySelector('#metric-gap');
  const lossInsight = container.querySelector('#reg-loss-insight');
  const legendTrainN = container.querySelector('#legend-train-n');

  const sliderComplexity = container.querySelector('#slider-complexity');
  const valComplexity = container.querySelector('#val-complexity');
  const sliderDataSize = container.querySelector('#slider-datasize');
  const valDataSize = container.querySelector('#val-datasize');
  const sliderWeightDecay = container.querySelector('#slider-weightdecay');
  const valWeightDecay = container.querySelector('#val-weightdecay');
  const valDropout = container.querySelector('#val-dropout');
  const btnToggleAugment = container.querySelector('#btn-toggle-augment');
  const badgeAugmentStatus = container.querySelector('#badge-augment-status');

  // Generate fixed base points (deterministic noise seed for repeatability)
  let trainPoints = [];
  let valPoints = [];
  let augPoints = [];

  function makeDatasets() {
    const N = state.regDataSize;
    trainPoints = [];
    valPoints = [];
    augPoints = [];

    // Training points
    for (let i = 0; i < N; i++) {
      const x = -0.9 + (1.8 * i) / (N - 1);
      // Pseudo-random noise with sine variation
      const noise = Math.sin(i * 12.9898 + 4.1414) * state.regNoise;
      const y = groundTruthFn(x) + noise;
      trainPoints.push({ x, y });
    }

    // Validation points (24 independent test samples spanning -0.96 to 0.96)
    for (let i = 0; i < 24; i++) {
      const x = -0.96 + (1.92 * i) / 23;
      const noise = Math.cos(i * 7.8233 + 1.234) * (state.regNoise * 0.9);
      const y = groundTruthFn(x) + noise;
      valPoints.push({ x, y });
    }

    // Augmented points
    if (state.regAugmentActive) {
      for (let i = 0; i < 12; i++) {
        const base = trainPoints[i % trainPoints.length];
        const jitX = Math.max(-0.95, Math.min(0.95, base.x + (Math.sin(i * 3.14) * 0.06)));
        const jitY = base.y + (Math.cos(i * 2.71) * 0.08);
        augPoints.push({ x: jitX, y: jitY });
      }
    }

    legendTrainN.textContent = trainPoints.length + augPoints.length;
  }

  function recomputeAndDraw() {
    const combinedTrain = state.regAugmentActive ? [...trainPoints, ...augPoints] : trainPoints;
    const degree = state.regComplexity;
    const lambda = state.regWeightDecay;
    const dropout = state.regDropout;

    // Fit model
    const W = fitPolynomial(combinedTrain, degree, lambda, dropout);

    // Compute MSE
    let trainLoss = 0;
    for (const p of combinedTrain) {
      const diff = p.y - evalPoly(W, p.x);
      trainLoss += diff * diff;
    }
    trainLoss /= combinedTrain.length;

    let valLoss = 0;
    for (const p of valPoints) {
      const diff = p.y - evalPoly(W, p.x);
      valLoss += diff * diff;
    }
    valLoss /= valPoints.length;

    const gap = Math.max(0, valLoss - trainLoss);

    // Update readouts
    metricTrain.textContent = trainLoss.toFixed(4);
    metricVal.textContent = valLoss.toFixed(4);
    metricGap.textContent = (gap >= 0 ? '+' : '') + gap.toFixed(4);

    const isOverfit = (degree >= 7 && lambda < 0.006 && dropout < 0.2) || (gap > 0.12 && lambda < 0.005);
    const isUnderfit = degree <= 2;

    // Calculate Generalization Score (0% to 100%)
    let genScore;
    if (isUnderfit) {
      genScore = Math.max(15, Math.min(45, Math.round(35 - trainLoss * 20)));
    } else if (isOverfit) {
      genScore = Math.max(12, Math.min(42, Math.round(42 - gap * 35)));
    } else {
      genScore = Math.max(75, Math.min(98, Math.round(96 - (valLoss * 30 + gap * 20))));
    }

    scoreVal.textContent = `${genScore}%`;
    scoreBarFill.style.width = `${genScore}%`;

    // Status classification
    if (isUnderfit) {
      statusBadge.className = 'reg-status-badge underfit';
      statusBadge.textContent = '⚠️ Rigid Underfitting';
      statusDesc.textContent = 'High Bias: Model is too primitive (straight line) to capture the true non-linear wave. Both Train and Val errors are high.';
      scoreBarFill.style.background = '#eab308';
    } else if (isOverfit) {
      statusBadge.className = 'reg-status-badge overfit';
      statusBadge.textContent = '🚨 Severe Overfitting';
      statusDesc.textContent = 'High Variance: Model connects every noisy data point with extreme loops! Train Loss is near 0, but Validation Loss is exploding.';
      scoreBarFill.style.background = '#f43f5e';
    } else {
      statusBadge.className = 'reg-status-badge optimal';
      statusBadge.textContent = '🏆 Optimal Generalization';
      statusDesc.textContent = 'Goldilocks Zone! Regularization smoothed the curve, matching the true pattern and keeping Test Error low.';
      scoreBarFill.style.background = '#10b981';
    }

    // Draw Canvases
    drawCurveCanvas(curveCtx, combinedTrain, valPoints, augPoints, W, degree, gap);
    drawLossCanvas(lossCtx, trainLoss, valLoss, degree, lambda, dropout, gap);
  }

  function drawCurveCanvas(ctx, trainPts, valPts, augPts, W, degree, gap) {
    const W_px = 500;
    const H_px = 280;
    ctx.clearRect(0, 0, W_px, H_px);

    // Coordinate mapping: x in [-1.1, 1.1], y in [-1.8, 1.8]
    const mapX = (x) => ((x + 1.1) / 2.2) * W_px;
    const mapY = (y) => H_px - ((y + 1.8) / 3.6) * H_px;

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let gx = -1; gx <= 1; gx += 0.5) {
      ctx.beginPath();
      ctx.moveTo(mapX(gx), 0);
      ctx.lineTo(mapX(gx), H_px);
      ctx.stroke();
    }
    for (let gy = -1; gy <= 1; gy += 0.5) {
      ctx.beginPath();
      ctx.moveTo(0, mapY(gy));
      ctx.lineTo(W_px, mapY(gy));
      ctx.stroke();
    }

    // 1. Ground Truth Function (Dashed green line)
    ctx.save();
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const x = -1.05 + (2.1 * i) / 100;
      const y = groundTruthFn(x);
      if (i === 0) ctx.moveTo(mapX(x), mapY(y));
      else ctx.lineTo(mapX(x), mapY(y));
    }
    ctx.stroke();
    ctx.restore();

    // 2. Model's Learned Curve
    ctx.save();
    const isOverfit = (degree >= 7 && state.regWeightDecay < 0.006 && state.regDropout < 0.2) || (gap > 0.12 && state.regWeightDecay < 0.005);
    const isUnderfit = degree <= 2;
    ctx.strokeStyle = isOverfit ? '#f43f5e' : (isUnderfit ? '#eab308' : '#06b6d4');
    ctx.lineWidth = 3.5;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 12;
    ctx.beginPath();

    for (let i = 0; i <= 150; i++) {
      const x = -1.05 + (2.1 * i) / 150;
      const y = Math.max(-2.2, Math.min(2.2, evalPoly(W, x)));
      if (i === 0) ctx.moveTo(mapX(x), mapY(y));
      else ctx.lineTo(mapX(x), mapY(y));
    }
    ctx.stroke();
    ctx.restore();

    // 3. Augmented Points (if any)
    for (const p of augPts) {
      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.arc(mapX(p.x), mapY(p.y), 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 4. Training Points (Blue dots)
    for (const p of trainPoints) {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(mapX(p.x), mapY(p.y), 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 5. Validation Points (Orange triangles)
    for (const p of valPts) {
      const cx = mapX(p.x);
      const cy = mapY(p.y);
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 6);
      ctx.lineTo(cx + 5, cy + 4);
      ctx.lineTo(cx - 5, cy + 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function drawLossCanvas(ctx, trainLoss, valLoss, degree, lambda, dropout, gap) {
    const W_px = 500;
    const H_px = 280;
    ctx.clearRect(0, 0, W_px, H_px);

    // Padding & Axes
    const padL = 45, padR = 25, padT = 25, padB = 40;
    const plotW = W_px - padL - padR;
    const plotH = H_px - padT - padB;

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let e = 0; e <= 40; e += 10) {
      const x = padL + (e / 40) * plotW;
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + plotH);
      ctx.stroke();
      // Epoch label
      ctx.fillStyle = 'var(--text-muted)';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(`Ep ${e}`, x - 12, padT + plotH + 16);
    }

    // Simulate 40 Epochs Progression
    const isOverfit = (degree >= 7 && lambda < 0.006 && dropout < 0.2) || (gap > 0.12 && lambda < 0.005);
    const trainPointsCurve = [];
    const valPointsCurve = [];

    const maxLossDisplay = 1.0;
    const mapLossY = (l) => padT + plotH - (Math.min(maxLossDisplay, Math.max(0, l)) / maxLossDisplay) * plotH;

    for (let e = 0; e <= 40; e++) {
      const progress = e / 40;
      // Train loss decay
      const tL = Math.max(0.01, trainLoss + (0.9 - trainLoss) * Math.exp(-e / 7.0));
      trainPointsCurve.push({ x: padL + progress * plotW, y: mapLossY(tL) });

      // Val loss behavior
      let vL;
      if (isOverfit) {
        // U-shaped curve: drops then shoots up after epoch 14
        const baseDrop = 0.85 * Math.exp(-e / 6.0) + 0.12;
        const divergence = e > 14 ? Math.pow((e - 14) / 26, 1.8) * 0.75 : 0;
        vL = baseDrop + divergence;
      } else {
        // Healthy: stays coupled
        vL = tL + 0.03 + Math.sin(e * 0.5) * 0.01;
      }
      valPointsCurve.push({ x: padL + progress * plotW, y: mapLossY(vL) });
    }

    // Optimal Early Stopping Marker (Epoch 14)
    if (isOverfit) {
      const stopX = padL + (14 / 40) * plotW;
      ctx.save();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.75)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(stopX, padT);
      ctx.lineTo(stopX, padT + plotH);
      ctx.stroke();
      ctx.fillStyle = '#f59e0b';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText('⭐ Early Stop (Ep 14)', stopX - 55, padT + 12);
      ctx.restore();
    }

    // Draw Train Loss Curve (Cyan)
    ctx.save();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < trainPointsCurve.length; i++) {
      if (i === 0) ctx.moveTo(trainPointsCurve[i].x, trainPointsCurve[i].y);
      else ctx.lineTo(trainPointsCurve[i].x, trainPointsCurve[i].y);
    }
    ctx.stroke();
    ctx.restore();

    // Draw Val Loss Curve (Orange)
    ctx.save();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < valPointsCurve.length; i++) {
      if (i === 0) ctx.moveTo(valPointsCurve[i].x, valPointsCurve[i].y);
      else ctx.lineTo(valPointsCurve[i].x, valPointsCurve[i].y);
    }
    ctx.stroke();
    ctx.restore();

    // Dynamic insight footer
    if (isOverfit) {
      lossInsight.innerHTML = '🚨 <strong>Classic U-Shaped Divergence:</strong> Validation loss bottoms out around Epoch 14 and begins climbing, proving the network is memorizing noise!';
    } else if (degree <= 2) {
      lossInsight.innerHTML = '⚠️ <strong>Underfitting Plateau:</strong> Both training and validation errors stall at high levels. The model lacks sufficient parameters to learn the wave.';
    } else {
      lossInsight.innerHTML = '🏆 <strong>Coupled Generalization:</strong> Validation loss closely follows training loss with minimal gap. Your regularization weapons conquered the beast!';
    }
  }

  // --- Controls Event Listeners ---
  sliderComplexity.addEventListener('input', (e) => {
    state.regComplexity = parseInt(e.target.value, 10);
    valComplexity.textContent = `Degree ${state.regComplexity}`;
    recomputeAndDraw();
  });

  sliderDataSize.addEventListener('input', (e) => {
    state.regDataSize = parseInt(e.target.value, 10);
    valDataSize.textContent = `${state.regDataSize} Points`;
    makeDatasets();
    recomputeAndDraw();
  });

  sliderWeightDecay.addEventListener('input', (e) => {
    state.regWeightDecay = parseFloat(e.target.value);
    valWeightDecay.textContent = `λ = ${state.regWeightDecay.toFixed(3)}`;
    recomputeAndDraw();
  });

  container.querySelectorAll('#reg-dropout-group .param-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('#reg-dropout-group .param-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.regDropout = parseFloat(btn.dataset.p);
      valDropout.textContent = `p = ${state.regDropout.toFixed(1)}`;
      recomputeAndDraw();
    });
  });

  btnToggleAugment.addEventListener('click', () => {
    state.regAugmentActive = !state.regAugmentActive;
    badgeAugmentStatus.textContent = state.regAugmentActive ? 'Active (+12 pts)' : 'Disabled';
    badgeAugmentStatus.style.color = state.regAugmentActive ? '#34d399' : 'var(--text-muted)';
    btnToggleAugment.classList.toggle('active', state.regAugmentActive);
    makeDatasets();
    recomputeAndDraw();
  });

  // --- Preset Scenarios ---
  container.querySelectorAll('.btn-reg-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.btn-reg-preset').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const preset = btn.dataset.preset;
      if (preset === 'monster') {
        state.regComplexity = 11;
        state.regDataSize = 14;
        state.regWeightDecay = 0.0;
        state.regDropout = 0.0;
        state.regAugmentActive = false;
      } else if (preset === 'underfit') {
        state.regComplexity = 1;
        state.regDataSize = 25;
        state.regWeightDecay = 0.0;
        state.regDropout = 0.0;
        state.regAugmentActive = false;
      } else if (preset === 'dropout') {
        state.regComplexity = 10;
        state.regDataSize = 20;
        state.regWeightDecay = 0.0;
        state.regDropout = 0.5;
        state.regAugmentActive = false;
      } else if (preset === 'decay') {
        state.regComplexity = 10;
        state.regDataSize = 20;
        state.regWeightDecay = 0.024;
        state.regDropout = 0.0;
        state.regAugmentActive = false;
      } else if (preset === 'optimal') {
        state.regComplexity = 4;
        state.regDataSize = 24;
        state.regWeightDecay = 0.006;
        state.regDropout = 0.2;
        state.regAugmentActive = true;
      }

      // Sync UI sliders
      sliderComplexity.value = state.regComplexity;
      valComplexity.textContent = `Degree ${state.regComplexity}`;
      sliderDataSize.value = state.regDataSize;
      valDataSize.textContent = `${state.regDataSize} Points`;
      sliderWeightDecay.value = state.regWeightDecay;
      valWeightDecay.textContent = `λ = ${state.regWeightDecay.toFixed(3)}`;
      valDropout.textContent = `p = ${state.regDropout.toFixed(1)}`;

      container.querySelectorAll('#reg-dropout-group .param-btn').forEach(b => {
        b.classList.toggle('active', parseFloat(b.dataset.p) === state.regDropout);
      });

      badgeAugmentStatus.textContent = state.regAugmentActive ? 'Active (+12 pts)' : 'Disabled';
      badgeAugmentStatus.style.color = state.regAugmentActive ? '#34d399' : 'var(--text-muted)';
      btnToggleAugment.classList.toggle('active', state.regAugmentActive);

      makeDatasets();
      recomputeAndDraw();
    });
  });

  // Initial draw
  makeDatasets();
  recomputeAndDraw();
}

// ==========================================================================
// WIDGET 7: The Attention Machine (Transformers & Self-Attention Workshop)
// ==========================================================================

const WORD_EMBEDDINGS_4D = {
  // Sentence 1: The animal didn't cross the street because it was too tired.
  'the': [0.05, 0.05, 0.05, 0.95],
  'animal': [0.95, 0.40, 0.15, 0.05],
  "didn't": [0.05, 0.15, 0.70, 0.85],
  'didnt': [0.05, 0.15, 0.70, 0.85],
  'cross': [0.20, 0.20, 0.95, 0.10],
  'street': [0.90, 0.05, 0.10, 0.05],
  'because': [0.05, 0.10, 0.10, 0.95],
  'it': [0.85, 0.65, 0.10, 0.15],
  'was': [0.10, 0.30, 0.85, 0.40],
  'too': [0.05, 0.70, 0.10, 0.80],
  'tired': [0.15, 0.95, 0.05, 0.10],
  'tired.': [0.15, 0.95, 0.05, 0.10],

  // Sentence 2: The river bank was muddy after the heavy morning storm.
  'river': [0.92, 0.85, 0.20, 0.05],
  'bank': [0.90, 0.70, 0.05, 0.10],
  'muddy': [0.25, 0.92, 0.05, 0.10],
  'after': [0.05, 0.10, 0.10, 0.92],
  'heavy': [0.20, 0.88, 0.05, 0.15],
  'morning': [0.45, 0.60, 0.05, 0.10],
  'storm': [0.85, 0.90, 0.30, 0.05],
  'storm.': [0.85, 0.90, 0.30, 0.05],

  // Sentence 3: The central bank raised interest rates to combat inflation.
  'central': [0.45, 0.80, 0.10, 0.20],
  'raised': [0.15, 0.25, 0.95, 0.10],
  'interest': [0.80, 0.75, 0.10, 0.10],
  'rates': [0.85, 0.70, 0.10, 0.05],
  'to': [0.05, 0.05, 0.10, 0.90],
  'combat': [0.15, 0.25, 0.92, 0.10],
  'inflation': [0.80, 0.85, 0.10, 0.10],
  'inflation.': [0.80, 0.85, 0.10, 0.10],

  // Sentence 4: Attention is all you need for modern sequence modeling.
  'attention': [0.90, 0.80, 0.30, 0.10],
  'is': [0.10, 0.20, 0.80, 0.30],
  'all': [0.10, 0.40, 0.10, 0.85],
  'you': [0.80, 0.30, 0.10, 0.15],
  'need': [0.20, 0.30, 0.90, 0.10],
  'for': [0.05, 0.05, 0.10, 0.90],
  'modern': [0.25, 0.75, 0.05, 0.20],
  'sequence': [0.85, 0.50, 0.20, 0.10],
  'modeling': [0.80, 0.65, 0.30, 0.10],
  'modeling.': [0.80, 0.65, 0.30, 0.10]
};

function getWordVector4D(word) {
  const clean = word.toLowerCase().replace(/[^a-z0-9']/g, '');
  if (WORD_EMBEDDINGS_4D[clean]) {
    return [...WORD_EMBEDDINGS_4D[clean]];
  }
  if (WORD_EMBEDDINGS_4D[word.toLowerCase()]) {
    return [...WORD_EMBEDDINGS_4D[word.toLowerCase()]];
  }
  // Deterministic pseudo-random embedding for arbitrary user tokens
  let h = 0;
  for (let i = 0; i < clean.length; i++) {
    h = (h * 31 + clean.charCodeAt(i)) & 0xffffffff;
  }
  const v0 = ((Math.abs(h) % 100) / 100) * 0.9 + 0.05;
  const v1 = ((Math.abs(h >> 4) % 100) / 100) * 0.9 + 0.05;
  const v2 = ((Math.abs(h >> 8) % 100) / 100) * 0.9 + 0.05;
  const v3 = ((Math.abs(h >> 12) % 100) / 100) * 0.9 + 0.05;
  return [v0, v1, v2, v3];
}

// Multi-Head Projection Transformations
function projectToken(vector, role, headType) {
  const [d0, d1, d2, d3] = vector;
  if (headType === 'head-1') {
    // Head 1: Syntax & Verb-Object Dependency
    if (role === 'Q') {
      return [d2 * 1.5, d0 * 0.8, d3 * 1.1, d1 * 0.3];
    } else {
      return [d0 * 1.6, d2 * 0.6, d3 * 1.0, d1 * 0.2];
    }
  } else if (headType === 'head-2') {
    // Head 2: Coreference & Semantic Antecedent Binding
    if (role === 'Q') {
      return [d0 * 1.5, d1 * 1.6, d2 * 0.2, d3 * 0.1];
    } else {
      return [d0 * 1.4, d1 * 1.5, d2 * 0.1, d3 * 0.2];
    }
  } else if (headType === 'head-3') {
    // Head 3: Positional Locality & Modifier Flow
    if (role === 'Q') {
      return [d3 * 1.3, d1 * 0.5, d2 * 0.7, d0 * 0.6];
    } else {
      return [d3 * 1.2, d1 * 0.6, d2 * 0.8, d0 * 0.5];
    }
  }
  return [d0, d1, d2, d3];
}

export function renderAttentionWorkshopWidget(quest, context) {
  const { state, dom, awardXp } = context;

  const container = document.createElement('div');
  container.className = 'attention-workshop-container';

  const sentences = quest.interactiveConfig?.sentences || [];
  let currentSentenceIdx = state.attnSentenceIdx || 0;
  let currentTokens = sentences[currentSentenceIdx]?.tokens || ["Attention", "is", "all", "you", "need"];
  let focusedIdx = Math.min(state.attnFocusedToken, currentTokens.length - 1);
  if (focusedIdx < 0) focusedIdx = 0;

  container.innerHTML = `
    <!-- Top Diagnostic HUD -->
    <div class="attn-diagnostic-banner">
      <div class="attn-status-col">
        <span class="attn-status-badge" id="attn-status-badge">⚡ Scaled Dot-Product Active</span>
        <div class="attn-status-desc" id="attn-status-desc">
          Attention Mechanism: Every token broadcasts a Query, scans all Keys, and extracts weighted Values in parallel.
        </div>
      </div>
      <div class="attn-metrics-rack">
        <div class="attn-metric-item">
          <span class="metric-label">Focused Query</span>
          <strong class="metric-val query-token" id="metric-query-token">"it" (#7)</strong>
        </div>
        <div class="attn-metric-item">
          <span class="metric-label">Top Key Match</span>
          <strong class="metric-val key-token" id="metric-key-token">"animal" (68.4%)</strong>
        </div>
        <div class="attn-metric-item">
          <span class="metric-label">Attention Entropy</span>
          <strong class="metric-val entropy" id="metric-entropy">0.52 bits</strong>
        </div>
        <div class="attn-metric-item">
          <span class="metric-label">Softmax State</span>
          <strong class="metric-val gradient" id="metric-gradient-health">Healthy Flow 🟢</strong>
        </div>
      </div>
    </div>

    <!-- Sentence Selector & Preset Bar -->
    <div class="attn-sentence-bar">
      <div class="attn-sentence-select-wrap">
        <label for="attn-sentence-select">📚 Benchmark Sentence:</label>
        <select id="attn-sentence-select" class="cyber-select">
          ${sentences.map((s, idx) => `
            <option value="${idx}" ${idx === currentSentenceIdx ? 'selected' : ''}>
              #${idx + 1}: ${s.text.length > 55 ? s.text.substring(0, 52) + '...' : s.text}
            </option>
          `).join('')}
        </select>
      </div>
      <div class="attn-custom-input-wrap">
        <input type="text" id="attn-custom-input" placeholder="Or enter your custom sentence..." class="cyber-input" />
        <button id="btn-apply-custom" class="btn-attn-sub">Tokenize ✨</button>
      </div>
    </div>

    <!-- Interactive Token Ribbon -->
    <div class="attn-tokens-ribbon-card">
      <div class="ribbon-header">
        <span>🔤 Sequence Tokens (Click any token to set as Query)</span>
        <span class="ribbon-hint">Current Query: <span id="ribbon-active-query-name" style="color: var(--accent-cyan); font-weight: 700;">"it"</span></span>
      </div>
      <div class="attn-tokens-ribbon" id="attn-tokens-ribbon">
        <!-- Rendered token chips -->
      </div>
    </div>

    <!-- 2-Column Visualizer Stage -->
    <div class="attn-stage-grid">
      <!-- Col 1: Dynamic Attention Strands (Bezier Arcs) -->
      <div class="attn-panel-card">
        <div class="attn-panel-header">
          <span>🕸️ Attention Arcs: Query ➔ All Keys</span>
          <div class="attn-legend">
            <span class="legend-item"><span class="legend-dot cyan"></span> Focused Query</span>
            <span class="legend-item"><span class="legend-dot yellow"></span> Attended Keys</span>
          </div>
        </div>
        <div class="attn-canvas-wrapper">
          <canvas id="attn-arcs-canvas" width="540" height="280" class="attn-canvas"></canvas>
        </div>
        <div class="attn-panel-footer" id="attn-arcs-caption">
          Arc thickness & glow represent the exact softmax probability $P(\\text{Key} \\mid \\text{Query})$.
        </div>
      </div>

      <!-- Col 2: N x N Attention Matrix Heatmap -->
      <div class="attn-panel-card">
        <div class="attn-panel-header">
          <span>🗺️ Self-Attention Matrix Heatmap ($N \\times N$)</span>
          <div class="attn-legend">
            <span class="legend-item"><span class="heatmap-swatch"></span> Softmax Weight ($0 \\to 1$)</span>
          </div>
        </div>
        <div class="attn-canvas-wrapper">
          <canvas id="attn-heatmap-canvas" width="540" height="280" class="attn-canvas"></canvas>
        </div>
        <div class="attn-panel-footer" id="attn-heatmap-hover-info">
          Hover over any cell $(i, j)$ to inspect the exact dot product and softmax calculation.
        </div>
      </div>
    </div>

    <!-- Attention Controls & Multi-Head Deck -->
    <div class="attn-controls-rack">
      <!-- Multi-Head Tabs -->
      <div class="attn-control-box">
        <div class="control-header">
          <span>🧠 Attention Head Subspace</span>
          <span id="label-active-head" style="color: var(--accent-violet); font-size: 0.8rem; font-weight: 700;">Head 2: Coreference</span>
        </div>
        <div class="attn-segmented-btn-group" id="attn-head-group">
          <button class="param-btn ${state.attnHead === 'head-1' ? 'active' : ''}" data-head="head-1">Head 1: Syntax</button>
          <button class="param-btn ${state.attnHead === 'head-2' ? 'active' : ''}" data-head="head-2">Head 2: Coreference</button>
          <button class="param-btn ${state.attnHead === 'head-3' ? 'active' : ''}" data-head="head-3">Head 3: Locality</button>
          <button class="param-btn ${state.attnHead === 'all' ? 'active' : ''}" data-head="all">Average Ensemble</button>
        </div>
        <span class="control-hint">Each head projects Query and Key into a distinct linguistic subspace</span>
      </div>

      <!-- Scaling Factor sqrt(d_k) Toggle -->
      <div class="attn-control-box">
        <div class="control-header">
          <span>🛡️ Scale Factor ($\\sqrt{d_k} = \\sqrt{4} = 2.0$)</span>
          <span id="badge-scale-status" class="scale-badge ${state.attnScaleEnabled ? 'enabled' : 'disabled'}">
            ${state.attnScaleEnabled ? 'Active (÷ 2.0)' : 'Disabled (Raw)'}
          </span>
        </div>
        <button class="btn-toggle-scale ${state.attnScaleEnabled ? 'active' : ''}" id="btn-toggle-scale">
          <span>${state.attnScaleEnabled ? '✓ Guardrail Enabled (÷ √d_k)' : '⚠️ Guardrail Bypassed (Saturate Softmax)'}</span>
        </button>
        <span class="control-hint">Disabling causes softmax saturation and gradient flatlining!</span>
      </div>

      <!-- Vector Inspector for Active Query Token -->
      <div class="attn-control-box attn-vector-box" style="grid-column: span 2;">
        <div class="control-header">
          <span>🔬 4D Query Projection for <strong id="val-query-token-name" style="color: #38bdf8;">"${currentTokens[focusedIdx]}"</strong></span>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <button id="btn-reset-vector" class="btn-subtle" title="Revert to base embedding">↺ Reset Vector</button>
            <span class="dim-badge">Dimension $d_k = 4$</span>
          </div>
        </div>
        <div class="attn-vector-sliders-grid" id="attn-vector-sliders">
          <!-- Populated dynamically with 4 sliders -->
        </div>
        <span class="control-hint">Nudge Query features to watch real-time redistribution of attention across Keys!</span>
      </div>
    </div>
  `;

  dom.interactiveContainer.appendChild(container);

  // References
  const arcsCanvas = container.querySelector('#attn-arcs-canvas');
  const arcsCtx = arcsCanvas.getContext('2d');
  const heatmapCanvas = container.querySelector('#attn-heatmap-canvas');
  const heatmapCtx = heatmapCanvas.getContext('2d');

  const statusBadge = container.querySelector('#attn-status-badge');
  const statusDesc = container.querySelector('#attn-status-desc');
  const metricQuery = container.querySelector('#metric-query-token');
  const metricKey = container.querySelector('#metric-key-token');
  const metricEntropy = container.querySelector('#metric-entropy');
  const metricGrad = container.querySelector('#metric-gradient-health');

  const sentenceSelect = container.querySelector('#attn-sentence-select');
  const customInput = container.querySelector('#attn-custom-input');
  const btnApplyCustom = container.querySelector('#btn-apply-custom');
  const tokensRibbon = container.querySelector('#attn-tokens-ribbon');
  const ribbonQueryName = container.querySelector('#ribbon-active-query-name');
  const valQueryTokenName = container.querySelector('#val-query-token-name');
  const labelActiveHead = container.querySelector('#label-active-head');
  const badgeScaleStatus = container.querySelector('#badge-scale-status');
  const btnToggleScale = container.querySelector('#btn-toggle-scale');
  const vectorSlidersContainer = container.querySelector('#attn-vector-sliders');
  const btnResetVector = container.querySelector('#btn-reset-vector');
  const heatmapHoverInfo = container.querySelector('#attn-heatmap-hover-info');

  // Matrix and computed attention weights
  let attentionMatrix = []; // N x N
  let rawScoresMatrix = [];
  let scaledScoresMatrix = [];

  function computeAttention() {
    const N = currentTokens.length;
    attentionMatrix = Array.from({ length: N }, () => new Float64Array(N));
    rawScoresMatrix = Array.from({ length: N }, () => new Float64Array(N));
    scaledScoresMatrix = Array.from({ length: N }, () => new Float64Array(N));

    const headMode = state.attnHead; // 'head-1', 'head-2', 'head-3', or 'all'
    const headsToCompute = headMode === 'all' ? ['head-1', 'head-2', 'head-3'] : [headMode];

    // Compute for each head and average if 'all'
    for (const h of headsToCompute) {
      for (let i = 0; i < N; i++) {
        let baseVecI = getWordVector4D(currentTokens[i]);
        if (i === focusedIdx && state.attnQueryVectorOverride) {
          baseVecI = [...state.attnQueryVectorOverride];
        }
        const q_i = projectToken(baseVecI, 'Q', h);

        const rowScores = new Float64Array(N);
        for (let j = 0; j < N; j++) {
          const baseVecJ = getWordVector4D(currentTokens[j]);
          const k_j = projectToken(baseVecJ, 'K', h);

          // Dot product
          let dot = 0;
          for (let d = 0; d < 4; d++) dot += q_i[d] * k_j[d];

          // Positional bias for Head 3 (Locality)
          if (h === 'head-3') {
            dot += 2.2 / (1 + Math.pow(Math.abs(i - j), 1.3));
          }

          rowScores[j] = dot;
          rawScoresMatrix[i][j] = dot;
        }

        // Scaling factor sqrt(d_k) = sqrt(4) = 2.0
        const scaledRow = new Float64Array(N);
        for (let j = 0; j < N; j++) {
          if (state.attnScaleEnabled) {
            scaledRow[j] = rowScores[j] / 2.0;
          } else {
            // Unscaled: amplified variance pushes softmax into extreme saturation
            scaledRow[j] = rowScores[j] * 2.8;
          }
          scaledScoresMatrix[i][j] = scaledRow[j];
        }

        // Softmax: exp(z_j - max) / sum(exp(z_k - max))
        let maxZ = -Infinity;
        for (let j = 0; j < N; j++) if (scaledRow[j] > maxZ) maxZ = scaledRow[j];

        let sumExp = 0;
        const expRow = new Float64Array(N);
        for (let j = 0; j < N; j++) {
          expRow[j] = Math.exp(scaledRow[j] - maxZ);
          sumExp += expRow[j];
        }

        for (let j = 0; j < N; j++) {
          const prob = expRow[j] / (sumExp || 1);
          attentionMatrix[i][j] += prob / headsToCompute.length;
        }
      }
    }
  }

  function updateHUDMetrics() {
    const N = currentTokens.length;
    const qToken = currentTokens[focusedIdx] || 'token';
    metricQuery.textContent = `"${qToken}" (#${focusedIdx})`;
    ribbonQueryName.textContent = `"${qToken}"`;
    valQueryTokenName.textContent = `"${qToken}"`;

    // Find top attention target from focusedIdx
    let maxProb = -1;
    let topTargetIdx = focusedIdx;
    let entropy = 0;

    const row = attentionMatrix[focusedIdx] || [];
    for (let j = 0; j < N; j++) {
      const p = row[j] || 0;
      if (p > maxProb && j !== focusedIdx) {
        maxProb = p;
        topTargetIdx = j;
      }
      if (p > 1e-9) {
        entropy -= p * Math.log2(p);
      }
    }

    const topTokenName = currentTokens[topTargetIdx] || 'none';
    metricKey.textContent = `"${topTokenName}" (${((maxProb > 0 ? maxProb : row[focusedIdx]) * 100).toFixed(1)}%)`;
    metricEntropy.textContent = `${entropy.toFixed(2)} bits ${entropy < 1.2 ? '(Sharp 🎯)' : '(Diffuse 🌊)'}`;

    // Softmax Saturation check
    const isSaturated = !state.attnScaleEnabled || maxProb > 0.95 || (row[focusedIdx] > 0.95);
    if (!state.attnScaleEnabled) {
      statusBadge.className = 'attn-status-badge saturated';
      statusBadge.textContent = '⚠️ Softmax Saturated (Gradients Dead)';
      statusDesc.textContent = 'Without sqrt(d_k) scaling, raw dot products explode! Softmax peaks into an argmax spike (99%+ on one token) where gradients flatline to zero.';
      metricGrad.textContent = 'Flatlined 🛑 (0% Flow)';
      metricGrad.style.color = '#f43f5e';
    } else {
      statusBadge.className = 'attn-status-badge';
      statusBadge.textContent = '⚡ Scaled Dot-Product Active';
      statusDesc.textContent = `Query "${qToken}" actively attends across all Keys. Notice how Query meets Key to gather contextual information.`;
      metricGrad.textContent = 'Healthy Flow 🟢 (100%)';
      metricGrad.style.color = '#34d399';
    }
  }

  function renderTokenRibbon() {
    tokensRibbon.innerHTML = '';
    const N = currentTokens.length;
    const weightsFromQuery = attentionMatrix[focusedIdx] || [];

    currentTokens.forEach((token, idx) => {
      const chip = document.createElement('div');
      const isQuery = idx === focusedIdx;
      const weight = weightsFromQuery[idx] || 0;

      let affinityClass = '';
      if (!isQuery) {
        if (weight > 0.35) affinityClass = 'high-affinity';
        else if (weight > 0.15) affinityClass = 'medium-affinity';
      }

      chip.className = `token-chip ${isQuery ? 'active-query' : ''} ${affinityClass}`;
      chip.innerHTML = `
        <span class="chip-idx">#${idx}</span>
        <span class="chip-word">${escapeHtml(token)}</span>
        <span class="chip-weight">${isQuery ? 'QUERY' : `${(weight * 100).toFixed(0)}%`}</span>
      `;

      chip.addEventListener('click', () => {
        focusedIdx = idx;
        state.attnFocusedToken = idx;
        state.attnQueryVectorOverride = null;
        recomputeAndDraw();
      });

      tokensRibbon.appendChild(chip);
    });
  }

  function renderVectorSliders() {
    vectorSlidersContainer.innerHTML = '';
    const dimNames = ['Entity / Nouniness', 'State / Fatigue', 'Action / Transitivity', 'Syntax / Modifier'];
    const baseVec = state.attnQueryVectorOverride || getWordVector4D(currentTokens[focusedIdx]);

    baseVec.forEach((val, dim) => {
      const item = document.createElement('div');
      item.className = 'attn-slider-item';
      item.innerHTML = `
        <div class="slider-meta">
          <span class="dim-name">d${dim}: ${dimNames[dim]}</span>
          <strong class="dim-val" id="val-dim-${dim}">${val.toFixed(2)}</strong>
        </div>
        <input type="range" class="cyber-slider dim-slider" data-dim="${dim}" min="-2.0" max="2.0" step="0.05" value="${val}" />
      `;

      const slider = item.querySelector('.dim-slider');
      slider.addEventListener('input', (e) => {
        const newVal = parseFloat(e.target.value);
        if (!state.attnQueryVectorOverride) {
          state.attnQueryVectorOverride = [...baseVec];
        }
        state.attnQueryVectorOverride[dim] = newVal;
        item.querySelector(`#val-dim-${dim}`).textContent = newVal.toFixed(2);
        computeAttention();
        updateHUDMetrics();
        renderTokenRibbon();
        drawArcs();
        drawHeatmap();
      });

      vectorSlidersContainer.appendChild(item);
    });
  }

  function drawArcs() {
    const W_px = 540;
    const H_px = 280;
    arcsCtx.clearRect(0, 0, W_px, H_px);

    const N = currentTokens.length;
    const padL = 36;
    const padR = 36;
    const stepX = (W_px - padL - padR) / Math.max(1, N - 1);
    const lineY = H_px - 45;

    // Baseline track
    arcsCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    arcsCtx.lineWidth = 1.5;
    arcsCtx.beginPath();
    arcsCtx.moveTo(padL, lineY);
    arcsCtx.lineTo(W_px - padR, lineY);
    arcsCtx.stroke();

    const queryX = padL + focusedIdx * stepX;
    const queryY = lineY;
    const row = attentionMatrix[focusedIdx] || [];

    // Find highest affinity target for floating badge
    let maxWeight = -1;
    let maxTargetIdx = -1;
    for (let j = 0; j < N; j++) {
      if (j !== focusedIdx && row[j] > maxWeight) {
        maxWeight = row[j];
        maxTargetIdx = j;
      }
    }

    // Draw Attention Arcs from Query to all Keys
    for (let j = 0; j < N; j++) {
      const weight = row[j] || 0;
      const keyX = padL + j * stepX;
      const keyY = lineY;

      if (j === focusedIdx) {
        // Self-loop arc
        const loopR = Math.max(10, Math.min(30, weight * 40));
        arcsCtx.save();
        arcsCtx.strokeStyle = `rgba(56, 189, 248, ${Math.max(0.2, weight)})`;
        arcsCtx.lineWidth = Math.max(1, weight * 7);
        arcsCtx.beginPath();
        arcsCtx.arc(queryX, queryY - loopR, loopR, 0, Math.PI * 2);
        arcsCtx.stroke();
        arcsCtx.restore();
        continue;
      }

      // Bezier curve
      const dist = Math.abs(queryX - keyX);
      const arcHeight = Math.min(180, Math.max(40, (dist / (W_px * 0.7)) * 140 + weight * 70));
      const midY = queryY - arcHeight;

      arcsCtx.save();
      const isTop = j === maxTargetIdx && weight > 0.25;
      if (isTop) {
        arcsCtx.strokeStyle = 'rgba(250, 204, 21, 0.9)';
        arcsCtx.lineWidth = Math.max(3, weight * 10);
        arcsCtx.shadowColor = '#facc15';
        arcsCtx.shadowBlur = 14;
      } else {
        arcsCtx.strokeStyle = `rgba(6, 182, 212, ${Math.max(0.12, weight * 1.2)})`;
        arcsCtx.lineWidth = Math.max(1, weight * 7);
        arcsCtx.shadowColor = '#06b6d4';
        arcsCtx.shadowBlur = weight > 0.2 ? 8 : 0;
      }

      arcsCtx.beginPath();
      arcsCtx.moveTo(queryX, queryY - 8);
      arcsCtx.bezierCurveTo(queryX, midY, keyX, midY, keyX, keyY - 8);
      arcsCtx.stroke();
      arcsCtx.restore();

      // Draw percentage pill over top arc apex
      if (isTop) {
        const apexX = (queryX + keyX) / 2;
        const apexY = midY - 6;
        arcsCtx.save();
        arcsCtx.fillStyle = '#0f172a';
        arcsCtx.strokeStyle = '#facc15';
        arcsCtx.lineWidth = 1.5;
        const badgeW = 76;
        const badgeH = 18;
        arcsCtx.beginPath();
        arcsCtx.roundRect(apexX - badgeW / 2, apexY - badgeH / 2, badgeW, badgeH, 6);
        arcsCtx.fill();
        arcsCtx.stroke();
        arcsCtx.fillStyle = '#facc15';
        arcsCtx.font = 'bold 9.5px JetBrains Mono, monospace';
        arcsCtx.textAlign = 'center';
        arcsCtx.textBaseline = 'middle';
        arcsCtx.fillText(`Match: ${(weight * 100).toFixed(1)}%`, apexX, apexY);
        arcsCtx.restore();
      }
    }

    // Draw Token Pins and Labels along bottom
    for (let i = 0; i < N; i++) {
      const px = padL + i * stepX;
      const isQuery = i === focusedIdx;
      const isTop = i === maxTargetIdx;

      // Pin circle
      arcsCtx.save();
      if (isQuery) {
        arcsCtx.fillStyle = '#38bdf8';
        arcsCtx.shadowColor = '#38bdf8';
        arcsCtx.shadowBlur = 12;
        arcsCtx.beginPath();
        arcsCtx.arc(px, lineY, 7, 0, Math.PI * 2);
        arcsCtx.fill();
      } else if (isTop) {
        arcsCtx.fillStyle = '#facc15';
        arcsCtx.shadowColor = '#facc15';
        arcsCtx.shadowBlur = 10;
        arcsCtx.beginPath();
        arcsCtx.arc(px, lineY, 5.5, 0, Math.PI * 2);
        arcsCtx.fill();
      } else {
        arcsCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        arcsCtx.beginPath();
        arcsCtx.arc(px, lineY, 4, 0, Math.PI * 2);
        arcsCtx.fill();
      }
      arcsCtx.restore();

      // Word Label
      arcsCtx.save();
      arcsCtx.font = isQuery ? 'bold 11px Outfit, sans-serif' : '10px Outfit, sans-serif';
      arcsCtx.fillStyle = isQuery ? '#38bdf8' : (isTop ? '#facc15' : 'var(--text-muted)');
      arcsCtx.textAlign = 'center';
      const labelText = currentTokens[i].length > 7 ? currentTokens[i].substring(0, 6) + '..' : currentTokens[i];
      arcsCtx.fillText(labelText, px, lineY + 18);
      arcsCtx.restore();
    }
  }

  function drawHeatmap(hoverRow = -1, hoverCol = -1) {
    const W_px = 540;
    const H_px = 280;
    heatmapCtx.clearRect(0, 0, W_px, H_px);

    const N = currentTokens.length;
    const padL = 70;
    const padT = 35;
    const gridMaxW = W_px - padL - 25;
    const gridMaxH = H_px - padT - 25;
    const cellSize = Math.min(24, Math.floor(Math.min(gridMaxW, gridMaxH) / N));

    // Draw Column Headers (Keys)
    heatmapCtx.save();
    heatmapCtx.font = '9px JetBrains Mono, monospace';
    heatmapCtx.fillStyle = 'var(--text-muted)';
    heatmapCtx.textAlign = 'center';
    for (let c = 0; c < N; c++) {
      const cx = padL + c * cellSize + cellSize / 2;
      const rawWord = currentTokens[c];
      const shortWord = rawWord.length > 3 ? rawWord.substring(0, 3) : rawWord;
      heatmapCtx.fillText(shortWord, cx, padT - 8);
    }
    heatmapCtx.restore();

    // Draw Cells & Row Headers (Queries)
    for (let r = 0; r < N; r++) {
      const ry = padT + r * cellSize;
      const isQueryRow = r === focusedIdx;

      // Row Label
      heatmapCtx.save();
      heatmapCtx.font = isQueryRow ? 'bold 10px JetBrains Mono, monospace' : '9px JetBrains Mono, monospace';
      heatmapCtx.fillStyle = isQueryRow ? '#38bdf8' : 'var(--text-muted)';
      heatmapCtx.textAlign = 'right';
      heatmapCtx.textBaseline = 'middle';
      const rowWord = currentTokens[r].length > 7 ? currentTokens[r].substring(0, 6) + '..' : currentTokens[r];
      heatmapCtx.fillText(rowWord, padL - 8, ry + cellSize / 2);
      heatmapCtx.restore();

      for (let c = 0; c < N; c++) {
        const cx = padL + c * cellSize;
        const weight = attentionMatrix[r] ? (attentionMatrix[r][c] || 0) : 0;

        // Color ramp: dark indigo (0.0) -> cyan (0.5) -> bright yellow (1.0)
        let rVal, gVal, bVal;
        if (weight <= 0.5) {
          const t = weight / 0.5;
          rVal = Math.round(15 + t * (6 - 15));
          gVal = Math.round(23 + t * (182 - 23));
          bVal = Math.round(42 + t * (212 - 42));
        } else {
          const t = (weight - 0.5) / 0.5;
          rVal = Math.round(6 + t * (250 - 6));
          gVal = Math.round(182 + t * (204 - 182));
          bVal = Math.round(212 + t * (21 - 212));
        }

        heatmapCtx.fillStyle = `rgb(${rVal}, ${gVal}, ${bVal})`;
        heatmapCtx.fillRect(cx, ry, cellSize - 1, cellSize - 1);

        // Highlight hover cell
        if (r === hoverRow && c === hoverCol) {
          heatmapCtx.strokeStyle = '#ffffff';
          heatmapCtx.lineWidth = 2;
          heatmapCtx.strokeRect(cx - 0.5, ry - 0.5, cellSize, cellSize);
        }
      }

      // Highlight active query row with cyan border
      if (isQueryRow) {
        heatmapCtx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
        heatmapCtx.lineWidth = 1.5;
        heatmapCtx.strokeRect(padL - 1, ry - 1, N * cellSize + 1, cellSize + 1);
      }
    }
  }

  function recomputeAndDraw() {
    computeAttention();
    updateHUDMetrics();
    renderTokenRibbon();
    renderVectorSliders();
    drawArcs();
    drawHeatmap();
  }

  // --- Canvas Interaction: Mouse Hover on Heatmap ---
  heatmapCanvas.addEventListener('mousemove', (e) => {
    const rect = heatmapCanvas.getBoundingClientRect();
    const scaleX = heatmapCanvas.width / rect.width;
    const scaleY = heatmapCanvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const N = currentTokens.length;
    const padL = 70;
    const padT = 35;
    const gridMaxW = heatmapCanvas.width - padL - 25;
    const gridMaxH = heatmapCanvas.height - padT - 25;
    const cellSize = Math.min(24, Math.floor(Math.min(gridMaxW, gridMaxH) / N));

    const col = Math.floor((mouseX - padL) / cellSize);
    const row = Math.floor((mouseY - padT) / cellSize);

    if (row >= 0 && row < N && col >= 0 && col < N) {
      drawHeatmap(row, col);
      const raw = rawScoresMatrix[row] ? rawScoresMatrix[row][col] : 0;
      const scaled = scaledScoresMatrix[row] ? scaledScoresMatrix[row][col] : 0;
      const prob = attentionMatrix[row] ? attentionMatrix[row][col] : 0;
      heatmapHoverInfo.innerHTML = `
        Cell <strong>[Q: "${currentTokens[row]}" ➔ K: "${currentTokens[col]}"]</strong>:
        Raw Dot = <span style="color: #38bdf8;">${raw.toFixed(2)}</span> |
        Scaled = <span style="color: #c4b5fd;">${scaled.toFixed(2)}</span> |
        Softmax Weight = <strong style="color: #facc15;">${(prob * 100).toFixed(1)}%</strong>
      `;
    } else {
      drawHeatmap(-1, -1);
      heatmapHoverInfo.textContent = 'Hover over any cell (i, j) to inspect the exact dot product and softmax calculation.';
    }
  });

  heatmapCanvas.addEventListener('mouseleave', () => {
    drawHeatmap(-1, -1);
    heatmapHoverInfo.textContent = 'Hover over any cell (i, j) to inspect the exact dot product and softmax calculation.';
  });

  // --- Canvas Click: Click Arc Canvas token pin to switch Query ---
  arcsCanvas.addEventListener('click', (e) => {
    const rect = arcsCanvas.getBoundingClientRect();
    const scaleX = arcsCanvas.width / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;

    const N = currentTokens.length;
    const padL = 36;
    const padR = 36;
    const stepX = (arcsCanvas.width - padL - padR) / Math.max(1, N - 1);

    for (let i = 0; i < N; i++) {
      const px = padL + i * stepX;
      if (Math.abs(mouseX - px) < stepX / 2) {
        focusedIdx = i;
        state.attnFocusedToken = i;
        state.attnQueryVectorOverride = null;
        recomputeAndDraw();
        break;
      }
    }
  });

  // --- Sentence Selector Listener ---
  sentenceSelect.addEventListener('change', (e) => {
    currentSentenceIdx = parseInt(e.target.value, 10);
    state.attnSentenceIdx = currentSentenceIdx;
    const selected = sentences[currentSentenceIdx];
    currentTokens = selected?.tokens || ["Attention", "is", "all", "you", "need"];
    focusedIdx = selected?.targetTokenIdx ?? 0;
    state.attnFocusedToken = focusedIdx;
    state.attnQueryVectorOverride = null;
    recomputeAndDraw();
  });

  // --- Custom Sentence Tokenize Button ---
  btnApplyCustom.addEventListener('click', () => {
    const text = customInput.value.trim();
    if (!text) return;
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length < 2) return;

    currentTokens = words.slice(0, 16); // limit to 16 tokens for clean display
    focusedIdx = 0;
    state.attnFocusedToken = 0;
    state.attnQueryVectorOverride = null;
    recomputeAndDraw();
  });

  // --- Multi-Head Selector Buttons ---
  container.querySelectorAll('#attn-head-group .param-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('#attn-head-group .param-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.attnHead = btn.dataset.head;
      const headLabels = {
        'head-1': 'Head 1: Syntax & Dependency',
        'head-2': 'Head 2: Coreference & Entities',
        'head-3': 'Head 3: Positional Locality',
        'all': 'Average Multi-Head Ensemble'
      };
      labelActiveHead.textContent = headLabels[state.attnHead] || state.attnHead;
      recomputeAndDraw();
    });
  });

  // --- Scale Factor Toggle Button ---
  btnToggleScale.addEventListener('click', () => {
    state.attnScaleEnabled = !state.attnScaleEnabled;
    badgeScaleStatus.className = `scale-badge ${state.attnScaleEnabled ? 'enabled' : 'disabled'}`;
    badgeScaleStatus.textContent = state.attnScaleEnabled ? 'Active (÷ 2.0)' : 'Disabled (Raw)';
    btnToggleScale.className = `btn-toggle-scale ${state.attnScaleEnabled ? 'active' : ''}`;
    btnToggleScale.querySelector('span').textContent = state.attnScaleEnabled
      ? '✓ Guardrail Enabled (÷ √d_k)'
      : '⚠️ Guardrail Bypassed (Saturate Softmax)';
    recomputeAndDraw();
  });

  // --- Reset Vector Button ---
  btnResetVector.addEventListener('click', () => {
    state.attnQueryVectorOverride = null;
    recomputeAndDraw();
  });

  // Initial draw
  recomputeAndDraw();
}

// ============================================================================
// WIDGET 8: Words into Vectors (BPE Tokenization & Embeddings Lab)
// ============================================================================
export function renderBpeEmbeddingLabWidget(quest, context) {
  const { state, dom, awardXp } = context;

  const container = document.createElement('div');
  container.className = 'bpe-lab-container';

  const presets = quest.interactiveConfig?.presets || [];
  let currentText = state.bpeText || "Tokenization powers modern LLMs like ChatGPT and Llama.";
  let selectedTokenIdx = state.bpeSelectedTokenIdx || 0;
  let activeTab = state.bpeActiveTab || 'tokenizer';
  let ropePos = state.bpeRopePos !== undefined ? state.bpeRopePos : 2;

  // Realistic subword segmenter for demonstration
  const SUBWORD_RULES = [
    { match: /^(token)(ization)$/i, parts: ['Token', 'ization'] },
    { match: /^(anti)(gravit)(y)$/i, parts: ['Anti', 'gravit', 'y'] },
    { match: /^(un)(believ)(ably)$/i, parts: ['un', 'believ', 'ably'] },
    { match: /^(trans)(format)(ive)$/i, parts: ['trans', 'format', 'ive'] },
    { match: /^(chat)(gpt)$/i, parts: ['Chat', 'GPT'] },
    { match: /^(embed)(ding)(s)?$/i, parts: ['embed', 'ding', 's'] },
    { match: /^(rotar)(y)$/i, parts: ['rotar', 'y'] },
    { match: /^(algorithm)(s)?$/i, parts: ['algorithm', 's'] },
    { match: /^(posit)(ion)(al)?$/i, parts: ['posit', 'ion', 'al'] }
  ];

  function tokenizeText(text) {
    const rawWords = text.trim().split(/(\s+|[.,!?;:()"])/).filter(Boolean);
    const tokens = [];

    rawWords.forEach((word) => {
      if (/^\s+$/.test(word)) return; // skip pure whitespace
      let matched = false;
      for (const rule of SUBWORD_RULES) {
        const m = word.match(rule.match);
        if (m) {
          rule.parts.filter(Boolean).forEach((p, pIdx) => {
            tokens.push({
              text: p,
              isPrefix: pIdx === 0,
              id: hashToken(p)
            });
          });
          matched = true;
          break;
        }
      }
      if (!matched) {
        if (word.length > 7 && !/^[.,!?;:]$/.test(word)) {
          // split long words into root + suffix
          const mid = Math.min(5, Math.floor(word.length * 0.6));
          const p1 = word.slice(0, mid);
          const p2 = word.slice(mid);
          tokens.push({ text: p1, isPrefix: true, id: hashToken(p1) });
          tokens.push({ text: p2, isPrefix: false, id: hashToken(p2) });
        } else {
          tokens.push({ text: word, isPrefix: true, id: hashToken(word) });
        }
      }
    });

    return tokens.length > 0 ? tokens : [{ text: 'AI', isPrefix: true, id: 2045 }];
  }

  function hashToken(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h % 31000) + 1024;
  }

  let currentTokens = tokenizeText(currentText);
  if (selectedTokenIdx >= currentTokens.length) selectedTokenIdx = 0;

  container.innerHTML = `
    <!-- Top Diagnostic HUD -->
    <div class="bpe-diagnostic-hud">
      <div class="bpe-hud-col">
        <span class="bpe-hud-badge">🔤 BPE Subword Tokenizer & Embeddings Lab</span>
        <div class="bpe-hud-desc">
          Decomposing human language into atomic subword IDs, projecting into dense vectors, and applying Rotary Position Embeddings (RoPE).
        </div>
      </div>
      <div class="bpe-metrics-grid">
        <div class="bpe-metric-card">
          <span class="metric-label">Token Count</span>
          <strong class="metric-val" id="metric-bpe-tokens">${currentTokens.length} Tokens</strong>
        </div>
        <div class="bpe-metric-card">
          <span class="metric-label">Raw Characters</span>
          <strong class="metric-val" id="metric-bpe-chars">${currentText.length} Chars</strong>
        </div>
        <div class="bpe-metric-card">
          <span class="metric-label">Compression Ratio</span>
          <strong class="metric-val" id="metric-bpe-ratio">${(currentText.length / Math.max(1, currentTokens.length)).toFixed(2)} chars/tok</strong>
        </div>
        <div class="bpe-metric-card">
          <span class="metric-label">Vocab Standard</span>
          <strong class="metric-val" style="color: var(--accent-emerald);">BPE 128k Vocab</strong>
        </div>
      </div>
    </div>

    <!-- Sentence Preset & Custom Input Bar -->
    <div class="bpe-input-card">
      <div class="bpe-input-row">
        <div class="bpe-preset-select-wrap">
          <label for="bpe-preset-select">📚 Benchmark Preset:</label>
          <select id="bpe-preset-select" class="cyber-select">
            ${presets.map((p) => `<option value="${p.id}">${p.name}: "${p.text.slice(0, 38)}..."</option>`).join('')}
            <option value="custom">✏️ Custom Sentence...</option>
          </select>
        </div>
        <div class="bpe-text-field-wrap">
          <input type="text" id="bpe-input-text" class="cyber-input" value="${escapeHtml(currentText)}" placeholder="Type any sentence to see subword tokenization..." />
          <button id="btn-bpe-tokenize" class="btn-attn-sub">Tokenize ✨</button>
        </div>
      </div>
    </div>

    <!-- Segmented Token Ribbon -->
    <div class="bpe-ribbon-card">
      <div class="bpe-ribbon-header">
        <span>🔤 Atomic Token Stream (Click any token to inspect its embedding coordinates)</span>
        <span class="bpe-active-pill" id="bpe-active-token-pill">Active: "${currentTokens[selectedTokenIdx]?.text || ''}" (ID: #${currentTokens[selectedTokenIdx]?.id || ''})</span>
      </div>
      <div class="bpe-token-chips-wrap" id="bpe-token-chips-wrap"></div>
    </div>

    <!-- Mode Sub-Tabs -->
    <div class="bpe-subtab-bar">
      <button class="bpe-subtab-btn ${activeTab === 'tokenizer' ? 'active' : ''}" data-tab="tokenizer">
        <span>🔤</span> BPE Subword Morphisms
      </button>
      <button class="bpe-subtab-btn ${activeTab === 'embeddings' ? 'active' : ''}" data-tab="embeddings">
        <span>🧭</span> 2D Semantic Vector Space
      </button>
      <button class="bpe-subtab-btn ${activeTab === 'rope' ? 'active' : ''}" data-tab="rope">
        <span>🔄</span> Rotary Position (RoPE) Compass
      </button>
    </div>

    <!-- Sub-Tab 1: Morphisms -->
    <div class="bpe-subtab-content ${activeTab === 'tokenizer' ? 'active' : ''}" id="bpe-content-tokenizer">
      <div class="bpe-morphisms-stage">
        <div class="bpe-merge-panel">
          <h4>Iterative Merge Tree for Active Word</h4>
          <p class="bpe-panel-subtitle">How raw UTF-8 bytes fuse into high-frequency vocabulary subwords</p>
          <div class="bpe-cascade-steps" id="bpe-cascade-steps">
            <div class="bpe-step-row">
              <span class="step-num">Step 0 (Chars):</span>
              <div class="step-chips">
                <span class="chip-char">T</span><span class="chip-char">o</span><span class="chip-char">k</span><span class="chip-char">e</span><span class="chip-char">n</span>
                <span class="chip-char sep">·</span>
                <span class="chip-char">i</span><span class="chip-char">z</span><span class="chip-char">a</span><span class="chip-char">t</span><span class="chip-char">i</span><span class="chip-char">o</span><span class="chip-char">n</span>
              </div>
            </div>
            <div class="bpe-step-arrow">⬇ Byte Pair Merge (Highest Frequency: 'i' + 'z' ➔ 'iz')</div>
            <div class="bpe-step-row">
              <span class="step-num">Step 1 (Bigrams):</span>
              <div class="step-chips">
                <span class="chip-token violet">Token</span>
                <span class="chip-char sep">·</span>
                <span class="chip-token cyan">iz</span><span class="chip-token amber">ation</span>
              </div>
            </div>
            <div class="bpe-step-arrow">⬇ Suffix Morphism Fusion ('iz' + 'ation' ➔ 'ization')</div>
            <div class="bpe-step-row highlighted">
              <span class="step-num">Final BPE Tokens:</span>
              <div class="step-chips">
                <span class="chip-token large violet">Token <small>(#4291)</small></span>
                <span class="chip-token large cyan">ization <small>(#1324)</small></span>
              </div>
            </div>
          </div>
        </div>

        <div class="bpe-complexity-panel">
          <h4>Quadratic Attention Memory Impact</h4>
          <p class="bpe-panel-subtitle">Why BPE is mandatory for modern 128k context windows</p>
          <div class="complexity-comparison-grid">
            <div class="complexity-box red">
              <h5>Character-Level (No BPE)</h5>
              <p class="val">${currentText.length} Tokens</p>
              <p class="desc">Attention Matrix = ${currentText.length}²</p>
              <strong class="highlight-stat">${currentText.length * currentText.length} Attention Ops</strong>
              <small>⚠️ Memory explodes quadratically!</small>
            </div>
            <div class="complexity-box green">
              <h5>Byte-Pair Encoding (BPE)</h5>
              <p class="val">${currentTokens.length} Tokens</p>
              <p class="desc">Attention Matrix = ${currentTokens.length}²</p>
              <strong class="highlight-stat">${currentTokens.length * currentTokens.length} Attention Ops</strong>
              <small>⚡ ${( (currentText.length * currentText.length) / Math.max(1, currentTokens.length * currentTokens.length) ).toFixed(1)}x faster computation!</small>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sub-Tab 2: Semantic Vector Space -->
    <div class="bpe-subtab-content ${activeTab === 'embeddings' ? 'active' : ''}" id="bpe-content-embeddings">
      <div class="bpe-vector-stage">
        <div class="bpe-canvas-card">
          <div class="bpe-canvas-header">
            <span>🧭 2D PCA Semantic Coordinates</span>
            <button id="btn-run-vector-arithmetic" class="btn-vector-action">▶ Run: King − Man + Woman = ?</button>
          </div>
          <canvas id="bpe-vector-canvas" width="600" height="340" class="bpe-interactive-canvas"></canvas>
          <div class="bpe-canvas-legend">
            <span><span class="dot violet"></span> Royalty</span>
            <span><span class="dot blue"></span> Human</span>
            <span><span class="dot emerald"></span> Technology</span>
            <span><span class="dot amber"></span> Food</span>
          </div>
        </div>

        <div class="bpe-vector-info-panel">
          <h4>Active Token Vector Representation</h4>
          <div class="token-meta-box">
            <div class="meta-row"><span>Token String:</span><strong id="meta-token-str" style="color: var(--accent-cyan);">"Token"</strong></div>
            <div class="meta-row"><span>Token ID:</span><code id="meta-token-id">#4291</code></div>
            <div class="meta-row"><span>Bytes:</span><code id="meta-token-bytes">[0x54, 0x6f, 0x6b, 0x65, 0x6e]</code></div>
            <div class="meta-row"><span>Embedding Norm:</span><code id="meta-token-norm">||v|| = 1.000</code></div>
          </div>
          <h5 style="margin-top: 1rem; color: #fff; font-size: 0.9rem;">Simulated Embedding Vector (d=8):</h5>
          <div class="vector-cells-rack" id="vector-cells-rack"></div>
          <div class="vector-arithmetic-result-box" id="vector-arithmetic-result" style="display: none;">
            <h5>Vector Arithmetic Result:</h5>
            <div class="arithmetic-eq">v("king") − v("man") + v("woman") ➔ v*</div>
            <div class="arithmetic-cos">Nearest Neighbor: <strong style="color: #fbbf24;">"queen"</strong> (Cosine Similarity = <strong>0.948</strong>) ✓</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sub-Tab 3: Rotary Position Compass (RoPE) -->
    <div class="bpe-subtab-content ${activeTab === 'rope' ? 'active' : ''}" id="bpe-content-rope">
      <div class="bpe-rope-stage">
        <div class="rope-canvas-card">
          <div class="rope-canvas-header">
            <span>🔄 2D Complex Unit Circle Rotation</span>
            <span class="rope-angle-pill" id="rope-angle-pill">Angle θ: 72.0°</span>
          </div>
          <canvas id="bpe-rope-canvas" width="460" height="340" class="bpe-interactive-canvas"></canvas>
        </div>

        <div class="rope-controls-panel">
          <h4>Rotary Position Embedding Parameters</h4>
          <p class="bpe-panel-subtitle">Rotate Query & Key vectors so inner products depend on relative distance (m − n)</p>
          
          <div class="control-slider-group">
            <div class="slider-label-row">
              <span>Token Sequence Position (m):</span>
              <span class="val" id="val-rope-pos">${ropePos}</span>
            </div>
            <input type="range" class="cyber-slider" id="slider-rope-pos" min="0" max="12" step="1" value="${ropePos}" />
          </div>

          <div class="rope-math-card">
            <h5>Rotary Matrix Applied:</h5>
            <div class="rope-matrix-display" id="rope-matrix-display">
              R_m = [[ cos(mθ), -sin(mθ) ], [ sin(mθ), cos(mθ) ]]
            </div>
            <div class="rope-math-insight">
              <strong>Crucial Guarantee:</strong><br/>
              ⟨R_m · q, R_n · k⟩ = f(q, k, m − n)<br/>
              Absolute position m drops out! The attention mechanism perceives relative distance naturally.
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  dom.interactiveContainer.appendChild(container);

  // --- Render Token Chips ---
  const chipsWrap = container.querySelector('#bpe-token-chips-wrap');
  const activePill = container.querySelector('#bpe-active-token-pill');
  const metaStr = container.querySelector('#meta-token-str');
  const metaId = container.querySelector('#meta-token-id');
  const metaBytes = container.querySelector('#meta-token-bytes');
  const vectorRack = container.querySelector('#vector-cells-rack');

  const COLORS = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#60a5fa'];

  function renderChips() {
    chipsWrap.innerHTML = '';
    currentTokens.forEach((tok, idx) => {
      const chip = document.createElement('div');
      const isSelected = idx === selectedTokenIdx;
      const col = COLORS[idx % COLORS.length];
      chip.className = `bpe-token-chip ${isSelected ? 'selected' : ''}`;
      chip.style.borderColor = isSelected ? col : 'rgba(148,163,184,0.3)';
      chip.style.backgroundColor = isSelected ? `${col}22` : 'rgba(15,23,42,0.6)';
      chip.innerHTML = `
        <span class="tok-prefix" style="color: ${col};">${tok.isPrefix ? '·' : 'Ġ'}</span>
        <span class="tok-text">${escapeHtml(tok.text)}</span>
        <span class="tok-id" style="color: ${col};">#${tok.id}</span>
      `;
      chip.addEventListener('click', () => {
        selectedTokenIdx = idx;
        state.bpeSelectedTokenIdx = idx;
        renderChips();
        updateTokenMetadata();
      });
      chipsWrap.appendChild(chip);
    });
  }

  function updateTokenMetadata() {
    const t = currentTokens[selectedTokenIdx] || currentTokens[0];
    if (!t) return;
    activePill.textContent = `Active: "${t.text}" (ID: #${t.id})`;
    if (metaStr) metaStr.textContent = `"${t.text}"`;
    if (metaId) metaId.textContent = `#${t.id}`;
    if (metaBytes) {
      const bytes = Array.from(new TextEncoder().encode(t.text)).map(b => '0x' + b.toString(16).padStart(2, '0'));
      metaBytes.textContent = `[${bytes.join(', ')}]`;
    }

    if (vectorRack) {
      vectorRack.innerHTML = '';
      // Generate pseudo-random coordinates deterministically from ID
      const seed = t.id * 1337;
      for (let i = 0; i < 8; i++) {
        const val = Math.sin(seed + i * 1.5) * 0.9;
        const cell = document.createElement('div');
        cell.className = 'vector-cell';
        cell.innerHTML = `
          <span class="dim-idx">d${i}</span>
          <span class="dim-val ${val >= 0 ? 'pos' : 'neg'}">${val >= 0 ? '+' : ''}${val.toFixed(2)}</span>
        `;
        vectorRack.appendChild(cell);
      }
    }
  }

  // --- Sub-Tab Switching ---
  container.querySelectorAll('.bpe-subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.bpe-subtab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.bpe-subtab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const tabName = btn.dataset.tab;
      activeTab = tabName;
      state.bpeActiveTab = tabName;
      const target = container.querySelector(`#bpe-content-${tabName}`);
      if (target) target.classList.add('active');

      if (tabName === 'embeddings') drawVectorCanvas();
      if (tabName === 'rope') drawRopeCanvas();
    });
  });

  // --- Tokenizer Action Handlers ---
  const presetSelect = container.querySelector('#bpe-preset-select');
  const inputText = container.querySelector('#bpe-input-text');
  const btnTokenize = container.querySelector('#btn-bpe-tokenize');

  presetSelect.addEventListener('change', (e) => {
    const pId = e.target.value;
    const found = presets.find(p => p.id === pId);
    if (found) {
      inputText.value = found.text;
      applyNewText(found.text);
    }
  });

  btnTokenize.addEventListener('click', () => {
    applyNewText(inputText.value.trim());
  });

  inputText.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') applyNewText(inputText.value.trim());
  });

  function applyNewText(text) {
    if (!text) return;
    currentText = text;
    state.bpeText = text;
    currentTokens = tokenizeText(text);
    selectedTokenIdx = 0;
    state.bpeSelectedTokenIdx = 0;

    container.querySelector('#metric-bpe-tokens').textContent = `${currentTokens.length} Tokens`;
    container.querySelector('#metric-bpe-chars').textContent = `${currentText.length} Chars`;
    container.querySelector('#metric-bpe-ratio').textContent = `${(currentText.length / Math.max(1, currentTokens.length)).toFixed(2)} chars/tok`;

    renderChips();
    updateTokenMetadata();
    if (activeTab === 'embeddings') drawVectorCanvas();
    if (activeTab === 'rope') drawRopeCanvas();
  }

  // --- Canvas 1: Semantic Vector Space ---
  const vectorCanvas = container.querySelector('#bpe-vector-canvas');
  const vCtx = vectorCanvas ? vectorCanvas.getContext('2d') : null;
  const btnArithmetic = container.querySelector('#btn-run-vector-arithmetic');
  const arithmeticResult = container.querySelector('#vector-arithmetic-result');

  let vectorArithmeticProgress = 0;
  let vectorAnimId = null;

  function drawVectorCanvas() {
    if (!vCtx || !vectorCanvas) return;
    const w = vectorCanvas.width;
    const h = vectorCanvas.height;
    vCtx.clearRect(0, 0, w, h);

    // Background Grid
    vCtx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
    vCtx.lineWidth = 1;
    for (let x = 40; x < w; x += 40) {
      vCtx.beginPath(); vCtx.moveTo(x, 0); vCtx.lineTo(x, h); vCtx.stroke();
    }
    for (let y = 40; y < h; y += 40) {
      vCtx.beginPath(); vCtx.moveTo(0, y); vCtx.lineTo(w, y); vCtx.stroke();
    }

    // Axes
    const cx = w / 2;
    const cy = h / 2;
    vCtx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    vCtx.lineWidth = 1.5;
    vCtx.beginPath(); vCtx.moveTo(20, cy); vCtx.lineTo(w - 20, cy); vCtx.stroke();
    vCtx.beginPath(); vCtx.moveTo(cx, 20); vCtx.lineTo(cx, h - 20); vCtx.stroke();

    const scale = 140;
    const toCanvasX = (vx) => cx + vx * scale;
    const toCanvasY = (vy) => cy - vy * scale;

    const samples = [
      { word: 'king', vx: 0.65, vy: 0.55, col: '#a78bfa' },
      { word: 'queen', vx: 0.60, vy: 0.82, col: '#fbbf24' },
      { word: 'man', vx: 0.30, vy: 0.20, col: '#60a5fa' },
      { word: 'woman', vx: 0.25, vy: 0.47, col: '#fb7185' },
      { word: 'robot', vx: -0.55, vy: -0.50, col: '#34d399' },
      { word: 'computer', vx: -0.65, vy: -0.62, col: '#22d3ee' },
      { word: 'apple', vx: -0.45, vy: 0.40, col: '#fbbf24' },
      { word: 'banana', vx: -0.52, vy: 0.30, col: '#fbbf24' }
    ];

    // Draw arithmetic vectors if running
    if (vectorArithmeticProgress > 0) {
      const man = samples.find(s => s.word === 'man');
      const king = samples.find(s => s.word === 'king');
      const woman = samples.find(s => s.word === 'woman');
      const queen = samples.find(s => s.word === 'queen');

      const mx = toCanvasX(man.vx), my = toCanvasY(man.vy);
      const kx = toCanvasX(king.vx), ky = toCanvasY(king.vy);
      const wx = toCanvasX(woman.vx), wy = toCanvasY(woman.vy);
      const qx = toCanvasX(queen.vx), qy = toCanvasY(queen.vy);

      // Vector 1: man -> king (Royalty delta)
      vCtx.strokeStyle = 'rgba(167, 139, 250, 0.8)';
      vCtx.lineWidth = 2.5;
      vCtx.beginPath();
      vCtx.moveTo(mx, my);
      vCtx.lineTo(mx + (kx - mx) * vectorArithmeticProgress, my + (ky - my) * vectorArithmeticProgress);
      vCtx.stroke();

      // Vector 2: woman -> woman + royalty delta
      if (vectorArithmeticProgress > 0.5) {
        const p2 = (vectorArithmeticProgress - 0.5) / 0.5;
        const targetX = wx + (kx - mx);
        const targetY = wy + (ky - my);
        vCtx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
        vCtx.lineWidth = 2.5;
        vCtx.setLineDash([4, 4]);
        vCtx.beginPath();
        vCtx.moveTo(wx, wy);
        vCtx.lineTo(wx + (targetX - wx) * p2, wy + (targetY - wy) * p2);
        vCtx.stroke();
        vCtx.setLineDash([]);
      }
    }

    // Draw word nodes
    samples.forEach(s => {
      const px = toCanvasX(s.vx);
      const py = toCanvasY(s.vy);
      vCtx.fillStyle = s.col;
      vCtx.beginPath();
      vCtx.arc(px, py, 6, 0, Math.PI * 2);
      vCtx.fill();
      vCtx.strokeStyle = '#fff';
      vCtx.lineWidth = 1.5;
      vCtx.stroke();

      vCtx.font = 'bold 12px "Outfit", sans-serif';
      vCtx.fillStyle = '#ffffff';
      vCtx.fillText(s.word, px + 9, py - 4);
    });
  }

  if (btnArithmetic) {
    btnArithmetic.addEventListener('click', () => {
      if (vectorAnimId) cancelAnimationFrame(vectorAnimId);
      vectorArithmeticProgress = 0;
      if (arithmeticResult) arithmeticResult.style.display = 'block';

      const startTime = performance.now();
      const duration = 1200;

      function step(now) {
        const elapsed = now - startTime;
        vectorArithmeticProgress = Math.min(1.0, elapsed / duration);
        drawVectorCanvas();
        if (vectorArithmeticProgress < 1.0) {
          vectorAnimId = requestAnimationFrame(step);
        }
      }
      vectorAnimId = requestAnimationFrame(step);
    });
  }

  // --- Canvas 2: RoPE Rotary Compass ---
  const ropeCanvas = container.querySelector('#bpe-rope-canvas');
  const rCtx = ropeCanvas ? ropeCanvas.getContext('2d') : null;
  const sliderRopePos = container.querySelector('#slider-rope-pos');
  const valRopePos = container.querySelector('#val-rope-pos');
  const ropeAnglePill = container.querySelector('#rope-angle-pill');
  const ropeMatrixDisplay = container.querySelector('#rope-matrix-display');

  function drawRopeCanvas() {
    if (!rCtx || !ropeCanvas) return;
    const w = ropeCanvas.width;
    const h = ropeCanvas.height;
    rCtx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const R = 110;

    // Unit Circle
    rCtx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    rCtx.lineWidth = 2;
    rCtx.beginPath();
    rCtx.arc(cx, cy, R, 0, Math.PI * 2);
    rCtx.stroke();

    // Cross axes
    rCtx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    rCtx.beginPath();
    rCtx.moveTo(cx - R - 20, cy); rCtx.lineTo(cx + R + 20, cy);
    rCtx.moveTo(cx, cy - R - 20); rCtx.lineTo(cx, cy + R + 20);
    rCtx.stroke();

    // Base query vector (angle 0)
    const baseAngle = 0.4;
    const rotatedAngle = baseAngle + ropePos * 0.35;

    // Key vector (at position 0)
    const kAngle = baseAngle + 0.1;
    const kx = cx + R * Math.cos(kAngle);
    const ky = cy - R * Math.sin(kAngle);
    rCtx.strokeStyle = '#fb7185';
    rCtx.lineWidth = 2.5;
    rCtx.beginPath();
    rCtx.moveTo(cx, cy);
    rCtx.lineTo(kx, ky);
    rCtx.stroke();
    rCtx.fillStyle = '#fb7185';
    rCtx.fillText('k (Key pos 0)', kx + 8, ky);

    // Query vector (rotated by pos * theta)
    const qx = cx + R * Math.cos(rotatedAngle);
    const qy = cy - R * Math.sin(rotatedAngle);
    rCtx.strokeStyle = '#38bdf8';
    rCtx.lineWidth = 3;
    rCtx.beginPath();
    rCtx.moveTo(cx, cy);
    rCtx.lineTo(qx, qy);
    rCtx.stroke();
    rCtx.fillStyle = '#38bdf8';
    rCtx.font = 'bold 12px "Outfit", sans-serif';
    rCtx.fillText(`q (Query pos ${ropePos})`, qx + 8, qy - 4);

    // Arc of rotation
    rCtx.strokeStyle = '#facc15';
    rCtx.lineWidth = 2;
    rCtx.beginPath();
    rCtx.arc(cx, cy, 40, -rotatedAngle, -baseAngle);
    rCtx.stroke();

    const deg = Math.round((ropePos * 0.35 * 180) / Math.PI);
    if (ropeAnglePill) ropeAnglePill.textContent = `Rotation Angle m·θ: ${deg}°`;
    if (ropeMatrixDisplay) {
      const cVal = Math.cos(ropePos * 0.35).toFixed(2);
      const sVal = Math.sin(ropePos * 0.35).toFixed(2);
      ropeMatrixDisplay.textContent = `R_${ropePos} = [[ ${cVal}, -${sVal} ], [ ${sVal}, ${cVal} ]]`;
    }
  }

  if (sliderRopePos) {
    sliderRopePos.addEventListener('input', (e) => {
      ropePos = parseInt(e.target.value, 10);
      state.bpeRopePos = ropePos;
      if (valRopePos) valRopePos.textContent = ropePos;
      drawRopeCanvas();
    });
  }

  // Initial render
  renderChips();
  updateTokenMetadata();
  if (activeTab === 'embeddings') drawVectorCanvas();
  if (activeTab === 'rope') drawRopeCanvas();
}

// ============================================================================
// WIDGET 9: Inside the GPT Block (Transformer Decoder Inspector)
// ============================================================================
export function renderTransformerBlockInspectorWidget(quest, context) {
  const { state, dom, awardXp } = context;

  const container = document.createElement('div');
  container.className = 'gpt-block-inspector-container';

  let activeTab = state.gptActiveTab || 'flow';
  let causalMaskActive = state.gptCausalMaskActive !== undefined ? state.gptCausalMaskActive : true;
  let focusedLayerIdx = state.gptFocusedLayerIdx !== undefined ? state.gptFocusedLayerIdx : 2;
  let kvSeqLen = state.gptKvSeqLen || 128;

  const sampleTokens = ["The", "future", "of", "AI", "is"];
  const N = sampleTokens.length;

  const STAGES = [
    {
      idx: 0,
      name: "Input Residual Highway (x)",
      type: "residual",
      color: "var(--accent-emerald)",
      icon: "🛣️",
      shapeIn: "[1, 5, 4096]",
      shapeOut: "[1, 5, 4096]",
      eq: "x_0 = \\text{Embed}(tokens) + \\text{RoPE}",
      role: "Continuous high-speed express highway carrying contextualized token representations throughout all 80 layers."
    },
    {
      idx: 1,
      name: "RMSNorm #1 (Pre-Attention)",
      type: "norm",
      color: "var(--accent-cyan)",
      icon: "⚡",
      shapeIn: "[1, 5, 4096]",
      shapeOut: "[1, 5, 4096]",
      eq: "\\text{RMSNorm}(x) = \\frac{x}{\\sqrt{\\frac{1}{d}\\sum x_i^2 + \\epsilon}} \\odot \\gamma",
      role: "Scales activations by root-mean-square variance to stabilize variance without slow mean-centering passes."
    },
    {
      idx: 2,
      name: "Causal Multi-Head Attention",
      type: "attention",
      color: "var(--accent-violet)",
      icon: "🛡️",
      shapeIn: "[1, 5, 4096]",
      shapeOut: "[1, 5, 4096]",
      eq: "\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}} + M_{\\text{causal}}\\right) V",
      role: "Dynamically routes context between words while strictly blinding future tokens via lower-triangular causal masking."
    },
    {
      idx: 3,
      name: "Residual Addition #1 (+)",
      type: "residual",
      color: "var(--accent-emerald)",
      icon: "➕",
      shapeIn: "[1, 5, 4096]",
      shapeOut: "[1, 5, 4096]",
      eq: "x^{(1)} = x + \\text{Attention}(\\text{RMSNorm}(x))",
      role: "Adds attention deltas onto the baseline residual stream, providing a zero-loss gradient highway during backpropagation."
    },
    {
      idx: 4,
      name: "RMSNorm #2 (Pre-FFN)",
      type: "norm",
      color: "var(--accent-amber)",
      icon: "⚡",
      shapeIn: "[1, 5, 4096]",
      shapeOut: "[1, 5, 4096]",
      eq: "\\text{RMSNorm}(x^{(1)})",
      role: "Pre-normalizes the contextualized representations before sending them through wide feed-forward knowledge expansion."
    },
    {
      idx: 5,
      name: "SwiGLU Feed-Forward Network",
      type: "ffn",
      color: "var(--accent-rose)",
      icon: "🧠",
      shapeIn: "[1, 5, 4096]",
      shapeOut: "[1, 5, 4096]",
      eq: "\\text{SwiGLU}(x) = (\\text{SiLU}(x W_{\\text{gate}}) \\odot x W_{\\text{up}}) W_{\\text{down}}",
      role: "Expands hidden dimension to 14,336 with non-linear gating. Stores encyclopedic facts, concepts, and relational memory."
    },
    {
      idx: 6,
      name: "Residual Addition #2 (+)",
      type: "residual",
      color: "var(--accent-emerald)",
      icon: "➕",
      shapeIn: "[1, 5, 4096]",
      shapeOut: "[1, 5, 4096]",
      eq: "x^{(2)} = x^{(1)} + \\text{SwiGLU}(\\text{RMSNorm}(x^{(1)}))",
      role: "Merges extracted factual knowledge back onto the residual highway, ready for the next stacked Transformer decoder block."
    }
  ];

  container.innerHTML = `
    <!-- Top Diagnostic HUD -->
    <div class="gpt-diagnostic-hud">
      <div class="gpt-hud-col">
        <span class="gpt-hud-badge">🧱 Inside the GPT Decoder Block (Llama 3 / Mistral)</span>
        <div class="gpt-hud-desc">
          Dissecting the internal anatomy of a modern auto-regressive Transformer block: Causal Masking, RMSNorm, SwiGLU, and KV Caching.
        </div>
      </div>
      <div class="gpt-metrics-grid">
        <div class="gpt-metric-card">
          <span class="metric-label">Hidden Dimension</span>
          <strong class="metric-val" style="color: var(--accent-cyan);">4,096 Dims</strong>
        </div>
        <div class="gpt-metric-card">
          <span class="metric-label">SwiGLU Intermediate</span>
          <strong class="metric-val" style="color: var(--accent-rose);">14,336 Dims</strong>
        </div>
        <div class="gpt-metric-card">
          <span class="metric-label">Causality Guard</span>
          <strong class="metric-val" id="metric-gpt-causal">${causalMaskActive ? 'Active (-∞)' : 'Bypassed ⚠️'}</strong>
        </div>
        <div class="gpt-metric-card">
          <span class="metric-label">Block Parameters</span>
          <strong class="metric-val" style="color: var(--accent-amber);">~14.2M / Block</strong>
        </div>
      </div>
    </div>

    <!-- Mode Sub-Tabs -->
    <div class="bpe-subtab-bar">
      <button class="bpe-subtab-btn ${activeTab === 'flow' ? 'active' : ''}" data-tab="flow">
        <span>🧱</span> 7-Stage Block Signal Highway
      </button>
      <button class="bpe-subtab-btn ${activeTab === 'mask' ? 'active' : ''}" data-tab="mask">
        <span>🛡️</span> Causal Masking Laboratory
      </button>
      <button class="bpe-subtab-btn ${activeTab === 'kvcache' ? 'active' : ''}" data-tab="kvcache">
        <span>🏎️</span> KV Cache Speedup Engine
      </button>
    </div>

    <!-- Sub-Tab 1: Block Flow Stage -->
    <div class="bpe-subtab-content ${activeTab === 'flow' ? 'active' : ''}" id="gpt-content-flow">
      <div class="gpt-flow-layout">
        <!-- Interactive Stage Highway Cards -->
        <div class="gpt-stages-track" id="gpt-stages-track"></div>

        <!-- Inspector Drawer -->
        <div class="gpt-inspector-drawer" id="gpt-inspector-drawer">
          <div class="drawer-header">
            <span class="drawer-icon" id="drawer-icon">🛡️</span>
            <div>
              <h4 id="drawer-title">Causal Multi-Head Attention</h4>
              <span class="drawer-type" id="drawer-type">Attention Layer</span>
            </div>
          </div>
          <div class="drawer-body">
            <div class="drawer-tensor-row">
              <span class="tensor-tag in">Input: <code id="drawer-shape-in">[1, 5, 4096]</code></span>
              <span class="tensor-arrow">➔</span>
              <span class="tensor-tag out">Output: <code id="drawer-shape-out">[1, 5, 4096]</code></span>
            </div>
            <div class="drawer-math-card">
              <h5>Mathematical Equation:</h5>
              <div class="drawer-eq" id="drawer-eq">Attention(Q, K, V) = softmax(QK^T / sqrt(d_k) + M) V</div>
            </div>
            <p class="drawer-desc" id="drawer-desc">
              Dynamically routes context between words while strictly blinding future tokens via lower-triangular causal masking.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Sub-Tab 2: Causal Mask Matrix -->
    <div class="bpe-subtab-content ${activeTab === 'mask' ? 'active' : ''}" id="gpt-content-mask">
      <div class="gpt-mask-stage">
        <div class="mask-grid-card">
          <div class="mask-card-header">
            <span>🛡️ 5×5 Attention Compatibility Matrix</span>
            <button id="btn-toggle-causal-mask" class="btn-attn-sub ${causalMaskActive ? 'active' : 'warn'}">
              ${causalMaskActive ? '✓ Causal Mask: ON (Lower Triangular)' : '⚠️ Causal Mask: OFF (Bidirectional Leaks)'}
            </button>
          </div>
          <div class="mask-matrix-table-wrap" id="mask-matrix-table-wrap"></div>
          <div class="mask-legend">
            <span><span class="cell-sample green">✓</span> Allowed Past Attention ($j \\le i$)</span>
            <span><span class="cell-sample red">−∞</span> Blinded Future Tokens ($j > i$, Prob = 0.00%)</span>
          </div>
        </div>

        <div class="mask-explanation-panel">
          <h4>Why Autoregressive LLMs Cannot Peek Ahead</h4>
          <p class="bpe-panel-subtitle">The strict temporal barrier in next-token prediction</p>
          <div class="mask-insight-card">
            <div class="insight-row">
              <span class="insight-num">1</span>
              <div>
                <strong>Next-Token Prediction Setup:</strong>
                <p>Given words [1, 2, 3], the model is rewarded for predicting word 4.</p>
              </div>
            </div>
            <div class="insight-row">
              <span class="insight-num">2</span>
              <div>
                <strong>The Fatal Cheat without Masking:</strong>
                <p>If word 2 could attend to word 3, the model would simply copy the answer off the test sheet instead of learning language!</p>
              </div>
            </div>
            <div class="insight-row">
              <span class="insight-num">3</span>
              <div>
                <strong>The Softmax Math Fix:</strong>
                <p>Adding $-\\infty$ sets $e^{-\\infty} = 0$, guaranteeing zero weight to future tokens.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sub-Tab 3: KV Cache Speedup -->
    <div class="bpe-subtab-content ${activeTab === 'kvcache' ? 'active' : ''}" id="gpt-content-kvcache">
      <div class="gpt-kvcache-stage">
        <div class="kv-controls-card">
          <h4>KV Cache Generation Simulator</h4>
          <p class="bpe-panel-subtitle">Compare quadratic full recomputation against lightning-fast Key-Value caching</p>
          
          <div class="control-slider-group">
            <div class="slider-label-row">
              <span>Context Length Generated (N tokens):</span>
              <span class="val" id="val-kv-seq">${kvSeqLen} tokens</span>
            </div>
            <input type="range" class="cyber-slider" id="slider-kv-seq" min="16" max="2048" step="16" value="${kvSeqLen}" />
          </div>

          <div class="kv-stats-grid">
            <div class="kv-stat-box red">
              <h5>Naive Full Recomputation</h5>
              <p class="stat-big" id="kv-stat-naive-flops">${( (kvSeqLen * kvSeqLen) / 2 ).toLocaleString()} MFLOPs</p>
              <p class="stat-sub">Quadratic O(N²) Time Complexity</p>
              <small>Recomputes tokens 1 to N-1 at every single word!</small>
            </div>
            <div class="kv-stat-box green">
              <h5>With KV Caching Active</h5>
              <p class="stat-big" id="kv-stat-cached-flops">${kvSeqLen.toLocaleString()} MFLOPs</p>
              <p class="stat-sub">Linear O(N) Generation Time</p>
              <small>Computes only the single newest Query!</small>
            </div>
          </div>

          <div class="kv-speedup-banner">
            <span class="speedup-icon">⚡</span>
            <div>
              <h4 id="kv-speedup-text">${(kvSeqLen / 2).toFixed(0)}x Faster Generation Speedup</h4>
              <p id="kv-memory-text">VRAM Cache Footprint: ~${( (2 * 32 * 32 * 128 * kvSeqLen * 2) / (1024 * 1024) ).toFixed(1)} MB</p>
            </div>
          </div>
        </div>

        <div class="kv-memory-visual-card">
          <h4>VRAM KV Cache Slot Buffer</h4>
          <p class="bpe-panel-subtitle">Keys and Values are preserved in GPU memory across time steps</p>
          <div class="kv-buffer-slots" id="kv-buffer-slots"></div>
        </div>
      </div>
    </div>
  `;

  dom.interactiveContainer.appendChild(container);

  // --- Render 7-Stage Flow Track ---
  const stagesTrack = container.querySelector('#gpt-stages-track');
  const drawerIcon = container.querySelector('#drawer-icon');
  const drawerTitle = container.querySelector('#drawer-title');
  const drawerType = container.querySelector('#drawer-type');
  const drawerShapeIn = container.querySelector('#drawer-shape-in');
  const drawerShapeOut = container.querySelector('#drawer-shape-out');
  const drawerEq = container.querySelector('#drawer-eq');
  const drawerDesc = container.querySelector('#drawer-desc');

  function renderStages() {
    stagesTrack.innerHTML = '';
    STAGES.forEach((s) => {
      const card = document.createElement('div');
      const isFocused = s.idx === focusedLayerIdx;
      card.className = `gpt-stage-card ${isFocused ? 'focused' : ''}`;
      card.style.borderLeftColor = s.color;
      card.innerHTML = `
        <div class="stage-card-left">
          <span class="stage-icon">${s.icon}</span>
          <div class="stage-info">
            <span class="stage-num">STAGE #${s.idx + 1}</span>
            <strong class="stage-name">${s.name}</strong>
          </div>
        </div>
        <div class="stage-card-right">
          <span class="stage-shape">${s.shapeOut}</span>
        </div>
      `;
      card.addEventListener('click', () => {
        focusedLayerIdx = s.idx;
        state.gptFocusedLayerIdx = s.idx;
        renderStages();
        updateDrawer();
      });
      stagesTrack.appendChild(card);
    });
  }

  function updateDrawer() {
    const s = STAGES[focusedLayerIdx] || STAGES[0];
    if (drawerIcon) drawerIcon.textContent = s.icon;
    if (drawerTitle) drawerTitle.textContent = s.name;
    if (drawerType) drawerType.textContent = s.type.toUpperCase() + ' LAYER';
    if (drawerShapeIn) drawerShapeIn.textContent = s.shapeIn;
    if (drawerShapeOut) drawerShapeOut.textContent = s.shapeOut;
    if (drawerEq) drawerEq.textContent = s.eq;
    if (drawerDesc) drawerDesc.textContent = s.role;
  }

  // --- Render Causal Mask Matrix ---
  const matrixWrap = container.querySelector('#mask-matrix-table-wrap');
  const btnToggleMask = container.querySelector('#btn-toggle-causal-mask');
  const metricCausal = container.querySelector('#metric-gpt-causal');

  function renderMaskMatrix() {
    matrixWrap.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'mask-table';

    // Header row
    const thead = document.createElement('thead');
    let hRow = '<tr><th>Query \\ Key</th>';
    sampleTokens.forEach((t) => {
      hRow += `<th>"${t}"</th>`;
    });
    hRow += '</tr>';
    thead.innerHTML = hRow;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (let r = 0; r < N; r++) {
      const tr = document.createElement('tr');
      let rHtml = `<th class="row-token">"${sampleTokens[r]}" (#${r})</th>`;
      for (let c = 0; c < N; c++) {
        const allowed = causalMaskActive ? (c <= r) : true;
        const cls = allowed ? 'allowed' : 'blocked';
        const txt = allowed ? (1 / (r + 1)).toFixed(2) : '−∞';
        rHtml += `<td class="cell ${cls}" title="Query: '${sampleTokens[r]}' ➔ Key: '${sampleTokens[c]}'">${txt}</td>`;
      }
      tr.innerHTML = rHtml;
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    matrixWrap.appendChild(table);
  }

  if (btnToggleMask) {
    btnToggleMask.addEventListener('click', () => {
      causalMaskActive = !causalMaskActive;
      state.gptCausalMaskActive = causalMaskActive;
      btnToggleMask.className = `btn-attn-sub ${causalMaskActive ? 'active' : 'warn'}`;
      btnToggleMask.textContent = causalMaskActive
        ? '✓ Causal Mask: ON (Lower Triangular)'
        : '⚠️ Causal Mask: OFF (Bidirectional Leaks)';
      if (metricCausal) metricCausal.textContent = causalMaskActive ? 'Active (-∞)' : 'Bypassed ⚠️';
      renderMaskMatrix();
    });
  }

  // --- KV Cache Calculations & Buffer Slots ---
  const sliderKvSeq = container.querySelector('#slider-kv-seq');
  const valKvSeq = container.querySelector('#val-kv-seq');
  const statNaiveFlops = container.querySelector('#kv-stat-naive-flops');
  const statCachedFlops = container.querySelector('#kv-stat-cached-flops');
  const speedupText = container.querySelector('#kv-speedup-text');
  const memoryText = container.querySelector('#kv-memory-text');
  const bufferSlots = container.querySelector('#kv-buffer-slots');

  function updateKvCacheMetrics() {
    if (valKvSeq) valKvSeq.textContent = `${kvSeqLen} tokens`;
    const naive = Math.round((kvSeqLen * kvSeqLen) / 2);
    const cached = kvSeqLen;
    const speedup = Math.max(1, Math.round(naive / cached));
    const vramMb = ((2 * 32 * 32 * 128 * kvSeqLen * 2) / (1024 * 1024)).toFixed(1);

    if (statNaiveFlops) statNaiveFlops.textContent = `${naive.toLocaleString()} MFLOPs`;
    if (statCachedFlops) statCachedFlops.textContent = `${cached.toLocaleString()} MFLOPs`;
    if (speedupText) speedupText.textContent = `${speedup}x Faster Generation Speedup`;
    if (memoryText) memoryText.textContent = `VRAM Cache Footprint: ~${vramMb} MB (Locked in GPU Memory)`;

    if (bufferSlots) {
      bufferSlots.innerHTML = '';
      const slotsCount = 8;
      for (let i = 0; i < slotsCount; i++) {
        const slot = document.createElement('div');
        const isCurrent = i === slotsCount - 1;
        slot.className = `kv-slot ${isCurrent ? 'current' : 'cached'}`;
        slot.innerHTML = `
          <span class="slot-idx">Step ${i * Math.floor(kvSeqLen / slotsCount)}</span>
          <span class="slot-status">${isCurrent ? '⚡ New Query' : '💾 Cached K, V'}</span>
        `;
        bufferSlots.appendChild(slot);
      }
    }
  }

  if (sliderKvSeq) {
    sliderKvSeq.addEventListener('input', (e) => {
      kvSeqLen = parseInt(e.target.value, 10);
      state.gptKvSeqLen = kvSeqLen;
      updateKvCacheMetrics();
    });
  }

  // --- Sub-Tab Switching ---
  container.querySelectorAll('.bpe-subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.bpe-subtab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.bpe-subtab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const tabName = btn.dataset.tab;
      activeTab = tabName;
      state.gptActiveTab = tabName;
      const target = container.querySelector(`#gpt-content-${tabName}`);
      if (target) target.classList.add('active');
    });
  });

  // Initial render
  renderStages();
  updateDrawer();
  renderMaskMatrix();
  updateKvCacheMetrics();
}

// ============================================================================
// WIDGET 10: The Generation Engine & Sampling Dynamics Lab
// ============================================================================
export function renderGenerationSamplerLabWidget(quest, context) {
  const { state, dom, awardXp } = context;

  const container = document.createElement('div');
  container.className = 'generation-sampler-container';

  const config = quest.interactiveConfig || {};
  const prompts = config.prompts || [
    {
      id: "robot",
      text: "The mysterious robot stepped out of the spaceship and saw a",
      candidates: [
        { token: " alien", logit: 4.2, category: "sci-fi" },
        { token: " glowing", logit: 3.7, category: "desc" },
        { token: " city", logit: 3.3, category: "place" },
        { token: " human", logit: 2.8, category: "entity" },
        { token: " flower", logit: 2.1, category: "nature" },
        { token: " glitch", logit: 1.4, category: "tech" },
        { token: " sandwich", logit: 0.4, category: "absurd" },
        { token: " banana", logit: -0.8, category: "absurd" },
        { token: " unicorn", logit: -1.9, category: "fantasy" },
        { token: " syntax", logit: -3.5, category: "code" }
      ]
    },
    {
      id: "code",
      text: "def train_neural_network(model, optimizer, data_loader):",
      candidates: [
        { token: "\n    ", logit: 4.8, category: "indent" },
        { token: " model", logit: 3.9, category: "code" },
        { token: " for", logit: 3.4, category: "loop" },
        { token: " total", logit: 2.2, category: "var" },
        { token: " print", logit: 1.5, category: "debug" },
        { token: " return", logit: 0.6, category: "control" },
        { token: " pizza", logit: -2.4, category: "absurd" },
        { token: " spaceship", logit: -3.8, category: "absurd" }
      ]
    },
    {
      id: "philosophy",
      text: "In the heart of the quantum computer, artificial consciousness began to",
      candidates: [
        { token: " awaken", logit: 4.1, category: "thought" },
        { token: " question", logit: 3.6, category: "thought" },
        { token: " evolve", logit: 3.2, category: "action" },
        { token: " calculate", logit: 2.5, category: "tech" },
        { token: " dream", logit: 2.0, category: "creative" },
        { token: " crash", logit: 0.8, category: "bug" },
        { token: " dance", logit: -0.5, category: "whimsical" },
        { token: " potato", logit: -3.6, category: "absurd" }
      ]
    }
  ];

  // Contextual continuations vocabulary dictionary for realistic multi-step autoregressive demo
  const followUpVocab = {
    " alien": [
      { token: " staring", logit: 4.4, category: "action" },
      { token: " holding", logit: 3.8, category: "action" },
      { token: " waving", logit: 3.3, category: "social" },
      { token: " with", logit: 2.9, category: "grammar" },
      { token: " silently", logit: 2.2, category: "desc" },
      { token: " spaceship", logit: 1.1, category: "entity" },
      { token: " pizza", logit: -1.8, category: "absurd" }
    ],
    " glowing": [
      { token: " crystal", logit: 4.6, category: "object" },
      { token: " orb", logit: 4.1, category: "object" },
      { token: " horizon", logit: 3.5, category: "place" },
      { token: " portal", logit: 3.1, category: "sci-fi" },
      { token: " mushroom", logit: 2.1, category: "nature" },
      { token: " bug", logit: 0.9, category: "tech" }
    ],
    " city": [
      { token: " built", logit: 4.3, category: "action" },
      { token: " floating", logit: 4.0, category: "desc" },
      { token: " of", logit: 3.5, category: "grammar" },
      { token: " covered", logit: 2.9, category: "desc" },
      { token: " buzzing", logit: 2.2, category: "desc" },
      { token: " underwater", logit: 1.1, category: "place" }
    ],
    " human": [
      { token: " scientist", logit: 4.5, category: "entity" },
      { token: " watching", logit: 3.9, category: "action" },
      { token: " terrified", logit: 3.4, category: "emotion" },
      { token: " sleeping", logit: 2.8, category: "action" },
      { token: " smiling", logit: 2.3, category: "social" },
      { token: " potato", logit: -2.5, category: "absurd" }
    ],
    " flower": [
      { token: " blooming", logit: 4.5, category: "action" },
      { token: " emitting", logit: 3.8, category: "action" },
      { token: " made", logit: 3.2, category: "grammar" },
      { token: " of", logit: 2.7, category: "grammar" },
      { token: " neon", logit: 2.1, category: "desc" }
    ],
    " glitch": [
      { token: " in", logit: 4.7, category: "grammar" },
      { token: " tearing", logit: 3.8, category: "action" },
      { token: " through", logit: 3.2, category: "grammar" },
      { token: " the", logit: 2.6, category: "grammar" }
    ],
    " model": [
      { token: " .train()", logit: 4.8, category: "code" },
      { token: " .to(device)", logit: 4.2, category: "code" },
      { token: " = model", logit: 2.5, category: "code" },
      { token: " .eval()", logit: 2.1, category: "code" }
    ],
    " for": [
      { token: " epoch", logit: 4.8, category: "loop" },
      { token: " batch", logit: 4.3, category: "loop" },
      { token: " step", logit: 3.5, category: "loop" },
      { token: " x,", logit: 2.8, category: "code" }
    ],
    " awaken": [
      { token: " within", logit: 4.5, category: "grammar" },
      { token: " and", logit: 3.9, category: "grammar" },
      { token: " its", logit: 3.3, category: "grammar" },
      { token: " silently", logit: 2.8, category: "desc" },
      { token: " across", logit: 2.2, category: "grammar" }
    ],
    " question": [
      { token: " its", logit: 4.7, category: "grammar" },
      { token: " whether", logit: 4.0, category: "thought" },
      { token: " reality", logit: 3.4, category: "concept" },
      { token: " human", logit: 2.6, category: "entity" }
    ],
    " default": [
      { token: " into", logit: 4.1, category: "grammar" },
      { token: " the", logit: 3.7, category: "grammar" },
      { token: " endless", logit: 3.2, category: "desc" },
      { token: " void", logit: 2.6, category: "concept" },
      { token: " forever", logit: 2.1, category: "concept" },
      { token: " banana", logit: -1.9, category: "absurd" }
    ]
  };

  let currentPromptIdx = state.genPromptIdx !== undefined ? state.genPromptIdx : 0;
  if (currentPromptIdx >= prompts.length) currentPromptIdx = 0;
  let currentTemperature = state.genTemperature !== undefined ? state.genTemperature : 0.7;
  let currentTopP = state.genTopP !== undefined ? state.genTopP : 0.90;
  let currentTopK = state.genTopK !== undefined ? state.genTopK : 5;
  let currentRepetitionPenalty = state.genRepetitionPenalty !== undefined ? state.genRepetitionPenalty : 1.15;
  let activeTab = state.genActiveTab || 'roulette';
  let isStreaming = false;
  let streamTimer = null;
  let sampledCandidateToken = null;

  // Build Layout Frame
  container.innerHTML = `
    <!-- Top Diagnostic HUD -->
    <div class="gen-diagnostic-hud">
      <div class="gen-hud-col">
        <div class="gen-hud-badge">
          <span>🎲</span>
          <span>AUTOREGRESSIVE SAMPLING ENGINE</span>
        </div>
        <div class="gen-hud-desc">
          Transform raw unembedding logits into probability distributions with Temperature scaling, Top-K pruning, and Top-P (Nucleus) boundary cuts.
        </div>
      </div>
      <div class="gen-metrics-grid">
        <div class="gen-metric-card">
          <span class="gen-metric-lbl">SAMPLING REGIME</span>
          <span class="gen-metric-val" id="gen-stat-regime">✨ Optimal Nucleus</span>
          <span class="gen-metric-sub" id="gen-stat-entropy">Entropy: 1.84 bits</span>
        </div>
        <div class="gen-metric-card">
          <span class="gen-metric-lbl">TEMPERATURE (T)</span>
          <span class="gen-metric-val cyan" id="gen-stat-temp">${currentTemperature.toFixed(2)}</span>
          <span class="gen-metric-sub" id="gen-stat-temp-desc">Balanced Creativity</span>
        </div>
        <div class="gen-metric-card">
          <span class="gen-metric-lbl">NUCLEUS (TOP-P)</span>
          <span class="gen-metric-val violet" id="gen-stat-topp">${(currentTopP * 100).toFixed(0)}%</span>
          <span class="gen-metric-sub" id="gen-stat-topk">Top-K: ${currentTopK}</span>
        </div>
        <div class="gen-metric-card">
          <span class="gen-metric-lbl">SURVIVING POOL</span>
          <span class="gen-metric-val green" id="gen-stat-survivors">5 / 10 Tokens</span>
          <span class="gen-metric-sub" id="gen-stat-pruned">5 Pruned (0% Mass)</span>
        </div>
      </div>
    </div>

    <!-- Navigation Sub-Tabs -->
    <div class="gen-subtabs-bar">
      <button class="gen-subtab-btn ${activeTab === 'roulette' ? 'active' : ''}" data-tab="roulette">
        <span>🎲</span> Token Roulette & Filter Lab
      </button>
      <button class="gen-subtab-btn ${activeTab === 'autoreg' ? 'active' : ''}" data-tab="autoreg">
        <span>🔁</span> Autoregressive Generation Loop
      </button>
      <button class="gen-subtab-btn ${activeTab === 'compare' ? 'active' : ''}" data-tab="compare">
        <span>⚔️</span> Decoding Regimes Face-Off
      </button>
    </div>

    <!-- SUB-TAB 1: TOKEN ROULETTE & FILTER LAB -->
    <div class="gen-subtab-content ${activeTab === 'roulette' ? 'active' : ''}" id="gen-content-roulette">
      <!-- Live Generation Context & Streaming Terminal -->
      <div class="gen-terminal-card">
        <div class="gen-terminal-header">
          <div class="terminal-dots">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
          </div>
          <span class="terminal-title">AUTOREGRESSIVE GENERATION TERMINAL</span>
          <div class="terminal-actions">
            <span class="token-count-pill" id="gen-token-count-pill">Tokens: 0</span>
            <button class="btn-terminal-action" id="btn-copy-generation" title="Copy text to clipboard">📋 Copy</button>
            <button class="btn-terminal-action" id="btn-reset-generation" title="Reset sequence">↺ Reset</button>
          </div>
        </div>
        <div class="gen-terminal-body" id="gen-story-display">
          <!-- Rendered in JS -->
        </div>
        <div class="gen-terminal-controls-row">
          <div class="prompt-select-group">
            <label for="gen-prompt-select">Scenario Prompt:</label>
            <select id="gen-prompt-select" class="gen-select-input">
              ${prompts.map((p, idx) => `<option value="${idx}" ${idx === currentPromptIdx ? 'selected' : ''}>${p.id.toUpperCase()}: "${p.text.slice(0, 45)}..."</option>`).join('')}
            </select>
          </div>
          <div class="terminal-action-buttons">
            <button class="btn-gen-sample" id="btn-gen-spin-step">
              <span>🎲</span> Sample Next Token
            </button>
            <button class="btn-gen-stream" id="btn-gen-stream-auto">
              <span>⚡</span> Auto-Stream 5 Tokens
            </button>
          </div>
        </div>
      </div>

      <!-- Two Column Lab: Sliders on Left, Candidate Probabilities on Right -->
      <div class="gen-interactive-grid">
        <!-- Left: Hyperparameters Control Panel -->
        <div class="gen-controls-panel">
          <div class="panel-section-title">
            <span>⚙️</span> SAMPLING HYPERPARAMETERS
          </div>

          <!-- Temperature Slider -->
          <div class="gen-slider-block">
            <div class="gen-slider-header">
              <div class="gen-slider-info">
                <span class="gen-slider-name">Temperature (T)</span>
                <span class="gen-slider-math">z' = z / T</span>
              </div>
              <span class="gen-slider-val-badge cyan" id="val-badge-temp">${currentTemperature.toFixed(2)}</span>
            </div>
            <input type="range" class="gen-range-slider" id="slider-temp" min="0.05" max="2.00" step="0.05" value="${currentTemperature}">
            <div class="gen-slider-scale">
              <span>0.05 (Frozen/Greedy)</span>
              <span>1.0 (Standard)</span>
              <span>2.0 (High Chaos)</span>
            </div>
            <div class="gen-preset-pills">
              <button class="preset-pill" data-type="temp" data-val="0.05">❄️ Greedy (0.05)</button>
              <button class="preset-pill" data-type="temp" data-val="0.20">📐 Code/Math (0.20)</button>
              <button class="preset-pill" data-type="temp" data-val="0.70">✍️ Balanced (0.70)</button>
              <button class="preset-pill" data-type="temp" data-val="1.50">🔥 Hallucination (1.50)</button>
            </div>
          </div>

          <!-- Top-P (Nucleus) Slider -->
          <div class="gen-slider-block">
            <div class="gen-slider-header">
              <div class="gen-slider-info">
                <span class="gen-slider-name">Top-P Nucleus (p)</span>
                <span class="gen-slider-math">∑ P(w_i) ≤ p</span>
              </div>
              <span class="gen-slider-val-badge violet" id="val-badge-topp">${currentTopP.toFixed(2)}</span>
            </div>
            <input type="range" class="gen-range-slider" id="slider-topp" min="0.10" max="1.00" step="0.05" value="${currentTopP}">
            <div class="gen-slider-scale">
              <span>0.10 (Hyper-Strict)</span>
              <span>0.90 (Standard)</span>
              <span>1.00 (Unbounded)</span>
            </div>
            <div class="gen-preset-pills">
              <button class="preset-pill" data-type="topp" data-val="0.50">🎯 Strict (0.50)</button>
              <button class="preset-pill" data-type="topp" data-val="0.90">✨ Standard (0.90)</button>
              <button class="preset-pill" data-type="topp" data-val="1.00">🌐 Unfiltered (1.00)</button>
            </div>
          </div>

          <!-- Top-K Slider -->
          <div class="gen-slider-block">
            <div class="gen-slider-header">
              <div class="gen-slider-info">
                <span class="gen-slider-name">Top-K Cutoff</span>
                <span class="gen-slider-math">k ≤ K</span>
              </div>
              <span class="gen-slider-val-badge amber" id="val-badge-topk">${currentTopK}</span>
            </div>
            <input type="range" class="gen-range-slider" id="slider-topk" min="1" max="10" step="1" value="${currentTopK}">
            <div class="gen-slider-scale">
              <span>K=1 (Argmax)</span>
              <span>K=5 (Standard)</span>
              <span>K=10 (All Tokens)</span>
            </div>
            <div class="gen-preset-pills">
              <button class="preset-pill" data-type="topk" data-val="1">K=1</button>
              <button class="preset-pill" data-type="topk" data-val="3">K=3</button>
              <button class="preset-pill" data-type="topk" data-val="5">K=5</button>
              <button class="preset-pill" data-type="topk" data-val="10">All (10)</button>
            </div>
          </div>

          <!-- Repetition Penalty Slider -->
          <div class="gen-slider-block">
            <div class="gen-slider-header">
              <div class="gen-slider-info">
                <span class="gen-slider-name">Repetition Penalty (θ)</span>
                <span class="gen-slider-math">z / θ for seen tokens</span>
              </div>
              <span class="gen-slider-val-badge rose" id="val-badge-rep">${currentRepetitionPenalty.toFixed(2)}</span>
            </div>
            <input type="range" class="gen-range-slider" id="slider-rep" min="1.00" max="2.00" step="0.05" value="${currentRepetitionPenalty}">
            <div class="gen-slider-scale">
              <span>1.00 (Off)</span>
              <span>1.15 (Optimal)</span>
              <span>2.00 (Strong Anti-Loop)</span>
            </div>
            <div class="gen-preset-pills">
              <button class="preset-pill" data-type="rep" data-val="1.00">Off (1.00)</button>
              <button class="preset-pill" data-type="rep" data-val="1.15">Standard (1.15)</button>
              <button class="preset-pill" data-type="rep" data-val="1.50">Aggressive (1.50)</button>
            </div>
          </div>
        </div>

        <!-- Right: Candidates Probability Bars & Roulette Deck -->
        <div class="gen-candidates-panel">
          <div class="candidates-panel-header">
            <div class="panel-section-title">
              <span>📊</span> CANDIDATE TOKENS PROBABILITY ROULETTE
            </div>
            <div class="candidates-legend">
              <span class="legend-item"><span class="legend-swatch active"></span> Active Nucleus</span>
              <span class="legend-item"><span class="legend-swatch pruned"></span> Pruned (0%)</span>
              <span class="legend-item"><span class="legend-swatch sampled"></span> Sampled</span>
            </div>
          </div>

          <!-- Candidates List Container -->
          <div class="candidates-deck" id="gen-candidates-deck">
            <!-- Rendered in JS -->
          </div>
        </div>
      </div>
    </div>

    <!-- SUB-TAB 2: AUTOREGRESSIVE GENERATION LOOP & REPETITION PENALTY -->
    <div class="gen-subtab-content ${activeTab === 'autoreg' ? 'active' : ''}" id="gen-content-autoreg">
      <div class="gen-card-banner">
        <div class="banner-icon">🔁</div>
        <div class="banner-text">
          <h3>The Autoregressive Loop: How Language Models Breathe</h3>
          <p>
            Large Language Models generate text one token at a time in an autoregressive feedback loop: 
            <strong>P(x_t | x_{<t})</strong>. The newly sampled token is appended to the context window, 
            becoming input context for the next forward pass.
          </p>
        </div>
      </div>

      <!-- Interactive 6-Stage Loop Visualizer -->
      <div class="autoreg-flow-visualizer">
        <div class="autoreg-step-node" id="node-step-1">
          <div class="node-badge">STAGE 1</div>
          <div class="node-icon">📜</div>
          <div class="node-title">Context Window</div>
          <div class="node-desc">Current prompt + all previously generated tokens</div>
          <div class="node-state-pill">[ x_1, x_2, ..., x_t ]</div>
        </div>
        <div class="flow-arrow">➔</div>

        <div class="autoreg-step-node" id="node-step-2">
          <div class="node-badge">STAGE 2</div>
          <div class="node-icon">🧠</div>
          <div class="node-title">Decoder Blocks</div>
          <div class="node-desc">Causal Attention & SwiGLU FFN compute context vectors</div>
          <div class="node-state-pill">h_t ∈ ℝ^4096</div>
        </div>
        <div class="flow-arrow">➔</div>

        <div class="autoreg-step-node" id="node-step-3">
          <div class="node-badge">STAGE 3</div>
          <div class="node-icon">⚡</div>
          <div class="node-title">Unembedding Head</div>
          <div class="node-desc">Linear projection maps hidden state to vocabulary logits</div>
          <div class="node-state-pill">z = h_t · W_u^T ∈ ℝ^V</div>
        </div>
        <div class="flow-arrow">➔</div>

        <div class="autoreg-step-node" id="node-step-4">
          <div class="node-badge">STAGE 4</div>
          <div class="node-icon">🔥</div>
          <div class="node-title">Temperature & Top-P</div>
          <div class="node-desc">Scale logits by 1/T, mask tail with Top-K and Top-P</div>
          <div class="node-state-pill">P_i = Softmax(z_i / T)</div>
        </div>
        <div class="flow-arrow">➔</div>

        <div class="autoreg-step-node" id="node-step-5">
          <div class="node-badge">STAGE 5</div>
          <div class="node-icon">🎲</div>
          <div class="node-title">Multinomial Sample</div>
          <div class="node-desc">Stochastic roll draws next token x_{t+1} from active pool</div>
          <div class="node-state-pill">x_{t+1} ~ P(w)</div>
        </div>
        <div class="flow-arrow feedback">↻</div>
      </div>

      <div class="autoreg-pulse-control">
        <button class="btn-pulse-loop" id="btn-pulse-autoreg-loop">
          <span>⚡</span> Pulse Autoregressive Cycle Once
        </button>
        <span class="pulse-status-msg" id="autoreg-pulse-msg">Click to trace data through all 5 stages of generation</span>
      </div>

      <!-- Repetition Penalty Interactive Sandbox -->
      <div class="rep-penalty-lab-box">
        <h4>🛡️ Repetition Penalty Deep Dive: Breaking The Degeneration Trap</h4>
        <p>
          Without repetition penalty, greedy or low-temperature decoding often falls into repetitive loops: 
          <em>"The model is a model that is a model..."</em>. 
          When a token has already appeared in the output, Keskar et al. (2019) penalize its logit:
        </p>
        <div class="rep-formula-box">
          <code>z_i' = (z_i > 0) ? (z_i / θ) : (z_i · θ)  where θ ≥ 1.0</code>
        </div>
        <div class="rep-live-demo-grid">
          <div class="rep-demo-col">
            <span class="demo-col-label">Simulated Candidate: " alien" (Initial Logit: 4.20)</span>
            <div class="rep-count-selector">
              <span>Token Occurrences in Context:</span>
              <button class="rep-count-btn active" data-count="0">0x (Fresh)</button>
              <button class="rep-count-btn" data-count="1">1x (Seen Once)</button>
              <button class="rep-count-btn" data-count="2">2x (Seen Twice)</button>
              <button class="rep-count-btn" data-count="3">3x (Loop Trap!)</button>
            </div>
          </div>
          <div class="rep-demo-col result-box">
            <div class="rep-calc-row">
              <span>Effective Logit:</span>
              <strong class="cyan" id="rep-demo-logit">4.20</strong>
            </div>
            <div class="rep-calc-row">
              <span>Selection Probability:</span>
              <strong class="green" id="rep-demo-prob">56.4%</strong>
            </div>
            <div class="rep-calc-row">
              <span>Loop Risk Status:</span>
              <span class="loop-status-pill safe" id="rep-demo-status">Safe (High Diversity)</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SUB-TAB 3: DECODING REGIMES FACE-OFF -->
    <div class="gen-subtab-content ${activeTab === 'compare' ? 'active' : ''}" id="gen-content-compare">
      <div class="faceoff-header">
        <h3>⚔️ The 3 Classic LLM Decoding Regimes</h3>
        <p>Compare how the exact same prompt completes under Greedy Decoding, Optimal Nucleus Sampling, and High-Entropy Chaos.</p>
        <button class="btn-run-faceoff" id="btn-run-parallel-faceoff">
          <span>▶</span> Run Multi-Regime Generation
        </button>
      </div>

      <div class="faceoff-grid">
        <!-- Regime 1: Greedy Decoding -->
        <div class="faceoff-card greedy">
          <div class="card-top-tag">❄️ DETERMINISTIC</div>
          <h4>Greedy Decoding</h4>
          <div class="card-hyperparams">T = 0.05 • Top-P = 1.0 • K = 1</div>
          <p class="regime-desc">Always picks token with highest logit (Argmax). Perfect for unit tests and math, but vulnerable to repetitive loops.</p>
          <div class="faceoff-output-box" id="faceoff-out-greedy">
            "The mysterious robot stepped out of the spaceship and saw a human. The human saw a human. The human saw a human..."
          </div>
          <div class="faceoff-stats-row">
            <span>Repetition: <strong class="red">88% (High)</strong></span>
            <span>Entropy: <strong class="cyan">0.05 bits</strong></span>
          </div>
        </div>

        <!-- Regime 2: Nucleus Sampling -->
        <div class="faceoff-card nucleus">
          <div class="card-top-tag recommended">✨ OPTIMAL NUCLEUS</div>
          <h4>Nucleus Sampling (Top-P)</h4>
          <div class="card-hyperparams">T = 0.70 • Top-P = 0.90 • K = 5</div>
          <p class="regime-desc">Standard ChatGPT & Claude setting. Balances fluency with surprise by sampling only inside the top 90% cumulative mass.</p>
          <div class="faceoff-output-box" id="faceoff-out-nucleus">
            "The mysterious robot stepped out of the spaceship and saw a glowing crystal emitting neon light across the horizon."
          </div>
          <div class="faceoff-stats-row">
            <span>Repetition: <strong class="green">0% (None)</strong></span>
            <span>Entropy: <strong class="green">1.82 bits</strong></span>
          </div>
        </div>

        <!-- Regime 3: High Temperature Chaos -->
        <div class="faceoff-card chaos">
          <div class="card-top-tag warning">🔥 UNBOUNDED CHAOS</div>
          <h4>High Temperature (Hallucination)</h4>
          <div class="card-hyperparams">T = 1.80 • Top-P = 1.0 • K = 10</div>
          <p class="regime-desc">Flattens the logit landscape. Ridiculous tail tokens receive almost equal probability as sensible words.</p>
          <div class="faceoff-output-box" id="faceoff-out-chaos">
            "The mysterious robot stepped out of the spaceship and saw a banana unicorn syntax pizza glitch underwater dancing."
          </div>
          <div class="faceoff-stats-row">
            <span>Repetition: <strong class="green">0% (None)</strong></span>
            <span>Entropy: <strong class="rose">3.32 bits (Max)</strong></span>
          </div>
        </div>
      </div>

      <!-- Strategy Comparison Matrix -->
      <div class="strategy-matrix-card">
        <h4>📋 Decoding Strategy Cheat-Sheet for AI Engineers</h4>
        <table class="strategy-table">
          <thead>
            <tr>
              <th>Strategy</th>
              <th>Typical Parameters</th>
              <th>Pros</th>
              <th>Cons</th>
              <th>Ideal Production Use Case</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Greedy Search</strong></td>
              <td><code>T ≈ 0.0, K = 1</code></td>
              <td>100% reproducible, precise, low latency</td>
              <td>Loops, dull, lacks human cadence</td>
              <td>SQL queries, Code Syntax, JSON parsing, Math arithmetic</td>
            </tr>
            <tr>
              <td><strong>Top-K Sampling</strong></td>
              <td><code>T = 0.7, K = 40, P = 1.0</code></td>
              <td>Cuts impossible tail tokens</td>
              <td>Fixed K fails when confidence is flat or sharp</td>
              <td>Fast mobile models, game NPC dialogue</td>
            </tr>
            <tr>
              <td><strong>Top-P (Nucleus)</strong></td>
              <td><code>T = 0.7, P = 0.90, K = 50</code></td>
              <td>Dynamically adapts pool size to confidence</td>
              <td>Slightly more sorting compute on GPU</td>
              <td>General ChatGPT chat, storytelling, essays, creative coding</td>
            </tr>
            <tr>
              <td><strong>Beam Search</strong></td>
              <td><code>Beams = 4–8</code></td>
              <td>Explores multiple parallel future hypotheses</td>
              <td>Very slow (multiplies KV cache VRAM by beam count)</td>
              <td>Language Translation, Text Summarization, Speech ASR</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  dom.interactiveContainer.appendChild(container);

  // --- Core Sampling Calculation Function ---
  function computeDistribution() {
    const promptObj = prompts[currentPromptIdx];
    let candidatePool = promptObj.candidates;

    // If we have generated tokens, adapt candidate pool to simulate natural autoregressive transitions!
    if (state.genTokensHistory && state.genTokensHistory.length > 0) {
      const lastToken = state.genTokensHistory[state.genTokensHistory.length - 1];
      if (followUpVocab[lastToken]) {
        candidatePool = followUpVocab[lastToken];
      } else {
        candidatePool = followUpVocab[" default"];
      }
    }

    // 1. Repetition Penalty application
    const historyTokens = state.genTokensHistory || [];
    const items = candidatePool.map(c => {
      let rawLogit = c.logit;
      const seenCount = historyTokens.filter(t => t.trim() === c.token.trim()).length;
      let effectiveLogit = rawLogit;
      if (seenCount > 0 && currentRepetitionPenalty > 1.0) {
        // Apply penalty power
        const penaltyFactor = Math.pow(currentRepetitionPenalty, seenCount);
        effectiveLogit = rawLogit > 0 ? (rawLogit / penaltyFactor) : (rawLogit * penaltyFactor);
      }
      return {
        token: c.token,
        category: c.category || 'word',
        rawLogit,
        effectiveLogit,
        seenCount
      };
    });

    // 2. Temperature Scaling: z / T
    const safeTemp = Math.max(currentTemperature, 0.02);
    items.forEach(item => {
      item.scaledLogit = item.effectiveLogit / safeTemp;
    });

    // Sort descending by scaledLogit
    items.sort((a, b) => b.scaledLogit - a.scaledLogit);

    // 3. Top-K cutoff
    items.forEach((item, idx) => {
      item.prunedByTopK = idx >= currentTopK;
    });

    // 4. Softmax over Top-K unpruned tokens
    const unprunedByK = items.filter(it => !it.prunedByTopK);
    const maxScaled = unprunedByK.length > 0 ? Math.max(...unprunedByK.map(it => it.scaledLogit)) : 0;
    
    let sumExp = 0;
    unprunedByK.forEach(item => {
      item.exp = Math.exp(item.scaledLogit - maxScaled);
      sumExp += item.exp;
    });

    unprunedByK.forEach(item => {
      item.rawProb = sumExp > 0 ? (item.exp / sumExp) : 0;
    });

    items.forEach(item => {
      if (item.prunedByTopK) {
        item.rawProb = 0;
      }
    });

    // 5. Top-P (Nucleus) cutoff
    let cumSum = 0;
    items.forEach((item, idx) => {
      if (item.prunedByTopK) {
        item.prunedByTopP = true;
        item.cumProb = cumSum;
        return;
      }
      cumSum += item.rawProb;
      item.cumProb = cumSum;
      // If previous cumulative sum already crossed top_p, prune this and remaining
      if (idx > 0 && (item.cumProb - item.rawProb) >= currentTopP) {
        item.prunedByTopP = true;
      } else {
        item.prunedByTopP = false;
      }
    });

    // 6. Re-normalize surviving candidates
    const surviving = items.filter(it => !it.prunedByTopK && !it.prunedByTopP);
    const survivingProbSum = surviving.reduce((sum, it) => sum + it.rawProb, 0);

    items.forEach(item => {
      if (!item.prunedByTopK && !item.prunedByTopP && survivingProbSum > 0) {
        item.finalProb = item.rawProb / survivingProbSum;
      } else {
        item.finalProb = 0;
      }
    });

    // 7. Calculate Shannon Entropy: H = - sum(p * log2(p))
    let entropy = 0;
    surviving.forEach(item => {
      if (item.finalProb > 1e-6) {
        entropy -= item.finalProb * Math.log2(item.finalProb);
      }
    });

    return {
      items,
      surviving,
      entropy
    };
  }

  // --- Render Candidates Deck & HUD ---
  function updateUI() {
    const dist = computeDistribution();
    const items = dist.items;
    const surviving = dist.surviving;
    const entropy = dist.entropy;

    // Update HUD Stats
    const regimeEl = container.querySelector('#gen-stat-regime');
    const entropyEl = container.querySelector('#gen-stat-entropy');
    const tempValEl = container.querySelector('#gen-stat-temp');
    const tempDescEl = container.querySelector('#gen-stat-temp-desc');
    const topPValEl = container.querySelector('#gen-stat-topp');
    const topKSubEl = container.querySelector('#gen-stat-topk');
    const survivorsEl = container.querySelector('#gen-stat-survivors');
    const prunedEl = container.querySelector('#gen-stat-pruned');

    if (tempValEl) tempValEl.textContent = currentTemperature.toFixed(2);
    if (topPValEl) topPValEl.textContent = `${(currentTopP * 100).toFixed(0)}%`;
    if (topKSubEl) topKSubEl.textContent = `Top-K: ${currentTopK}`;
    if (survivorsEl) survivorsEl.textContent = `${surviving.length} / ${items.length} Tokens`;
    if (prunedEl) prunedEl.textContent = `${items.length - surviving.length} Pruned (0% Mass)`;
    if (entropyEl) entropyEl.textContent = `Entropy: ${entropy.toFixed(2)} bits`;

    // Determine regime tag
    if (regimeEl && tempDescEl) {
      if (currentTemperature <= 0.1 || currentTopK === 1) {
        regimeEl.textContent = '❄️ Deterministic Argmax';
        regimeEl.className = 'gen-metric-val cyan';
        tempDescEl.textContent = 'Rigid / Zero Entropy';
      } else if (currentTemperature >= 1.4) {
        regimeEl.textContent = '🔥 High-Entropy Chaos';
        regimeEl.className = 'gen-metric-val rose';
        tempDescEl.textContent = 'Hallucinatory Flattener';
      } else if (currentTopP <= 0.6) {
        regimeEl.textContent = '🎯 Strict Nucleus';
        regimeEl.className = 'gen-metric-val amber';
        tempDescEl.textContent = 'Tight Conservative';
      } else {
        regimeEl.textContent = '✨ Optimal Nucleus';
        regimeEl.className = 'gen-metric-val green';
        tempDescEl.textContent = 'Balanced Creativity';
      }
    }

    // Update Slider Badges
    const badgeTemp = container.querySelector('#val-badge-temp');
    const badgeTopP = container.querySelector('#val-badge-topp');
    const badgeTopK = container.querySelector('#val-badge-topk');
    const badgeRep = container.querySelector('#val-badge-rep');
    if (badgeTemp) badgeTemp.textContent = currentTemperature.toFixed(2);
    if (badgeTopP) badgeTopP.textContent = currentTopP.toFixed(2);
    if (badgeTopK) badgeTopK.textContent = currentTopK;
    if (badgeRep) badgeRep.textContent = currentRepetitionPenalty.toFixed(2);

    // Update Terminal Story Box
    renderStoryTerminal();

    // Render Candidate Cards Deck
    const deck = container.querySelector('#gen-candidates-deck');
    if (!deck) return;
    deck.innerHTML = '';

    items.forEach((item, idx) => {
      const isPruned = item.prunedByTopK || item.prunedByTopP;
      const isSampled = sampledCandidateToken === item.token;
      const pct = (item.finalProb * 100).toFixed(1);

      let pruneReason = '';
      if (item.prunedByTopK) pruneReason = `Pruned by Top-K (Rank ${idx + 1} > ${currentTopK})`;
      else if (item.prunedByTopP) pruneReason = `Pruned by Top-P (Cum. ${(item.cumProb * 100).toFixed(0)}% > ${(currentTopP * 100).toFixed(0)}%)`;

      const card = document.createElement('div');
      card.className = `candidate-card ${isPruned ? 'pruned' : 'active'} ${isSampled ? 'sampled-highlight' : ''}`;
      card.innerHTML = `
        <div class="candidate-header-row">
          <div class="candidate-token-block">
            <span class="candidate-rank">#${idx + 1}</span>
            <span class="candidate-token-pill">${escapeHtml(item.token.replace(/\n/g, '↵'))}</span>
            <span class="candidate-category-tag">${item.category}</span>
            ${item.seenCount > 0 ? `<span class="candidate-rep-tag">Seen ${item.seenCount}x</span>` : ''}
          </div>
          <div class="candidate-math-block">
            <span class="math-item" title="Raw Unembedding Logit">z: ${item.rawLogit.toFixed(1)}</span>
            ${item.seenCount > 0 && currentRepetitionPenalty > 1.0 ? `<span class="math-item rep" title="Penalized Logit">z': ${item.effectiveLogit.toFixed(1)}</span>` : ''}
            <span class="math-item" title="Scaled Logit (z / T)">z/T: ${item.scaledLogit.toFixed(1)}</span>
            <span class="candidate-prob-pill ${isPruned ? 'zero' : ''}">${pct}%</span>
          </div>
        </div>

        <!-- Animated Probability Meter Bar -->
        <div class="candidate-bar-track">
          <div class="candidate-bar-fill ${isPruned ? 'pruned-fill' : ''} ${isSampled ? 'sampled-bar' : ''}" style="width: ${isPruned ? '0%' : pct + '%'}"></div>
          ${!isPruned ? `<span class="candidate-bar-cum-marker" style="left: ${Math.min((item.cumProb * 100), 98)}%"></span>` : ''}
        </div>

        <div class="candidate-footer-row">
          <span class="candidate-status-text">
            ${isPruned ? `🚫 ${pruneReason}` : `✓ In Nucleus (Cum. Mass: ${(item.cumProb * 100).toFixed(1)}%)`}
          </span>
          ${isSampled ? `<span class="sampled-badge">🏆 Winner Sampled!</span>` : ''}
        </div>
      `;

      // Allow clicking candidate to sample it manually!
      card.addEventListener('click', () => {
        if (isPruned) {
          soundFx.playBlip(320, 0.08);
          return;
        }
        applySampledToken(item.token);
      });

      deck.appendChild(card);
    });
  }

  // --- Render Generation Terminal ---
  function renderStoryTerminal() {
    const storyBox = container.querySelector('#gen-story-display');
    const countPill = container.querySelector('#gen-token-count-pill');
    if (!storyBox) return;

    const basePrompt = prompts[currentPromptIdx].text;
    const history = state.genTokensHistory || [];

    if (countPill) {
      countPill.textContent = `Generated: ${history.length} tokens`;
    }

    let html = `<span class="terminal-prompt-text">${escapeHtml(basePrompt)}</span>`;
    history.forEach((tok, i) => {
      const isLatest = i === history.length - 1;
      html += `<span class="terminal-gen-token ${isLatest ? 'latest' : ''}" data-idx="${i}" title="Generated Token #${i+1}">${escapeHtml(tok.replace(/\n/g, '↵'))}</span>`;
    });

    if (isStreaming) {
      html += `<span class="terminal-cursor">▋</span>`;
    }

    storyBox.innerHTML = html;
    storyBox.scrollTop = storyBox.scrollHeight;
  }

  // --- Sampling Logic (Multinomial Roulette Spin) ---
  function sampleNextToken() {
    const dist = computeDistribution();
    const surviving = dist.surviving;
    if (surviving.length === 0) return null;

    // Generate random uniform r in [0, 1)
    const r = Math.random();
    let cumulative = 0;
    let chosen = surviving[0];

    for (let i = 0; i < surviving.length; i++) {
      cumulative += surviving[i].finalProb;
      if (r <= cumulative) {
        chosen = surviving[i];
        break;
      }
    }

    return chosen.token;
  }

  function applySampledToken(tok) {
    if (!tok) return;
    sampledCandidateToken = tok;
    state.genTokensHistory = state.genTokensHistory || [];
    state.genTokensHistory.push(tok);

    soundFx.playBlip(680 + (state.genTokensHistory.length % 5) * 60, 0.09);
    awardXp(10);

    updateUI();

    // Reset sampled highlight after a brief moment
    setTimeout(() => {
      sampledCandidateToken = null;
      updateUI();
    }, 900);
  }

  // --- Auto-Streaming Routine ---
  function toggleAutoStream() {
    const btnStream = container.querySelector('#btn-gen-stream-auto');
    if (isStreaming) {
      // Stop
      clearInterval(streamTimer);
      isStreaming = false;
      if (btnStream) {
        btnStream.innerHTML = `<span>⚡</span> Auto-Stream 5 Tokens`;
        btnStream.classList.remove('streaming');
      }
      renderStoryTerminal();
      return;
    }

    // Start
    isStreaming = true;
    if (btnStream) {
      btnStream.innerHTML = `<span>⏹</span> Pause Stream`;
      btnStream.classList.add('streaming');
    }

    let tokensRemaining = 5;
    streamTimer = setInterval(() => {
      if (tokensRemaining <= 0) {
        clearInterval(streamTimer);
        isStreaming = false;
        if (btnStream) {
          btnStream.innerHTML = `<span>⚡</span> Auto-Stream 5 Tokens`;
          btnStream.classList.remove('streaming');
        }
        soundFx.playSuccess();
        renderStoryTerminal();
        return;
      }

      const nextTok = sampleNextToken();
      if (nextTok) {
        applySampledToken(nextTok);
      }
      tokensRemaining--;
    }, 600);
  }

  // --- Subtab Switching ---
  container.querySelectorAll('.gen-subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.gen-subtab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.gen-subtab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const tabName = btn.dataset.tab;
      activeTab = tabName;
      state.genActiveTab = tabName;
      const target = container.querySelector(`#gen-content-${tabName}`);
      if (target) target.classList.add('active');
      soundFx.playBlip(540, 0.05);
    });
  });

  // --- Event Listeners for Sliders ---
  const sliderTemp = container.querySelector('#slider-temp');
  if (sliderTemp) {
    sliderTemp.addEventListener('input', (e) => {
      currentTemperature = parseFloat(e.target.value);
      state.genTemperature = currentTemperature;
      updateUI();
    });
  }

  const sliderTopP = container.querySelector('#slider-topp');
  if (sliderTopP) {
    sliderTopP.addEventListener('input', (e) => {
      currentTopP = parseFloat(e.target.value);
      state.genTopP = currentTopP;
      updateUI();
    });
  }

  const sliderTopK = container.querySelector('#slider-topk');
  if (sliderTopK) {
    sliderTopK.addEventListener('input', (e) => {
      currentTopK = parseInt(e.target.value, 10);
      state.genTopK = currentTopK;
      updateUI();
    });
  }

  const sliderRep = container.querySelector('#slider-rep');
  if (sliderRep) {
    sliderRep.addEventListener('input', (e) => {
      currentRepetitionPenalty = parseFloat(e.target.value);
      state.genRepetitionPenalty = currentRepetitionPenalty;
      updateUI();
    });
  }

  // --- Preset Quick Buttons ---
  container.querySelectorAll('.preset-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      const val = parseFloat(btn.dataset.val);
      if (type === 'temp') {
        currentTemperature = val;
        state.genTemperature = val;
        if (sliderTemp) sliderTemp.value = val;
      } else if (type === 'topp') {
        currentTopP = val;
        state.genTopP = val;
        if (sliderTopP) sliderTopP.value = val;
      } else if (type === 'topk') {
        currentTopK = parseInt(val, 10);
        state.genTopK = currentTopK;
        if (sliderTopK) sliderTopK.value = val;
      } else if (type === 'rep') {
        currentRepetitionPenalty = val;
        state.genRepetitionPenalty = val;
        if (sliderRep) sliderRep.value = val;
      }
      soundFx.playBlip(720, 0.05);
      updateUI();
    });
  });

  // --- Terminal Action Buttons ---
  const btnPromptSelect = container.querySelector('#gen-prompt-select');
  if (btnPromptSelect) {
    btnPromptSelect.addEventListener('change', (e) => {
      currentPromptIdx = parseInt(e.target.value, 10);
      state.genPromptIdx = currentPromptIdx;
      state.genTokensHistory = [];
      sampledCandidateToken = null;
      soundFx.playBlip(600, 0.06);
      updateUI();
    });
  }

  const btnSpinStep = container.querySelector('#btn-gen-spin-step');
  if (btnSpinStep) {
    btnSpinStep.addEventListener('click', () => {
      const tok = sampleNextToken();
      if (tok) applySampledToken(tok);
    });
  }

  const btnStreamAuto = container.querySelector('#btn-gen-stream-auto');
  if (btnStreamAuto) {
    btnStreamAuto.addEventListener('click', toggleAutoStream);
  }

  const btnReset = container.querySelector('#btn-reset-generation');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (isStreaming) toggleAutoStream();
      state.genTokensHistory = [];
      sampledCandidateToken = null;
      soundFx.playBlip(440, 0.08);
      updateUI();
    });
  }

  const btnCopy = container.querySelector('#btn-copy-generation');
  if (btnCopy) {
    btnCopy.addEventListener('click', async () => {
      const base = prompts[currentPromptIdx].text;
      const history = state.genTokensHistory || [];
      const fullText = base + history.join('');
      try {
        await navigator.clipboard.writeText(fullText);
        const originalText = btnCopy.textContent;
        btnCopy.textContent = '✓ Copied!';
        soundFx.playBlip(880, 0.05);
        setTimeout(() => { btnCopy.textContent = originalText; }, 2000);
      } catch (err) {
        console.error('Clipboard copy failed:', err);
      }
    });
  }

  // --- Autoregressive Flow Pulse Animation ---
  const btnPulseLoop = container.querySelector('#btn-pulse-autoreg-loop');
  const pulseMsg = container.querySelector('#autoreg-pulse-msg');
  if (btnPulseLoop) {
    btnPulseLoop.addEventListener('click', () => {
      btnPulseLoop.disabled = true;
      const nodes = [
        container.querySelector('#node-step-1'),
        container.querySelector('#node-step-2'),
        container.querySelector('#node-step-3'),
        container.querySelector('#node-step-4'),
        container.querySelector('#node-step-5')
      ];

      const messages = [
        "1. Reading prompt & past tokens from KV cache...",
        "2. Propagating activations across 32 Transformer layers...",
        "3. Unembedding hidden state into 128,000 raw logits...",
        "4. Applying Temperature scaling & Top-P Nucleus filter...",
        "5. Stochastic multinomial sample: New token emitted & fed back!"
      ];

      nodes.forEach(n => n && n.classList.remove('pulse-active'));

      nodes.forEach((node, i) => {
        setTimeout(() => {
          nodes.forEach(n => n && n.classList.remove('pulse-active'));
          if (node) node.classList.add('pulse-active');
          if (pulseMsg) pulseMsg.textContent = messages[i];
          soundFx.playBlip(500 + i * 90, 0.08);

          if (i === nodes.length - 1) {
            setTimeout(() => {
              if (node) node.classList.remove('pulse-active');
              btnPulseLoop.disabled = false;
              if (pulseMsg) pulseMsg.textContent = "✓ Cycle Complete! Next token fed back into context.";
              soundFx.playSuccess();
            }, 800);
          }
        }, i * 650);
      });
    });
  }

  // --- Repetition Penalty Live Sandbox Interactive Buttons ---
  const repButtons = container.querySelectorAll('.rep-count-btn');
  const repLogitEl = container.querySelector('#rep-demo-logit');
  const repProbEl = container.querySelector('#rep-demo-prob');
  const repStatusEl = container.querySelector('#rep-demo-status');

  repButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      repButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const count = parseInt(btn.dataset.count, 10);
      const baseLogit = 4.20;
      const theta = currentRepetitionPenalty || 1.15;
      const factor = Math.pow(theta, count);
      const effective = baseLogit / factor;

      // Simulated relative probability against competing score of 3.8
      const exp1 = Math.exp(effective / 0.7);
      const exp2 = Math.exp(3.8 / 0.7);
      const prob = (exp1 / (exp1 + exp2)) * 100;

      if (repLogitEl) repLogitEl.textContent = effective.toFixed(2);
      if (repProbEl) repProbEl.textContent = `${prob.toFixed(1)}%`;
      if (repStatusEl) {
        if (count === 0) {
          repStatusEl.className = 'loop-status-pill safe';
          repStatusEl.textContent = 'Safe (High Diversity)';
        } else if (count === 1) {
          repStatusEl.className = 'loop-status-pill warning';
          repStatusEl.textContent = 'Suppressed (-15%)';
        } else {
          repStatusEl.className = 'loop-status-pill danger';
          repStatusEl.textContent = 'Strongly Blocked (-60%)';
        }
      }
      soundFx.playBlip(560 + count * 50, 0.06);
    });
  });

  // --- Faceoff Multi-Regime Parallel Runner ---
  const btnRunFaceoff = container.querySelector('#btn-run-parallel-faceoff');
  const outGreedy = container.querySelector('#faceoff-out-greedy');
  const outNucleus = container.querySelector('#faceoff-out-nucleus');
  const outChaos = container.querySelector('#faceoff-out-chaos');

  const faceoffScenarios = {
    robot: {
      greedy: '"The mysterious robot stepped out of the spaceship and saw a human. The human saw a human. The human saw a human..."',
      nucleus: '"The mysterious robot stepped out of the spaceship and saw a glowing alien staring silently across the alien horizon."',
      chaos: '"The mysterious robot stepped out of the spaceship and saw a banana unicorn syntax pizza glitch underwater dancing."'
    },
    code: {
      greedy: '"def train_neural_network(model, optimizer, data_loader):\n    model.train()\n    model.train()\n    model.train()..."',
      nucleus: '"def train_neural_network(model, optimizer, data_loader):\n    model.train()\n    for epoch in range(10):\n        for batch in data_loader:"',
      chaos: '"def train_neural_network(model, optimizer, data_loader):\n    spaceship pizza print total spaceship pizza return"'
    },
    philosophy: {
      greedy: '"In the heart of the quantum computer, artificial consciousness began to question. It began to question. It began to question..."',
      nucleus: '"In the heart of the quantum computer, artificial consciousness began to awaken and question whether reality itself was a simulation."',
      chaos: '"In the heart of the quantum computer, artificial consciousness began to potato crash dance banana evolve quantum glitch."'
    }
  };

  if (btnRunFaceoff) {
    btnRunFaceoff.addEventListener('click', () => {
      btnRunFaceoff.disabled = true;
      const scenarioKey = prompts[currentPromptIdx].id || 'robot';
      const scenario = faceoffScenarios[scenarioKey] || faceoffScenarios.robot;

      if (outGreedy) outGreedy.textContent = "⏳ Generating with Argmax (T=0.05)...";
      if (outNucleus) outNucleus.textContent = "⏳ Generating with Nucleus (T=0.7, P=0.9)...";
      if (outChaos) outChaos.textContent = "⏳ Generating with Chaos (T=1.8)...";

      setTimeout(() => {
        if (outGreedy) outGreedy.textContent = scenario.greedy;
        soundFx.playBlip(600, 0.08);
      }, 500);

      setTimeout(() => {
        if (outNucleus) outNucleus.textContent = scenario.nucleus;
        soundFx.playBlip(750, 0.08);
      }, 1000);

      setTimeout(() => {
        if (outChaos) outChaos.textContent = scenario.chaos;
        soundFx.playSuccess();
        btnRunFaceoff.disabled = false;
      }, 1500);
    });
  }

  // Initial draw
  updateUI();
}

// ============================================================================
// WIDGET 11: Post-Training & Alignment Lab (SFT, ChatML & DPO)
// ============================================================================