/**
 * NeuroQuest Certificate & Diploma Generator
 * Renders a high-resolution (1600x1100) samurai dojo diploma on an HTML5 Canvas
 * and generates downloadable PNG files.
 */

export function generateDiplomaCanvas(options = {}) {
  const {
    studentName = 'Tensor Practitioner',
    completedQuests = [],
    totalQuests = 11,
    userXp = 1250,
    completionDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    verificationCode = generateVerificationCode(studentName)
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1100;
  const ctx = canvas.getContext('2d');

  // 1. Background Obsidian Gradient
  const bgGrad = ctx.createRadialGradient(800, 550, 50, 800, 550, 950);
  bgGrad.addColorStop(0, '#11182c');
  bgGrad.addColorStop(0.5, '#090d1a');
  bgGrad.addColorStop(1, '#04060c');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1600, 1100);

  // 2. Neural Constellation Watermark in Background
  drawNeuralConstellationWatermark(ctx, 1600, 1100);

  // 3. Luxurious Dual Gold Border Frame
  drawDiplomaBorder(ctx, 1600, 1100);

  // 4. Header Dojo Crest & Branding
  ctx.save();
  ctx.textAlign = 'center';

  // Crest icon
  ctx.font = '54px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  ctx.fillText('🧠 🥋 ⚡', 800, 140);

  // Dojo Supertitle
  ctx.font = '700 24px "Outfit", sans-serif';
  ctx.fillStyle = '#f59e0b';
  ctx.letterSpacing = '6px';
  ctx.fillText('NEUROQUEST DOJO OF MACHINE INTELLIGENCE', 800, 185);

  // Certificate Main Title
  ctx.font = '800 48px "Outfit", sans-serif';
  const titleGrad = ctx.createLinearGradient(400, 0, 1200, 0);
  titleGrad.addColorStop(0, '#fef3c7');
  titleGrad.addColorStop(0.3, '#fbbf24');
  titleGrad.addColorStop(0.7, '#f59e0b');
  titleGrad.addColorStop(1, '#d97706');
  ctx.fillStyle = titleGrad;
  ctx.fillText('CERTIFICATE OF DEEP LEARNING MASTERY', 800, 245);

  // Subtitle / Dedication
  ctx.font = 'italic 400 19px "Outfit", serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('This certifies with honor and distinction that the scholar', 800, 290);

  // 5. Student Name (Hero Display)
  ctx.font = '800 56px "Outfit", sans-serif';
  const nameGrad = ctx.createLinearGradient(400, 310, 1200, 390);
  nameGrad.addColorStop(0, '#ffffff');
  nameGrad.addColorStop(0.5, '#67e8f9');
  nameGrad.addColorStop(1, '#c084fc');
  ctx.fillStyle = nameGrad;
  ctx.shadowColor = 'rgba(103, 232, 249, 0.45)';
  ctx.shadowBlur = 24;
  ctx.fillText(studentName.toUpperCase(), 800, 365);
  ctx.shadowBlur = 0; // reset shadow

  // Gold underline under student name
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(480, 385);
  ctx.lineTo(1120, 385);
  ctx.stroke();

  // Small diamond center accent
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(800, 385, 5, 0, Math.PI * 2);
  ctx.fill();

  // Affirmation Paragraph
  ctx.font = '400 20px "Outfit", sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(
    'has thoroughly conquered the mathematical foundations, gradient mechanics, and architectural mastery',
    800,
    430
  );
  ctx.fillText(
    'of modern Artificial Neural Networks, from Biological Perceptrons to Deep Transformers.',
    800,
    460
  );

  ctx.restore();

  // 6. Mastered Disciplines Grid (9 Curriculum Badges)
  drawMasteredDisciplinesGrid(ctx, 800, 485, completedQuests, totalQuests);

  // 7. Footer: Sensei Hanko Stamp, XP Achievement, Signature, Verification
  const completedCount = completedQuests.length >= totalQuests ? totalQuests : completedQuests.length;
  drawDiplomaFooter(ctx, 1600, 1100, {
    userXp,
    completionDate,
    verificationCode,
    totalQuests,
    completedCount,
    isCompleted: completedCount >= totalQuests
  });

  return canvas;
}

