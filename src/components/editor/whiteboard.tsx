'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Circle,
  Eraser,
  ArrowUpRight,
  PenLine,
  Redo2,
  Slash,
  Square,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Freehand whiteboard overlay for the editor screen. Local per user (not
 * Yjs-synced): used to sketch/illustrate an idea during an interview.
 *
 * Implementations notes:
 * - Drawing coordinates are normalized (0..1 of the canvas box) so the board
 *   survives window resizes without losing its contents.
 * - The action list is replayed on every repaint, which makes undo/redo a
 *   simple stack pop/push and keeps the canvas crisp at any devicePixelRatio.
 */

type Point = { x: number; y: number };

type Tool = "pen" | "eraser" | "line" | "rectangle" | "ellipse" | "arrow";

type PenAction = {
  tool: "pen" | "eraser";
  color: string;
  size: number;
  points: Point[];
};

type ShapeAction = {
  tool: "line" | "rectangle" | "ellipse" | "arrow";
  color: string;
  size: number;
  from: Point;
  to: Point;
};

type Action = PenAction | ShapeAction;

const WHITEBOARD_BG = "#ffffff";
const MAX_COLORS: string[] = [
  "#0F172A", // slate-900 (near-black marker)
  "#EF4444", // red
  "#F97316", // orange
  "#22C55E", // green
  "#3B82F6", // blue
  "#A855F7", // purple
];

/** Pen stroke widths per size selector. */
const PEN_SIZES = [2.5, 5, 10];
/** Eraser widths per size selector (wider than the pen by design). */
const ERASER_SIZES = [24, 40, 64];

const TOOLS: { id: Tool; label: string }[] = [
  { id: "pen", label: "Pen" },
  { id: "eraser", label: "Eraser" },
  { id: "line", label: "Line" },
  { id: "rectangle", label: "Rectangle" },
  { id: "ellipse", label: "Ellipse" },
  { id: "arrow", label: "Arrow" },
];

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Type guard: freehand strokes (pen/eraser) vs. geometric shapes. */
const isStrokeAction = (action: Action): action is PenAction =>
  action.tool === "pen" || action.tool === "eraser";

interface WhiteboardProps {
  /** Called by the X button; the header toggle also closes the board. */
  onClose?: () => void;
}

