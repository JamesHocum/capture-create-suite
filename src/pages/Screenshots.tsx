import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Download, Trash2, Image, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { AnnotationEditor } from "@/components/AnnotationEditor";

const Screenshots = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [annotatingFile, setAnnotatingFile] = useState<any | null>(null);
  const [annotationImageUrl, setAnnotationImageUrl] = useState<string>("");

  const fetchFiles = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("media_files")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "screenshot")
      .eq("is_trashed", false)
      .order("created_at", { ascending: false });
    setFiles(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchFiles(); }, [user]);

  const handleCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" } as any,
      });
      const track = stream.getVideoTracks()[0];
      const imageCapture = new (window as any).ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();
      track.stop();

      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0);

      canvas.toBlob(async (blob) => {
        if (!blob || !user) return;
        const fileName = `${user.id}/${Date.now()}.png`;
        await supabase.storage.from("screenshots").upload(fileName, blob, { contentType: "image/png" });
        await supabase.from("media_files").insert({
          user_id: user.id,
          name: `Screenshot ${new Date().toLocaleString()}`,
          type: "screenshot",
          format: "png",
          file_path: fileName,
          file_size: blob.size,
          width: bitmap.width,
          height: bitmap.height,
        });
        toast({ title: "Screenshot captured!" });
        fetchFiles();
      }, "image/png");
    } catch { /* cancelled */ }
  };

  const handleDownload = async (file: any) => {
    const { data } = await supabase.storage.from("screenshots").download(file.file_path);
    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name + "." + file.format;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleTrash = async (id: string) => {
    await supabase.from("media_files").update({ is_trashed: true, trashed_at: new Date().toISOString() }).eq("id", id);
    toast({ title: "Moved to trash" });
    fetchFiles();
  };

  const openAnnotation = async (file: any) => {
    const { data } = await supabase.storage.from("screenshots").createSignedUrl(file.file_path, 3600);
    if (data) {
      setAnnotationImageUrl(data.signedUrl);
      setAnnotatingFile(file);
    }
  };

  const handleAnnotationSave = async (blob: Blob) => {
    if (!user || !annotatingFile) return;
    const fileName = `${user.id}/${Date.now()}_annotated.png`;
    await supabase.storage.from("screenshots").upload(fileName, blob, { contentType: "image/png" });
    await supabase.from("media_files").insert({
      user_id: user.id,
      name: `${annotatingFile.name} (Annotated)`,
      type: "screenshot",
      format: "png",
      file_path: fileName,
      file_size: blob.size,
    });
    toast({ title: "Annotated screenshot saved!" });
    setAnnotatingFile(null);
    fetchFiles();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Screenshots</h1>
            <p className="text-muted-foreground mt-1">{files.length} screenshots</p>
          </div>
          <Button onClick={handleCapture} className="gap-2">
            <Camera className="h-4 w-4" />
            Capture
          </Button>
        </div>

        {files.length === 0 && !loading ? (
          <Card className="bg-card/30 border-border/30 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Image className="h-12 w-12 mb-3 opacity-50" />
              <p>No screenshots yet. Click Capture to take your first one!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map((file) => (
              <Card key={file.id} className="bg-card/50 border-border/50 group">
                <CardContent className="p-4 space-y-3">
                  <div className="aspect-video bg-muted/30 rounded-md flex items-center justify-center overflow-hidden">
                    <ScreenshotPreview filePath={file.file_path} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(file.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => openAnnotation(file)} title="Annotate">
                        <Pencil className="h-4 w-4" />
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

      {annotatingFile && (
        <AnnotationEditor
          imageUrl={annotationImageUrl}
          onSave={handleAnnotationSave}
          onClose={() => setAnnotatingFile(null)}
        />
      )}
    </DashboardLayout>
  );
};

function ScreenshotPreview({ filePath }: { filePath: string }) {
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    supabase.storage.from("screenshots").createSignedUrl(filePath, 3600).then(({ data }) => {
      if (data) setUrl(data.signedUrl);
    });
  }, [filePath]);

  if (!url) return <Image className="h-8 w-8 text-muted-foreground/30" />;
  return <img src={url} alt="Screenshot" className="w-full h-full object-cover" />;
}

export default Screenshots;
