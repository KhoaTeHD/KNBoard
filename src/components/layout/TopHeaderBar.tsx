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

  // Silent background check on startup — automatically pops up modal AND auto-installs if running in Tauri!
  useEffect(() => {
    let mounted = true;
    checkAppUpdate()
      .then(async (info) => {
        if (!mounted) return;
        setUpdateInfo(info);
        if (info.hasUpdate) {
          setIsUpdateModalOpen(true);
          // If running inside Tauri Desktop, automatically download, install, and restart into the new version!
          if (info.isTauriNativeUpdate) {
            try {
              const { performTauriNativeUpdate } = await import('../../core/autoUpdater');
              await performTauriNativeUpdate();
            } catch {
              // If auto-install requires user confirmation, modal is already open
            }
          }
        }
      })
      .catch(() => {
        // Ignore network offline errors during silent startup check
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <header className="h-12 px-3 bg-white border-b border-slate-200 flex items-center justify-between gap-2 select-none z-40 print:hidden">
      {/* Left: Brand + Workspace Mode Switcher */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 pr-2 border-r border-slate-200">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-sm flex items-center justify-center shadow-sm">
            ∑
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 leading-none">
                KNBoard
              </span>
              <button
                onClick={() => setIsUpdateModalOpen(true)}
                title="Bấm để kiểm tra cập nhật phiên bản mới từ GitHub Releases"
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 transition ${
                  updateInfo?.hasUpdate
                    ? 'bg-amber-500 text-white animate-pulse shadow-sm'
                    : 'bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200'
                }`}
              >
                <DownloadCloud className="w-2.5 h-2.5" />
                <span>
                  {updateInfo?.hasUpdate
                    ? `Có bản mới v${updateInfo.latestVersion}`
                    : `v${CURRENT_APP_VERSION}`}
                </span>
              </button>
            </div>
            <div className="text-[10px] text-slate-500">
              Math Studio & XP-Pen
            </div>
          </div>
        </div>

        {/* 4 Workspace Modes */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 text-xs">
          {(
            [
              {
                id: 'split',
                label: 'Chia đôi (Đề + Bảng vẽ)',
                icon: Columns,
              },
              {
                id: 'editor-only',
                label: 'Soạn Đề Thi',
                icon: FileEdit,
              },
              {
                id: 'board-only',
                label: 'Bảng Vẽ Hình',
                icon: Presentation,
              },
              {
                id: 'teaching',
                label: 'Giảng Dạy XP-Pen',
                icon: BookOpen,
              },
            ] as { id: WorkspaceMode; label: string; icon: React.ElementType }[]
          ).map((m) => {
            const Icon = m.icon;
            const active = workspaceMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setWorkspaceMode(m.id)}
                className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5 transition ${
                  active
                    ? 'bg-white text-blue-600 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Center: XP-Pen / Stylus Live Teaching Toolset */}
      <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200/90">
        {(
          [
            { id: 'select', label: 'Chọn / Kéo', icon: MousePointer },
            { id: 'pen', label: 'Bút XP-Pen', icon: PenTool },
            { id: 'highlighter', label: 'Dạ quang', icon: Highlighter },
            { id: 'laser', label: 'Bút Laser', icon: Sparkles },
            { id: 'eraser', label: 'Tẩy', icon: Eraser },
          ] as { id: PenToolType; label: string; icon: React.ElementType }[]
        ).map((t) => {
          const Icon = t.icon;
          const active = penTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setPenTool(t.id)}
              className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
                active
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-200/70'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}

        <span className="text-slate-300 mx-0.5">|</span>

        {/* Pen Color Swatches */}
        <div className="flex items-center gap-1">
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
              className={`w-4 h-4 rounded-full border transition transform ${
                penColor === c.hex
                  ? 'scale-125 ring-2 ring-blue-500 ring-offset-1'
                  : 'border-slate-300 hover:scale-110'
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>

        <span className="text-slate-300 mx-0.5">|</span>

        {/* Dynamic Pen Size OR Eraser Size Slider & Presets */}
        {penTool === 'eraser' ? (
          <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg bg-red-50/70 border border-red-200/80 text-[11px]">
            <span className="font-semibold text-red-700 whitespace-nowrap">
              Cỡ tẩy: {eraserSize}px
            </span>
            <input
              type="range"
              min="6"
              max="55"
              step="2"
              value={eraserSize}
              onChange={(e) => setEraserSize(parseInt(e.target.value, 10))}
              className="w-16 accent-red-600 cursor-pointer"
              title="Kéo để chỉnh độ to/nhỏ của cục tẩy"
            />
            {[
              { label: 'Nhỏ', val: 10 },
              { label: 'Vừa', val: 20 },
              { label: 'To', val: 40 },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => setEraserSize(preset.val)}
                className={`px-1.5 py-0.2 rounded text-[10px] font-medium transition ${
                  Math.abs(eraserSize - preset.val) <= 3
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-red-700 hover:bg-red-100 border border-red-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg bg-blue-50/60 border border-blue-200/80 text-[11px]">
            <span className="font-semibold text-blue-800 whitespace-nowrap flex items-center gap-1">
              <span>Nét bút: {penSize.toFixed(1)}</span>
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
              className="w-16 accent-blue-600 cursor-pointer"
              title="Kéo để chỉnh độ dày nét bút XP-Pen"
            />
            {[
              { label: 'Mảnh', val: 1.6 },
              { label: 'Vừa', val: 2.8 },
              { label: 'Đậm', val: 5.0 },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  setPenSize(preset.val);
                  if (penTool === 'select') setPenTool('pen');
                }}
                className={`px-1.5 py-0.2 rounded text-[10px] font-medium transition ${
                  Math.abs(penSize - preset.val) < 0.5
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-blue-700 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}

        {/* Hold 0.45s to Snap Straight Line Toggle */}
        <button
          onClick={() => setShapeSnapEnabled(!shapeSnapEnabled)}
          title="Giữ bút XP-Pen đứng yên 0.45 giây ở cuối nét để tự động nắn thành đường thẳng tắp"
          className={`ml-1 px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 border transition ${
            shapeSnapEnabled
              ? 'bg-amber-50 border-amber-300 text-amber-800'
              : 'bg-white border-slate-200 text-slate-500'
          }`}
        >
          <Wand2 className="w-3 h-3" />
          <span>Tự nắn thẳng</span>
        </button>

        {/* Clear All Ink Button */}
        <button
          onClick={clearAllExamInk}
          title="Xoá toàn bộ nét bút XP-Pen trên đề thi và bảng vẽ"
          className="px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition"
        >
          <Trash2 className="w-3 h-3" />
          <span>Xoá hết mực</span>
        </button>
      </div>

      {/* Right: Math Formula Button ("∫ Công thức") + Eye-Care Projector Theme */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMathModalOpen(true)}
          className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-xs flex items-center gap-1.5 transition"
        >
          <Sigma className="w-4 h-4" />
          <span>∫ Công thức</span>
        </button>

        {/* Board / Projector Theme Switcher (White | Warm Paper | Dark Chalkboard) */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
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
                className={`px-2 py-1 rounded flex items-center gap-1 transition ${
                  boardTheme === th.id
                    ? 'bg-white text-slate-900 shadow-sm font-medium'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Đổi màu nền chống lóa khi chiếu Tivi / Máy chiếu"
              >
                <Icon className="w-3 h-3" />
                <span className="hidden xl:inline">{th.label}</span>
              </button>
            );
          })}
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