export function Whiteboard({ onClose }: WhiteboardProps) {
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(MAX_COLORS[0]);
  const [sizeIndex, setSizeIndex] = useState(1);
  // Refs mirror these so the repaint/rAF path never reads stale closures.
  const toolRef = useRef<Tool>(tool);
  const colorRef = useRef(color);
  const sizeIndexRef = useRef(sizeIndex);
  toolRef.current = tool;
  colorRef.current = color;
  sizeIndexRef.current = sizeIndex;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  /** Committed strokes/shapes, oldest first. Ref: mutated in pointer handlers. */
  const actionsRef = useRef<Action[]>([]);
  /** Actions popped by undo, available again via redo. */
  const redoRef = useRef<Action[]>([]);
  /** Stroke/shape currently being drawn; previewed live until pointer up. */
  const draftRef = useRef<Action | null>(null);
  const rafRef = useRef(0);

  // Button enable-state mirror of the two stacks (refs don't re-render).
  const [history, setHistory] = useState({ done: 0, undone: 0 });
  const syncHistory = useCallback(() => {
    setHistory({
      done: actionsRef.current.length,
      undone: redoRef.current.length,
    });
  }, []);

  const drawAction = useCallback((ctx: CanvasRenderingContext2D, action: Action) => {
    const canvas = ctx.canvas;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = action.tool === "eraser" ? WHITEBOARD_BG : action.color;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth =
      action.tool === "eraser" ? ERASER_SIZES[action.size] : action.size;

    const px = (v: number) => v * w;
    const py = (v: number) => v * h;

    if (isStrokeAction(action)) {
      const pts = action.points;
      // Single click without drag: draw a dot so taps still mark the board.
      if (pts.length === 1) {
        const r = Math.max(ctx.lineWidth / 2, 1.25);
        ctx.beginPath();
        ctx.arc(px(pts[0].x), py(pts[0].y), r, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      // Quad-curve through segment midpoints for a smooth freehand stroke.
      ctx.beginPath();
      ctx.moveTo(px(pts[0].x), py(pts[0].y));
      for (let i = 1; i < pts.length - 1; i++) {
        const midX = (px(pts[i].x) + px(pts[i + 1].x)) / 2;
        const midY = (py(pts[i].y) + py(pts[i + 1].y)) / 2;
        ctx.quadraticCurveTo(px(pts[i].x), py(pts[i].y), midX, midY);
      }
      ctx.lineTo(px(pts[pts.length - 1].x), py(pts[pts.length - 1].y));
      ctx.stroke();
      return;
    }

    const fromX = px(action.from.x);
    const fromY = py(action.from.y);
    const toX = px(action.to.x);
    const toY = py(action.to.y);

    if (action.tool === "line") {
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();
    } else if (action.tool === "rectangle") {
      ctx.strokeRect(
        Math.min(fromX, toX),
        Math.min(fromY, toY),
        Math.abs(toX - fromX),
        Math.abs(toY - fromY)
      );
    } else if (action.tool === "ellipse") {
      const rx = Math.max(Math.abs(toX - fromX) / 2, 0.5);
      const ry = Math.max(Math.abs(toY - fromY) / 2, 0.5);
      ctx.beginPath();
      ctx.ellipse(
        Math.min(fromX, toX) + rx,
        Math.min(fromY, toY) + ry,
        rx,
        ry,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    } else if (action.tool === "arrow") {
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();
      // Arrowhead: two short lines fanned ±30° around the line direction.
      const angle = Math.atan2(toY - fromY, toX - fromX);
      const head = Math.max(ctx.lineWidth * 3.5, 10);
      for (const spread of [Math.PI - Math.PI / 6, Math.PI + Math.PI / 6]) {
        const tipX = toX + head * Math.cos(angle + spread);
        const tipY = toY + head * Math.sin(angle + spread);
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
      }
    }
  }, []);

  /** Clear canvas to white and replay every committed action (+ live draft). */
  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = WHITEBOARD_BG;
    ctx.fillRect(0, 0, rect.width, rect.height);
    for (const action of actionsRef.current) drawAction(ctx, action);
    if (draftRef.current) drawAction(ctx, draftRef.current);
  }, [drawAction]);

  const schedulePaint = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      repaint();
    });
  }, [repaint]);

  /** Keep the backing store at CSS size × devicePixelRatio for crisp lines. */
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(window.devicePixelRatio || 1, 1);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    repaint();
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      resizeCanvas();
      repaint();
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [resizeCanvas, repaint]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const getPos = useCallback((e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: clamp01((e.clientX - rect.left) / rect.width),
      y: clamp01((e.clientY - rect.top) / rect.height),
    };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      const canvas = canvasRef.current;
      if (canvas) {
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {
          /* pointer already released */
        }
      }
      const pos = getPos(e);
      const activeTool = toolRef.current;
      const base = { color: colorRef.current, size: sizeIndexRef.current };
      if (activeTool === "pen" || activeTool === "eraser") {
        draftRef.current = { tool: activeTool, ...base, points: [pos] };
      } else {
        draftRef.current = { tool: activeTool, ...base, from: pos, to: pos };
      }
      schedulePaint();
    },
    [getPos, schedulePaint]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const draft = draftRef.current;
      if (!draft) return;
      // Lost the button mid-stroke (pointer capture edge case): end the stroke.
      if (e.pointerType === "mouse" && e.buttons === 0) {
        actionsRef.current.push(draft);
        redoRef.current = [];
        draftRef.current = null;
        repaint();
        syncHistory();
        return;
      }
      e.preventDefault();
      const pos = getPos(e);
      if (isStrokeAction(draft)) {
        draft.points.push(pos);
      } else {
        draft.to = pos;
      }
      schedulePaint();
    },
    [getPos, schedulePaint, repaint, syncHistory]
  );

  const endStroke = useCallback(() => {
    const draft = draftRef.current;
    if (!draft) return;
    actionsRef.current.push(draft);
    // A new action invalidates the redo stack (standard editor semantics).
    redoRef.current = [];
    draftRef.current = null;
    repaint();
    syncHistory();
  }, [repaint, syncHistory]);

  const handlePointerUp = useCallback(() => {
    endStroke();
  }, [endStroke]);

  const handleUndo = useCallback(() => {
    const action = actionsRef.current.pop();
    if (!action) return;
    redoRef.current.push(action);
    repaint();
    syncHistory();
  }, [repaint, syncHistory]);

  const handleRedo = useCallback(() => {
    const action = redoRef.current.pop();
    if (!action) return;
    actionsRef.current.push(action);
    repaint();
    syncHistory();
  }, [repaint, syncHistory]);

  const handleClear = useCallback(() => {
    if (actionsRef.current.length === 0) return;
    if (
      !window.confirm(
        "Clear the whiteboard? This wipes the sketch for everyone's view of your screen and cannot be undone."
      )
    ) {
      return;
    }
    actionsRef.current = [];
    redoRef.current = [];
    repaint();
    syncHistory();
  }, [repaint, syncHistory]);

  const toolButtonClass = (active: boolean) =>
    cn(
      "shrink-0 p-2 rounded-lg transition-colors flex items-center gap-2",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
      active
        ? "bg-accent/20 text-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    );

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col select-none bg-card/95 backdrop-blur-sm"
      role="group"
      aria-label="Whiteboard"
    >
      {/* Toolbar */}
      <div
        className="shrink-0 bg-card px-3 py-2 border-b border-border flex items-center gap-1 overflow-x-auto"
        role="toolbar"
        aria-label="Whiteboard tools"
      >
        <span className="shrink-0 flex items-center gap-2 text-sm font-medium text-foreground pr-1">
          <PenLine className="w-4 h-4 text-accent" />
          <span className="hidden sm:inline">Whiteboard</span>
        </span>

        <div className="w-px h-5 bg-border shrink-0 mx-1" />

        {/* Tools */}
        {TOOLS.map(({ id, label }) => {
          const ToolIcon =
            id === "pen"
              ? PenLine
              : id === "eraser"
                ? Eraser
                : id === "line"
                  ? Slash
                  : id === "rectangle"
                    ? Square
                    : id === "ellipse"
                      ? Circle
                      : ArrowUpRight;
          return (
            <button
              key={id}
              onClick={() => setTool(id)}
              aria-pressed={tool === id}
              aria-label={`${label} tool`}
              title={label}
              className={toolButtonClass(tool === id)}
            >
              <ToolIcon className="w-4 h-4" />
              <span className="hidden md:inline text-sm">{label}</span>
            </button>
          );
        })}

        <div className="w-px h-5 bg-border shrink-0 mx-1" />

        {/* Colors */}
        <div className="shrink-0 flex items-center gap-1.5 pr-1" role="radiogroup" aria-label="Marker color">
          {MAX_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                setColor(c);
                // Picking a color implicitly leaves the eraser behind.
                if (toolRef.current === "eraser") setTool("pen");
              }}
              aria-pressed={color === c}
              aria-label={`Color ${c}`}
              title={`Color ${c}`}
              className={cn(
                "w-5 h-5 rounded-full shrink-0 transition-transform",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                color === c ? "ring-2 ring-offset-1 ring-offset-card ring-accent scale-110" : "hover:scale-105"
              )}
              style={{ backgroundColor: c, border: "1px solid rgba(15,23,42,0.25)" }}
            />
          ))}
        </div>

        <div className="w-px h-5 bg-border shrink-0 mx-1" />

        {/* Stroke sizes */}
        <div className="shrink-0 flex items-center gap-1" role="radiogroup" aria-label="Stroke size">
          {PEN_SIZES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSizeIndex(i)}
              aria-pressed={sizeIndex === i}
              aria-label={["Thin stroke", "Medium stroke", "Thick stroke"][i]}
              title={["Thin stroke", "Medium stroke", "Thick stroke"][i]}
              className={cn(
                "p-1.5 rounded-lg flex items-center justify-center transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                sizeIndex === i
                  ? "bg-accent/20"
                  : "hover:bg-muted"
              )}
            >
              <span
                className="block rounded-full bg-current text-muted-foreground"
                style={{ width: 4 + i * 3, height: 4 + i * 3 }}
              />
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-2" />

        {/* History & panel actions */}
        <button
          onClick={handleUndo}
          disabled={history.done === 0}
          className={cn(
            "shrink-0 p-2 rounded-lg transition-colors flex items-center gap-2",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            history.done === 0
              ? "opacity-50 cursor-not-allowed text-muted-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
          title="Undo"
          aria-label="Undo"
        >
          <Undo2 className="w-4 h-4" />
          <span className="hidden lg:inline text-sm">Undo</span>
        </button>
        <button
          onClick={handleRedo}
          disabled={history.undone === 0}
          className={cn(
            "shrink-0 p-2 rounded-lg transition-colors flex items-center gap-2",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            history.undone === 0
              ? "opacity-50 cursor-not-allowed text-muted-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
          title="Redo"
          aria-label="Redo"
        >
          <Redo2 className="w-4 h-4" />
          <span className="hidden lg:inline text-sm">Redo</span>
        </button>
        <button
          onClick={handleClear}
          disabled={history.done === 0}
          className={cn(
            "shrink-0 p-2 rounded-lg transition-colors flex items-center gap-2",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            history.done === 0
              ? "opacity-50 cursor-not-allowed text-muted-foreground"
              : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          )}
          title="Clear whiteboard"
          aria-label="Clear whiteboard"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden lg:inline text-sm">Clear</span>
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="shrink-0 p-2 text-muted-foreground rounded-lg transition-colors hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            title="Close whiteboard"
            aria-label="Close whiteboard"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Canvas area: solid white board, rounded to match the app's panels */}
      <div className="flex-1 min-h-0 mx-3 mb-3 rounded-xl border border-border overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-full block touch-none cursor-crosshair"
          aria-label="Whiteboard drawing surface"
        />
      </div>
    </div>
  );
}
