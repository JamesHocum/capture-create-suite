import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Pencil, ArrowUp, Square, Circle, Type, Undo2, Redo2, Save, X, Palette,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Tool = "freehand" | "arrow" | "rectangle" | "circle" | "text";

interface DrawAction {
  tool: Tool;
  color: string;
  lineWidth: number;
  points?: { x: number; y: number }[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  text?: string;
  fontSize?: number;
}

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6",
  "#8b5cf6", "#ec4899", "#ffffff", "#000000",
];

interface AnnotationEditorProps {
  imageUrl: string;
  onSave: (blob: Blob) => void;
  onClose: () => void;
}

export function AnnotationEditor({ imageUrl, onSave, onClose }: AnnotationEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>("freehand");
  const [color, setColor] = useState("#ef4444");
  const [lineWidth, setLineWidth] = useState(3);
  const [fontSize, setFontSize] = useState(24);
  const [actions, setActions] = useState<DrawAction[]>([]);
  const [redoStack, setRedoStack] = useState<DrawAction[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [currentAction, setCurrentAction] = useState<DrawAction | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const maxW = Math.min(window.innerWidth - 100, 1200);
      const scale = Math.min(maxW / img.width, (window.innerHeight - 200) / img.height, 1);
      setCanvasSize({ w: Math.round(img.width * scale), h: Math.round(img.height * scale) });
      setImage(img);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    [...actions, currentAction].filter(Boolean).forEach((a) => {
      if (!a) return;
      ctx.strokeStyle = a.color;
      ctx.fillStyle = a.color;
      ctx.lineWidth = a.lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (a.tool === "freehand" && a.points && a.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(a.points[0].x, a.points[0].y);
        a.points.forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.stroke();
      } else if (a.tool === "arrow" && a.start && a.end) {
        const dx = a.end.x - a.start.x;
        const dy = a.end.y - a.start.y;
        const angle = Math.atan2(dy, dx);
        const headLen = 15;
        ctx.beginPath();
        ctx.moveTo(a.start.x, a.start.y);
        ctx.lineTo(a.end.x, a.end.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(a.end.x, a.end.y);
        ctx.lineTo(a.end.x - headLen * Math.cos(angle - Math.PI / 6), a.end.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(a.end.x, a.end.y);
        ctx.lineTo(a.end.x - headLen * Math.cos(angle + Math.PI / 6), a.end.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      } else if (a.tool === "rectangle" && a.start && a.end) {
        ctx.beginPath();
        ctx.strokeRect(a.start.x, a.start.y, a.end.x - a.start.x, a.end.y - a.start.y);
      } else if (a.tool === "circle" && a.start && a.end) {
        const rx = Math.abs(a.end.x - a.start.x) / 2;
        const ry = Math.abs(a.end.y - a.start.y) / 2;
        const cx = a.start.x + (a.end.x - a.start.x) / 2;
        const cy = a.start.y + (a.end.y - a.start.y) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (a.tool === "text" && a.start && a.text) {
        ctx.font = `${a.fontSize || 24}px 'Space Grotesk', sans-serif`;
        ctx.fillText(a.text, a.start.x, a.start.y);
      }
    });
  }, [image, actions, currentAction]);

  useEffect(() => { redrawCanvas(); }, [redrawCanvas]);

  const getPos = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getPos(e);
    if (tool === "text") {
      const text = prompt("Enter text:");
      if (text) {
        const action: DrawAction = { tool, color, lineWidth, start: pos, text, fontSize };
        setActions((prev) => [...prev, action]);
        setRedoStack([]);
      }
      return;
    }
    setDrawing(true);
    if (tool === "freehand") {
      setCurrentAction({ tool, color, lineWidth, points: [pos] });
    } else {
      setCurrentAction({ tool, color, lineWidth, start: pos, end: pos });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing || !currentAction) return;
    const pos = getPos(e);
    if (tool === "freehand") {
      setCurrentAction((prev) => prev ? { ...prev, points: [...(prev.points || []), pos] } : null);
    } else {
      setCurrentAction((prev) => prev ? { ...prev, end: pos } : null);
    }
  };

  const handleMouseUp = () => {
    if (!drawing || !currentAction) return;
    setDrawing(false);
    setActions((prev) => [...prev, currentAction]);
    setRedoStack([]);
    setCurrentAction(null);
  };

  const undo = () => {
    setActions((prev) => {
      if (prev.length === 0) return prev;
      setRedoStack((r) => [...r, prev[prev.length - 1]]);
      return prev.slice(0, -1);
    });
  };

  const redo = () => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      setActions((a) => [...a, prev[prev.length - 1]]);
      return prev.slice(0, -1);
    });
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Render at full resolution
    const fullCanvas = document.createElement("canvas");
    fullCanvas.width = image!.width;
    fullCanvas.height = image!.height;
    const ctx = fullCanvas.getContext("2d")!;
    const scaleX = image!.width / canvas.width;
    const scaleY = image!.height / canvas.height;
    ctx.drawImage(image!, 0, 0);
    
    actions.forEach((a) => {
      ctx.strokeStyle = a.color;
      ctx.fillStyle = a.color;
      ctx.lineWidth = a.lineWidth * scaleX;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (a.tool === "freehand" && a.points && a.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(a.points[0].x * scaleX, a.points[0].y * scaleY);
        a.points.forEach((p) => ctx.lineTo(p.x * scaleX, p.y * scaleY));
        ctx.stroke();
      } else if (a.tool === "arrow" && a.start && a.end) {
        const sx = a.start.x * scaleX, sy = a.start.y * scaleY;
        const ex = a.end.x * scaleX, ey = a.end.y * scaleY;
        const angle = Math.atan2(ey - sy, ex - sx);
        const headLen = 15 * scaleX;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      } else if (a.tool === "rectangle" && a.start && a.end) {
        ctx.strokeRect(a.start.x * scaleX, a.start.y * scaleY, (a.end.x - a.start.x) * scaleX, (a.end.y - a.start.y) * scaleY);
      } else if (a.tool === "circle" && a.start && a.end) {
        const rx = Math.abs(a.end.x - a.start.x) / 2 * scaleX;
        const ry = Math.abs(a.end.y - a.start.y) / 2 * scaleY;
        const cx = (a.start.x + (a.end.x - a.start.x) / 2) * scaleX;
        const cy = (a.start.y + (a.end.y - a.start.y) / 2) * scaleY;
        ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
      } else if (a.tool === "text" && a.start && a.text) {
        ctx.font = `${(a.fontSize || 24) * scaleX}px 'Space Grotesk', sans-serif`;
        ctx.fillText(a.text, a.start.x * scaleX, a.start.y * scaleY);
      }
    });

    fullCanvas.toBlob((blob) => { if (blob) onSave(blob); }, "image/png");
  };

  const tools: { id: Tool; icon: any; label: string }[] = [
    { id: "freehand", icon: Pencil, label: "Draw" },
    { id: "arrow", icon: ArrowUp, label: "Arrow" },
    { id: "rectangle", icon: Square, label: "Rectangle" },
    { id: "circle", icon: Circle, label: "Circle" },
    { id: "text", icon: Type, label: "Text" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background/95 flex flex-col items-center">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 bg-card border-b border-border w-full justify-center flex-wrap">
        {tools.map((t) => (
          <Button
            key={t.id}
            variant={tool === t.id ? "default" : "secondary"}
            size="sm"
            onClick={() => setTool(t.id)}
            className="gap-1.5"
          >
            <t.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </Button>
        ))}

        <div className="w-px h-6 bg-border mx-1" />

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary" size="sm" className="gap-1.5">
              <div className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: color }} />
              <Palette className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3">
            <div className="grid grid-cols-5 gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`h-7 w-7 rounded-full border-2 transition-transform ${color === c ? "border-primary scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
            <div className="mt-3 space-y-2">
              <label className="text-xs text-muted-foreground">Stroke Width</label>
              <Slider value={[lineWidth]} onValueChange={([v]) => setLineWidth(v)} min={1} max={10} step={1} />
            </div>
            {tool === "text" && (
              <div className="mt-3 space-y-2">
                <label className="text-xs text-muted-foreground">Font Size</label>
                <Slider value={[fontSize]} onValueChange={([v]) => setFontSize(v)} min={12} max={72} step={2} />
              </div>
            )}
          </PopoverContent>
        </Popover>

        <div className="w-px h-6 bg-border mx-1" />

        <Button variant="secondary" size="sm" onClick={undo} disabled={actions.length === 0}>
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="sm" onClick={redo} disabled={redoStack.length === 0}>
          <Redo2 className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button variant="default" size="sm" onClick={handleSave} className="gap-1.5">
          <Save className="h-4 w-4" /> Save
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center overflow-auto p-4">
        <canvas
          ref={canvasRef}
          width={canvasSize.w}
          height={canvasSize.h}
          className="border border-border rounded-lg cursor-crosshair shadow-lg"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
    </div>
  );
}
