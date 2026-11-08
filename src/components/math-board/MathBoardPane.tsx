import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Rotate3D,
  Palette,
  Layers,
  SendToBack,
  Sliders,
  Check,
  Maximize2,
  Trash2,
  ChevronDown,
  RotateCcw,
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
  const [openMenu, setOpenMenu] = useState<'board-studio' | 'send-target' | null>(
    null
  );
  const [justTransferred, setJustTransferred] = useState(false);
  const subToolbarRef = useRef<HTMLDivElement | null>(null);
  const bottomBarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDownOutside = (e: PointerEvent) => {
      if (!openMenu) return;
      const target = e.target as Node;
      if (
        subToolbarRef.current?.contains(target) ||
        bottomBarRef.current?.contains(target)
      ) {
        return;
      }
      setOpenMenu(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenu(null);
      }
    };
    window.addEventListener('pointerdown', handlePointerDownOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDownOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenu]);

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
      questions[0]?.id ||
      'q1';
    linkFigure(qId, activeBoardTab);
    setOpenMenu(null);
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
    <div
      className={`relative h-full w-full flex flex-col select-none overflow-hidden ${bgThemeClass}`}
    >
      {/* Streamlined Collapsible Board Sub-Toolbar */}
      <div
        ref={subToolbarRef}
        className="min-h-[40px] px-2.5 py-1 border-b border-slate-200/80 bg-white/95 text-slate-800 flex flex-wrap items-center justify-between gap-1.5 z-30 text-xs"
      >
        {/* Left: 3 Geometry Mode Tabs */}
        <div className="flex flex-wrap items-center bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/80 gap-0.5">
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
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap shrink-0 transition ${
                activeBoardTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm font-semibold ring-1 ring-slate-200/70'
                  : 'hover:bg-white/60 text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right: Shape Selector + Single Collapsible "Tuỳ chỉnh Hình & Màu ▾" Popover */}
        <div className="flex flex-wrap items-center gap-1.5 relative">
          {activeBoardTab === '3d-pyramid' && (
            <select
              value={pyramid3D.shape3DType || 'pyramid-quad'}
              onChange={(e) =>
                updatePyramid3D({
                  shape3DType: e.target.value as
                    | 'pyramid-quad'
                    | 'prism-tri'
                    | 'cone',
                })
              }
              className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 font-semibold text-slate-700 focus:outline-none whitespace-nowrap shrink-0 cursor-pointer"
              title="Chọn khối hình học không gian 3D"
            >
              <option value="pyramid-quad">Khối chóp S.ABCD</option>
              <option value="prism-tri">Lăng trụ ABC.A'B'C'</option>
              <option value="cone">Khối nón S.OAB</option>
            </select>
          )}

          {/* Single Collapsible Studio Button for Colors, Cross-section, Font size & Unfold */}
          <button
            onClick={() =>
              setOpenMenu((prev) =>
                prev === 'board-studio' ? null : 'board-studio'
              )
            }
            className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition ${
              openMenu === 'board-studio'
                ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-sm'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
            title="Mở bảng Tô màu mặt phẳng, Thiết diện MNPQ, Tách hình & Cỡ chữ tên điểm"
          >
            <Palette className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Tuỳ chỉnh Hình & Màu</span>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform ${
                openMenu === 'board-studio' ? 'rotate-180 text-blue-600' : ''
              }`}
            />
          </button>

          {boardInkStrokes.length > 0 && (
            <button
              onClick={clearBoardInk}
              className="px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1 border border-red-200 whitespace-nowrap shrink-0 font-medium"
              title="Xoá chữ viết tay XP-Pen trên bảng vẽ"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>Xoá mực</span>
            </button>
          )}

          {/* Unified Board Studio Popover (Colors + Cross-Section + Label Font Size + View Reset) */}
          {openMenu === 'board-studio' && (
            <div className="absolute top-full right-0 mt-1.5 w-72 rounded-2xl bg-white shadow-2xl border border-slate-200 p-3.5 space-y-3 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
              {/* 1. Point Label Font Size (Synced live to Exam Paper!) */}
              <div>
                <div className="flex items-center justify-between font-semibold text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-blue-600" /> Cỡ chữ tên điểm (S, A, B, C...)
                  </span>
                  <span className="text-blue-600 font-bold">
                    {pyramid3D.labelFontSize}px
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      updatePyramid3D({
                        labelFontSize: Math.max(11, pyramid3D.labelFontSize - 2),
                      })
                    }
                    className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700 transition"
                  >
                    A- Nhỏ lại
                  </button>
                  <button
                    onClick={() =>
                      updatePyramid3D({
                        labelFontSize: Math.min(24, pyramid3D.labelFontSize + 2),
                      })
                    }
                    className="flex-1 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-semibold transition"
                  >
                    A+ To rõ hơn
                  </button>
                </div>
              </div>

              {/* 2. 3D Specific Controls */}
              {activeBoardTab === '3d-pyramid' && (
                <>
                  <div className="pt-2.5 border-t border-slate-100 space-y-2">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Thiết diện & Bề mặt 3D
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() =>
                          updatePyramid3D({
                            showCrossSection: !pyramid3D.showCrossSection,
                          })
                        }
                        className={`px-2 py-1.5 rounded-lg border font-medium flex items-center justify-center gap-1 transition ${
                          pyramid3D.showCrossSection
                            ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5 shrink-0" />
                        <span>Thiết diện MNPQ</span>
                      </button>

                      <button
                        onClick={() =>
                          updatePyramid3D({
                            showUnfoldedSection: !pyramid3D.showUnfoldedSection,
                          })
                        }
                        className={`px-2 py-1.5 rounded-lg border font-medium flex items-center justify-center gap-1 transition ${
                          pyramid3D.showUnfoldedSection
                            ? 'bg-blue-50 border-blue-300 text-blue-800 font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <Maximize2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Tách hình thật</span>
                      </button>

                      <button
                        onClick={() =>
                          updatePyramid3D({
                            showSideFaceFill: !pyramid3D.showSideFaceFill,
                          })
                        }
                        className={`px-2 py-1.5 rounded-lg border font-medium flex items-center justify-center gap-1 transition ${
                          pyramid3D.showSideFaceFill
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-800 font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <span>Tô mặt bên SBC</span>
                      </button>

                      <button
                        onClick={resetPyramid3DView}
                        className="px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium flex items-center justify-center gap-1 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                        <span>Góc ban đầu</span>
                      </button>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-medium text-slate-600 mb-1">
                        <span>Vị trí mặt cắt thiết diện (SA, SB, SC, SD)</span>
                        <span className="font-bold text-amber-700">
                          {Math.round(pyramid3D.cutRatioM * 100)}%
                        </span>
                      </div>
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
                        className="w-full accent-amber-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* 3. Color Swatches for 3D */}
                  <div className="pt-2.5 border-t border-slate-100 space-y-2">
                    <div>
                      <div className="text-[11px] font-semibold text-slate-600 mb-1">
                        Màu thiết diện (MNPQ):
                      </div>
                      <div className="grid grid-cols-8 gap-1.5">
                        {COLOR_SWATCHES.map((c) => (
                          <button
                            key={c}
                            onClick={() =>
                              updatePyramid3D({ sectionFillColor: c })
                            }
                            className={`h-5 rounded-md border transition transform ${
                              pyramid3D.sectionFillColor === c
                                ? 'scale-110 ring-2 ring-blue-600 border-white'
                                : 'border-slate-300 hover:scale-105'
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-slate-600 mb-1">
                        Màu mặt đáy (ABCD):
                      </div>
                      <div className="grid grid-cols-8 gap-1.5">
                        {COLOR_SWATCHES.map((c) => (
                          <button
                            key={c}
                            onClick={() => updatePyramid3D({ baseFillColor: c })}
                            className={`h-5 rounded-md border transition transform ${
                              pyramid3D.baseFillColor === c
                                ? 'scale-110 ring-2 ring-blue-600 border-white'
                                : 'border-slate-300 hover:scale-105'
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* 2D Specific Controls inside Studio */}
              {activeBoardTab === '2d-triangle' && (
                <div className="pt-2.5 border-t border-slate-100 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">
                    Thành phần Hình phẳng 2D
                  </div>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span>Đường tròn ngoại tiếp (O)</span>
                    <input
                      type="checkbox"
                      checked={triangle2D.showCircumcircle}
                      onChange={(e) =>
                        updateTriangle2D({ showCircumcircle: e.target.checked })
                      }
                      className="rounded accent-blue-600 w-4 h-4"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span>Trực tâm H & 3 đường cao</span>
                    <input
                      type="checkbox"
                      checked={triangle2D.showOrthocenter}
                      onChange={(e) =>
                        updateTriangle2D({
                          showOrthocenter: e.target.checked,
                          showAltitudes: e.target.checked,
                        })
                      }
                      className="rounded accent-blue-600 w-4 h-4"
                    />
                  </label>
                </div>
              )}
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
          <div className="absolute top-3 left-3 z-30 bg-white/95 backdrop-blur border border-slate-200 rounded-xl shadow-lg p-3 w-72 max-w-[calc(100%-24px)] text-slate-800 space-y-2">
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
              onChange={(e) =>
                updateFunctionGraph({ expression: e.target.value })
              }
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-slate-300 focus:border-blue-500 focus:outline-none"
              placeholder="x^3 - 3*x + m"
            />
            {functionGraph.enableParamM && (
              <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-2">
                <div className="flex items-center justify-between text-xs font-semibold text-blue-900 mb-1">
                  <span>
                    Thanh trượt tham số: m = {functionGraph.paramM.toFixed(1)}
                  </span>
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
          <div className="absolute top-3 left-3 z-30 bg-white/95 border border-slate-200 rounded-xl shadow-md px-3 py-2 text-xs text-slate-700 flex flex-wrap items-center gap-2 max-w-[calc(100%-24px)]">
            <span className="font-medium">
              💡 Giữ chuột kéo đỉnh <b>C</b>: Đường tròn (O), Trực tâm <b>H</b>, Đường cao <b>CK</b> tự chạy theo!
            </span>
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

        {/* Unified Bottom Floating Control Bar (Never collides on narrow panes!) */}
        <div
          ref={bottomBarRef}
          className="absolute bottom-3 inset-x-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none"
        >
          {/* Left Quick 3D Action Pill */}
          <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
            {activeBoardTab === '3d-pyramid' && (
              <>
                <button
                  onClick={() => setIsRotating3D((v) => !v)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md transition ${
                    isRotating3D
                      ? 'bg-slate-900 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <Rotate3D className="w-3.5 h-3.5 shrink-0" />
                  <span>{isRotating3D ? 'Đang xoay 3D' : 'Xoay 3D'}</span>
                </button>

                <button
                  onClick={() =>
                    updatePyramid3D({
                      showUnfoldedSection: !pyramid3D.showUnfoldedSection,
                    })
                  }
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md transition ${
                    pyramid3D.showUnfoldedSection
                      ? 'bg-amber-600 text-white'
                      : 'bg-white/95 hover:bg-white text-slate-800 border border-slate-300'
                  }`}
                >
                  <Maximize2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Tách hình thật</span>
                </button>
              </>
            )}
          </div>

          {/* Right Split-Button: "← Đưa hình vào Đề | ▾" */}
          <div className="relative flex items-center rounded-xl bg-slate-900/95 text-white p-1 shadow-xl border border-slate-700 pointer-events-auto">
            <button
              onClick={() => handleQuickSendToExam()}
              className="px-2.5 py-1 rounded-l-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition"
              title="Đưa hình đang vẽ sang câu hỏi đang chọn bên trang Đề thi"
            >
              {justTransferred ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  <span>Đã chèn vào Đề!</span>
                </>
              ) : (
                <>
                  <SendToBack className="w-3.5 h-3.5 shrink-0" />
                  <span>← Đưa hình vào Đề</span>
                </>
              )}
            </button>

            <button
              onClick={() =>
                setOpenMenu((prev) =>
                  prev === 'send-target' ? null : 'send-target'
                )
              }
              className="px-1.5 py-1 rounded-r-lg bg-blue-700 hover:bg-blue-600 text-white border-l border-blue-500/60 flex items-center"
              title="Chọn câu hỏi cụ thể để gắn hình này vào"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {openMenu === 'send-target' && (
              <div className="absolute bottom-full right-0 mb-2 w-48 rounded-2xl bg-white text-slate-800 shadow-2xl border border-slate-200 p-1.5 space-y-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase">
                  Chèn hình vào câu:
                </div>
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {questions.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => handleQuickSendToExam(q.id)}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-left flex items-center justify-between transition ${
                        activeQuestionId === q.id
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span>Câu {q.number}</span>
                      {activeQuestionId === q.id && (
                        <span className="text-[10px] text-blue-600">
                          Đang chọn
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
