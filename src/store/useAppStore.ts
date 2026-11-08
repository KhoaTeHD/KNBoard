import { create } from 'zustand';
import {
  BoardTabMode,
  BoardTheme,
  ExamHeaderInfo,
  ExamQuestion,
  FigureAlignment,
  FunctionGraphState,
  InkStroke,
  OptionLayout,
  PenToolType,
  Pyramid3DState,
  Triangle2DState,
  WorkspaceMode,
} from '../types/exam';

const BLANK_INITIAL_QUESTIONS: ExamQuestion[] = [
  {
    id: 'q1',
    part: 'multiple-choice',
    number: 1,
    stemText: 'Nháy đúp vào đây để nhập nội dung câu hỏi (hoặc bấm Công thức để chèn toán học)...',
    options: {
      A: 'Phương án A',
      B: 'Phương án B',
      C: 'Phương án C',
      D: 'Phương án D',
    },
    correctOption: 'A',
    optionLayout: '1-row',
    solutionSpaceHeight: 0,
    inkStrokes: [],
  },
];

const DEMO_SAMPLE_QUESTIONS: ExamQuestion[] = [
  {
    id: 'q1',
    part: 'multiple-choice',
    number: 1,
    stemText:
      'Cho hình chóp $S.ABCD$ có đáy là hình vuông. Gọi $M, N, P, Q$ lần lượt là trung điểm của $SA, SB, SC, SD$. Tỉ số diện tích của $MNPQ$ và $ABCD$ bằng',
    options: {
      A: '$\\frac{1}{2}$',
      B: '$\\frac{1}{4}$',
      C: '$\\frac{1}{3}$',
      D: '$\\frac{1}{8}$',
    },
    correctOption: 'B',
    optionLayout: '1-row',
    linkedFigure: {
      boardType: '3d-pyramid',
      width: 245,
      align: 'center',
    },
    solutionSpaceHeight: 0,
    inkStrokes: [],
  },
  {
    id: 'q2',
    part: 'multiple-choice',
    number: 2,
    stemText:
      'Cho hàm số $y = x^3 - 3x$ có đồ thị như hình vẽ. Hàm số đã cho đồng biến trên khoảng nào dưới đây?',
    options: {
      A: '$(-1; 1)$',
      B: '$(1; +\\infty)$',
      C: '$(-\\infty; 1)$',
      D: '$(-2; 2)$',
    },
    correctOption: 'B',
    optionLayout: '1-row',
    linkedFigure: {
      boardType: 'function-graph',
      width: 250,
      align: 'center',
    },
    solutionSpaceHeight: 0,
    inkStrokes: [],
  },
  {
    id: 'q3',
    part: 'essay',
    number: 3,
    points: '1 điểm',
    stemText: 'Giải hệ phương trình $\\begin{cases} x + y = 3 \\\\ x - y = 1 \\end{cases}$',
    optionLayout: '1-row',
    solutionSpaceHeight: 0,
    inkStrokes: [],
  },
];

interface AppState {
  workspaceMode: WorkspaceMode;
  activeBoardTab: BoardTabMode;
  boardTheme: BoardTheme;
  activeQuestionId: string | null;
  isMathModalOpen: boolean;
  hideAnswersForStudentPdf: boolean;

  // XP-Pen & Live Teaching State
  penTool: PenToolType;
  penColor: string;
  penSize: number;
  eraserSize: number;
  shapeSnapEnabled: boolean;
  boardInkStrokes: InkStroke[];
  pageInkStrokes: Record<number, InkStroke[]>;

  // Exam Document Header & Questions
  examHeader: ExamHeaderInfo;
  questions: ExamQuestion[];

  // Interactive Math Board States
  pyramid3D: Pyramid3DState;
  functionGraph: FunctionGraphState;
  triangle2D: Triangle2DState;

