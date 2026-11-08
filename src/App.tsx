import React, { useRef, useState } from 'react';
import { TopHeaderBar } from './components/layout/TopHeaderBar';
import { ExamEditorPane } from './components/exam-editor/ExamEditorPane';
import { MathBoardPane } from './components/math-board/MathBoardPane';
import { MathInputModal } from './components/math-input/MathInputModal';
import { PdfTeachingReader } from './components/pdf-reader/PdfTeachingReader';
import { useAppStore } from './store/useAppStore';

export function App() {
  const workspaceMode = useAppStore((s) => s.workspaceMode);

  // Draggable Split Ratio (in %) so teachers can resize Left/Right panes smoothly!
  const [splitRatio, setSplitRatio] = useState<number>(50);
  const [showBoardBesidePdf, setShowBoardBesidePdf] = useState<boolean>(false);
  const isDraggingSplitRef = useRef<boolean>(false);

  const handleSplitterPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingSplitRef.current = true;
  };

  const handleSplitterPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingSplitRef.current) return;
    const pct = (e.clientX / window.innerWidth) * 100;
    setSplitRatio(Math.max(28, Math.min(72, pct)));
  };

  const handleSplitterPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingSplitRef.current) return;
    isDraggingSplitRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const isSplitActive =
    workspaceMode === 'split' ||
    (workspaceMode === 'teaching' && showBoardBesidePdf);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 overflow-hidden">
      {/* Main Unified Top Toolbar */}
      <TopHeaderBar />

      {/* Main Workspace Area */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Left Pane: Either Smart A4 Exam Editor OR XP-Pen PDF/Folder Teaching Reader */}
        {(workspaceMode === 'split' || workspaceMode === 'editor-only') && (
          <div
            style={{ width: isSplitActive ? `${splitRatio}%` : '100%' }}
            className="h-full overflow-hidden"
          >
            <ExamEditorPane />
          </div>
        )}

        {workspaceMode === 'teaching' && (
          <div
            style={{ width: isSplitActive ? `${splitRatio}%` : '100%' }}
            className="h-full overflow-hidden"
          >
            <PdfTeachingReader
              showBoardBesidePdf={showBoardBesidePdf}
              onToggleBoardBesidePdf={() => setShowBoardBesidePdf((v) => !v)}
            />
          </div>
        )}

        {/* Resizable Vertical Splitter Handle */}
        {isSplitActive && (
          <div
            onPointerDown={handleSplitterPointerDown}
            onPointerMove={handleSplitterPointerMove}
            onPointerUp={handleSplitterPointerUp}
            title="Giữ chuột kéo qua trái / phải để thay đổi độ rộng 2 khung màn hình"
            className="w-2 h-full bg-slate-300/80 hover:bg-blue-500 active:bg-blue-600 cursor-col-resize flex items-center justify-center transition-colors z-40 shrink-0 print:hidden"
          >
            <div className="w-0.5 h-10 rounded-full bg-slate-500/70 pointer-events-none" />
          </div>
        )}

        {/* Right Pane: Interactive 2D/3D Geometry & Function Graph Whiteboard */}
        {(workspaceMode === 'split' ||
          workspaceMode === 'board-only' ||
          (workspaceMode === 'teaching' && showBoardBesidePdf)) && (
          <div
            style={{
              width: isSplitActive ? `${100 - splitRatio}%` : '100%',
            }}
            className="h-full overflow-hidden"
          >
            <MathBoardPane />
          </div>
        )}
      </main>

      {/* Math Formula Input Modal ("∫ Công thức") */}
      <MathInputModal />
    </div>
  );
}

export default App;
