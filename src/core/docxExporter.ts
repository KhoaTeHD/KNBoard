import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { saveAs } from 'file-saver';
import {
  ExamHeaderInfo,
  ExamQuestion,
  FunctionGraphState,
  Pyramid3DState,
  Triangle2DState,
} from '../types/exam';
import {
  generateFunctionGraphSvg,
  generatePyramid3DSvg,
  generateTriangle2DSvg,
} from './mathRenderer';

/**
 * Converts a simple LaTeX expression into clean Unicode Math readable & editable in MS Word
 */
function formatMathForWord(text: string): string {
  return text
    .replace(/\$/g, '')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\int_\{([^}]+)\}\^\{([^}]+)\}/g, '∫[$1→$2]')
    .replace(/\\lim_\{x \\to \+\\infty\}/g, 'lim(x→+∞)')
    .replace(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/g, (_, body) => {
      return '{ ' + body.replace(/\\\\/g, ' ; ').trim() + ' }';
    })
    .replace(/\\infty/g, '∞')
    .replace(/\\le/g, '≤')
    .replace(/\\ge/g, '≥')
    .replace(/\\ne/g, '≠')
    .replace(/\\pm/g, '±')
    .replace(/\\\,/g, ' ');
}

/**
 * Renders an SVG string to a high-DPI PNG Uint8Array so MS Word displays crisp figures
 */
async function svgStringToPngBytes(
  svgString: string,
  widthPx: number,
  heightPx: number
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgString], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const scale = 2; // 2x Retina DPI for crisp Word printouts
      const canvas = document.createElement('canvas');
      canvas.width = widthPx * scale;
      canvas.height = heightPx * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas context unavailable'));
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create PNG blob'));
          return;
        }
        blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
      }, 'image/png');
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });
}

export async function exportExamToDocx(
  header: ExamHeaderInfo,
  questions: ExamQuestion[],
  boardStates: {
    pyramid3D: Pyramid3DState;
    functionGraph: FunctionGraphState;
    triangle2D: Triangle2DState;
  }
): Promise<void> {
  const children: (Paragraph | Table)[] = [];

  // 1. Header Table (Sở GD&ĐT / Đề kiểm tra)
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: header.department,
                    bold: true,
                    font: 'Times New Roman',
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: header.school,
                    bold: true,
                    font: 'Times New Roman',
                    size: 24,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: header.examTitle,
                    bold: true,
                    font: 'Times New Roman',
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: header.subjectAndGrade,
                    bold: true,
                    font: 'Times New Roman',
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: header.duration,
                    italics: true,
                    font: 'Times New Roman',
                    size: 22,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  children.push(headerTable);

  // Student info line
  children.push(
    new Paragraph({
      spacing: { before: 160, after: 160 },
      children: [
        new TextRun({
          text: 'Họ và tên: ........................................................ Lớp: ............. Số báo danh: ...................',
          font: 'Times New Roman',
          size: 24,
        }),
      ],
    })
  );

  const mcQuestions = questions.filter((q) => q.part === 'multiple-choice');
  const essayQuestions = questions.filter((q) => q.part === 'essay');

  const appendQuestionToDoc = async (q: ExamQuestion) => {
    // Question stem
    children.push(
      new Paragraph({
        spacing: { before: 120, after: 80 },
        children: [
          new TextRun({
            text: `Câu ${q.number}. ${q.points ? `(${q.points}) ` : ''}`,
            bold: true,
            font: 'Times New Roman',
            size: 24,
          }),
          new TextRun({
            text: formatMathForWord(q.stemText),
            font: 'Times New Roman',
            size: 24,
          }),
        ],
      })
    );

    // Linked figure if present
    if (q.linkedFigure) {
      let svgStr = '';
      if (q.linkedFigure.boardType === '3d-pyramid') {
        svgStr = generatePyramid3DSvg(boardStates.pyramid3D, 360, 280, false);
      } else if (q.linkedFigure.boardType === 'function-graph') {
        svgStr = generateFunctionGraphSvg(
          boardStates.functionGraph,
          360,
          280,
          false
        );
      } else {
        svgStr = generateTriangle2DSvg(boardStates.triangle2D, 360, 280, false);
      }

      try {
        const pngBytes = await svgStringToPngBytes(svgStr, 360, 280);
        const alignMap = {
          left: AlignmentType.LEFT,
          center: AlignmentType.CENTER,
          right: AlignmentType.RIGHT,
        };
        children.push(
          new Paragraph({
            alignment: alignMap[q.linkedFigure.align] || AlignmentType.CENTER,
            spacing: { before: 80, after: 80 },
            children: [
              new ImageRun({
                data: pngBytes,
                transformation: {
                  width: q.linkedFigure.width,
                  height: Math.round(q.linkedFigure.width * 0.77),
                },
              }),
            ],
          })
        );
      } catch {
        // Fallback if image generation fails
      }
    }

    // Multiple-choice options A, B, C, D formatted in a borderless aligned table
    if (q.part === 'multiple-choice' && q.options) {
      const noBorder = {
        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      };

      const makeOptionCell = (key: 'A' | 'B' | 'C' | 'D', widthPct: number) =>
        new TableCell({
          width: { size: widthPct, type: WidthType.PERCENTAGE },
          borders: noBorder,
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: `${key}. `,
                  bold: true,
                  underline: q.correctOption === key ? {} : undefined,
                  font: 'Times New Roman',
                  size: 24,
                }),
                new TextRun({
                  text: formatMathForWord(q.options![key]),
                  font: 'Times New Roman',
                  size: 24,
                }),
              ],
            }),
          ],
        });

      if (q.optionLayout === '1-row') {
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  makeOptionCell('A', 25),
                  makeOptionCell('B', 25),
                  makeOptionCell('C', 25),
                  makeOptionCell('D', 25),
                ],
              }),
            ],
          })
        );
      } else if (q.optionLayout === '2-row') {
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [makeOptionCell('A', 50), makeOptionCell('B', 50)],
              }),
              new TableRow({
                children: [makeOptionCell('C', 50), makeOptionCell('D', 50)],
              }),
            ],
          })
        );
      } else {
        (['A', 'B', 'C', 'D'] as const).forEach((k) => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${k}. `,
                  bold: true,
                  font: 'Times New Roman',
                  size: 24,
                }),
                new TextRun({
                  text: formatMathForWord(q.options![k]),
                  font: 'Times New Roman',
                  size: 24,
                }),
              ],
            })
          );
        });
      }
    }
  };

  if (mcQuestions.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 160, after: 80 },
        children: [
          new TextRun({
            text: 'PHẦN I. TRẮC NGHIỆM',
            bold: true,
            font: 'Times New Roman',
            size: 24,
          }),
        ],
      })
    );
    for (const q of mcQuestions) {
      await appendQuestionToDoc(q);
    }
  }

  if (essayQuestions.length > 0) {
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 80 },
        children: [
          new TextRun({
            text: 'PHẦN II. TỰ LUẬN',
            bold: true,
            font: 'Times New Roman',
            size: 24,
          }),
        ],
      })
    );
    for (const q of essayQuestions) {
      await appendQuestionToDoc(q);
    }
  }

  const doc = new Document({
    sections: [
      {
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, 'De_Kiem_Tra_Toan_KNBoard.docx');
}
