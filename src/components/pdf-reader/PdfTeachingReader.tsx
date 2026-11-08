import React, { useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  FolderOpen,
  FileUp,
  FileText,
  ZoomIn,
  ZoomOut,
  Plus,
  Trash2,
  Printer,
  ChevronLeft,
  ChevronRight,
  Columns,
  Sparkles,
} from 'lucide-react';
import { InkCanvasOverlay } from '../ink-overlay/InkCanvasOverlay';
import { InkStroke } from '../../types/exam';
import { useAppStore } from '../../store/useAppStore';

// Configure local worker so PDF rendering works 100% offline in Tauri / Desktop
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface FolderFileItem {
  name: string;
  file: File;
}

interface RenderedPageSlide {
  id: string;
  type: 'pdf-page' | 'image-page' | 'blank-sheet';
  label: string;
  dataUrl?: string;
  width: number;
  height: number;
}

interface PdfTeachingReaderProps {
  showBoardBesidePdf: boolean;
  onToggleBoardBesidePdf: () => void;
}

export const PdfTeachingReader: React.FC<PdfTeachingReaderProps> = ({
  showBoardBesidePdf,
  onToggleBoardBesidePdf,
}) => {
  const boardTheme = useAppStore((s) => s.boardTheme);
  const setPenTool = useAppStore((s) => s.setPenTool);
  const penTool = useAppStore((s) => s.penTool);

  const [folderFiles, setFolderFiles] = useState<FolderFileItem[]>([]);
  const [activeFileName, setActiveFileName] = useState<string>('');
  const [slides, setSlides] = useState<RenderedPageSlide[]>([
    {
      id: 'blank_initial_1',
      type: 'blank-sheet',
      label: 'Trang bảng viết XP-Pen 1',
      width: 780,
      height: 1080,
    },
  ]);
  const [slideStrokes, setSlideStrokes] = useState<Record<string, InkStroke[]>>({});
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [loadingPdf, setLoadingPdf] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const loadDocumentFile = async (file: File) => {
    setLoadingPdf(true);
    setActiveFileName(file.name);
    // Automatically switch to XP-Pen writing tool when a file is opened for teaching
    if (penTool === 'select') {
      setPenTool('pen');
    }

    try {
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const newSlides: RenderedPageSlide[] = [];

        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
          const page = await pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.8 }); // High-DPI crisp rendering
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
          }
          newSlides.push({
            id: `pdf_${file.name}_p${pageNum}`,
            type: 'pdf-page',
            label: `${file.name} — Trang ${pageNum}/${pdfDoc.numPages}`,
            dataUrl: canvas.toDataURL('image/png'),
            width: Math.round(viewport.width / 1.35),
            height: Math.round(viewport.height / 1.35),
          });
        }
        setSlides(newSlides);
      } else if (
        lower.endsWith('.png') ||
        lower.endsWith('.jpg') ||
        lower.endsWith('.jpeg') ||
        lower.endsWith('.webp')
      ) {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.readAsDataURL(file);
        });
        setSlides([
          {
            id: `img_${file.name}_${Date.now()}`,
            type: 'image-page',
            label: file.name,
            dataUrl,
            width: 780,
            height: 1040,
          },
        ]);
      }
    } catch (err) {
      alert(
        'Không thể đọc file PDF này. Vui lòng kiểm tra lại định dạng file: ' +
          (err instanceof Error ? err.message : '')
      );
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleSingleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const list: FolderFileItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (/\.(pdf|png|jpe?g|webp)$/i.test(f.name)) {
        list.push({ name: f.name, file: f });
      }
    }
    if (list.length > 0) {
      setFolderFiles((prev) => [...list, ...prev]);
      loadDocumentFile(list[0].file);
    }
    e.target.value = '';
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const validFiles: FolderFileItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (/\.(pdf|png|jpe?g|webp)$/i.test(f.name)) {
        validFiles.push({
          name: f.webkitRelativePath || f.name,
          file: f,
        });
      }
    }
    validFiles.sort((a, b) => a.name.localeCompare(b.name));
    setFolderFiles(validFiles);
    setSidebarOpen(true);
    if (validFiles.length > 0) {
      loadDocumentFile(validFiles[0].file);
    }
    e.target.value = '';
  };

  const insertBlankSheetAfter = (index: number) => {
    const newSheet: RenderedPageSlide = {
      id: `blank_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      type: 'blank-sheet',
      label: `Trang giấy nháp bổ sung`,
      width: 780,
      height: 920,
    };
    setSlides((prev) => {
      const copy = [...prev];
      copy.splice(index + 1, 0, newSheet);
      return copy;
    });
  };

  const addStrokeToSlide = (slideId: string, stroke: InkStroke) => {
    setSlideStrokes((prev) => ({
      ...prev,
      [slideId]: [...(prev[slideId] || []), stroke],
    }));
  };

  const removeStrokeFromSlide = (slideId: string, strokeId: string) => {
    setSlideStrokes((prev) => ({
      ...prev,
      [slideId]: (prev[slideId] || []).filter((s) => s.id !== strokeId),
    }));
  };

  const replaceStrokesOnSlide = (slideId: string, next: InkStroke[]) => {
    setSlideStrokes((prev) => ({
      ...prev,
      [slideId]: next,
    }));
  };

  const clearSlideStrokes = (slideId: string) => {
    setSlideStrokes((prev) => ({
      ...prev,
      [slideId]: [],
    }));
  };

  const sheetBgClass =
    boardTheme === 'chalkboard'
      ? 'bg-[#152c24] text-slate-100 border-emerald-900'
      : boardTheme === 'warm-paper'
      ? 'bg-[#fffdf6] text-slate-900 border-amber-200'
      : 'bg-white text-slate-900 border-slate-300';

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-slate-200/80">
      {/* Hidden File & Directory Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        multiple
        onChange={handleSingleFileSelect}
        className="hidden"
      />
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is standard in Chromium/WebView2 for folder picking
        webkitdirectory="true"
        directory="true"
        multiple
        onChange={handleFolderSelect}
        className="hidden"
      />

      {/* Top Sub-Toolbar for XP-Pen PDF & Folder Teaching */}
      <div className="min-h-[40px] px-3 py-1 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs z-30 print:hidden">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-sm transition"
          >
            <FileUp className="w-3.5 h-3.5 shrink-0" />
            <span>Mở File PDF / Ảnh</span>
          </button>

          <button
            onClick={() => folderInputRef.current?.click()}
            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-sm transition"
          >
            <FolderOpen className="w-3.5 h-3.5 shrink-0" />
            <span>Mở Thư Mục Đề</span>
          </button>

          <button
            onClick={() => insertBlankSheetAfter(slides.length - 1)}
            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold flex items-center gap-1 whitespace-nowrap shrink-0 transition"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>+ Thêm Trang Giấy Nháp</span>
          </button>

          {activeFileName && (
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium truncate max-w-[240px]">
              📄 {activeFileName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setZoomScale((z) => Math.max(0.65, +(z - 0.1).toFixed(2)))}
              className="p-0.5 hover:bg-white rounded"
              title="Thu nhỏ trang"
            >
              <ZoomOut className="w-3.5 h-3.5 text-slate-700" />
            </button>
            <span className="font-mono text-[11px] font-semibold text-slate-700 w-11 text-center">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              onClick={() => setZoomScale((z) => Math.min(1.6, +(z + 0.1).toFixed(2)))}
              className="p-0.5 hover:bg-white rounded"
              title="Phóng to trang"
            >
              <ZoomIn className="w-3.5 h-3.5 text-slate-700" />
            </button>
          </div>

          {/* Toggle 3D/Graph Math Board right next to the PDF! */}
          <button
            onClick={onToggleBoardBesidePdf}
            className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 border whitespace-nowrap shrink-0 transition ${
              showBoardBesidePdf
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                : 'bg-white hover:bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}
            title="Mở Bảng Vẽ Hình 3D / Đồ thị nằm cạnh trang PDF để vừa chữa đề PDF vừa dựng hình"
          >
            <Columns className="w-3.5 h-3.5 shrink-0" />
            <span>{showBoardBesidePdf ? 'Ẩn Bảng Vẽ 3D' : 'Mở Bảng Vẽ 3D Cạnh PDF'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold flex items-center gap-1 whitespace-nowrap shrink-0"
            title="Xuất/In toàn bộ trang PDF kèm chữ viết tay XP-Pen"
          >
            <Printer className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
            <span>Lưu PDF Bài Giảng</span>
          </button>
        </div>
      </div>

      {/* Main Content Area: Optional Folder Sidebar + Scrollable PDF/Ink Pages */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Folder File Explorer Sidebar (Shown when a Folder or multiple files are loaded) */}
        {folderFiles.length > 0 && (
          <div
            className={`bg-white border-r border-slate-200 flex flex-col transition-all duration-150 print:hidden ${
              sidebarOpen ? 'w-60' : 'w-9'
            }`}
          >
            <div className="h-9 px-2.5 border-b border-slate-100 flex items-center justify-between">
              {sidebarOpen && (
                <span className="text-[11px] font-bold text-slate-600 uppercase truncate">
                  Thư mục ({folderFiles.length} tài liệu)
                </span>
              )}
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className="p-1 rounded hover:bg-slate-100 text-slate-500"
                title={sidebarOpen ? 'Thu gọn danh sách file' : 'Mở danh sách file'}
              >
                {sidebarOpen ? (
                  <ChevronLeft className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            </div>

            {sidebarOpen && (
              <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
                {folderFiles.map((item, idx) => {
                  const isCurrent = activeFileName === item.file.name;
                  return (
                    <button
                      key={idx}
                      onClick={() => loadDocumentFile(item.file)}
                      className={`w-full px-2.5 py-2 rounded-lg text-left text-xs flex items-center gap-2 transition ${
                        isCurrent
                          ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <FileText className="w-4 h-4 shrink-0 text-blue-600" />
                      <span className="truncate">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Scrollable PDF & Blank Scratchpad Canvas Stream */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center gap-8">
          {loadingPdf && (
            <div className="py-12 px-6 rounded-2xl bg-white shadow-lg border border-slate-200 flex items-center gap-3 text-sm font-medium text-blue-700">
              <Sparkles className="w-5 h-5 animate-spin" />
              <span>Đang đọc và dựng trang PDF sắc nét cho bút XP-Pen...</span>
            </div>
          )}

          {slides.map((slide, sIdx) => {
            const strokes = slideStrokes[slide.id] || [];
            const scaledW = Math.round(slide.width * zoomScale);
            const scaledH = Math.round(slide.height * zoomScale);

            return (
              <div
                key={slide.id}
                style={{
                  width: `${scaledW}px`,
                  minHeight: `${scaledH}px`,
                  pageBreakAfter: 'always',
                }}
                className={`relative rounded-sm shadow-xl border overflow-hidden transition print:shadow-none print:border-none ${sheetBgClass}`}
              >
                {/* Top Slide Header Bar */}
                <div className="h-8 px-3 bg-slate-900/5 border-b border-slate-200/60 flex items-center justify-between text-[11px] font-sans print:hidden">
                  <span className="font-semibold text-slate-600">
                    {slide.label} (Trang {sIdx + 1}/{slides.length})
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => insertBlankSheetAfter(sIdx)}
                      className="px-2 py-0.5 rounded bg-white hover:bg-emerald-50 text-emerald-700 border border-slate-200 font-medium"
                      title="Chèn thêm 1 trang giấy nháp XP-Pen ngay dưới trang này để giải tiếp"
                    >
                      + Chèn trang giải bài bên dưới
                    </button>
                    {strokes.length > 0 && (
                      <button
                        onClick={() => clearSlideStrokes(slide.id)}
                        className="px-2 py-0.5 rounded bg-white hover:bg-red-50 text-red-600 border border-red-200 font-medium flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Xoá mực trang này
                      </button>
                    )}
                  </div>
                </div>

                {/* Page Body: PDF/Image Background OR Lined Grid Paper */}
                <div
                  style={{
                    height: `${scaledH - 32}px`,
                    backgroundImage:
                      slide.type === 'blank-sheet'
                        ? boardTheme === 'chalkboard'
                          ? 'radial-gradient(rgba(255,255,255,0.16) 1px, transparent 1px)'
                          : 'linear-gradient(to right, rgba(148,163,184,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.22) 1px, transparent 1px)'
                        : undefined,
                    backgroundSize: '24px 24px',
                  }}
                  className="relative w-full select-none"
                >
                  {slide.dataUrl ? (
                    <img
                      src={slide.dataUrl}
                      alt={slide.label}
                      className="w-full h-full object-contain pointer-events-none select-none"
                      draggable={false}
                    />
                  ) : (
                    <div className="p-4 text-xs text-slate-400 pointer-events-none print:hidden">
                      💡 Trang bảng viết tự do XP-Pen — Hoặc bấm nút <b>"Mở File PDF / Ảnh"</b> hay <b>"Mở Thư Mục Đề"</b> ở góc trái trên để nạp tài liệu vào chữa bài!
                    </div>
                  )}

                  {/* Full-Page XP-Pen Ink Layer directly over the PDF / Blank Sheet */}
                  <InkCanvasOverlay
                    strokes={strokes}
                    onAddStroke={(st) => addStrokeToSlide(slide.id, st)}
                    onRemoveStroke={(sId) => removeStrokeFromSlide(slide.id, sId)}
                    onReplaceStrokes={(next) => replaceStrokesOnSlide(slide.id, next)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
