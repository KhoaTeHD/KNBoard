import {
  FunctionGraphState,
  Pyramid3DState,
  Triangle2DState,
} from '../types/exam';

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface Vec2 {
  x: number;
  y: number;
}

function rotate3D(p: Vec3, yaw: number, pitch: number): Vec3 {
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const x1 = p.x * cosY - p.z * sinY;
  const z1 = p.x * sinY + p.z * cosY;

  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const y2 = p.y * cosP - z1 * sinP;
  const z2 = p.y * sinP + z1 * cosP;

  return { x: x1, y: y2, z: z2 };
}

function lerp3D(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

function crossProductZ(a: Vec2, b: Vec2, c: Vec2): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

/**
 * Automatically computes a tight, padded SVG viewBox from a list of 2D points
 * so that NO vertex or label (like apex S) is EVER clipped regardless of container size!
 */
function computeAutoFitViewBox(
  pts: Vec2[],
  padLeft = 36,
  padRight = 36,
  padTop = 36,
  padBottom = 32
): string {
  if (pts.length === 0) return '0 0 400 320';
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const vx = Math.floor(minX - padLeft);
  const vy = Math.floor(minY - padTop);
  const vw = Math.max(120, Math.ceil(maxX - minX + padLeft + padRight));
  const vh = Math.max(100, Math.ceil(maxY - minY + padTop + padBottom));
  return `${vx} ${vy} ${vw} ${vh}`;
}

/**
 * Generates a crisp textbook-grade SVG string for 3D Spatial Geometry with AUTO-FIT VIEWBOX
 * Guarantees apex S and all labels are 100% visible both on the Whiteboard and inside the Exam Paper!
 */
export function generatePyramid3DSvg(
  state: Pyramid3DState,
  _width = 420,
  _height = 340,
  isDarkTheme = false
): string {
  const shapeType = state.shape3DType || 'pyramid-quad';
  const mainStroke = isDarkTheme ? '#e2e8f0' : '#1e3a8a';
  const labelColor = isDarkTheme ? '#f8fafc' : '#0f172a';
  const pointColor = isDarkTheme ? '#60a5fa' : '#2563eb';
  const s = state.scale || 110;
  const cx = 250;
  const cy = 220;

  const project = (p: Vec3): Vec2 => ({
    x: cx + p.x * s,
    y: cy - p.y * s,
  });

  // --- CASE B: TRIANGULAR PRISM ABC.A'B'C' ---
  if (shapeType === 'prism-tri') {
    const h = state.apexHeight * 0.52;
    const raw3D: Record<string, Vec3> = {
      A: { x: -1.0, y: -h, z: -0.45 },
      B: { x: 0.95, y: -h, z: -0.55 },
      C: { x: -0.1, y: -h, z: 0.85 },
      A1: { x: -0.82, y: h, z: -0.45 },
      B1: { x: 1.13, y: h, z: -0.55 },
      C1: { x: 0.08, y: h, z: 0.85 },
    };
    raw3D.M = lerp3D(raw3D.A, raw3D.A1, state.cutRatioM);
    raw3D.N = lerp3D(raw3D.B, raw3D.B1, state.cutRatioN);
    raw3D.P = lerp3D(raw3D.C, raw3D.C1, state.cutRatioP);

    const pts2D: Record<string, Vec2> = {};
    for (const k of Object.keys(raw3D)) {
      pts2D[k] = project(rotate3D(raw3D[k], state.yaw, state.pitch));
    }

    const frontAB = crossProductZ(pts2D.A1, pts2D.A, pts2D.B) < 0;
    const frontBC = crossProductZ(pts2D.B1, pts2D.B, pts2D.C) < 0;
    const frontCA = crossProductZ(pts2D.C1, pts2D.C, pts2D.A) < 0;

    let svg = '';
    if (state.showBaseFill) {
      svg += `<polygon points="${pts2D.A.x},${pts2D.A.y} ${pts2D.B.x},${pts2D.B.y} ${pts2D.C.x},${pts2D.C.y}" fill="${state.baseFillColor}" fill-opacity="0.35" />`;
    }
    if (state.showCrossSection) {
      svg += `<polygon points="${pts2D.M.x},${pts2D.M.y} ${pts2D.N.x},${pts2D.N.y} ${pts2D.P.x},${pts2D.P.y}" fill="${state.sectionFillColor}" fill-opacity="0.52" />`;
    }

    const edges = [
      { a: 'A1', b: 'B1', vis: true },
      { a: 'B1', b: 'C1', vis: true },
      { a: 'C1', b: 'A1', vis: true },
      { a: 'A', b: 'A1', vis: frontAB || frontCA },
      { a: 'B', b: 'B1', vis: frontAB || frontBC },
      { a: 'C', b: 'C1', vis: frontBC || frontCA },
      { a: 'A', b: 'B', vis: frontAB },
      { a: 'B', b: 'C', vis: frontBC },
      { a: 'C', b: 'A', vis: frontCA },
    ];
    if (state.showCrossSection) {
      edges.push(
        { a: 'M', b: 'N', vis: frontAB },
        { a: 'N', b: 'P', vis: frontBC },
        { a: 'P', b: 'M', vis: frontCA }
      );
    }

    edges.forEach((e) => {
      const p1 = pts2D[e.a];
      const p2 = pts2D[e.b];
      svg += `<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="${mainStroke}" stroke-width="${e.vis ? 1.8 : 1.35}" ${e.vis ? '' : 'stroke-dasharray="5,4"'} />`;
    });

    const labels: Record<string, string> = {
      A: 'A',
      B: 'B',
      C: 'C',
      A1: "A'",
      B1: "B'",
      C1: "C'",
      M: 'M',
      N: 'N',
      P: 'P',
    };
    const keys = state.showCrossSection
      ? ['A', 'B', 'C', 'A1', 'B1', 'C1', 'M', 'N', 'P']
      : ['A', 'B', 'C', 'A1', 'B1', 'C1'];

    keys.forEach((k) => {
      const pt = pts2D[k];
      svg += `<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="3.5" fill="${pointColor}" stroke="#fff" stroke-width="1" />`;
      svg += `<text x="${(pt.x + (pt.x > cx ? 8 : -18)).toFixed(1)}" y="${(pt.y + 4).toFixed(1)}" font-family="Times New Roman, serif" font-style="italic" font-weight="bold" font-size="${state.labelFontSize}" fill="${labelColor}">${labels[k]}</text>`;
    });

    const vb = computeAutoFitViewBox(Object.values(pts2D));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">${svg}</svg>`;
  }

  // --- CASE C: CONE (HÌNH NÓN S.OAB) ---
  if (shapeType === 'cone') {
    const rx = s * 0.95;
    const ry = Math.max(18, Math.abs(Math.sin(state.pitch)) * s * 0.65);
    const sy = cy - state.apexHeight * s * 0.88;

    let svg = '';
    if (state.showBaseFill) {
      svg += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${state.baseFillColor}" fill-opacity="0.32" />`;
    }
    if (state.showCrossSection) {
      svg += `<polygon points="${cx},${sy} ${cx - rx * 0.55},${cy + ry * 0.82} ${cx + rx * 0.72},${cy + ry * 0.68}" fill="${state.sectionFillColor}" fill-opacity="0.48" />`;
    }
    svg += `<path d="M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 1 ${cx + rx} ${cy}" fill="none" stroke="${mainStroke}" stroke-width="1.4" stroke-dasharray="5,4" />`;
    svg += `<path d="M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 0 ${cx + rx} ${cy}" fill="none" stroke="${mainStroke}" stroke-width="1.8" />`;
    svg += `<line x1="${cx}" y1="${sy}" x2="${cx - rx}" y2="${cy}" stroke="${mainStroke}" stroke-width="1.8" />`;
    svg += `<line x1="${cx}" y1="${sy}" x2="${cx + rx}" y2="${cy}" stroke="${mainStroke}" stroke-width="1.8" />`;
    svg += `<line x1="${cx}" y1="${sy}" x2="${cx}" y2="${cy}" stroke="${mainStroke}" stroke-width="1.35" stroke-dasharray="5,4" />`;
    svg += `<line x1="${cx - rx}" y1="${cy}" x2="${cx + rx}" y2="${cy}" stroke="${mainStroke}" stroke-width="1.35" stroke-dasharray="5,4" />`;

    const pts = [
      { k: 'S', x: cx, y: sy, ox: -4, oy: -12 },
      { k: 'O', x: cx, y: cy, ox: 6, oy: 15 },
      { k: 'A', x: cx - rx, y: cy, ox: -18, oy: 5 },
      { k: 'B', x: cx + rx, y: cy, ox: 9, oy: 5 },
    ];
    pts.forEach((p) => {
      svg += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="${pointColor}" stroke="#fff" stroke-width="1" />`;
      svg += `<text x="${p.x + p.ox}" y="${p.y + p.oy}" font-family="Times New Roman, serif" font-style="italic" font-weight="bold" font-size="${state.labelFontSize}" fill="${labelColor}">${p.k}</text>`;
    });

    const vb = computeAutoFitViewBox([
      { x: cx - rx, y: sy },
      { x: cx + rx, y: cy + ry },
    ]);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">${svg}</svg>`;
  }

  // --- CASE A (DEFAULT): PYRAMID S.ABCD + CROSS SECTION MNPQ ---
  const raw3D: Record<string, Vec3> = {
    S: { x: -0.18, y: state.apexHeight, z: -0.1 },
    A: { x: -1.05, y: 0, z: -0.65 },
    B: { x: 1.05, y: 0, z: -0.65 },
    C: { x: 0.65, y: 0, z: 0.72 },
    D: { x: -1.35, y: 0, z: 0.72 },
  };

  raw3D.M = lerp3D(raw3D.S, raw3D.A, state.cutRatioM);
  raw3D.N = lerp3D(raw3D.S, raw3D.B, state.cutRatioN);
  raw3D.P = lerp3D(raw3D.S, raw3D.C, state.cutRatioP);
  raw3D.Q = lerp3D(raw3D.S, raw3D.D, state.cutRatioQ);

  const rot3D: Record<string, Vec3> = {};
  const pts2D: Record<string, Vec2> = {};
  const allBoundingPts: Vec2[] = [];

  for (const key of Object.keys(raw3D)) {
    rot3D[key] = rotate3D(raw3D[key], state.yaw, state.pitch);
    pts2D[key] = project(rot3D[key]);
    allBoundingPts.push(pts2D[key]);
  }

  const faces: { name: string; verts: [string, string, string]; isVisible: boolean }[] = [
    { name: 'SAB', verts: ['S', 'A', 'B'], isVisible: false },
    { name: 'SBC', verts: ['S', 'B', 'C'], isVisible: false },
    { name: 'SCD', verts: ['S', 'C', 'D'], isVisible: false },
    { name: 'SDA', verts: ['S', 'D', 'A'], isVisible: false },
  ];

  faces.forEach((f) => {
    const [v0, v1, v2] = f.verts;
    const nz = crossProductZ(pts2D[v0], pts2D[v1], pts2D[v2]);
    f.isVisible = nz < 0;
  });

  const faceVisibility: Record<string, boolean> = {};
  faces.forEach((f) => {
    faceVisibility[f.name] = f.isVisible;
  });
  const baseVisible = state.pitch > 0.65;
  const isEdgeVisible = (f1: boolean, f2: boolean) => f1 || f2;

  const edges: { a: string; b: string; visible: boolean; color?: string; width?: number }[] = [
    { a: 'S', b: 'A', visible: isEdgeVisible(faceVisibility.SAB, faceVisibility.SDA) },
    { a: 'S', b: 'B', visible: isEdgeVisible(faceVisibility.SAB, faceVisibility.SBC) },
    { a: 'S', b: 'C', visible: isEdgeVisible(faceVisibility.SBC, faceVisibility.SCD) },
    { a: 'S', b: 'D', visible: isEdgeVisible(faceVisibility.SCD, faceVisibility.SDA) },
    { a: 'A', b: 'B', visible: isEdgeVisible(faceVisibility.SAB, baseVisible) },
    { a: 'B', b: 'C', visible: isEdgeVisible(faceVisibility.SBC, baseVisible) },
    { a: 'C', b: 'D', visible: isEdgeVisible(faceVisibility.SCD, baseVisible) },
    { a: 'D', b: 'A', visible: isEdgeVisible(faceVisibility.SDA, baseVisible) },
  ];

  if (state.showCrossSection) {
    edges.push(
      { a: 'M', b: 'N', visible: faceVisibility.SAB, width: 2 },
      { a: 'N', b: 'P', visible: faceVisibility.SBC, width: 2 },
      { a: 'P', b: 'Q', visible: faceVisibility.SCD, width: 2 },
      { a: 'Q', b: 'M', visible: faceVisibility.SDA, width: 2 }
    );
  }

  let svgContent = '';

  if (state.showBaseFill) {
    const basePts = ['A', 'B', 'C', 'D']
      .map((k) => `${pts2D[k].x.toFixed(1)},${pts2D[k].y.toFixed(1)}`)
      .join(' ');
    svgContent += `<polygon points="${basePts}" fill="${state.baseFillColor}" fill-opacity="0.45" />`;
  }

  if (state.showSideFaceFill && state.showCrossSection) {
    const sidePts = ['N', 'P', 'C', 'B']
      .map((k) => `${pts2D[k].x.toFixed(1)},${pts2D[k].y.toFixed(1)}`)
      .join(' ');
    svgContent += `<polygon points="${sidePts}" fill="${state.sideFaceFillColor}" fill-opacity="0.38" />`;
  }

  if (state.showCrossSection) {
    const secPts = ['M', 'N', 'P', 'Q']
      .map((k) => `${pts2D[k].x.toFixed(1)},${pts2D[k].y.toFixed(1)}`)
      .join(' ');
    svgContent += `<polygon points="${secPts}" fill="${state.sectionFillColor}" fill-opacity="0.52" />`;
  }

  edges.forEach((edge) => {
    const p1 = pts2D[edge.a];
    const p2 = pts2D[edge.b];
    const dashAttr = edge.visible ? '' : 'stroke-dasharray="5,4"';
    const strokeW = edge.width || (edge.visible ? 1.8 : 1.4);
    const opacity = edge.visible ? '1' : '0.78';
    svgContent += `<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="${edge.color || mainStroke}" stroke-width="${strokeW}" stroke-opacity="${opacity}" stroke-linecap="round" ${dashAttr} />`;
  });

  if (state.showUnfoldedSection && state.showCrossSection) {
    const ux = cx + s * 1.95;
    const uy = cy - s * 0.45;
    const r = s * 0.48;
    const uPts: Record<string, Vec2> = {
      M: { x: ux - r * 0.85, y: uy + r * 0.7 },
      N: { x: ux + r * 0.85, y: uy + r * 0.7 },
      P: { x: ux + r * 0.55, y: uy - r * 0.65 },
      Q: { x: ux - r * 0.55, y: uy - r * 0.65 },
    };
    Object.values(uPts).forEach((p) => allBoundingPts.push(p));
    allBoundingPts.push({ x: ux, y: uy + r * 1.25 });

    const polyStr = ['M', 'N', 'P', 'Q']
      .map((k) => `${uPts[k].x.toFixed(1)},${uPts[k].y.toFixed(1)}`)
      .join(' ');
    svgContent += `<polygon points="${polyStr}" fill="${state.sectionFillColor}" fill-opacity="0.55" stroke="${mainStroke}" stroke-width="1.7" />`;
    svgContent += `<text x="${ux}" y="${uy + r * 1.15}" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" fill="${labelColor}" opacity="0.75">Thiết diện thật (MNPQ)</text>`;
    for (const k of ['M', 'N', 'P', 'Q']) {
      const pt = uPts[k];
      svgContent += `<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="3.2" fill="${pointColor}" />`;
      svgContent += `<text x="${(pt.x + (pt.x > ux ? 8 : -14)).toFixed(1)}" y="${(pt.y + (pt.y > uy ? 14 : -6)).toFixed(1)}" font-family="Times New Roman, serif" font-style="italic" font-weight="bold" font-size="${state.labelFontSize - 2}" fill="${labelColor}">${k}</text>`;
    }
  }

  const labelOffsets: Record<string, Vec2> = {
    S: { x: -4, y: -11 },
    A: { x: -17, y: -4 },
    B: { x: 10, y: 4 },
    C: { x: 8, y: 16 },
    D: { x: -18, y: 15 },
    M: { x: -18, y: -3 },
    N: { x: 9, y: -3 },
    P: { x: 9, y: 6 },
    Q: { x: -18, y: 5 },
  };

  const keysToRender = state.showCrossSection
    ? ['S', 'A', 'B', 'C', 'D', 'M', 'N', 'P', 'Q']
    : ['S', 'A', 'B', 'C', 'D'];

  keysToRender.forEach((k) => {
    const pt = pts2D[k];
    const off = labelOffsets[k] || { x: 6, y: -6 };
    svgContent += `<circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="3.6" fill="${pointColor}" stroke="#ffffff" stroke-width="1" />`;
    svgContent += `<text x="${(pt.x + off.x).toFixed(1)}" y="${(pt.y + off.y).toFixed(1)}" font-family="Times New Roman, serif" font-style="italic" font-weight="bold" font-size="${state.labelFontSize}" fill="${labelColor}">${k}</text>`;
  });

  // Auto-fit viewBox guarantees S and all vertices are NEVER clipped!
  const vb = computeAutoFitViewBox(allBoundingPts, 34, 34, 34, 28);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">${svgContent}</svg>`;
}

/**
 * Generates a crisp textbook-grade SVG string for the Function Graph y = f(x, m)
 */
export function generateFunctionGraphSvg(
  state: FunctionGraphState,
  width = 360,
  height = 280,
  isDarkTheme = false
): string {
  const cx = width / 2;
  const cy = height / 2;
  const scale = state.zoom;

  const axisColor = isDarkTheme ? '#cbd5e1' : '#1e293b';
  const gridColor = isDarkTheme ? '#334155' : '#e2e8f0';
  const m = state.enableParamM ? state.paramM : 0;

  const evalFn = (x: number): number => {
    try {
      const expr = state.expression
        .replace(/\^/g, '**')
        .replace(/(\d)([xm(])/gi, '$1*$2')
        .replace(/\b(sin|cos|tan|sqrt|abs|exp|log)\b/g, 'Math.$1');
      const fn = new Function('x', 'm', `return (${expr});`);
      const res = Number(fn(x, m));
      return Number.isFinite(res) ? res : NaN;
    } catch {
      return x * x * x - 3 * x + m;
    }
  };

  let svg = '';

  const xMaxUnits = Math.floor((cx - 16) / scale);
  const yMaxUnits = Math.floor((cy - 16) / scale);

  for (let i = -xMaxUnits; i <= xMaxUnits; i++) {
    if (i === 0) continue;
    const px = cx + i * scale;
    svg += `<line x1="${px}" y1="12" x2="${px}" y2="${height - 12}" stroke="${gridColor}" stroke-width="0.7" />`;
  }
  for (let j = -yMaxUnits; j <= yMaxUnits; j++) {
    if (j === 0) continue;
    const py = cy - j * scale;
    svg += `<line x1="12" y1="${py}" x2="${width - 12}" y2="${py}" stroke="${gridColor}" stroke-width="0.7" />`;
  }

  svg += `<line x1="12" y1="${cy}" x2="${width - 14}" y2="${cy}" stroke="${axisColor}" stroke-width="1.5" />`;
  svg += `<polygon points="${width - 10},${cy} ${width - 18},${cy - 4} ${width - 18},${cy + 4}" fill="${axisColor}" />`;
  svg += `<text x="${width - 18}" y="${cy + 16}" font-family="Times New Roman, serif" font-style="italic" font-size="14" fill="${axisColor}">x</text>`;

  svg += `<line x1="${cx}" y1="${height - 12}" x2="${cx}" y2="14" stroke="${axisColor}" stroke-width="1.5" />`;
  svg += `<polygon points="${cx},10 ${cx - 4},18 ${cx + 4},18" fill="${axisColor}" />`;
  svg += `<text x="${cx + 8}" y="20" font-family="Times New Roman, serif" font-style="italic" font-size="14" fill="${axisColor}">y</text>`;
  svg += `<text x="${cx - 13}" y="${cy + 14}" font-family="Times New Roman, serif" font-style="italic" font-size="13" fill="${axisColor}">O</text>`;

  for (let i = -xMaxUnits; i <= xMaxUnits; i++) {
    if (i === 0) continue;
    const px = cx + i * scale;
    svg += `<line x1="${px}" y1="${cy - 3}" x2="${px}" y2="${cy + 3}" stroke="${axisColor}" stroke-width="1.1" />`;
    svg += `<text x="${px}" y="${cy + 15}" text-anchor="middle" font-family="Times New Roman, serif" font-size="11" fill="${axisColor}">${i}</text>`;
  }
  for (let j = -yMaxUnits; j <= yMaxUnits; j++) {
    if (j === 0) continue;
    const py = cy - j * scale;
    svg += `<line x1="${cx - 3}" y1="${py}" x2="${cx + 3}" y2="${py}" stroke="${axisColor}" stroke-width="1.1" />`;
    svg += `<text x="${cx - 7}" y="${py + 4}" text-anchor="end" font-family="Times New Roman, serif" font-size="11" fill="${axisColor}">${j}</text>`;
  }

  if (state.showExtremaDashed && state.expression.includes('x^3')) {
    const exPts = [
      { x: -1, y: evalFn(-1) },
      { x: 1, y: evalFn(1) },
    ];
    exPts.forEach((pt) => {
      const px = cx + pt.x * scale;
      const py = cy - pt.y * scale;
      if (py >= 10 && py <= height - 10) {
        svg += `<line x1="${px}" y1="${cy}" x2="${px}" y2="${py}" stroke="${axisColor}" stroke-width="1" stroke-dasharray="3,3" opacity="0.7" />`;
        svg += `<line x1="${cx}" y1="${py}" x2="${px}" y2="${py}" stroke="${axisColor}" stroke-width="1" stroke-dasharray="3,3" opacity="0.7" />`;
        svg += `<circle cx="${px}" cy="${py}" r="2.8" fill="${state.strokeColor}" />`;
      }
    });
  }

  let pathData = '';
  let penDown = false;
  const stepPx = 2;
  for (let px = 16; px <= width - 16; px += stepPx) {
    const xVal = (px - cx) / scale;
    const yVal = evalFn(xVal);
    if (!Number.isNaN(yVal)) {
      const py = cy - yVal * scale;
      if (py >= 12 && py <= height - 12) {
        pathData += `${penDown ? 'L' : 'M'} ${px.toFixed(1)} ${py.toFixed(1)} `;
        penDown = true;
      } else {
        penDown = false;
      }
    } else {
      penDown = false;
    }
  }

  svg += `<path d="${pathData}" fill="none" stroke="${state.strokeColor}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" />`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">${svg}</svg>`;
}

/**
 * Generates a dynamic 2D Geometry SVG (Triangle ABC + Circumcircle + Orthocenter H + Altitude CK)
 */
export function generateTriangle2DSvg(
  state: Triangle2DState,
  _width = 400,
  _height = 320,
  isDarkTheme = false
): string {
  const { ax, ay, bx, by, cx, cy } = state;
  const strokeColor = isDarkTheme ? '#60a5fa' : '#1d4ed8';
  const labelColor = isDarkTheme ? '#f8fafc' : '#0f172a';

  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  const ux =
    ((ax * ax + ay * ay) * (by - cy) +
      (bx * bx + by * by) * (cy - ay) +
      (cx * cx + cy * cy) * (ay - by)) /
    (d || 1);
  const uy =
    ((ax * ax + ay * ay) * (cx - bx) +
      (bx * bx + by * by) * (ax - cx) +
      (cx * cx + cy * cy) * (bx - ax)) /
    (d || 1);
  const R = Math.hypot(ax - ux, ay - uy);

  const hx = ax + bx + cx - 2 * ux;
  const hy = ay + by + cy - 2 * uy;

  const abx = bx - ax;
  const aby = by - ay;
  const abLen2 = abx * abx + aby * aby || 1;
  const t = ((cx - ax) * abx + (cy - ay) * aby) / abLen2;
  const kx = ax + t * abx;
  const ky = ay + t * aby;

  let svg = '';

  if (state.fillTriangle) {
    svg += `<polygon points="${ax},${ay} ${bx},${by} ${cx},${cy}" fill="#3b82f6" fill-opacity="0.14" />`;
  }

  if (state.showCircumcircle) {
    svg += `<circle cx="${ux.toFixed(1)}" cy="${uy.toFixed(1)}" r="${R.toFixed(1)}" fill="none" stroke="#0284c7" stroke-width="1.5" />`;
    svg += `<circle cx="${ux.toFixed(1)}" cy="${uy.toFixed(1)}" r="3" fill="#0284c7" />`;
    svg += `<text x="${(ux + 7).toFixed(1)}" y="${(uy + 4).toFixed(1)}" font-family="Times New Roman, serif" font-style="italic" font-weight="bold" font-size="14" fill="${labelColor}">O</text>`;
  }

  if (state.showAltitudes) {
    svg += `<line x1="${cx}" y1="${cy}" x2="${kx.toFixed(1)}" y2="${ky.toFixed(1)}" stroke="${strokeColor}" stroke-width="1.3" />`;
    svg += `<circle cx="${kx.toFixed(1)}" cy="${ky.toFixed(1)}" r="3" fill="${strokeColor}" />`;
    svg += `<text x="${(kx - 4).toFixed(1)}" y="${(ky + 16).toFixed(1)}" font-family="Times New Roman, serif" font-style="italic" font-weight="bold" font-size="14" fill="${labelColor}">K</text>`;
  }

  if (state.showOrthocenter) {
    svg += `<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="3.2" fill="#e11d48" />`;
    svg += `<text x="${(hx + 7).toFixed(1)}" y="${(hy + 4).toFixed(1)}" font-family="Times New Roman, serif" font-style="italic" font-weight="bold" font-size="14" fill="${labelColor}">H</text>`;
  }

  svg += `<polygon points="${ax},${ay} ${bx},${by} ${cx},${cy}" fill="none" stroke="${strokeColor}" stroke-width="1.8" stroke-linejoin="round" />`;

  const pts = [
    { label: 'A', x: ax, y: ay, ox: -16, oy: 12 },
    { label: 'B', x: bx, y: by, ox: 9, oy: 12 },
    { label: 'C', x: cx, y: cy, ox: -4, oy: -10 },
  ];
  pts.forEach((p) => {
    svg += `<circle cx="${p.x}" cy="${p.y}" r="4.2" fill="#2563eb" stroke="#fff" stroke-width="1.2" />`;
    svg += `<text x="${p.x + p.ox}" y="${p.y + p.oy}" font-family="Times New Roman, serif" font-style="italic" font-weight="bold" font-size="15" fill="${labelColor}">${p.label}</text>`;
  });

  const boundPts: Vec2[] = [
    { x: ax, y: ay },
    { x: bx, y: by },
    { x: cx, y: cy },
  ];
  if (state.showCircumcircle && Number.isFinite(R) && R < 400) {
    boundPts.push({ x: ux - R, y: uy - R }, { x: ux + R, y: uy + R });
  }
  const vb = computeAutoFitViewBox(boundPts, 28, 28, 28, 28);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">${svg}</svg>`;
}