  // Actions
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  setActiveBoardTab: (tab: BoardTabMode) => void;
  setBoardTheme: (theme: BoardTheme) => void;
  setActiveQuestionId: (id: string | null) => void;
  setMathModalOpen: (open: boolean) => void;
  setHideAnswersForStudentPdf: (hide: boolean) => void;

  // Document Presets
  resetToBlankExam: () => void;
  loadSampleDemoExam: () => void;

  // XP-Pen Actions
  setPenTool: (tool: PenToolType) => void;
  setPenColor: (color: string) => void;
  setPenSize: (size: number) => void;
  setEraserSize: (size: number) => void;
  setShapeSnapEnabled: (enabled: boolean) => void;
  addBoardInkStroke: (stroke: InkStroke) => void;
  removeBoardInkStroke: (id: string) => void;
  replaceBoardInkStrokes: (strokes: InkStroke[]) => void;
  clearBoardInk: () => void;
  addPageInkStroke: (pageIdx: number, stroke: InkStroke) => void;
  removePageInkStroke: (pageIdx: number, id: string) => void;
  replacePageInkStrokes: (pageIdx: number, strokes: InkStroke[]) => void;
  clearAllExamInk: () => void;

  // Question Actions
  updateExamHeader: (partial: Partial<ExamHeaderInfo>) => void;
  updateQuestionText: (id: string, stemText: string) => void;
  updateQuestionOption: (id: string, key: 'A' | 'B' | 'C' | 'D', val: string) => void;
  setQuestionOptionLayout: (id: string, layout: OptionLayout) => void;
  setQuestionCorrectOption: (id: string, opt: 'A' | 'B' | 'C' | 'D') => void;
  linkBoardFigureToQuestion: (questionId: string, boardType: BoardTabMode) => void;
  updateQuestionFigureProp: (
    questionId: string,
    partial: { width?: number; align?: FigureAlignment }
  ) => void;
  removeQuestionFigure: (questionId: string) => void;
  addQuestion: (part: 'multiple-choice' | 'essay') => void;
  deleteQuestion: (questionId: string) => void;
  parseSmartInputLine: (questionId: string, rawLine: string) => void;
  insertFormulaIntoActiveQuestion: (latex: string) => void;
  toggleQuestionSolutionSpace: (questionId: string) => void;
  addQuestionInkStroke: (questionId: string, stroke: InkStroke) => void;
  removeQuestionInkStroke: (questionId: string, strokeId: string) => void;
  replaceQuestionInkStrokes: (questionId: string, strokes: InkStroke[]) => void;
  clearQuestionInk: (questionId: string) => void;

  // Math Board Actions
  updatePyramid3D: (partial: Partial<Pyramid3DState>) => void;
  resetPyramid3DView: () => void;
  updateFunctionGraph: (partial: Partial<FunctionGraphState>) => void;
  updateTriangle2D: (partial: Partial<Triangle2DState>) => void;
  shuffleExamQuestionsAndOptions: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  workspaceMode: 'split',
  activeBoardTab: '3d-pyramid',
  boardTheme: 'white',
  activeQuestionId: 'q1',
  isMathModalOpen: false,
  hideAnswersForStudentPdf: false,

  penTool: 'select',
  penColor: '#dc2626',
  penSize: 2.8,
  eraserSize: 16,
  shapeSnapEnabled: true,
  boardInkStrokes: [],
  pageInkStrokes: {},

  examHeader: {
    department: 'SỞ GIÁO DỤC VÀ ĐÀO TẠO ...',
    school: 'TRƯỜNG THPT ...',
    examTitle: 'ĐỀ KIỂM TRA ĐỊNH KỲ',
    subjectAndGrade: 'Môn: Toán — Lớp 12',
    duration: 'Thời gian làm bài: 90 phút',
  },

  // Start clean without cluttered demo seed data!
  questions: BLANK_INITIAL_QUESTIONS,

