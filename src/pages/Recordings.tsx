import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Video, Download, Trash2, Film, Pause, Square, Play, Scissors, FileVideo } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { VideoEditor } from "@/components/VideoEditor";
import { FormatConverter } from "@/components/FormatConverter";

const Recordings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout>();
  const [searchParams] = useSearchParams();
  const [editingFile, setEditingFile] = useState<any | null>(null);
  const [editingUrl, setEditingUrl] = useState("");
  const [convertingFile, setConvertingFile] = useState<any | null>(null);
  const [convertingUrl, setConvertingUrl] = useState("");

  const fetchFiles = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("media_files")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "recording")
      .eq("is_trashed", false)
      .order("created_at", { ascending: false });
    setFiles(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchFiles(); }, [user]);

  useEffect(() => {
    if (searchParams.get("new") === "true") startRecording();
  }, [searchParams]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor", width: { ideal: 3840 }, height: { ideal: 2160 } } as any,
        audio: true,
      });
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9" : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunks.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(timerRef.current);
        const blob = new Blob(chunks.current, { type: mimeType });
        if (!user) return;
        const fileName = `${user.id}/${Date.now()}.webm`;
        await supabase.storage.from("recordings").upload(fileName, blob, { contentType: "video/webm" });
        await supabase.from("media_files").insert({
          user_id: user.id, name: `Recording ${new Date().toLocaleString()}`,
          type: "recording", format: "webm", file_path: fileName, file_size: blob.size, duration: elapsed,
        });
        setRecording(false); setPaused(false); setElapsed(0);
        toast({ title: "Recording saved!" }); fetchFiles();
      };
      stream.getVideoTracks()[0].onended = () => { if (recorder.state !== "inactive") recorder.stop(); };
      recorder.start(1000);
      mediaRecorder.current = recorder;
      setRecording(true); setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch { /* cancelled */ }
  };

  const togglePause = () => {
    if (!mediaRecorder.current) return;
    if (paused) { mediaRecorder.current.resume(); timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000); }
    else { mediaRecorder.current.pause(); clearInterval(timerRef.current); }
    setPaused(!paused);
  };

  const stopRecording = () => { mediaRecorder.current?.stop(); };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handleDownload = async (file: any) => {
    const { data } = await supabase.storage.from("recordings").download(file.file_path);
    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a"); a.href = url; a.download = file.name + "." + file.format; a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleTrash = async (id: string) => {
    await supabase.from("media_files").update({ is_trashed: true, trashed_at: new Date().toISOString() }).eq("id", id);
    toast({ title: "Moved to trash" }); fetchFiles();
  };

  const openEditor = async (file: any) => {
    const { data } = await supabase.storage.from("recordings").createSignedUrl(file.file_path, 3600);
    if (data) { setEditingUrl(data.signedUrl); setEditingFile(file); }
  };

  const handleEditorSave = async (blob: Blob) => {
    if (!user || !editingFile) return;
    const fileName = `${user.id}/${Date.now()}_edited.webm`;
    await supabase.storage.from("recordings").upload(fileName, blob, { contentType: "video/webm" });
    await supabase.from("media_files").insert({
      user_id: user.id, name: `${editingFile.name} (Edited)`,
      type: "recording", format: "webm", file_path: fileName, file_size: blob.size,
    });
    toast({ title: "Edited recording saved!" }); setEditingFile(null); fetchFiles();
  };

  const openConverter = async (file: any) => {
    const { data } = await supabase.storage.from("recordings").createSignedUrl(file.file_path, 3600);
    if (data) { setConvertingUrl(data.signedUrl); setConvertingFile(file); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Recordings</h1>
            <p className="text-muted-foreground mt-1">{files.length} recordings</p>
          </div>
          {!recording ? (
            <Button onClick={startRecording} className="gap-2">
              <Video className="h-4 w-4" /> Start Recording
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-foreground bg-destructive/20 px-3 py-1.5 rounded-md flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                {formatTime(elapsed)}
              </span>
              <Button variant="secondary" size="icon" onClick={togglePause}>
                {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
              <Button variant="destructive" size="icon" onClick={stopRecording}>
                <Square className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {files.length === 0 && !loading ? (
          <Card className="bg-card/30 border-border/30 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Film className="h-12 w-12 mb-3 opacity-50" />
              <p>No recordings yet. Click Start Recording to begin!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map((file) => (
              <Card key={file.id} className="bg-card/50 border-border/50 group">
                <CardContent className="p-4 space-y-3">
                  <div className="aspect-video bg-muted/30 rounded-md flex items-center justify-center">
                    <Film className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {file.duration ? formatTime(file.duration) + " • " : ""}
                        {new Date(file.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => openEditor(file)} title="Edit">
                        <Scissors className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openConverter(file)} title="Convert to MP4">
                        <FileVideo className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDownload(file)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleTrash(file.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {editingFile && (
        <VideoEditor videoUrl={editingUrl} onSave={handleEditorSave} onClose={() => setEditingFile(null)} />
      )}
      {convertingFile && (
        <FormatConverter videoUrl={convertingUrl} fileName={convertingFile.name} onClose={() => setConvertingFile(null)} />
      )}
    </DashboardLayout>
  );
};

export default Recordings;