function drawDiplomaBorder(ctx, width, height) {
  ctx.save();
  // Outer frame
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 3;
  ctx.strokeRect(40, 40, width - 80, height - 80);

  // Inner frame
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(52, 52, width - 104, height - 104);

  // Thin hairline frame
  ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(60, 60, width - 120, height - 120);

  // Corner Ornaments (Samurai Brackets)
  const corners = [
    { x: 40, y: 40, dx: 1, dy: 1 },
    { x: width - 40, y: 40, dx: -1, dy: 1 },
    { x: 40, y: height - 40, dx: 1, dy: -1 },
    { x: width - 40, y: height - 40, dx: -1, dy: -1 }
  ];

  ctx.fillStyle = '#f59e0b';
  corners.forEach(c => {
    // Corner block
    ctx.fillRect(c.x - (c.dx < 0 ? 30 : 0), c.y - (c.dy < 0 ? 8 : 0), 30, 8);
    ctx.fillRect(c.x - (c.dx < 0 ? 8 : 0), c.y - (c.dy < 0 ? 30 : 0), 8, 30);
    // Diamond accent
    ctx.beginPath();
    ctx.arc(c.x + c.dx * 20, c.y + c.dy * 20, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

function drawNeuralConstellationWatermark(ctx, width, height) {
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = '#8b5cf6';
  ctx.fillStyle = '#67e8f9';
  ctx.lineWidth = 1;

  // Pseudo-random deterministic grid of neurons
  const points = [
    { x: 180, y: 220 }, { x: 300, y: 150 }, { x: 240, y: 350 }, { x: 150, y: 500 },
    { x: 320, y: 620 }, { x: 220, y: 780 }, { x: 190, y: 920 }, { x: 380, y: 880 },
    { x: 1380, y: 200 }, { x: 1250, y: 140 }, { x: 1320, y: 340 }, { x: 1420, y: 480 },
    { x: 1280, y: 600 }, { x: 1370, y: 760 }, { x: 1240, y: 900 }, { x: 1400, y: 940 },
    { x: 500, y: 160 }, { x: 1100, y: 160 }, { x: 450, y: 920 }, { x: 1150, y: 920 }
  ];

  // Draw connections
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dist = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
      if (dist < 260) {
        ctx.beginPath();
        ctx.moveTo(points[i].x, points[i].y);
        ctx.lineTo(points[j].x, points[j].y);
        ctx.stroke();
      }
    }
  }

  // Draw nodes
  points.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

function drawMasteredDisciplinesGrid(ctx, centerX, startY, completedQuests, totalQuests) {
  const quests = [
    { num: 'I', icon: '☕', title: 'Perceptrons', tag: 'Linear Weights & Bias' },
    { num: 'II', icon: '⚡', title: 'Activations', tag: 'Space Bending ReLU' },
    { num: 'III', icon: '⛰️', title: 'Gradients', tag: 'Loss Surface Descent' },
    { num: 'IV', icon: '🎨', title: 'Vision CNN', tag: 'Convolutions & Pooling' },
    { num: 'V', icon: '🔍', title: 'Feature Maps', tag: 'Spatial Kernels' },
    { num: 'VI', icon: '🐉', title: 'Regularization', tag: 'Dropout & Weight Decay' },
    { num: 'VII', icon: '⚡', title: 'Transformers', tag: 'QKV Self-Attention' },
    { num: 'VIII', icon: '🔤', title: 'Tokenization', tag: 'BPE & RoPE Embeddings' },
    { num: 'IX', icon: '🧱', title: 'GPT Decoder', tag: 'Causal Mask & SwiGLU' },
    { num: 'X', icon: '🎲', title: 'Generation Engine', tag: 'Sampling & Top-P Nucleus' },
    { num: 'XI', icon: '🛡️', title: 'Alignment & DPO', tag: 'ChatML & Preference Tuning' }
  ];

  ctx.save();

  // Split into Row 1 (6 quests) and Row 2 (5 quests)
  const row1 = quests.slice(0, 6);
  const row2 = quests.slice(6, 11);

  const cardWidth = 205;
  const cardHeight = 98;
  const gap = 14;

  const renderRow = (rowItems, rowIdx, y) => {
    const totalRowWidth = rowItems.length * cardWidth + (rowItems.length - 1) * gap;
    const startX = centerX - totalRowWidth / 2;

    rowItems.forEach((q, idx) => {
      const globalIdx = rowIdx === 0 ? idx : 6 + idx;
      const x = startX + idx * (cardWidth + gap);
      const isDone = completedQuests.includes(`quest-${globalIdx + 1}`) || completedQuests.length >= totalQuests;

      // Card background
      ctx.fillStyle = isDone ? 'rgba(16, 185, 129, 0.12)' : 'rgba(30, 41, 59, 0.5)';
      ctx.strokeStyle = isDone ? 'rgba(16, 185, 129, 0.6)' : 'rgba(71, 85, 105, 0.4)';
      ctx.lineWidth = 1.5;

      drawRoundedRect(ctx, x, y, cardWidth, cardHeight, 10);
      ctx.fill();
      ctx.stroke();

      // Quest number badge
      ctx.font = '700 12px "Outfit", sans-serif';
      ctx.fillStyle = isDone ? '#34d399' : '#64748b';
      ctx.textAlign = 'left';
      ctx.fillText(`QUEST ${q.num}`, x + 12, y + 22);

      // Icon + Status checkmark
      ctx.font = '22px "Segoe UI Emoji", sans-serif';
      ctx.fillText(q.icon, x + 12, y + 54);

      if (isDone) {
        ctx.font = '700 13px "Outfit", sans-serif';
        ctx.fillStyle = '#10b981';
        ctx.textAlign = 'right';
        ctx.fillText('✓ PASSED', x + cardWidth - 12, y + 22);
      }

      // Quest Title
      ctx.font = '600 14px "Outfit", sans-serif';
      ctx.fillStyle = isDone ? '#f8fafc' : '#94a3b8';
      ctx.textAlign = 'left';
      ctx.fillText(q.title, x + 44, y + 54);

      // Technical tag
      ctx.font = '400 11px "JetBrains Mono", monospace';
      ctx.fillStyle = isDone ? '#67e8f9' : '#475569';
      ctx.fillText(q.tag, x + 12, y + 80);
    });
  };

  renderRow(row1, 0, startY);
  renderRow(row2, 1, startY + cardHeight + gap);

  ctx.restore();
}

function drawDiplomaFooter(ctx, width, height, data) {
  const { userXp, completionDate, verificationCode, isCompleted } = data;
  const bottomY = 940;

  ctx.save();

  // --- Left: Red Sensei Hanko Stamp (Inkan) ---
  const stampX = 220;
  const stampY = bottomY - 30;

  // Outer red square with rounded corners
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 4;
  ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
  drawRoundedRect(ctx, stampX - 60, stampY - 60, 120, 120, 16);
  ctx.fill();
  ctx.stroke();

  // Double inner ring
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, stampX - 52, stampY - 52, 104, 104, 12);
  ctx.stroke();

  // Stamp Kanji & Sensei Text
  ctx.fillStyle = '#ef4444';
  ctx.textAlign = 'center';
  ctx.font = '700 24px "Outfit", sans-serif';
  ctx.fillText('皆 伝', stampX, stampY - 14); // Kaiden (Full Transmission/Mastery)
  ctx.font = '700 12px "Outfit", sans-serif';
  ctx.letterSpacing = '1px';
  ctx.fillText('SENSEI TENSOR', stampX, stampY + 12);
  ctx.font = '600 10px "Outfit", sans-serif';
  ctx.fillText('DOJO SEAL 🥋', stampX, stampY + 30);

  // Label under stamp
  ctx.font = '500 14px "Outfit", sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Authenticated Instructor Seal', stampX, bottomY + 75);

  // --- Center: Grandmaster Rank, Total XP & Ribbon ---
  const centerX = 800;
  ctx.textAlign = 'center';

  // XP Medallion
  ctx.font = '800 28px "Outfit", sans-serif';
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(`⚡ ${userXp} XP EARNED`, centerX, bottomY - 35);

  ctx.font = '700 18px "Outfit", sans-serif';
  ctx.fillStyle = isCompleted ? '#34d399' : '#f59e0b';
  ctx.fillText(
    isCompleted ? '★ GRANDMASTER TENSOR SAMURAI ★' : '★ SENIOR TENSOR APPRENTICE ★',
    centerX,
    bottomY - 8
  );

  ctx.font = '400 14px "JetBrains Mono", monospace';
  ctx.fillStyle = '#64748b';
  const total = data.totalQuests || 9;
  const count = data.completedCount !== undefined ? data.completedCount : (isCompleted ? total : 0);
  const pct = Math.round((count / total) * 100);
  ctx.fillText(`Curriculum: ${count} / ${total} Quests Conquered • ${pct}% Mastery`, centerX, bottomY + 20);

  // --- Right: Verification Hash & Issue Date ---
  const rightX = 1380;
  ctx.textAlign = 'right';

  ctx.font = '600 15px "Outfit", sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(`Conferred on: ${completionDate}`, rightX, bottomY - 35);

  ctx.font = '700 14px "JetBrains Mono", monospace';
  ctx.fillStyle = '#f59e0b';
  ctx.fillText(`Credential ID: ${verificationCode}`, rightX, bottomY - 10);

  ctx.font = '400 12px "JetBrains Mono", monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText('SHA-256 DOJO SIGNATURE VERIFIED ✓', rightX, bottomY + 15);

  // Signature line on top of date
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(rightX - 320, bottomY - 55);
  ctx.lineTo(rightX, bottomY - 55);
  ctx.stroke();

  ctx.font = 'italic 16px "Brush Script MT", "Segoe Script", cursive';
  ctx.fillStyle = '#67e8f9';
  ctx.fillText('Sensei Tensor, Head of Dojo', rightX - 20, bottomY - 65);

  ctx.restore();
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function generateVerificationCode(name) {
  let hash = 0;
  const str = `${name}-NEUROQUEST-DOJO-2026`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  return `NQ-2026-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

export function downloadDiplomaPng(canvas, studentName = 'Learner') {
  const safeName = studentName.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'Cadet';
  const dataUrl = canvas.toDataURL('image/png', 1.0);
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `NeuroQuest_Diploma_${safeName}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
