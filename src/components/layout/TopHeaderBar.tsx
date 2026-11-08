import React, { useEffect, useRef, useState } from 'react';
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
  Trash2,
  DownloadCloud,
  ChevronDown,
  Palette,
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
  { label: 'Cam nổi bật', hex: '#ea580c' },
  { label: 'Tím', hex: '#7c3aed' },
  { label: 'Vàng phấn (Bảng đen)', hex: '#facc15' },
  { label: 'Trắng phấn (Bảng đen)', hex: '#ffffff' },
];

const THEME_OPTIONS: {
  id: BoardTheme;
  label: string;
  desc: string;
  icon: React.ElementType;
}[] = [
  {
    id: 'white',
    label: 'Giấy Trắng',
    desc: 'Chuẩn in ấn & soạn đề',
    icon: Sun,
  },
  {
    id: 'warm-paper',
    label: 'Giấy Dịu Mắt',
    desc: 'Chống mỏi mắt khi dạy lâu',
    icon: BookOpen,
  },
  {
    id: 'chalkboard',
    label: 'Bảng Đen Phấn',
    desc: 'Tương phản cao cho máy chiếu',
    icon: Moon,
  },
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

  // Collapsible Professional Popovers (Only 1 open at a time, auto-closes on outside click / Escape)
  const [openMenu, setOpenMenu] = useState<'pen' | 'theme' | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handlePointerDownOutside = (e: PointerEvent) => {
      if (
        openMenu &&
        headerRef.current &&
        !headerRef.current.contains(e.target as Node)
      ) {
        setOpenMenu(null);
      }
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

  const currentThemeMeta =
    THEME_OPTIONS.find((t) => t.id === boardTheme) || THEME_OPTIONS[0];
  const CurrentThemeIcon = currentThemeMeta.icon;

  return (
    <header
      ref={headerRef}
      className="min-h-[46px] py-1 px-2.5 bg-white border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 select-none z-40 print:hidden shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
    >
      {/* 1. LEFT: Brand + Version Badge + 4 Workspace Mode Tabs */}
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <div className="flex items-center gap-1.5 pr-2 border-r border-slate-200 shrink-0">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shadow-sm shrink-0">
            ∑
          </div>
          <span className="text-xs font-extrabold tracking-tight text-slate-900">
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

        {/* 4 Workspace Modes — Segmented Pill Switcher */}
        <div className="flex flex-wrap items-center bg-slate-100/90 p-0.5 rounded-xl border border-slate-200/80 text-xs">
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
                className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 transition ${
                  active
                    ? 'bg-white text-blue-600 shadow-sm font-semibold ring-1 ring-slate-200/70'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. RIGHT & CENTER: Ultra-Clean Collapsible XP-Pen Dock + Math Formula + Theme Popover */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Streamlined XP-Pen Tool Dock: 5 Tools + 1 Collapsible "Màu & Nét" Studio Button */}
        <div className="relative flex flex-wrap items-center gap-0.5 bg-slate-100/85 p-0.5 rounded-xl border border-slate-200/90">
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
                title={`Công cụ: ${t.label}`}
                className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 whitespace-nowrap shrink-0 transition ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm font-semibold'
                    : 'text-slate-700 hover:bg-white/80 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{t.label}</span>
              </button>
            );
          })}

          <div className="w-px h-4 bg-slate-300/80 mx-0.5 shrink-0" />

          {/* Single Collapsible Pen & Eraser Studio Trigger (Replaces 8 cluttered items!) */}
          <button
            onClick={() =>
              setOpenMenu((prev) => (prev === 'pen' ? null : 'pen'))
            }
            title="Mở bảng chọn màu mực, chỉnh độ dày nét bút, bán kính cục tẩy & xoá mực"
            className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 border transition ${
              openMenu === 'pen'
                ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-sm'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90 shadow-[0_1px_1px_rgba(0,0,0,0.03)]'
            }`}
          >
            <span
              className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0 shadow-inner"
              style={{ backgroundColor: penColor }}
            />
            <span>
              {penTool === 'eraser'
                ? `Tẩy ${eraserSize}px`
                : `Nét ${penSize.toFixed(1)}`}
            </span>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform ${
                openMenu === 'pen' ? 'rotate-180 text-blue-600' : ''
              }`}
            />
          </button>

          {/* Collapsible Pen & Eraser Studio Popover */}
          {openMenu === 'pen' && (
            <div className="absolute top-full right-0 mt-1.5 w-72 rounded-2xl bg-white shadow-2xl border border-slate-200 p-3.5 space-y-3.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
              {/* Section 1: Color Swatches */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  <span className="flex items-center gap-1">
                    <Palette className="w-3.5 h-3.5 text-blue-600" /> Màu mực bút XP-Pen
                  </span>
                  <span className="text-[10px] font-normal text-slate-400">
                    Bấm để đổi màu
                  </span>
                </div>
                <div className="grid grid-cols-8 gap-1.5">
                  {PEN_COLORS.map((c) => {
                    const isSelected = penColor === c.hex;
                    return (
                      <button
                        key={c.hex}
                        onClick={() => {
                          setPenColor(c.hex);
                          if (penTool === 'select' || penTool === 'eraser') {
                            setPenTool('pen');
                          }
                        }}
                        title={c.label}
                        className={`w-6 h-6 rounded-full border transition transform flex items-center justify-center ${
                          isSelected
                            ? 'scale-110 ring-2 ring-blue-600 ring-offset-1 border-white'
                            : 'border-slate-300 hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Pen Stroke Thickness */}
              <div className="pt-2.5 border-t border-slate-100">
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>Độ dày nét bút XP-Pen</span>
                  <span className="text-blue-600 font-bold">
                    {penSize.toFixed(1)} px
                  </span>
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
                <div className="flex gap-1.5 mt-1.5">
                  {[
                    { label: 'Mảnh (1.6)', val: 1.6 },
                    { label: 'Vừa (2.8)', val: 2.8 },
                    { label: 'Đậm (5.0)', val: 5.0 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      onClick={() => {
                        setPenSize(p.val);
                        if (penTool === 'select') setPenTool('pen');
                      }}
                      className={`flex-1 py-1 rounded-lg border text-[11px] font-medium transition ${
                        Math.abs(penSize - p.val) < 0.15
                          ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
                          : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 3: Partial Eraser Radius */}
              <div className="pt-2.5 border-t border-slate-100">
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>Bán kính Cục Tẩy (Xoá từng phần)</span>
                  <span className="text-red-600 font-bold">{eraserSize} px</span>
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
                <div className="flex gap-1.5 mt-1.5">
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
                      className={`flex-1 py-1 rounded-lg border text-[11px] font-medium transition ${
                        eraserSize === p.val
                          ? 'bg-red-50 border-red-300 text-red-700 font-semibold'
                          : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section 4: Hold-to-Snap Straight Line + Clear All Ink */}
              <div className="pt-2.5 border-t border-slate-100 space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-[11px] font-medium text-slate-700">
                    Giữ bút 0.45s tự nắn thẳng đoạn thẳng
                  </span>
                  <input
                    type="checkbox"
                    checked={shapeSnapEnabled}
                    onChange={(e) => setShapeSnapEnabled(e.target.checked)}
                    className="rounded accent-blue-600 w-4 h-4 cursor-pointer"
                  />
                </label>

                <button
                  onClick={() => {
                    clearAllExamInk();
                    setOpenMenu(null);
                  }}
                  className="w-full py-1.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xoá sạch toàn bộ nét mực trên đề & bảng</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Math Formula Modal Trigger ("∫ Công thức") + Collapsible Theme Switcher */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setMathModalOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1 whitespace-nowrap shrink-0 shadow-sm transition"
            title="Mở bảng gõ công thức Toán học nhanh (KaTeX)"
          >
            <Sigma className="w-3.5 h-3.5 shrink-0" />
            <span>Công thức</span>
          </button>

          {/* Single Collapsible Eye-Care Theme Dropdown */}
          <div className="relative">
            <button
              onClick={() =>
                setOpenMenu((prev) => (prev === 'theme' ? null : 'theme'))
              }
              title="Đổi màu nền giấy & bảng chống mỏi mắt (Trắng / Dịu mắt / Bảng đen)"
              className={`px-2 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1 whitespace-nowrap shrink-0 transition ${
                openMenu === 'theme'
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'bg-slate-100/90 hover:bg-slate-200/70 text-slate-700 border-slate-200'
              }`}
            >
              <CurrentThemeIcon className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span className="hidden sm:inline">{currentThemeMeta.label}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {openMenu === 'theme' && (
              <div className="absolute top-full right-0 mt-1.5 w-56 rounded-2xl bg-white shadow-2xl border border-slate-200 p-1.5 space-y-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Màu nền Giấy & Bảng Vẽ
                </div>
                {THEME_OPTIONS.map((th) => {
                  const Icon = th.icon;
                  const active = boardTheme === th.id;
                  return (
                    <button
                      key={th.id}
                      onClick={() => {
                        setBoardTheme(th.id);
                        setOpenMenu(null);
                      }}
                      className={`w-full px-2.5 py-2 rounded-xl text-left flex items-center gap-2.5 transition ${
                        active
                          ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200/80'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          active ? 'text-blue-600' : 'text-slate-500'
                        }`}
                      />
                      <div>
                        <div className="leading-tight">{th.label}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {th.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
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
