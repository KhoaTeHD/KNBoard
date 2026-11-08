import React, { useMemo, useRef, useState } from 'react';
import {
  Rotate3D,
  Move,
  Palette,
  Layers,
  Copy,
  SendToBack,
  Sliders,
  Sparkles,
  Check,
  Maximize2,
  Trash2,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import {
  generateFunctionGraphSvg,
  generatePyramid3DSvg,
  generateTriangle2DSvg,
} from '../../core/mathRenderer';
import { InkCanvasOverlay } from '../ink-overlay/InkCanvasOverlay';
import { BoardTabMode } from '../../types/exam';

const COLOR_SWATCHES = [
  '#f59e0b',
  '#fb923c',
  '#ef4444',
  '#3b82f6',
  '#10b981',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
];

export const MathBoardPane: React.FC = () => {
  const activeBoardTab = useAppStore((s) => s.activeBoardTab);
  const setActiveBoardTab = useAppStore((s) => s.setActiveBoardTab);
  const boardTheme = useAppStore((s) => s.boardTheme);
  const activeQuestionId = useAppStore((s) => s.activeQuestionId);
  const questions = useAppStore((s) => s.questions);
  const linkFigure = useAppStore((s) => s.linkBoardFigureToQuestion);

  const pyramid3D = useAppStore((s) => s.pyramid3D);
  const updatePyramid3D = useAppStore((s) => s.updatePyramid3D);
  const resetPyramid3DView = useAppStore((s) => s.resetPyramid3DView);

  const functionGraph = useAppStore((s) => s.functionGraph);
  const updateFunctionGraph = useAppStore((s) => s.updateFunctionGraph);

  const triangle2D = useAppStore((s) => s.triangle2D);
  const updateTriangle2D = useAppStore((s) => s.updateTriangle2D);

  const boardInkStrokes = useAppStore((s) => s.boardInkStrokes);
  const addBoardInkStroke = useAppStore((s) => s.addBoardInkStroke);
  const removeBoardInkStroke = useAppStore((s) => s.removeBoardInkStroke);
  const replaceBoardInkStrokes = useAppStore((s) => s.replaceBoardInkStrokes);
  const clearBoardInk = useAppStore((s) => s.clearBoardInk);
  const penTool = useAppStore((s) => s.penTool);

  const [isRotating3D, setIsRotating3D] = useState(false);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [justTransferred, setJustTransferred] = useState(false);

  const dragStartRef = useRef<{
    x: number;
    y: number;
    yaw: number;
    pitch: number;
    cx: number;
    cy: number;
  } | null>(null);

  const isDark = boardTheme === 'chalkboard';

  // Generate SVG on-demand only when state changes (0% idle CPU!)
  const renderedSvg = useMemo(() => {
    if (activeBoardTab === '3d-pyramid') {
      return generatePyramid3DSvg(pyramid3D, 540, 420, isDark);
    }
    if (activeBoardTab === 'function-graph') {
      return generateFunctionGraphSvg(functionGraph, 500, 390, isDark);
    }
    return generateTriangle2DSvg(triangle2D, 500, 390, isDark);
  }, [activeBoardTab, pyramid3D, functionGraph, triangle2D, isDark]);

  // Interactive Pointer Drag for 3D Rotation or 2D Vertex C Drag
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (penTool !== 'select') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      yaw: pyramid3D.yaw,
      pitch: pyramid3D.pitch,
      cx: triangle2D.cx,
      cy: triangle2D.cy,
    };
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current || penTool !== 'select') return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (activeBoardTab === '3d-pyramid') {
      updatePyramid3D({
        yaw: dragStartRef.current.yaw + dx * 0.0085,
        pitch: Math.max(-0.45, Math.min(1.15, dragStartRef.current.pitch + dy * 0.007)),
      });
    } else if (activeBoardTab === '2d-triangle') {
      updateTriangle2D({
        cx: Math.max(50, Math.min(350, dragStartRef.current.cx + dx * 0.85)),
        cy: Math.max(35, Math.min(220, dragStartRef.current.cy + dy * 0.85)),
      });
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    dragStartRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleDragStartToExam = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('application/knboard-figure', activeBoardTab);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleQuickSendToExam = (targetQuestionId?: string) => {
    const qId =
      targetQuestionId ||
      activeQuestionId ||
      (activeBoardTab === 'function-graph' ? 'q2' : 'q1');
    linkFigure(qId, activeBoardTab);
    setJustTransferred(true);
    window.setTimeout(() => setJustTransferred(false), 1400);
  };

  const bgThemeClass =
    boardTheme === 'chalkboard'
      ? 'bg-[#122620] text-slate-100'
      : boardTheme === 'warm-paper'
      ? 'bg-[#fdf8ee] text-slate-900'
      : 'bg-white text-slate-900';

  return (
    <div className={`relative h-full w-full flex flex-col select-none overflow-hidden ${bgThemeClass}`}>
      {/* Board Top Sub-Toolbar (Responsive, never wraps text into vertical columns) */}
      <div className="min-h-[40px] px-2.5 py-1 border-b border-slate-200/80 bg-white/95 text-slate-800 flex flex-wrap items-center justify-between gap-1.5 z-30 text-xs">
        {/* Left: Geometry Mode Tabs */}
        <div className="flex items-center gap-1 shrink-0">
          {(
            [
              { id: '3d-pyramid', label: 'Không gian 3D' },
              { id: 'function-graph', label: 'Đồ thị f(x)' },
              { id: '2d-triangle', label: 'Hình phẳng 2D' },
            ] as { id: BoardTabMode; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveBoardTab(tab.id)}
              className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap shrink-0 transition ${
                activeBoardTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right: Quick Tools (Tô màu, Cỡ tên điểm, Xoá nét bút) */}
        <div className="flex flex-wrap items-center gap-1.5 relative">
          {activeBoardTab === '3d-pyramid' && (
            <>
              <select
                value={pyramid3D.shape3DType || 'pyramid-quad'}
                onChange={(e) =>
                  updatePyramid3D({
                    shape3DType: e.target.value as 'pyramid-quad' | 'prism-tri' | 'cone',
                  })
                }
                className="px-2 py-1 rounded border border-slate-200 bg-slate-50 font-semibold text-slate-700 focus:outline-none whitespace-nowrap shrink-0"
                title="Chọn khối hình học không gian 3D"
              >
                <option value="pyramid-quad">Khối chóp S.ABCD</option>
                <option value="prism-tri">Lăng trụ ABC.A'B'C'</option>
                <option value="cone">Khối nón S.OAB</option>
              </select>

              <button
                onClick={() => setShowColorPalette((v) => !v)}
                className="px-2 py-1 rounded hover:bg-slate-100 flex items-center gap-1 border border-slate-200 whitespace-nowrap shrink-0"
                title="Tô màu mặt đáy & thiết diện"
              >
                <Palette className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Tô màu</span>
              </button>

              <button
                onClick={() =>
                  updatePyramid3D({ showCrossSection: !pyramid3D.showCrossSection })
                }
                className={`px-2 py-1 rounded flex items-center gap-1 border whitespace-nowrap shrink-0 ${
                  pyramid3D.showCrossSection
                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                    : 'border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>Thiết diện</span>
              </button>
            </>
          )}

          {/* Font size & Label Settings Menu */}
          <button
            onClick={() => setShowSettingsMenu((v) => !v)}
            className="px-2 py-1 rounded hover:bg-slate-100 flex items-center gap-1 border border-slate-200 whitespace-nowrap shrink-0"
            title="Cài đặt cỡ tên điểm (Tự động cập nhật sang đề thi)"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span>Cỡ chữ: {pyramid3D.labelFontSize}px</span>
          </button>

          {boardInkStrokes.length > 0 && (
            <button
              onClick={clearBoardInk}
              className="px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1 border border-red-200 whitespace-nowrap shrink-0"
              title="Xoá chữ viết tay XP-Pen trên bảng vẽ"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>Xoá mực</span>
            </button>
          )}

          {/* Color Swatch Popover */}
          {showColorPalette && (
            <div className="absolute top-9 right-24 bg-white border border-slate-200 rounded-xl shadow-xl p-3 w-56 z-50">
              <div className="text-[11px] font-semibold text-slate-500 mb-1.5">
                Màu thiết diện (MNPQ):
              </div>
              <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                {COLOR_SWATCHES.map((c) => (
                  <button
                    key={c}
                    onClick={() => updatePyramid3D({ sectionFillColor: c })}
                    className="h-6 rounded border border-slate-300 transition transform hover:scale-105"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 mb-1.5">
                Màu mặt đáy (ABCD):
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {COLOR_SWATCHES.map((c) => (
                  <button
                    key={c}
                    onClick={() => updatePyramid3D({ baseFillColor: c })}
                    className="h-6 rounded border border-slate-300 transition transform hover:scale-105"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Label Font Size Popover (Matches 01:08 in Video: Live-syncs with Exam Figure!) */}
          {showSettingsMenu && (
            <div className="absolute top-9 right-0 bg-white border border-slate-200 rounded-xl shadow-xl p-3 w-60 z-50 space-y-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase">
                Cỡ tên điểm (Tự đồng bộ sang Đề)
              </div>
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() =>
                    updatePyramid3D({
                      labelFontSize: Math.max(11, pyramid3D.labelFontSize - 2),
                    })
                  }
                  className="flex-1 py-1.5 rounded bg-slate-100 hover:bg-slate-200 font-semibold"
                >
                  A- Nhỏ hơn
                </button>
                <button
                  onClick={() =>
                    updatePyramid3D({
                      labelFontSize: Math.min(24, pyramid3D.labelFontSize + 2),
                    })
                  }
                  className="flex-1 py-1.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold"
                >
                  A+ To hơn
                </button>
              </div>
              <div className="pt-1 border-t border-slate-100">
                <label className="text-[11px] text-slate-500 block mb-1">
                  Tỉ lệ cắt thiết diện (SA, SB, SC, SD):{' '}
                  {Math.round(pyramid3D.cutRatioM * 100)}%
                </label>
                <input
                  type="range"
                  min="0.2"
                  max="0.8"
                  step="0.05"
                  value={pyramid3D.cutRatioM}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    updatePyramid3D({
                      cutRatioM: v,
                      cutRatioN: v,
                      cutRatioP: v,
                      cutRatioQ: v,
                    });
                  }}
                  className="w-full accent-blue-600"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Coordinate Grid Canvas Area */}
      <div
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        className="relative flex-1 flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage:
            boardTheme === 'chalkboard'
              ? 'radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)'
              : 'linear-gradient(to right, rgba(226,232,240,0.7) 1px, transparent 1px), linear-gradient(to bottom, rgba(226,232,240,0.7) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        {/* Function Graph Parameter Slider m / Formula Editor Floating Box */}
        {activeBoardTab === 'function-graph' && (
          <div className="absolute top-3 left-3 z-30 bg-white/95 backdrop-blur border border-slate-200 rounded-xl shadow-lg p-3 w-72 text-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">
                Hàm số $y = f(x, m)$
              </span>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={functionGraph.enableParamM}
                  onChange={(e) =>
                    updateFunctionGraph({
                      enableParamM: e.target.checked,
                      displayLatex: e.target.checked
                        ? 'y = x^3 - 3x + m'
                        : 'y = x^3 - 3x',
                    })
                  }
                  className="rounded accent-blue-600"
                />
                <span className="font-medium text-blue-700">Tham số $m$</span>
              </label>
            </div>
            <input
              type="text"
              value={functionGraph.expression}
              onChange={(e) => updateFunctionGraph({ expression: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-slate-300 focus:border-blue-500 focus:outline-none"
              placeholder="x^3 - 3*x + m"
            />
            {functionGraph.enableParamM && (
              <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-2">
                <div className="flex items-center justify-between text-xs font-semibold text-blue-900 mb-1">
                  <span>Thanh trượt tham số: m = {functionGraph.paramM.toFixed(1)}</span>
                  <button
                    onClick={() => updateFunctionGraph({ paramM: 0 })}
                    className="text-[11px] text-blue-600 hover:underline"
                  >
                    Về 0
                  </button>
                </div>
                <input
                  type="range"
                  min="-4"
                  max="4"
                  step="0.1"
                  value={functionGraph.paramM}
                  onChange={(e) =>
                    updateFunctionGraph({ paramM: parseFloat(e.target.value) })
                  }
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            )}
          </div>
        )}

        {/* 2D Geometry Hint Banner */}
        {activeBoardTab === '2d-triangle' && (
          <div className="absolute top-3 left-3 z-30 bg-white/95 border border-slate-200 rounded-xl shadow-md px-3 py-2 text-xs text-slate-700 flex items-center gap-3">
            <span className="font-medium">
              💡 Kéo đỉnh <b>C</b> trên bảng: Đường tròn ngoại tiếp, Trực tâm <b>H</b>, Đường cao <b>CK</b> tự chạy theo!
            </span>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={triangle2D.showCircumcircle}
                onChange={(e) =>
                  updateTriangle2D({ showCircumcircle: e.target.checked })
                }
              />
              <span>Đường tròn (O)</span>
            </label>
          </div>
        )}

        {/* Draggable Figure Container for Drag-and-Drop to Left Exam Pane */}
        <div
          draggable={penTool === 'select'}
          onDragStart={handleDragStartToExam}
          className={`w-[92%] h-[88%] flex items-center justify-center transition ${
            penTool === 'select' ? 'cursor-grab active:cursor-grabbing' : ''
          }`}
          title="Giữ chuột để xoay 3D hoặc kéo thả hình sang trang Đề Thi bên trái"
        >
          <div
            className="w-full h-full flex items-center justify-center pointer-events-none"
            dangerouslySetInnerHTML={{ __html: renderedSvg }}
          />
        </div>

        {/* XP-Pen Ink Layer directly on top of the Math Board */}
        <InkCanvasOverlay
          strokes={boardInkStrokes}
          onAddStroke={addBoardInkStroke}
          onRemoveStroke={removeBoardInkStroke}
          onReplaceStrokes={replaceBoardInkStrokes}
        />

        {/* Bottom Left Contextual Action Bar (Matches 00:01 & 01:34 in Video!) */}
        <div className="absolute bottom-3 left-3 z-30 flex flex-wrap items-center gap-1.5">
          {activeBoardTab === '3d-pyramid' && (
            <>
              <button
                onClick={() => setIsRotating3D((v) => !v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition ${
                  isRotating3D
                    ? 'bg-slate-900 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Rotate3D className="w-3.5 h-3.5" />
                <span>{isRotating3D ? 'Đang xoay khối 3D (Kéo chuột)' : 'Xoay khối 3D'}</span>
              </button>

              <button
                onClick={() =>
                  updatePyramid3D({
                    showUnfoldedSection: !pyramid3D.showUnfoldedSection,
                  })
                }
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition ${
                  pyramid3D.showUnfoldedSection
                    ? 'bg-amber-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Tách hình ra thật</span>
              </button>

              <button
                onClick={() =>
                  updatePyramid3D({
                    showSideFaceFill: !pyramid3D.showSideFaceFill,
                  })
                }
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-sm"
              >
                Tô mặt bên
              </button>

              <button
                onClick={resetPyramid3DView}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-sm"
              >
                Góc ban đầu
              </button>
            </>
          )}
        </div>

        {/* Bottom Right Drag-to-Exam Guide Box (Matches the Dark Tooltip at 00:01 in Video!) */}
        <div className="absolute bottom-3 right-3 z-30 w-64 rounded-xl bg-slate-900/95 text-white p-3 shadow-xl border border-slate-700">
          <p className="text-[11px] leading-relaxed text-slate-300 mb-2">
            Vẽ hình trên bảng bên phải, giữ chuột để xoay 3D — kéo thả hình sang câu hỏi bên trái, hoặc bấm nút dưới để chèn ngay:
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleQuickSendToExam()}
              className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-blue-600 border border-slate-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              {justTransferred ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Đã đồng bộ sang Đề!</span>
                </>
              ) : (
                <>
                  <SendToBack className="w-3.5 h-3.5" />
                  <span>← Kéo hình sang trang</span>
                </>
              )}
            </button>
          </div>
          {/* Quick question target selector */}
          <div className="mt-1.5 flex items-center gap-1 overflow-x-auto pt-1 border-t border-slate-800">
            <span className="text-[10px] text-slate-400 shrink-0">Gắn vào:</span>
            {questions.slice(0, 4).map((q) => (
              <button
                key={q.id}
                onClick={() => handleQuickSendToExam(q.id)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition ${
                  activeQuestionId === q.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Câu {q.number}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
