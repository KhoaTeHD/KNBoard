import React, { useState, useMemo } from 'react';
import katex from 'katex';
import { X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface MathShortcut {
  label: string;
  latex: string;
  display?: string;
}

const SHORTCUT_ROWS: MathShortcut[][] = [
  [
    { label: 'xⁿ', latex: 'x^{2}' },
    { label: 'xₙ', latex: 'x_{1}' },
    { label: 'a/b', latex: '\\frac{a}{b}' },
    { label: '√x', latex: '\\sqrt{x}' },
    { label: 'ⁿ√x', latex: '\\sqrt[3]{x}' },
    { label: '|x|', latex: '\\left|x\\right|' },
    { label: '{hệ}', latex: '\\begin{cases} x + y = 3 \\\\ x - y = 1 \\end{cases}' },
    { label: '[hệ]', latex: '\\left[\\begin{matrix} x = 1 \\\\ x = -1 \\end{matrix}\\right.' },
  ],
  [
    { label: '∫', latex: '\\int_{0}^{1} \\sqrt{x} \\, dx' },
    { label: '∑', latex: '\\sum_{i=1}^{n} x_i' },
    { label: 'lim', latex: '\\lim_{x \\to +\\infty} \\frac{2x + 1}{x - 3}' },
    { label: 'log', latex: '\\log_{2}(x)' },
    { label: 'ln', latex: '\\ln(x)' },
    { label: '→', latex: '\\rightarrow' },
    { label: '⇒', latex: '\\Rightarrow' },
    { label: '⇔', latex: '\\Leftrightarrow' },
  ],
  [
    { label: 'véc-tơ', latex: '\\overrightarrow{AB}' },
    { label: 'góc', latex: '\\widehat{ABC}' },
    { label: 'độ °', latex: '60^{\\circ}' },
    { label: '∞', latex: '+\\infty' },
    { label: '≤', latex: '\\le' },
    { label: '≥', latex: '\\ge' },
    { label: '≠', latex: '\\ne' },
    { label: '±', latex: '\\pm' },
  ],
  [
    { label: '∈', latex: '\\in' },
    { label: '∉', latex: '\\notin' },
    { label: '⊂', latex: '\\subset' },
    { label: '∪', latex: '\\cup' },
    { label: '∩', latex: '\\cap' },
    { label: '∀', latex: '\\forall' },
    { label: '∃', latex: '\\exists' },
    { label: 'ℝ', latex: '\\mathbb{R}' },
  ],
  [
    { label: 'π', latex: '\\pi' },
    { label: 'α', latex: '\\alpha' },
    { label: 'β', latex: '\\beta' },
    { label: 'Δ', latex: '\\Delta' },
    { label: '⊥', latex: '\\perp' },
    { label: '∥', latex: '\\parallel' },
    { label: 'sin', latex: '\\sin(x)' },
    { label: 'cos', latex: '\\cos(x)' },
  ],
];

export const MathInputModal: React.FC = () => {
  const isOpen = useAppStore((s) => s.isMathModalOpen);
  const setOpen = useAppStore((s) => s.setMathModalOpen);
  const insertFormula = useAppStore((s) => s.insertFormulaIntoActiveQuestion);

  const [latexInput, setLatexInput] = useState<string>(
    '\\begin{cases} x + y = 3 \\\\ x - y = 1 \\end{cases}'
  );

  const previewHtml = useMemo(() => {
    try {
      return katex.renderToString(latexInput || '\\text{Nhập công thức...}', {
        throwOnError: false,
        displayMode: true,
      });
    } catch {
      return '<span class="text-red-500">Lỗi cú pháp LaTeX</span>';
    }
  }, [latexInput]);

  if (!isOpen) return null;

  const handleInsert = () => {
    if (!latexInput.trim()) return;
    insertFormula(latexInput.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 backdrop-blur-[1px]">
      <div className="w-[440px] rounded-xl bg-white shadow-2xl border border-slate-200 p-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-600">
            Soạn công thức (Enter = chèn vào câu đang chọn)
          </span>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live KaTeX Preview + Input Box */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 rounded-lg border-2 border-blue-500 bg-slate-50/60 px-3 py-2">
            <div
              className="min-h-[42px] flex items-center justify-start overflow-x-auto text-slate-900 border-b border-slate-200 pb-1.5 mb-1.5"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
            <input
              type="text"
              value={latexInput}
              onChange={(e) => setLatexInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleInsert();
              }}
              placeholder="Gõ LaTeX hoặc bấm nút bên dưới..."
              className="w-full bg-transparent text-xs font-mono text-slate-700 focus:outline-none"
              autoFocus
            />
          </div>
          <button
            onClick={handleInsert}
            className="h-[68px] px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition"
          >
            Chèn
          </button>
        </div>

        {/* Quick Mode Bar */}
        <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100">
          <div className="flex gap-1.5">
            <span className="px-2.5 py-1 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              ∑ Toán chuẩn SGK
            </span>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setLatexInput('')}
              className="px-2.5 py-1 rounded text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
            >
              Xoá hết
            </button>
          </div>
        </div>

        {/* Math Virtual Keypad */}
        <div className="space-y-1.5">
          {SHORTCUT_ROWS.map((row, rIdx) => (
            <div key={rIdx} className="grid grid-cols-8 gap-1">
              {row.map((btn, bIdx) => (
                <button
                  key={bIdx}
                  type="button"
                  onClick={() =>
                    setLatexInput((prev) =>
                      btn.latex.includes('cases') ||
                      btn.latex.includes('int') ||
                      btn.latex.includes('lim')
                        ? btn.latex
                        : `${prev} ${btn.latex}`.trim()
                    )
                  }
                  className="h-8 rounded border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-xs font-serif font-medium text-slate-800 flex items-center justify-center transition"
                  title={btn.latex}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