  pyramid3D: {
    shape3DType: 'pyramid-quad',
    yaw: 0.18,
    pitch: 0.34,
    scale: 112,
    apexHeight: 1.75,
    cutRatioM: 0.5,
    cutRatioN: 0.5,
    cutRatioP: 0.5,
    cutRatioQ: 0.5,
    showCrossSection: true,
    showBaseFill: true,
    baseFillColor: '#f59e0b',
    sectionFillColor: '#fb923c',
    sideFaceFillColor: '#60a5fa',
    showSideFaceFill: true,
    showUnfoldedSection: false,
    labelFontSize: 15,
  },

  functionGraph: {
    expression: 'x^3 - 3*x + m',
    displayLatex: 'y = x^3 - 3x',
    paramM: 0,
    enableParamM: false,
    strokeColor: '#dc2626',
    showExtremaDashed: true,
    zoom: 28,
  },

  triangle2D: {
    ax: 95,
    ay: 245,
    bx: 315,
    by: 245,
    cx: 175,
    cy: 65,
    showCircumcircle: true,
    showOrthocenter: true,
    showAltitudes: true,
    fillTriangle: true,
  },

  setWorkspaceMode: (workspaceMode) =>
    set((state) => ({
      workspaceMode,
      penTool:
        workspaceMode === 'teaching' && state.penTool === 'select'
          ? 'pen'
          : state.penTool,
    })),
  setActiveBoardTab: (activeBoardTab) => set({ activeBoardTab }),
  setBoardTheme: (boardTheme) => set({ boardTheme }),
  setActiveQuestionId: (activeQuestionId) => set({ activeQuestionId }),
  setMathModalOpen: (isMathModalOpen) => set({ isMathModalOpen }),
  setHideAnswersForStudentPdf: (hideAnswersForStudentPdf) =>
    set({ hideAnswersForStudentPdf }),

  resetToBlankExam: () =>
    set({
      questions: [
        {
          id: `q_${Date.now()}`,
          part: 'multiple-choice',
          number: 1,
          stemText:
            'Nháy đúp vào đây để nhập nội dung câu hỏi (hoặc bấm Công thức để chèn toán học)...',
          options: {
            A: 'Phương án A',
            B: 'Phương án B',
            C: 'Phương án C',
            D: 'Phương án D',
          },
          correctOption: 'A',
          optionLayout: '1-row',
          solutionSpaceHeight: 0,
          inkStrokes: [],
        },
      ],
      pageInkStrokes: {},
      boardInkStrokes: [],
    }),

  loadSampleDemoExam: () =>
    set({
      questions: DEMO_SAMPLE_QUESTIONS.map((q) => ({ ...q })),
      activeQuestionId: 'q1',
    }),

  setPenTool: (penTool) => set({ penTool }),
  setPenColor: (penColor) => set({ penColor }),
  setPenSize: (penSize) => set({ penSize }),
  setEraserSize: (eraserSize) => set({ eraserSize }),
  setShapeSnapEnabled: (shapeSnapEnabled) => set({ shapeSnapEnabled }),
  addBoardInkStroke: (stroke) =>
    set((s) => ({ boardInkStrokes: [...s.boardInkStrokes, stroke] })),
  removeBoardInkStroke: (id) =>
    set((s) => ({
      boardInkStrokes: s.boardInkStrokes.filter((st) => st.id !== id),
    })),
  replaceBoardInkStrokes: (boardInkStrokes) => set({ boardInkStrokes }),
  clearBoardInk: () => set({ boardInkStrokes: [] }),
  addPageInkStroke: (pageIdx, stroke) =>
    set((s) => ({
      pageInkStrokes: {
        ...s.pageInkStrokes,
        [pageIdx]: [...(s.pageInkStrokes[pageIdx] || []), stroke],
      },
    })),
  removePageInkStroke: (pageIdx, id) =>
    set((s) => ({
      pageInkStrokes: {
        ...s.pageInkStrokes,
        [pageIdx]: (s.pageInkStrokes[pageIdx] || []).filter((st) => st.id !== id),
      },
    })),
  replacePageInkStrokes: (pageIdx, strokes) =>
    set((s) => ({
      pageInkStrokes: {
        ...s.pageInkStrokes,
        [pageIdx]: strokes,
      },
    })),
  clearAllExamInk: () =>
    set((s) => ({
      pageInkStrokes: {},
      boardInkStrokes: [],
      questions: s.questions.map((q) => ({ ...q, inkStrokes: [] })),
    })),

