import React, { useRef, useState } from 'react';
import { InkPoint, InkStroke } from '../../types/exam';
import { useAppStore } from '../../store/useAppStore';

interface InkCanvasOverlayProps {
  strokes: InkStroke[];
  onAddStroke: (stroke: InkStroke) => void;
  onRemoveStroke: (id: string) => void;
  onReplaceStrokes?: (newStrokes: InkStroke[]) => void;
  className?: string;
}

interface LaserTrailPoint {
  x: number;
  y: number;
  timestamp: number;
}

function pointsToSvgPath(points: InkPoint[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)} L ${(p.x + 0.5).toFixed(1)} ${(p.y + 0.5).toFixed(1)}`;
  }
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)}, ${midX.toFixed(1)} ${midY.toFixed(1)}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return d;
}

/**
 * Exact geometric distance from point P(px, py) to line segment AB(ax, ay -> bx, by).
 */
export function pointToSegmentDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return Math.hypot(px - projX, py - projY);
}

/**
 * Subdivides any long segment in a stroke into dense points (~4px apart)
 * so that the Partial Eraser can cleanly carve out ONLY the touched section
 * without deleting the entire line!
 */
function densifyPoints(points: InkPoint[], maxStep = 4): InkPoint[] {
  if (points.length <= 1) return points;
  const out: InkPoint[] = [points[0]];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    if (dist > maxStep) {
      const steps = Math.ceil(dist / maxStep);
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        out.push({
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
          pressure: a.pressure + (b.pressure - a.pressure) * t,
        });
      }
    }
    out.push(b);
  }
  return out;
}

/**
 * Carves out circular eraser region (pt.x, pt.y, radius) from an array of strokes,
 * splitting any intersected stroke into the remaining untouched sub-strokes!
 */
export function partialEraseStrokes(
  strokes: InkStroke[],
  pt: InkPoint,
  eraserRadius = 14
): { changed: boolean; nextStrokes: InkStroke[] } {
  let changed = false;
  const nextStrokes: InkStroke[] = [];

  for (const st of strokes) {
    const effectiveRadius = eraserRadius + st.size * 0.35;
    // Quick bounding/segment check to see if this stroke is touched at all
    let isTouched = false;
    if (st.points.length === 1) {
      if (Math.hypot(st.points[0].x - pt.x, st.points[0].y - pt.y) <= effectiveRadius) {
        isTouched = true;
      }
    } else {
      for (let i = 0; i < st.points.length - 1; i++) {
        if (
          pointToSegmentDistance(
            pt.x,
            pt.y,
            st.points[i].x,
            st.points[i].y,
            st.points[i + 1].x,
            st.points[i + 1].y
          ) <= effectiveRadius
        ) {
          isTouched = true;
          break;
        }
      }
    }

    if (!isTouched) {
      nextStrokes.push(st);
      continue;
    }

    // This stroke is touched by the eraser! Densify it and split into surviving chunks
    changed = true;
    const densePts = densifyPoints(st.points, 4);
    let currentChunk: InkPoint[] = [];
    let chunkIndex = 0;

    for (const p of densePts) {
      const insideEraser = Math.hypot(p.x - pt.x, p.y - pt.y) <= effectiveRadius;
      if (insideEraser) {
        if (currentChunk.length >= 2) {
          nextStrokes.push({
            ...st,
            id: `${st.id}_p${chunkIndex++}_${Math.random().toString(36).slice(2, 5)}`,
            points: currentChunk,
          });
        }
        currentChunk = [];
      } else {
        currentChunk.push(p);
      }
    }

    if (currentChunk.length >= 2) {
      nextStrokes.push({
        ...st,
        id: `${st.id}_p${chunkIndex++}_${Math.random().toString(36).slice(2, 5)}`,
        points: currentChunk,
      });
    }
  }

  return { changed, nextStrokes };
}

/**
 * Dual-Layer Zero-Latency Ink Overlay for XP-Pen / Wacom Tablets
 * - Partial Pixel-Accurate Eraser: erases ONLY the exact area under the eraser circle!
 * - Hold-to-Snap-Line (0.45s hold automatically snaps freehand stroke into a straight line)
 * - Laser Pointer with glowing trail
 */
export const InkCanvasOverlay: React.FC<InkCanvasOverlayProps> = ({
  strokes,
  onAddStroke,
  onRemoveStroke,
  onReplaceStrokes,
  className = '',
}) => {
  const penTool = useAppStore((s) => s.penTool);
  const penColor = useAppStore((s) => s.penColor);
  const penSize = useAppStore((s) => s.penSize);
  const eraserSize = useAppStore((s) => s.eraserSize);
  const shapeSnapEnabled = useAppStore((s) => s.shapeSnapEnabled);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [activePoints, setActivePoints] = useState<InkPoint[]>([]);
  const [laserPoints, setLaserPoints] = useState<LaserTrailPoint[]>([]);
  const [eraserCursor, setEraserCursor] = useState<{ x: number; y: number } | null>(
    null
  );
  const [isSnappedLine, setIsSnappedLine] = useState(false);
  const holdTimerRef = useRef<number | null>(null);
  const isDrawingRef = useRef(false);

  const isInteractive = penTool !== 'select';

  const getLocalCoords = (e: React.PointerEvent<SVGSVGElement>): InkPoint => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0, pressure: 0.5 };
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pointerType === 'pen' ? Math.max(0.2, e.pressure) : 0.6,
    };
  };

  const eraseAtPoint = (pt: InkPoint) => {
    if (onReplaceStrokes) {
      const { changed, nextStrokes } = partialEraseStrokes(strokes, pt, eraserSize);
      if (changed) {
        onReplaceStrokes(nextStrokes);
      }
      return;
    }
    // Fallback if onReplaceStrokes is not provided
    for (const st of strokes) {
      for (let i = 0; i < st.points.length - 1; i++) {
        if (
          pointToSegmentDistance(
            pt.x,
            pt.y,
            st.points[i].x,
            st.points[i].y,
            st.points[i + 1].x,
            st.points[i + 1].y
          ) <= eraserSize
        ) {
          onRemoveStroke(st.id);
          break;
        }
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isInteractive) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    setIsSnappedLine(false);

    const pt = getLocalCoords(e);

    if (penTool === 'eraser' || e.button === 5 || e.button === 2) {
      setEraserCursor({ x: pt.x, y: pt.y });
      eraseAtPoint(pt);
      return;
    }

    if (penTool === 'laser') {
      setLaserPoints([{ x: pt.x, y: pt.y, timestamp: Date.now() }]);
      return;
    }

    setActivePoints([pt]);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isInteractive) return;
    const pt = getLocalCoords(e);

    if (penTool === 'eraser') {
      setEraserCursor({ x: pt.x, y: pt.y });
    } else if (eraserCursor) {
      setEraserCursor(null);
    }

    if (!isDrawingRef.current) return;
    e.stopPropagation();

    if (penTool === 'eraser' || e.buttons === 32 || e.buttons === 2) {
      eraseAtPoint(pt);
      return;
    }

    if (penTool === 'laser') {
      const now = Date.now();
      setLaserPoints((prev) => [
        ...prev.filter((p) => now - p.timestamp < 550),
        { x: pt.x, y: pt.y, timestamp: now },
      ]);
      return;
    }

    if (isSnappedLine) {
      setActivePoints((prev) => (prev.length > 0 ? [prev[0], pt] : [pt]));
      return;
    }

    setActivePoints((prev) => [...prev, pt]);

    if (shapeSnapEnabled) {
      if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = window.setTimeout(() => {
        setActivePoints((curr) => {
          if (curr.length >= 5) {
            const first = curr[0];
            const last = curr[curr.length - 1];
            if (Math.hypot(last.x - first.x, last.y - first.y) > 25) {
              setIsSnappedLine(true);
              return [first, last];
            }
          }
          return curr;
        });
      }, 450);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    if (penTool === 'laser') {
      window.setTimeout(() => setLaserPoints([]), 350);
      return;
    }

    if (
      (penTool === 'pen' || penTool === 'highlighter') &&
      activePoints.length > 0
    ) {
      onAddStroke({
        id: `ink_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        tool: penTool,
        color: penColor,
        size: penTool === 'highlighter' ? 18 : penSize,
        points: activePoints,
      });
    }

    setActivePoints([]);
    setIsSnappedLine(false);
  };

  const handlePointerLeave = () => {
    setEraserCursor(null);
  };

  return (
    <svg
      ref={svgRef}
      onContextMenu={(e) => {
        if (isInteractive) e.preventDefault();
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      className={`inset-0 w-full h-full touch-none select-none ${
        isInteractive
          ? penTool === 'eraser'
            ? 'pointer-events-auto cursor-none'
            : 'pointer-events-auto cursor-crosshair'
          : 'pointer-events-none'
      } ${className}`}
      style={{ position: 'absolute', zIndex: 25 }}
    >
      {/* Layer 1: Static Dry Ink Strokes */}
      {strokes.map((st) => (
        <path
          key={st.id}
          d={pointsToSvgPath(st.points)}
          fill="none"
          stroke={st.color}
          strokeWidth={st.size}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={st.tool === 'highlighter' ? 0.35 : 0.95}
          style={
            st.tool === 'highlighter' ? { mixBlendMode: 'multiply' } : undefined
          }
        />
      ))}

      {/* Layer 2: Active Wet Ink Stroke */}
      {activePoints.length > 0 && (
        <path
          d={pointsToSvgPath(activePoints)}
          fill="none"
          stroke={penColor}
          strokeWidth={penTool === 'highlighter' ? 18 : penSize}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={penTool === 'highlighter' ? 0.35 : 0.95}
        />
      )}

      {/* Layer 3: Laser Pointer Glowing Trail */}
      {laserPoints.length > 1 && (
        <>
          <path
            d={pointsToSvgPath(
              laserPoints.map((p) => ({ x: p.x, y: p.y, pressure: 1 }))
            )}
            fill="none"
            stroke="#ef4444"
            strokeWidth="7"
            strokeLinecap="round"
            strokeOpacity="0.3"
          />
          <path
            d={pointsToSvgPath(
              laserPoints.map((p) => ({ x: p.x, y: p.y, pressure: 1 }))
            )}
            fill="none"
            stroke="#dc2626"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <circle
            cx={laserPoints[laserPoints.length - 1].x}
            cy={laserPoints[laserPoints.length - 1].y}
            r="5.5"
            fill="#ef4444"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
        </>
      )}

      {/* Visual Eraser Ring showing exact partial-erase radius */}
      {penTool === 'eraser' && eraserCursor && (
        <circle
          cx={eraserCursor.x}
          cy={eraserCursor.y}
          r={eraserSize}
          fill="rgba(255, 255, 255, 0.78)"
          stroke="#ef4444"
          strokeWidth="1.8"
        />
      )}
    </svg>
  );
};
