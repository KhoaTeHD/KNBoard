import React from 'react';
import { TopHeaderBar } from './components/layout/TopHeaderBar';
import { ExamEditorPane } from './components/exam-editor/ExamEditorPane';
import { MathBoardPane } from './components/math-board/MathBoardPane';
import { MathInputModal } from './components/math-input/MathInputModal';
import { useAppStore } from './store/useAppStore';

export function App() {
  const workspaceMode = useAppStore((s) => s.workspaceMode);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 overflow-hidden">
      {/* Main Unified Top Toolbar */}
      <TopHeaderBar />

      {/* Main Workspace Area */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Left Pane: Smart A4 Exam Editor & XP-Pen Live Teaching Sheet */}
        {(workspaceMode === 'split' ||
          workspaceMode === 'editor-only' ||
          workspaceMode === 'teaching') && (
          <div
            className={`h-full transition-all duration-200 ${
              workspaceMode === 'split'
                ? 'w-[50%] border-r border-slate-300'
                : 'w-full'
            }`}
          >
            <ExamEditorPane />
          </div>
        )}

        {/* Right Pane: Interactive 2D/3D Geometry & Function Graph Whiteboard */}
        {(workspaceMode === 'split' || workspaceMode === 'board-only') && (
          <div
            className={`h-full transition-all duration-200 ${
              workspaceMode === 'split' ? 'w-[50%]' : 'w-full'
            }`}
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
