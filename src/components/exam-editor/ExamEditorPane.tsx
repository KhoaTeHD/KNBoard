import React, { useState, useRef, useMemo } from 'react';
import {
  FileDown,
  FileText,
  Printer,
  Plus,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  PenTool,
  ChevronDown,
  Sparkles,
  BookOpen,
  Shuffle,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { MathText } from '../common/MathText';
import {
  generateFunctionGraphSvg,
  generatePyramid3DSvg,
  generateTriangle2DSvg,
} from '../../core/mathRenderer';
import { InkCanvasOverlay } from '../ink-overlay/InkCanvasOverlay';
import { BoardTabMode, ExamQuestion, OptionLayout } from '../../types/exam';
import { exportExamToDocx } from '../../core/docxExporter';

/**
 * Estimates the vertical height (in px) of a question block so the editor
 * automatically splits overflow questions onto Page 2, Page 3... just like Microsoft Word!
 */
function estimateQuestionHeight(q: ExamQuestion, hideAnswers: boolean): number {
  let h = 58; // Base question stem height
  if (q.stemText.length > 90) h += 24;
  if (q.linkedFigure) {
    // Figure height based on width * 0.78 aspect ratio + margins
    h += Math.round(q.linkedFigure.width * 0.76) + 24;
  }
  if (q.part === 'multiple-choice' && q.options) {
    if (q.optionLayout === '1-row') h += 36;
    else if (q.optionLayout === '2-row') h += 64;
    else h += 110;
  }
  if (q.solutionSpaceHeight > 0 && !hideAnswers) {
    h += q.solutionSpaceHeight + 20;
  }
  return h;
}

export const ExamEditorPane: React.FC = () => {
  const workspaceMode = useAppStore((s) => s.workspaceMode);
  const setWorkspaceMode = useAppStore((s) => s.setWorkspaceMode);
  const boardTheme = useAppStore((s) => s.boardTheme);
  const examHeader = useAppStore((s) => s.examHeader);
  const updateExamHeader = useAppStore((s) => s.updateExamHeader);
  const questions = useAppStore((s) => s.questions);
  const activeQuestionId = useAppStore((s) => s.activeQuestionId);
  const setActiveQuestionId = useAppStore((s) => s.setActiveQuestionId);
  const setActiveBoardTab = useAppStore((s) => s.setActiveBoardTab);

  const updateQuestionText = useAppStore((s) => s.updateQuestionText);
  const updateQuestionOption = useAppStore((s) => s.updateQuestionOption);
  const setQuestionOptionLayout = useAppStore((s) => s.setQuestionOptionLayout);
  const setQuestionCorrectOption = useAppStore((s) => s.setQuestionCorrectOption);
  const linkBoardFigureToQuestion = useAppStore((s) => s.linkBoardFigureToQuestion);
  const updateQuestionFigureProp = useAppStore((s) => s.updateQuestionFigureProp);
  const removeQuestionFigure = useAppStore((s) => s.removeQuestionFigure);
  const addQuestion = useAppStore((s) => s.addQuestion);
  const parseSmartInputLine = useAppStore((s) => s.parseSmartInputLine);
  const toggleQuestionSolutionSpace = useAppStore((s) => s.toggleQuestionSolutionSpace);
  const addQuestionInkStroke = useAppStore((s) => s.addQuestionInkStroke);
  const removeQuestionInkStroke = useAppStore((s) => s.removeQuestionInkStroke);
  const replaceQuestionInkStrokes = useAppStore((s) => s.replaceQuestionInkStrokes);
  const clearQuestionInk = useAppStore((s) => s.clearQuestionInk);
  const pageInkStrokes = useAppStore((s) => s.pageInkStrokes);
  const addPageInkStroke = useAppStore((s) => s.addPageInkStroke);
  const removePageInkStroke = useAppStore((s) => s.removePageInkStroke);
  const replacePageInkStrokes = useAppStore((s) => s.replacePageInkStrokes);

  const pyramid3D = useAppStore((s) => s.pyramid3D);
  const updatePyramid3D = useAppStore((s) => s.updatePyramid3D);
  const functionGraph = useAppStore((s) => s.functionGraph);
  const triangle2D = useAppStore((s) => s.triangle2D);
  const hideAnswersForStudentPdf = useAppStore((s) => s.hideAnswersForStudentPdf);
  const setHideAnswersForStudentPdf = useAppStore((s) => s.setHideAnswersForStudentPdf);
  const shuffleExamQuestionsAndOptions = useAppStore(
    (s) => s.shuffleExamQuestionsAndOptions
  );

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [selectedFigureQuestionId, setSelectedFigureQuestionId] = useState<string | null>(null);
  const [dragOverQuestionId, setDragOverQuestionId] = useState<string | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  // Live 3D rotation drag inside the exam paper
  const inline3DDragRef = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(
    null
  );

  // Word-style corner resize drag for figures inside the exam paper!
  const figureResizeDragRef = useRef<{
    questionId: string;
    startX: number;
    startWidth: number;
    direction: 1 | -1;
  } | null>(null);

  const isDark = boardTheme === 'chalkboard';

  const renderLinkedFigureSvg = (boardType: BoardTabMode) => {
    if (boardType === '3d-pyramid') {
      return generatePyramid3DSvg(pyramid3D, 360, 280, isDark);
    }
    if (boardType === 'function-graph') {
      return generateFunctionGraphSvg(functionGraph, 360, 280, isDark);
    }
    return generateTriangle2DSvg(triangle2D, 360, 280, isDark);
  };

  // Automatic Multi-Page A4 Pagination Engine!
  // Page 1 has Header Table (~145px), so usable content budget is ~760px.
  // Subsequent Pages (Page 2, Page 3...) have full usable content budget of ~890px.
  const paginatedPages = useMemo(() => {
    const pages: ExamQuestion[][] = [];
    let currentPage: ExamQuestion[] = [];
    let currentHeight = 0;

    const orderedQuestions = [
      ...questions.filter((q) => q.part === 'multiple-choice'),
      ...questions.filter((q) => q.part === 'essay'),
    ];

    orderedQuestions.forEach((q) => {
      const qHeight = estimateQuestionHeight(q, hideAnswersForStudentPdf);
      const maxBudget = pages.length === 0 ? 730 : 870;

      if (currentPage.length > 0 && currentHeight + qHeight > maxBudget) {
        pages.push(currentPage);
        currentPage = [q];
        currentHeight = qHeight;
      } else {
        currentPage.push(q);
        currentHeight += qHeight;
      }
    });

    if (currentPage.length > 0 || pages.length === 0) {
      pages.push(currentPage);
    }

    return pages;
  }, [questions, hideAnswersForStudentPdf]);

  const handleDropFigureOnQuestion = (
    e: React.DragEvent<HTMLDivElement>,
    questionId: string
  ) => {
    e.preventDefault();
    setDragOverQuestionId(null);
    const boardType = e.dataTransfer.getData('application/knboard-figure') as BoardTabMode;
    if (boardType) {
      linkBoardFigureToQuestion(questionId, boardType);
      setSelectedFigureQuestionId(questionId);
    }
  };

  const handlePrintStudentPdf = () => {
    setHideAnswersForStudentPdf(true);
    setShowDownloadMenu(false);
    window.setTimeout(() => {
      window.print();
      setHideAnswersForStudentPdf(false);
    }, 180);
  };

  const handlePrintTeacherLecturePdf = () => {
    setHideAnswersForStudentPdf(false);
    setShowDownloadMenu(false);
    window.setTimeout(() => {
      window.print();
    }, 180);
  };

  const handleExportWord = async () => {
    setShowDownloadMenu(false);
    await exportExamToDocx(examHeader, questions, {
      pyramid3D,
      functionGraph,
      triangle2D,
    });
  };

  const paperBgClass =
    boardTheme === 'chalkboard'
      ? 'bg-[#152c24] text-slate-100 border-emerald-900'
      : boardTheme === 'warm-paper'
      ? 'bg-[#fffdf6] text-slate-900 border-amber-200'
      : 'bg-white text-slate-900 border-slate-300';

  const startCornerResize = (
    e: React.PointerEvent<HTMLDivElement>,
    questionId: string,
    currentWidth: number,
    direction: 1 | -1
  ) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    figureResizeDragRef.current = {
      questionId,
      startX: e.clientX,
      startWidth: currentWidth,
      direction,
    };
  };

  const moveCornerResize = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!figureResizeDragRef.current) return;
    e.stopPropagation();
    const { questionId, startX, startWidth, direction } = figureResizeDragRef.current;
    const deltaX = (e.clientX - startX) * direction * 1.5;
    const newWidth = Math.max(140, Math.min(480, Math.round(startWidth + deltaX)));
    updateQuestionFigureProp(questionId, { width: newWidth });
  };

  const endCornerResize = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!figureResizeDragRef.current) return;
    e.stopPropagation();
    figureResizeDragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const renderQuestionBlock = (
    q: ExamQuestion,
    showSectionHeader?: 'multiple-choice' | 'essay'
  ) => {
    const isActive = activeQuestionId === q.id;
    const isEditing = editingQuestionId === q.id;
    const isFigSelected = selectedFigureQuestionId === q.id;
    const isDragOver = dragOverQuestionId === q.id;

    const gridColsClass =
      q.optionLayout === '1-row'
        ? 'grid-cols-4'
        : q.optionLayout === '2-row'
        ? 'grid-cols-2'
        : 'grid-cols-1';

    return (
      <React.Fragment key={q.id}>
        {showSectionHeader === 'multiple-choice' && (
          <div className="flex items-center justify-between mt-1 mb-1.5">
            <h3 className="font-serif font-bold text-[15px] uppercase">
              PHẦN I. TRẮC NGHIỆM
            </h3>
            <button
              onClick={() => addQuestion('multiple-choice')}
              className="px-2.5 py-1 rounded-md text-xs font-sans font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center gap-1 print:hidden"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm câu trắc nghiệm
            </button>
          </div>
        )}

        {showSectionHeader === 'essay' && (
          <div className="flex items-center justify-between mt-3 mb-1.5 pt-2 border-t border-slate-200/70">
            <h3 className="font-serif font-bold text-[15px] uppercase">
              PHẦN II. TỰ LUẬN
            </h3>
            <button
              onClick={() => addQuestion('essay')}
              className="px-2.5 py-1 rounded-md text-xs font-sans font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center gap-1 print:hidden"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm câu tự luận
            </button>
          </div>
        )}

        <div
          onClick={() => setActiveQuestionId(q.id)}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverQuestionId(q.id);
          }}
          onDragLeave={() => setDragOverQuestionId(null)}
          onDrop={(e) => handleDropFigureOnQuestion(e, q.id)}
          className={`group relative rounded-lg px-2.5 py-2 transition ${
            isDragOver
              ? 'ring-2 ring-blue-500 bg-blue-50/60'
              : isActive
              ? 'ring-1 ring-blue-300/80 bg-blue-50/15'
              : 'hover:bg-slate-50/60'
          }`}
        >
          {/* Question Stem Line */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 text-[15px] font-serif leading-relaxed">
              <span className="font-bold">
                Câu {q.number}. {q.points ? `(${q.points}) ` : ''}
              </span>
              {isEditing ? (
                <div className="mt-1 space-y-1.5 print:hidden">
                  <textarea
                    value={q.stemText}
                    onChange={(e) => updateQuestionText(q.id, e.target.value)}
                    onBlur={(e) => {
                      parseSmartInputLine(q.id, e.target.value);
                    }}
                    rows={2}
                    className="w-full p-2 rounded border border-blue-400 bg-white text-slate-900 text-sm font-sans focus:outline-none"
                    placeholder="Gõ đề bài... Có thể gõ liền A. 1/2 B. 1/4 C. 1/3 D. 1/8 ở cuối dòng để tự tách cột!"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      💡 Mẹo: Gõ công thức trong dấu <code>$...$</code> hoặc bấm nút{' '}
                      <b>∫ Công thức</b> trên thanh công cụ.
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingQuestionId(null);
                      }}
                      className="px-2.5 py-0.5 rounded bg-blue-600 text-white font-semibold"
                    >
                      Xong
                    </button>
                  </div>
                </div>
              ) : (
                <span
                  onDoubleClick={() => setEditingQuestionId(q.id)}
                  className="cursor-text"
                  title="Nháy đúp để sửa nội dung câu hỏi"
                >
                  <MathText text={q.stemText} />
                </span>
              )}
            </div>

            {/* Quick Hover Actions */}
            <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition flex items-center gap-1 shrink-0 print:hidden">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingQuestionId(isEditing ? null : q.id);
                }}
                className="px-2 py-0.5 rounded text-[11px] font-sans font-medium bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                {isEditing ? 'Đóng' : 'Sửa đề'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleQuestionSolutionSpace(q.id);
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-sans font-medium flex items-center gap-1 ${
                  q.solutionSpaceHeight > 0
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                }`}
                title="Mở giấy kẻ ô ly ngay dưới câu này để dùng bút XP-Pen viết lời giải"
              >
                <PenTool className="w-3 h-3" />
                <span>
                  {q.solutionSpaceHeight > 0 ? 'Ẩn bảng giải' : '+ Bảng giải XP-Pen'}
                </span>
              </button>
            </div>
          </div>

          {/* Live-Linked Interactive Figure with Word-Style Corner Resize Handles & Slider */}
          {q.linkedFigure && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFigureQuestionId(q.id);
                setActiveBoardTab(q.linkedFigure!.boardType);
              }}
              className={`my-2.5 flex ${
                q.linkedFigure.align === 'left'
                  ? 'justify-start'
                  : q.linkedFigure.align === 'right'
                  ? 'justify-end'
                  : 'justify-center'
              }`}
            >
              <div
                style={{ width: `${q.linkedFigure.width}px` }}
                className={`relative rounded transition select-none ${
                  isFigSelected
                    ? 'ring-2 ring-blue-600 bg-blue-50/10'
                    : 'hover:ring-1 hover:ring-blue-400'
                }`}
              >
                {/* Floating Image Alignment + Size Slider Toolbar */}
                {isFigSelected && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute -top-10 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 bg-white border border-slate-300 shadow-xl rounded-lg px-2.5 py-1 text-xs font-sans text-slate-700 whitespace-nowrap print:hidden"
                  >
                    <button
                      onClick={() => updateQuestionFigureProp(q.id, { align: 'left' })}
                      className={`px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                        q.linkedFigure.align === 'left'
                          ? 'bg-blue-50 text-blue-600 font-semibold border border-blue-200'
                          : 'hover:bg-slate-100'
                      }`}
                    >
                      <AlignLeft className="w-3 h-3" /> Trái
                    </button>
                    <button
                      onClick={() => updateQuestionFigureProp(q.id, { align: 'center' })}
                      className={`px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                        q.linkedFigure.align === 'center'
                          ? 'bg-blue-50 text-blue-600 font-semibold border border-blue-200'
                          : 'hover:bg-slate-100'
                      }`}
                    >
                      <AlignCenter className="w-3 h-3" /> Giữa
                    </button>
                    <button
                      onClick={() => updateQuestionFigureProp(q.id, { align: 'right' })}
                      className={`px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                        q.linkedFigure.align === 'right'
                          ? 'bg-blue-50 text-blue-600 font-semibold border border-blue-200'
                          : 'hover:bg-slate-100'
                      }`}
                    >
                      <AlignRight className="w-3 h-3" /> Phải
                    </button>

                    <span className="text-slate-300">|</span>

                    {/* Direct Size Controls + Slider */}
                    <button
                      onClick={() =>
                        updateQuestionFigureProp(q.id, {
                          width: Math.max(140, q.linkedFigure!.width - 25),
                        })
                      }
                      className="p-1 rounded hover:bg-slate-100 text-slate-700"
                      title="Thu nhỏ hình"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="range"
                      min="140"
                      max="460"
                      value={q.linkedFigure.width}
                      onChange={(e) =>
                        updateQuestionFigureProp(q.id, {
                          width: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-20 accent-blue-600 cursor-pointer"
                      title={`Cỡ hình: ${q.linkedFigure.width}px`}
                    />
                    <button
                      onClick={() =>
                        updateQuestionFigureProp(q.id, {
                          width: Math.min(460, q.linkedFigure!.width + 25),
                        })
                      }
                      className="p-1 rounded hover:bg-slate-100 text-slate-700"
                      title="Phóng to hình"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {q.linkedFigure.width}px
                    </span>

                    <span className="text-slate-300">|</span>

                    <button
                      onClick={() => removeQuestionFigure(q.id)}
                      className="px-1.5 py-0.5 rounded text-red-600 hover:bg-red-50 flex items-center gap-0.5 font-medium"
                    >
                      <Trash2 className="w-3 h-3" /> Xóa hình
                    </button>
                  </div>
                )}

                {/* 4 Corner Drag Resize Handles (Word-style) when selected! */}
                {isFigSelected && (
                  <>
                    {/* Top-Left Handle */}
                    <div
                      onPointerDown={(e) =>
                        startCornerResize(e, q.id, q.linkedFigure!.width, -1)
                      }
                      onPointerMove={moveCornerResize}
                      onPointerUp={endCornerResize}
                      className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-full cursor-nwse-resize z-30 shadow print:hidden"
                      title="Kéo góc để chỉnh kích thước hình"
                    />
                    {/* Top-Right Handle */}
                    <div
                      onPointerDown={(e) =>
                        startCornerResize(e, q.id, q.linkedFigure!.width, 1)
                      }
                      onPointerMove={moveCornerResize}
                      onPointerUp={endCornerResize}
                      className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-full cursor-nesw-resize z-30 shadow print:hidden"
                      title="Kéo góc để chỉnh kích thước hình"
                    />
                    {/* Bottom-Left Handle */}
                    <div
                      onPointerDown={(e) =>
                        startCornerResize(e, q.id, q.linkedFigure!.width, -1)
                      }
                      onPointerMove={moveCornerResize}
                      onPointerUp={endCornerResize}
                      className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-full cursor-nesw-resize z-30 shadow print:hidden"
                      title="Kéo góc để chỉnh kích thước hình"
                    />
                    {/* Bottom-Right Handle */}
                    <div
                      onPointerDown={(e) =>
                        startCornerResize(e, q.id, q.linkedFigure!.width, 1)
                      }
                      onPointerMove={moveCornerResize}
                      onPointerUp={endCornerResize}
                      className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-full cursor-nwse-resize z-30 shadow print:hidden"
                      title="Kéo góc để chỉnh kích thước hình"
                    />
                  </>
                )}

                {/* Auto-Fit Live SVG Figure */}
                <div
                  onPointerDown={(e) => {
                    if (q.linkedFigure?.boardType !== '3d-pyramid') return;
                    e.stopPropagation();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    inline3DDragRef.current = {
                      x: e.clientX,
                      y: e.clientY,
                      yaw: pyramid3D.yaw,
                      pitch: pyramid3D.pitch,
                    };
                  }}
                  onPointerMove={(e) => {
                    if (!inline3DDragRef.current) return;
                    const dx = e.clientX - inline3DDragRef.current.x;
                    const dy = e.clientY - inline3DDragRef.current.y;
                    updatePyramid3D({
                      yaw: inline3DDragRef.current.yaw + dx * 0.009,
                      pitch: Math.max(
                        -0.4,
                        Math.min(1.1, inline3DDragRef.current.pitch + dy * 0.007)
                      ),
                    });
                  }}
                  onPointerUp={(e) => {
                    if (!inline3DDragRef.current) return;
                    inline3DDragRef.current = null;
                    try {
                      e.currentTarget.releasePointerCapture(e.pointerId);
                    } catch {
                      // ignore
                    }
                  }}
                  className="cursor-grab active:cursor-grabbing p-1"
                  title="Bấm vào hình để hiện 4 nút kéo chỉnh cỡ ở 4 góc, hoặc giữ chuột xoay 3D trực tiếp!"
                  dangerouslySetInnerHTML={{
                    __html: renderLinkedFigureSvg(q.linkedFigure.boardType),
                  }}
                />
              </div>
            </div>
          )}

          {/* Multiple-Choice Options A, B, C, D */}
          {q.part === 'multiple-choice' && q.options && (
            <div className="mt-1.5 relative">
              <div
                className={`grid ${gridColsClass} gap-y-1.5 gap-x-4 text-[15px] font-serif`}
              >
                {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                  const isCorrect =
                    q.correctOption === optKey && !hideAnswersForStudentPdf;
                  return (
                    <div key={optKey} className="flex items-baseline gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuestionCorrectOption(q.id, optKey);
                        }}
                        title="Bấm vào chữ cái để đánh dấu đáp án đúng"
                        className={`font-bold px-1 rounded transition ${
                          isCorrect
                            ? 'text-blue-700 underline decoration-2 underline-offset-2 bg-blue-50 print:bg-transparent print:no-underline print:text-black'
                            : 'hover:bg-slate-100'
                        }`}
                      >
                        {optKey}.
                      </button>
                      {isEditing ? (
                        <input
                          type="text"
                          value={q.options![optKey]}
                          onChange={(e) =>
                            updateQuestionOption(q.id, optKey, e.target.value)
                          }
                          className="w-full px-1.5 py-0.5 text-xs font-sans border border-slate-300 rounded bg-white text-slate-900"
                        />
                      ) : (
                        <MathText text={q.options![optKey]} />
                      )}
                    </div>
                  );
                })}
              </div>

              {isActive && (
                <div className="mt-2 flex items-center justify-end gap-1 text-[11px] font-sans print:hidden">
                  <span className="text-slate-400 mr-1">Phương án:</span>
                  {(
                    [
                      { id: '1-row', label: '1 dòng' },
                      { id: '2-row', label: '2 dòng' },
                      { id: '4-row', label: '4 dòng' },
                    ] as { id: OptionLayout; label: string }[]
                  ).map((ly) => (
                    <button
                      key={ly.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuestionOptionLayout(q.id, ly.id);
                      }}
                      className={`px-2 py-0.5 rounded border transition ${
                        q.optionLayout === ly.id
                          ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {ly.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* XP-Pen Expandable Solution Grid Space */}
          {q.solutionSpaceHeight > 0 && !hideAnswersForStudentPdf && (
            <div
              style={{
                height: `${q.solutionSpaceHeight}px`,
                backgroundImage:
                  boardTheme === 'chalkboard'
                    ? 'radial-gradient(rgba(255,255,255,0.18) 1px, transparent 1px)'
                    : 'linear-gradient(to right, rgba(148,163,184,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.22) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
              className="mt-2.5 relative rounded-lg border border-dashed border-blue-300/80 overflow-hidden"
            >
              <div className="absolute top-1.5 left-2.5 z-10 flex items-center gap-2 text-[11px] font-sans text-blue-600/80 pointer-events-none">
                <span>✍️ Vùng bảng giải bài XP-Pen (Câu {q.number})</span>
              </div>
              {q.inkStrokes.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearQuestionInk(q.id);
                  }}
                  className="absolute top-1.5 right-2 z-30 px-2 py-0.5 rounded bg-white/90 hover:bg-red-50 text-red-600 border border-red-200 text-[10px] font-sans print:hidden"
                >
                  Xoá lời giải câu này
                </button>
              )}
              <InkCanvasOverlay
                strokes={q.inkStrokes}
                onAddStroke={(st) => addQuestionInkStroke(q.id, st)}
                onRemoveStroke={(sId) => removeQuestionInkStroke(q.id, sId)}
                onReplaceStrokes={(next) => replaceQuestionInkStrokes(q.id, next)}
              />
            </div>
          )}
        </div>
      </React.Fragment>
    );
  };

  // Track which question is the first multiple-choice and first essay across all pages
  const firstMcId = questions.find((q) => q.part === 'multiple-choice')?.id;
  const firstEssayId = questions.find((q) => q.part === 'essay')?.id;

  return (
    <div className="relative h-full w-full bg-slate-200/85 overflow-y-auto flex flex-col items-center py-6 px-4 gap-8">
      {/* Left Floating Action Stack */}
      <div className="fixed left-4 top-16 z-40 flex flex-col gap-1.5 w-36 print:hidden">
        <button
          onClick={() =>
            setWorkspaceMode(workspaceMode === 'split' ? 'editor-only' : 'split')
          }
          className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md flex items-center gap-1.5 transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>
            {workspaceMode === 'split' ? 'Mở rộng trang Đề' : 'Chia đôi Bảng vẽ'}
          </span>
        </button>

        <button
          onClick={() =>
            setWorkspaceMode(workspaceMode === 'teaching' ? 'split' : 'teaching')
          }
          className={`w-full py-2 px-3 rounded-xl font-semibold text-xs shadow-sm border flex items-center gap-1.5 transition ${
            workspaceMode === 'teaching'
              ? 'bg-emerald-600 text-white border-emerald-700'
              : 'bg-white hover:bg-emerald-50 text-emerald-700 border-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>
            {workspaceMode === 'teaching' ? 'Đang chữa XP-Pen' : 'Chữa đề XP-Pen'}
          </span>
        </button>

        <button
          onClick={shuffleExamQuestionsAndOptions}
          className="w-full py-2 px-3 rounded-xl bg-white hover:bg-amber-50 text-amber-800 border border-slate-200 font-semibold text-xs shadow-sm flex items-center gap-1.5 transition"
          title="Trộn ngẫu nhiên câu hỏi và đảo đáp án A, B, C, D"
        >
          <Shuffle className="w-3.5 h-3.5 text-amber-600" />
          <span>Trộn mã đề</span>
        </button>

        {/* Export Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDownloadMenu((v) => !v)}
            className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs shadow-sm border border-slate-200 flex items-center justify-between transition"
          >
            <span className="flex items-center gap-1.5">
              <FileDown className="w-3.5 h-3.5 text-blue-600" />
              <span>Tải về</span>
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showDownloadMenu && (
            <div className="mt-1 w-52 rounded-xl bg-white shadow-xl border border-slate-200 p-1.5 space-y-1 z-50">
              <button
                onClick={handleExportWord}
                className="w-full px-2.5 py-2 rounded-lg hover:bg-blue-50 text-left text-xs flex items-center gap-2 text-slate-800"
              >
                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <div className="font-semibold">File Word (.docx)</div>
                  <div className="text-[10px] text-slate-500">
                    Sửa tiếp thoải mái trong MS Word
                  </div>
                </div>
              </button>
              <button
                onClick={handlePrintStudentPdf}
                className="w-full px-2.5 py-2 rounded-lg hover:bg-emerald-50 text-left text-xs flex items-center gap-2 text-slate-800"
              >
                <Printer className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-semibold">PDF (đề phát học sinh)</div>
                  <div className="text-[10px] text-slate-500">
                    Tự động bỏ đáp án & lời giải
                  </div>
                </div>
              </button>
              <button
                onClick={handlePrintTeacherLecturePdf}
                className="w-full px-2.5 py-2 rounded-lg hover:bg-amber-50 text-left text-xs flex items-center gap-2 text-slate-800"
              >
                <PenTool className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <div className="font-semibold">PDF (kèm lời giải XP-Pen)</div>
                  <div className="text-[10px] text-slate-500">
                    Lưu bài giảng gửi cho lớp
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Render Multi-Page A4 Sheets (Trang 1, Trang 2, ...) */}
      {paginatedPages.map((pageQuestions, pageIdx) => (
        <div
          key={pageIdx}
          onClick={() => setSelectedFigureQuestionId(null)}
          style={{ pageBreakAfter: 'always' }}
          className={`relative w-full max-w-[740px] min-h-[1040px] rounded-sm shadow-xl border px-10 py-8 flex flex-col justify-between transition print:shadow-none print:border-none print:p-0 ${paperBgClass}`}
        >
          <div>
            {/* Show Official Exam Header Table ONLY on Page 1 */}
            {pageIdx === 0 && (
              <>
                <div className="border border-slate-400/80 mb-3 font-serif">
                  <div className="grid grid-cols-2 divide-x divide-slate-400/80 text-center py-2 px-3">
                    <div>
                      <input
                        type="text"
                        value={examHeader.department}
                        onChange={(e) =>
                          updateExamHeader({ department: e.target.value })
                        }
                        className="w-full text-center font-bold text-[13px] bg-transparent focus:outline-none uppercase"
                      />
                      <input
                        type="text"
                        value={examHeader.school}
                        onChange={(e) =>
                          updateExamHeader({ school: e.target.value })
                        }
                        className="w-full text-center font-bold text-[13px] bg-transparent focus:outline-none uppercase mt-0.5"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={examHeader.examTitle}
                        onChange={(e) =>
                          updateExamHeader({ examTitle: e.target.value })
                        }
                        className="w-full text-center font-bold text-[13px] bg-transparent focus:outline-none uppercase"
                      />
                      <input
                        type="text"
                        value={examHeader.subjectAndGrade}
                        onChange={(e) =>
                          updateExamHeader({ subjectAndGrade: e.target.value })
                        }
                        className="w-full text-center font-bold text-[13px] bg-transparent focus:outline-none mt-0.5"
                      />
                      <input
                        type="text"
                        value={examHeader.duration}
                        onChange={(e) =>
                          updateExamHeader({ duration: e.target.value })
                        }
                        className="w-full text-center italic text-[12px] bg-transparent focus:outline-none mt-0.5"
                      />
                    </div>
                  </div>
                </div>

                {/* Student Info Line */}
                <div className="font-serif text-[14px] mb-4 flex items-center justify-between gap-2">
                  <span>
                    Họ và tên: ........................................................................
                  </span>
                  <span>Lớp: .................</span>
                  <span>Số báo danh: ........................</span>
                </div>
              </>
            )}

            {/* Questions on this A4 Page */}
            <div className="space-y-2">
              {pageQuestions.map((q) => {
                const headerType =
                  q.id === firstMcId
                    ? 'multiple-choice'
                    : q.id === firstEssayId
                    ? 'essay'
                    : undefined;
                return renderQuestionBlock(q, headerType);
              })}
            </div>
          </div>

          {/* Page Footer (Trang 1/2, Trang 2/2...) */}
          <div className="mt-6 pt-2 border-t border-slate-200/70 flex items-center justify-between text-xs font-serif text-slate-400">
            <span>{examHeader.examTitle} — {examHeader.subjectAndGrade}</span>
            <span className="font-semibold text-slate-500">
              Trang {pageIdx + 1} / {paginatedPages.length}
            </span>
          </div>

          {/* Full-Page XP-Pen Ink Overlay: Write, circle options A/B/C/D, underline stem text, or annotate directly on the A4 Exam Page! */}
          {!hideAnswersForStudentPdf && (
            <InkCanvasOverlay
              strokes={pageInkStrokes[pageIdx] || []}
              onAddStroke={(st) => addPageInkStroke(pageIdx, st)}
              onRemoveStroke={(sId) => removePageInkStroke(pageIdx, sId)}
              onReplaceStrokes={(next) => replacePageInkStrokes(pageIdx, next)}
            />
          )}
        </div>
      ))}
    </div>
  );
};
