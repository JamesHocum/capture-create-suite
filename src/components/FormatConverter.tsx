import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileVideo, Download, Loader2 } from "lucide-react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

interface FormatConverterProps {
  videoUrl: string;
  fileName: string;
  onClose: () => void;
}

export function FormatConverter({ videoUrl, fileName, onClose }: FormatConverterProps) {
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  const convert = async () => {
    setConverting(true);
    setProgress(0);
    setError(null);

    try {
      const ffmpeg = new FFmpeg();
      ffmpegRef.current = ffmpeg;

      ffmpeg.on("progress", ({ progress: p }) => {
        setProgress(Math.round(p * 100));
      });

      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });

      await ffmpeg.writeFile("input.webm", await fetchFile(videoUrl));
      await ffmpeg.exec(["-i", "input.webm", "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac", "output.mp4"]);
      const data = await ffmpeg.readFile("output.mp4") as Uint8Array;
      const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      const blob = new Blob([arrayBuffer as ArrayBuffer], { type: "video/mp4" });
      setOutputUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      setError(err?.message || "Conversion failed. Your browser may not support this feature.");
    } finally {
      setConverting(false);
    }
  };

  const downloadMp4 = () => {
    if (!outputUrl) return;
    const a = document.createElement("a");
    a.href = outputUrl;
    a.download = fileName.replace(/\.webm$/i, "") + ".mp4";
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4 space-y-5 shadow-xl">
        <div className="flex items-center gap-3">
          <FileVideo className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">Convert to MP4</h2>
            <p className="text-sm text-muted-foreground">{fileName}</p>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">{error}</div>
        )}

        {converting && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Converting...</span>
              <span className="font-mono text-foreground">{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {outputUrl && (
          <div className="bg-accent/10 text-accent text-sm rounded-md p-3 flex items-center gap-2">
            ✓ Conversion complete!
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          {!outputUrl ? (
            <Button onClick={convert} disabled={converting} className="gap-2">
              {converting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileVideo className="h-4 w-4" />}
              {converting ? "Converting..." : "Convert"}
            </Button>
          ) : (
            <Button onClick={downloadMp4} className="gap-2">
              <Download className="h-4 w-4" /> Download MP4
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
