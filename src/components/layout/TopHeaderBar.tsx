import React, { useEffect, useState } from 'react';
import {
  MousePointer,
  PenTool,
  Highlighter,
  Sparkles,
  Eraser,
  Columns,
  FileEdit,
  Presentation,
  Sigma,
  Sun,
  Moon,
  BookOpen,
  Wand2,
  Trash2,
  DownloadCloud,
  SlidersHorizontal,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { BoardTheme, PenToolType, WorkspaceMode } from '../../types/exam';
import {
  CURRENT_APP_VERSION,
  ReleaseUpdateInfo,
  checkAppUpdate,
} from '../../core/autoUpdater';
import { UpdateModal } from '../updater/UpdateModal';

const PEN_COLORS = [
  { label: 'Đỏ chấm bài', hex: '#dc2626' },
  { label: 'Xanh bút bi', hex: '#2563eb' },
  { label: 'Đen', hex: '#0f172a' },
  { label: 'Xanh lá', hex: '#16a34a' },
  { label: 'Vàng phấn (Bảng đen)', hex: '#facc15' },
];

export const TopHeaderBar: React.FC = () => {
  const workspaceMode = useAppStore((s) => s.workspaceMode);
  const setWorkspaceMode = useAppStore((s) => s.setWorkspaceMode);
  const setMathModalOpen = useAppStore((s) => s.setMathModalOpen);

  const penTool = useAppStore((s) => s.penTool);
  const setPenTool = useAppStore((s) => s.setPenTool);
  const penColor = useAppStore((s) => s.penColor);
  const setPenColor = useAppStore((s) => s.setPenColor);
  const penSize = useAppStore((s) => s.penSize);
  const setPenSize = useAppStore((s) => s.setPenSize);
  const eraserSize = useAppStore((s) => s.eraserSize);
  const setEraserSize = useAppStore((s) => s.setEraserSize);
  const shapeSnapEnabled = useAppStore((s) => s.shapeSnapEnabled);
  const setShapeSnapEnabled = useAppStore((s) => s.setShapeSnapEnabled);
  const clearAllExamInk = useAppStore((s) => s.clearAllExamInk);

  const boardTheme = useAppStore((s) => s.boardTheme);
  const setBoardTheme = useAppStore((s) => s.setBoardTheme);

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<ReleaseUpdateInfo | null>(null);
  const [showPenSettingsPopover, setShowPenSettingsPopover] = useState(false);

  useEffect(() => {
    let mounted = true;
    checkAppUpdate()
      .then(async (info) => {
        if (!mounted) return;
        setUpdateInfo(info);
        if (info.hasUpdate) {
          setIsUpdateModalOpen(true);
          if (info.isTauriNativeUpdate) {
            try {
              const { performTauriNativeUpdate } = await import(
                '../../core/autoUpdater'
              );
              await performTauriNativeUpdate();
            } catch {
              // Modal remains open for manual click if needed
            }
          }
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <header className="min-h-[44px] py-1.5 px-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 select-none z-40 print:hidden">
      {/* Left: Brand + Workspace Mode Switcher */}
      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
        <div className="flex items-center gap-1.5 pr-2 border-r border-slate-200 shrink-0">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shadow-sm shrink-0">
            ∑
          </div>
          <span className="text-xs font-bold text-slate-900">
            KNBoard
          </span>
          <button
            onClick={() => setIsUpdateModalOpen(true)}
            title="Bấm để kiểm tra cập nhật phiên bản mới từ GitHub Releases"
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 transition ${
              updateInfo?.hasUpdate
                ? 'bg-amber-500 text-white animate-pulse shadow-sm'
                : 'bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200'
            }`}
          >
            <DownloadCloud className="w-2.5 h-2.5 shrink-0" />
            <span>
              {updateInfo?.hasUpdate
                ? `v${updateInfo.latestVersion}`
                : `v${CURRENT_APP_VERSION}`}
            </span>
          </button>
        </div>

        {/* 4 Workspace Modes — Always visible, wraps cleanly if ultra-narrow */}
        <div className="flex flex-wrap items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 text-xs">
          {(
            [
              { id: 'split', label: 'Chia đôi', icon: Columns },
              { id: 'editor-only', label: 'Soạn Đề', icon: FileEdit },
              { id: 'board-only', label: 'Bảng Vẽ', icon: Presentation },
              { id: 'teaching', label: 'Mở PDF / Dạy', icon: BookOpen },
            ] as { id: WorkspaceMode; label: string; icon: React.ElementType }[]
          ).map((m) => {
            const Icon = m.icon;
            const active = workspaceMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setWorkspaceMode(m.id)}
                className={`px-2 py-1 rounded-md font-medium flex items-center gap-1 whitespace-nowrap shrink-0 transition ${
                  active
                    ? 'bg-white text-blue-600 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right & Center Combined: XP-Pen Toolset + Math Formula ("∫ Công thức") + Eye-Care Theme */}
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="relative flex flex-wrap items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-xl border border-slate-200/90">
          {(
            [
              { id: 'select', label: 'Chọn', icon: MousePointer },
              { id: 'pen', label: 'Bút', icon: PenTool },
              { id: 'highlighter', label: 'Dạ quang', icon: Highlighter },
              { id: 'laser', label: 'Laser', icon: Sparkles },
              { id: 'eraser', label: 'Tẩy', icon: Eraser },
            ] as { id: PenToolType; label: string; icon: React.ElementType }[]
          ).map((t) => {
            const Icon = t.icon;
            const active = penTool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setPenTool(t.id)}
                title={t.label}
                className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 whitespace-nowrap shrink-0 transition ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-200/70'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{t.label}</span>
              </button>
            );
          })}

          <span className="text-slate-300 shrink-0">|</span>

          {/* Color Swatches */}
          <div className="flex items-center gap-1 shrink-0">
            {PEN_COLORS.map((c) => (
              <button
                key={c.hex}
                onClick={() => {
                  setPenColor(c.hex);
                  if (penTool === 'select' || penTool === 'eraser') {
                    setPenTool('pen');
                  }
                }}
                title={c.label}
                className={`w-3.5 h-3.5 rounded-full border shrink-0 transition transform ${
                  penColor === c.hex
                    ? 'scale-125 ring-2 ring-blue-500 ring-offset-1'
                    : 'border-slate-300 hover:scale-110'
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>

          {/* Inline Slider on large screens */}
          <div className="hidden xl:flex items-center gap-1 pl-1.5 border-l border-slate-200 text-[11px] whitespace-nowrap shrink-0">
            {penTool === 'eraser' ? (
              <>
                <span className="font-semibold text-red-700">
                  Tẩy: {eraserSize}
                </span>
                <input
                  type="range"
                  min="6"
                  max="55"
                  step="2"
                  value={eraserSize}
                  onChange={(e) => setEraserSize(parseInt(e.target.value, 10))}
                  className="w-14 accent-red-600 cursor-pointer"
                />
              </>
            ) : (
              <>
                <span className="font-semibold text-blue-800">
                  Nét: {penSize.toFixed(1)}
                </span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.4"
                  value={penSize}
                  onChange={(e) => {
                    setPenSize(parseFloat(e.target.value));
                    if (penTool === 'select') setPenTool('pen');
                  }}
                  className="w-14 accent-blue-600 cursor-pointer"
                />
              </>
            )}
          </div>

          {/* Compact Pen/Eraser Size Popover Trigger */}
          <button
            onClick={() => setShowPenSettingsPopover((v) => !v)}
            title="Chỉnh cỡ bút, cỡ tẩy & chế độ tự nắn thẳng"
            className="px-1.5 py-1 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 text-slate-700 flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>
              {penTool === 'eraser' ? `Tẩy ${eraserSize}px` : `Cỡ ${penSize.toFixed(1)}`}
            </span>
          </button>

          {/* Clear All Ink Button */}
          <button
            onClick={clearAllExamInk}
            title="Xoá toàn bộ nét bút XP-Pen trên đề thi và bảng vẽ"
            className="px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 text-red-600 hover:bg-red-50 border border-red-200/70 whitespace-nowrap shrink-0 transition"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            <span>Xoá mực</span>
          </button>

          {/* Pen & Eraser Settings Popover */}
          {showPenSettingsPopover && (
            <div className="absolute top-10 right-0 w-64 rounded-xl bg-white shadow-2xl border border-slate-200 p-3 space-y-3 z-50 text-xs">
              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>Độ dày nét bút XP-Pen</span>
                  <span className="text-blue-600">{penSize.toFixed(1)}px</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.4"
                  value={penSize}
                  onChange={(e) => {
                    setPenSize(parseFloat(e.target.value));
                    if (penTool === 'select') setPenTool('pen');
                  }}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex gap-1 mt-1">
                  {[
                    { label: 'Mảnh (1.6)', val: 1.6 },
                    { label: 'Vừa (2.8)', val: 2.8 },
                    { label: 'Đậm (5.0)', val: 5.0 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      onClick={() => setPenSize(p.val)}
                      className="flex-1 py-1 rounded bg-slate-100 hover:bg-blue-50 text-[11px] font-medium"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>Bán kính Cục Tẩy</span>
                  <span className="text-red-600">{eraserSize}px</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="55"
                  step="2"
                  value={eraserSize}
                  onChange={(e) => {
                    setEraserSize(parseInt(e.target.value, 10));
                    setPenTool('eraser');
                  }}
                  className="w-full accent-red-600 cursor-pointer"
                />
                <div className="flex gap-1 mt-1">
                  {[
                    { label: 'Nhỏ (10)', val: 10 },
                    { label: 'Vừa (20)', val: 20 },
                    { label: 'To (42)', val: 42 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      onClick={() => {
                        setEraserSize(p.val);
                        setPenTool('eraser');
                      }}
                      className="flex-1 py-1 rounded bg-slate-100 hover:bg-red-50 text-[11px] font-medium"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-700">
                  Giữ bút 0.45s tự nắn thẳng
                </span>
                <input
                  type="checkbox"
                  checked={shapeSnapEnabled}
                  onChange={(e) => setShapeSnapEnabled(e.target.checked)}
                  className="rounded accent-blue-600 w-4 h-4"
                />
              </div>
            </div>
          )}
        </div>

        {/* Math Formula Button ("∫ Công thức") + Eye-Care Projector Theme */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setMathModalOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1 whitespace-nowrap shrink-0 shadow-sm transition"
          >
            <Sigma className="w-3.5 h-3.5 shrink-0" />
            <span>Công thức</span>
          </button>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs shrink-0">
            {(
              [
                { id: 'white', label: 'Trắng', icon: Sun },
                { id: 'warm-paper', label: 'Dịu mắt', icon: BookOpen },
                { id: 'chalkboard', label: 'Bảng đen', icon: Moon },
              ] as { id: BoardTheme; label: string; icon: React.ElementType }[]
            ).map((th) => {
              const Icon = th.icon;
              return (
                <button
                  key={th.id}
                  onClick={() => setBoardTheme(th.id)}
                  className={`p-1.5 rounded flex items-center gap-1 whitespace-nowrap shrink-0 transition ${
                    boardTheme === th.id
                      ? 'bg-white text-slate-900 shadow-sm font-medium'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={`Chế độ màu nền: ${th.label}`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* OTA Auto-Updater Modal */}
      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        initialUpdateInfo={updateInfo}
        onUpdateInfoChanged={setUpdateInfo}
      />
    </header>
  );
};
