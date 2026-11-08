export type WorkspaceMode = 'split' | 'editor-only' | 'board-only' | 'teaching';

export type BoardTabMode = '3d-pyramid' | 'function-graph' | '2d-triangle';

export type OptionLayout = '1-row' | '2-row' | '4-row';

export type FigureAlignment = 'left' | 'center' | 'right';

export type BoardTheme = 'white' | 'warm-paper' | 'chalkboard';

export type PenToolType = 'select' | 'pen' | 'highlighter' | 'laser' | 'eraser';

export interface InkPoint {
  x: number;
  y: number;
  pressure: number;
}

export interface InkStroke {
  id: string;
  tool: 'pen' | 'highlighter';
  color: string;
  size: number;
  points: InkPoint[];
}

export interface LinkedFigureRef {
  boardType: BoardTabMode;
  width: number; // in px, e.g., 240
  align: FigureAlignment;
}

export interface ExamQuestion {
  id: string;
  part: 'multiple-choice' | 'essay';
  number: number;
  points?: string; // e.g. "1 điểm" for essay
  stemText: string; // Supports inline LaTeX with $...$
  options?: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctOption?: 'A' | 'B' | 'C' | 'D';
  optionLayout: OptionLayout;
  linkedFigure?: LinkedFigureRef;
  // For XP-Pen Teaching Mode:
  solutionSpaceHeight: number; // 0 = collapsed, >0 = expanded height in px for writing with XP-Pen
  inkStrokes: InkStroke[];
}

export interface ExamHeaderInfo {
  department: string;
  school: string;
  examTitle: string;
  subjectAndGrade: string;
  duration: string;
}

export type Shape3DType = 'pyramid-quad' | 'prism-tri' | 'cone';

export interface Pyramid3DState {
  shape3DType?: Shape3DType;
  yaw: number; // Horizontal rotation angle in radians
  pitch: number; // Vertical tilt angle in radians
  scale: number; // Size scale
  apexHeight: number; // S height
  cutRatioM: number; // Ratio on SA (0.15 to 0.85)
  cutRatioN: number; // Ratio on SB
  cutRatioP: number; // Ratio on SC
  cutRatioQ: number; // Ratio on SD
  showCrossSection: boolean;
  showBaseFill: boolean;
  baseFillColor: string;
  sectionFillColor: string;
  sideFaceFillColor: string;
  showSideFaceFill: boolean;
  showUnfoldedSection: boolean; // Tách hình thật của thiết diện ra bên cạnh
  labelFontSize: number; // Cỡ tên điểm (12 - 24)
}

export interface FunctionGraphState {
  expression: string; // e.g., "x^3 - 3*x + m"
  displayLatex: string; // e.g., "y = x^3 - 3x + m"
  paramM: number;
  enableParamM: boolean;
  strokeColor: string;
  showExtremaDashed: boolean;
  zoom: number;
}

export interface Triangle2DState {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  cx: number;
  cy: number;
  showCircumcircle: boolean;
  showOrthocenter: boolean;
  showAltitudes: boolean;
  fillTriangle: boolean;
}