  updateExamHeader: (partial) =>
    set((s) => ({ examHeader: { ...s.examHeader, ...partial } })),

  updateQuestionText: (id, stemText) =>
    set((s) => ({
      questions: s.questions.map((q) => (q.id === id ? { ...q, stemText } : q)),
    })),

  updateQuestionOption: (id, key, val) =>
    set((s) => ({
      questions: s.questions.map((q) =>
        q.id === id && q.options
          ? { ...q, options: { ...q.options, [key]: val } }
          : q
      ),
    })),

  setQuestionOptionLayout: (id, optionLayout) =>
    set((s) => ({
      questions: s.questions.map((q) =>
        q.id === id ? { ...q, optionLayout } : q
      ),
    })),

  setQuestionCorrectOption: (id, correctOption) =>
    set((s) => ({
      questions: s.questions.map((q) =>
        q.id === id ? { ...q, correctOption } : q
      ),
    })),

  linkBoardFigureToQuestion: (questionId, boardType) =>
    set((s) => ({
      questions: s.questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              linkedFigure: {
                boardType,
                width: q.linkedFigure?.width || 245,
                align: q.linkedFigure?.align || 'center',
              },
            }
          : q
      ),
    })),

  updateQuestionFigureProp: (questionId, partial) =>
    set((s) => ({
      questions: s.questions.map((q) =>
        q.id === questionId && q.linkedFigure
          ? { ...q, linkedFigure: { ...q.linkedFigure, ...partial } }
          : q
      ),
    })),

  removeQuestionFigure: (questionId) =>
    set((s) => ({
      questions: s.questions.map((q) =>
        q.id === questionId ? { ...q, linkedFigure: undefined } : q
      ),
    })),

  addQuestion: (part) =>
    set((s) => {
      const nextNum = s.questions.length + 1;
      const newId = `q_${Date.now()}`;
      const newQ: ExamQuestion =
        part === 'multiple-choice'
          ? {
              id: newId,
              part: 'multiple-choice',
              number: nextNum,
              stemText:
                'Nháy đúp để nhập câu hỏi (có thể gõ liền A. ... B. ... C. ... D. ... ở cuối dòng):',
              options: {
                A: 'Phương án A',
                B: 'Phương án B',
                C: 'Phương án C',
                D: 'Phương án D',
              },
              correctOption: 'A',
              optionLayout: '1-row',
              solutionSpaceHeight: 0,
              inkStrokes: [],
            }
          : {
              id: newId,
              part: 'essay',
              number: nextNum,
              points: '1 điểm',
              stemText: 'Nháy đúp để nhập câu hỏi tự luận...',
              optionLayout: '1-row',
              solutionSpaceHeight: 0,
              inkStrokes: [],
            };
      return {
        questions: [...s.questions, newQ],
        activeQuestionId: newId,
      };
    }),

  deleteQuestion: (questionId) =>
    set((s) => {
      const filtered = s.questions.filter((q) => q.id !== questionId);
      const renumbered = filtered.map((q, idx) => ({ ...q, number: idx + 1 }));
      return {
        questions: renumbered,
        activeQuestionId: renumbered[0]?.id || null,
      };
    }),

  parseSmartInputLine: (questionId, rawLine) =>
    set((s) => {
      const regex = /A\.\s*(.+?)\s+B\.\s*(.+?)\s+C\.\s*(.+?)\s+D\.\s*(.+)$/i;
      const match = rawLine.match(regex);
      if (!match) return s;
      const [, optA, optB, optC, optD] = match;
      const cleanStem = rawLine.replace(regex, '').trim();
      return {
        questions: s.questions.map((q) =>
          q.id === questionId
            ? {
                ...q,
                stemText: cleanStem || q.stemText,
                options: {
                  A: optA.trim(),
                  B: optB.trim(),
                  C: optC.trim(),
                  D: optD.trim(),
                },
              }
            : q
        ),
      };
    }),

  insertFormulaIntoActiveQuestion: (latex) =>
    set((s) => {
      const targetId = s.activeQuestionId || s.questions[0]?.id;
      if (!targetId) return s;
      return {
        questions: s.questions.map((q) =>
          q.id === targetId
            ? { ...q, stemText: `${q.stemText} $${latex}$ ` }
            : q
        ),
        isMathModalOpen: false,
      };
    }),

  toggleQuestionSolutionSpace: (questionId) =>
    set((s) => ({
      questions: s.questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              solutionSpaceHeight: q.solutionSpaceHeight > 0 ? 0 : 210,
            }
          : q
      ),
    })),

  addQuestionInkStroke: (questionId, stroke) =>
    set((s) => ({
      questions: s.questions.map((q) =>
        q.id === questionId
          ? { ...q, inkStrokes: [...q.inkStrokes, stroke] }
          : q
      ),
    })),

  removeQuestionInkStroke: (questionId, strokeId) =>
    set((s) => ({
      questions: s.questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              inkStrokes: q.inkStrokes.filter((st) => st.id !== strokeId),
            }
          : q
      ),
    })),

  replaceQuestionInkStrokes: (questionId, strokes) =>
    set((s) => ({
      questions: s.questions.map((q) =>
        q.id === questionId ? { ...q, inkStrokes: strokes } : q
      ),
    })),

  clearQuestionInk: (questionId) =>
    set((s) => ({
      questions: s.questions.map((q) =>
        q.id === questionId ? { ...q, inkStrokes: [] } : q
      ),
    })),

  updatePyramid3D: (partial) =>
    set((s) => ({ pyramid3D: { ...s.pyramid3D, ...partial } })),

  resetPyramid3DView: () =>
    set((s) => ({
      pyramid3D: {
        ...s.pyramid3D,
        yaw: 0.18,
        pitch: 0.34,
        scale: 112,
        apexHeight: 1.75,
      },
    })),

  updateFunctionGraph: (partial) =>
    set((s) => ({ functionGraph: { ...s.functionGraph, ...partial } })),

  updateTriangle2D: (partial) =>
    set((s) => ({ triangle2D: { ...s.triangle2D, ...partial } })),

  shuffleExamQuestionsAndOptions: () =>
    set((s) => {
      const mc = s.questions.filter((q) => q.part === 'multiple-choice');
      const essay = s.questions.filter((q) => q.part === 'essay');

      const shuffledMc = [...mc]
        .sort(() => Math.random() - 0.5)
        .map((q, idx) => {
          if (!q.options) return { ...q, number: idx + 1 };
          const entries: {
            key: 'A' | 'B' | 'C' | 'D';
            val: string;
            isCorrect: boolean;
          }[] = (['A', 'B', 'C', 'D'] as const).map((k) => ({
            key: k,
            val: q.options![k],
            isCorrect: q.correctOption === k,
          }));
          entries.sort(() => Math.random() - 0.5);
          const keys: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
          const newOptions = {
            A: entries[0].val,
            B: entries[1].val,
            C: entries[2].val,
            D: entries[3].val,
          };
          const newCorrectIdx = entries.findIndex((e) => e.isCorrect);
          return {
            ...q,
            number: idx + 1,
            options: newOptions,
            correctOption:
              newCorrectIdx >= 0 ? keys[newCorrectIdx] : q.correctOption,
          };
        });

      const renumberedEssay = essay.map((q, idx) => ({
        ...q,
        number: shuffledMc.length + idx + 1,
      }));

      return {
        questions: [...shuffledMc, ...renumberedEssay],
      };
    }),
}));
