import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play, Pause, Scissors, Type, Square, Save, X, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  startTime: number;
  endTime: number;
}

interface ShapeOverlay {
  id: string;
  type: "rectangle" | "circle";
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  lineWidth: number;
  startTime: number;
  endTime: number;
}

interface VideoEditorProps {
  videoUrl: string;
  onSave: (blob: Blob) => void;
  onClose: () => void;
}

export function VideoEditor({ videoUrl, onSave, onClose }: VideoEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [shapeOverlays, setShapeOverlays] = useState<ShapeOverlay[]>([]);
  const [saving, setSaving] = useState(false);
  const animFrameRef = useRef<number>();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.onloadedmetadata = () => {
      setDuration(video.duration);
      setTrimEnd(video.duration);
    };
    video.ontimeupdate = () => setCurrentTime(video.currentTime);
  }, []);

  const drawFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    ctx.drawImage(video, 0, 0);

    const t = video.currentTime;
    textOverlays.filter((o) => t >= o.startTime && t <= o.endTime).forEach((o) => {
      ctx.fillStyle = o.color;
      ctx.font = `${o.fontSize}px 'Space Grotesk', sans-serif`;
      ctx.fillText(o.text, o.x, o.y);
    });
    shapeOverlays.filter((o) => t >= o.startTime && t <= o.endTime).forEach((o) => {
      ctx.strokeStyle = o.color;
      ctx.lineWidth = o.lineWidth;
      if (o.type === "rectangle") {
        ctx.strokeRect(o.x, o.y, o.w, o.h);
      } else {
        ctx.beginPath();
        ctx.ellipse(o.x + o.w / 2, o.y + o.h / 2, Math.abs(o.w / 2), Math.abs(o.h / 2), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    if (playing) animFrameRef.current = requestAnimationFrame(drawFrame);
  }, [playing, textOverlays, shapeOverlays]);

  useEffect(() => {
    if (playing) {
      animFrameRef.current = requestAnimationFrame(drawFrame);
    }
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [playing, drawFrame]);

  useEffect(() => { if (!playing) drawFrame(); }, [currentTime, textOverlays, shapeOverlays]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      video.pause();
    } else {
      if (video.currentTime < trimStart || video.currentTime >= trimEnd) {
        video.currentTime = trimStart;
      }
      video.play();
    }
    setPlaying(!playing);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const check = () => {
      if (video.currentTime >= trimEnd) {
        video.pause();
        setPlaying(false);
      }
    };
    video.addEventListener("timeupdate", check);
    return () => video.removeEventListener("timeupdate", check);
  }, [trimEnd]);

  const seek = (val: number[]) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = val[0];
    setCurrentTime(val[0]);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const addTextOverlay = () => {
    const text = prompt("Enter overlay text:");
    if (!text) return;
    setTextOverlays((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        text,
        x: 50,
        y: 80,
        color: "#ffffff",
        fontSize: 32,
        startTime: currentTime,
        endTime: Math.min(currentTime + 5, duration),
      },
    ]);
  };

  const addShapeOverlay = (type: "rectangle" | "circle") => {
    setShapeOverlays((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type,
        x: 50,
        y: 50,
        w: 200,
        h: 150,
        color: "#ef4444",
        lineWidth: 3,
        startTime: currentTime,
        endTime: Math.min(currentTime + 5, duration),
      },
    ]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      const stream = canvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9" : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        video.currentTime = trimStart;
        video.play();
        setPlaying(true);
        recorder.start(100);

        const checkEnd = () => {
          if (video.currentTime >= trimEnd) {
            video.pause();
            setPlaying(false);
            recorder.stop();
          } else {
            requestAnimationFrame(checkEnd);
          }
        };
        requestAnimationFrame(checkEnd);
      });

      const blob = new Blob(chunks, { type: mimeType });
      onSave(blob);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 bg-card border-b border-border justify-center flex-wrap">
        <Button variant="secondary" size="sm" onClick={togglePlay}>
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button variant="secondary" size="sm" onClick={addTextOverlay} className="gap-1.5">
          <Type className="h-4 w-4" /> Add Text
        </Button>
        <Button variant="secondary" size="sm" onClick={() => addShapeOverlay("rectangle")} className="gap-1.5">
          <Square className="h-4 w-4" /> Rectangle
        </Button>
        <Button variant="secondary" size="sm" onClick={() => addShapeOverlay("circle")} className="gap-1.5">
          ⬭ Circle
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          variant="default"
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="gap-1.5"
        >
          <Save className="h-4 w-4" /> {saving ? "Exporting..." : "Export"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Video preview */}
      <div className="flex-1 flex items-center justify-center overflow-auto p-4">
        <video ref={videoRef} src={videoUrl} className="hidden" crossOrigin="anonymous" preload="auto" />
        <canvas ref={canvasRef} className="max-w-full max-h-full border border-border rounded-lg shadow-lg" />
      </div>

      {/* Timeline */}
      <div className="bg-card border-t border-border p-4 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground w-12">{formatTime(currentTime)}</span>
          <Slider
            value={[currentTime]}
            onValueChange={seek}
            min={0}
            max={duration || 1}
            step={0.1}
            className="flex-1"
          />
          <span className="text-xs font-mono text-muted-foreground w-12">{formatTime(duration)}</span>
        </div>

        {/* Trim controls */}
        <div className="flex items-center gap-3">
          <Scissors className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Trim:</span>
          <span className="text-xs font-mono text-muted-foreground w-12">{formatTime(trimStart)}</span>
          <Slider
            value={[trimStart, trimEnd]}
            onValueChange={([s, e]) => { setTrimStart(s); setTrimEnd(e); }}
            min={0}
            max={duration || 1}
            step={0.1}
            className="flex-1"
          />
          <span className="text-xs font-mono text-muted-foreground w-12">{formatTime(trimEnd)}</span>
        </div>

        {/* Overlay list */}
        {(textOverlays.length > 0 || shapeOverlays.length > 0) && (
          <div className="space-y-1 max-h-32 overflow-auto">
            <p className="text-xs text-muted-foreground font-medium">Overlays</p>
            {textOverlays.map((o) => (
              <div key={o.id} className="flex items-center gap-2 text-xs bg-secondary/50 rounded px-2 py-1">
                <Type className="h-3 w-3" />
                <span className="truncate flex-1">"{o.text}"</span>
                <span className="text-muted-foreground">{formatTime(o.startTime)} - {formatTime(o.endTime)}</span>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setTextOverlays((p) => p.filter((x) => x.id !== o.id))}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {shapeOverlays.map((o) => (
              <div key={o.id} className="flex items-center gap-2 text-xs bg-secondary/50 rounded px-2 py-1">
                <Square className="h-3 w-3" />
                <span className="flex-1">{o.type}</span>
                <span className="text-muted-foreground">{formatTime(o.startTime)} - {formatTime(o.endTime)}</span>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setShapeOverlays((p) => p.filter((x) => x.id !== o.id))}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
