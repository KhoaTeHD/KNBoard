import React, { useMemo } from 'react';
import katex from 'katex';

interface MathTextProps {
  text: string;
  className?: string;
}

/**
 * Ultra-fast KaTeX mixed text & formula renderer.
 * Parses $...$ inline math segments and renders them with textbook precision.
 */
export const MathText: React.FC<MathTextProps> = React.memo(({ text, className = '' }) => {
  const renderedHtml = useMemo(() => {
    if (!text) return '';
    // Split by $...$ segments
    const parts = text.split(/(\$[^$]+\$)/g);
    return parts
      .map((part) => {
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          const latex = part.slice(1, -1);
          try {
            return katex.renderToString(latex, {
              throwOnError: false,
              displayMode: latex.includes('\\begin{cases}') || latex.includes('\\int') || latex.includes('\\lim'),
            });
          } catch {
            return `<code>${latex}</code>`;
          }
        }
        // Escape basic HTML characters in plain text
        return part
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      })
      .join('');
  }, [text]);

  return (
    <span
      className={`leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
});
