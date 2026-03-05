import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Video, Image, Film, Clock, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ screenshots: 0, recordings: 0, trashed: 0 });
  const [recentFiles, setRecentFiles] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: files } = await supabase
        .from("media_files")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(6);

      if (files) {
        setRecentFiles(files.filter((f) => !f.is_trashed));
        setStats({
          screenshots: files.filter((f) => f.type === "screenshot" && !f.is_trashed).length,
          recordings: files.filter((f) => f.type === "recording" && !f.is_trashed).length,
          trashed: files.filter((f) => f.is_trashed).length,
        });
      }
    };
    fetchData();
  }, [user]);

  const handleScreenshot = async () => {
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
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0);

      canvas.toBlob(async (blob) => {
        if (!blob || !user) return;
        const fileName = `${user.id}/${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
          .from("screenshots")
          .upload(fileName, blob, { contentType: "image/png" });

        if (uploadError) return;

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

        navigate("/screenshots");
      }, "image/png");
    } catch (err) {
      // User cancelled
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl">
        <div>
          <h1 className="text-3xl font-bold text-primary neon-text uppercase tracking-wider">Dashboard</h1>
          <p className="text-muted-foreground mt-1 tracking-wide">Welcome back. Capture something amazing.</p>
        </div>

        {/* Quick actions */}
        <div className="flex gap-4">
          <Button onClick={handleScreenshot} size="lg" className="gap-2 neon-btn uppercase tracking-wider">
            <Camera className="h-5 w-5" />
            New Screenshot
          </Button>
          <Button
            onClick={() => navigate("/recordings?new=true")}
            size="lg"
            variant="secondary"
            className="gap-2 uppercase tracking-wider border border-accent/30 hover:border-accent/60 hover:bg-accent/10 transition-all"
          >
            <Video className="h-5 w-5 text-accent" />
            New Recording
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="cyber-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Screenshots</CardTitle>
              <Image className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary neon-text">{stats.screenshots}</div>
            </CardContent>
          </Card>
          <Card className="cyber-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Recordings</CardTitle>
              <Film className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">{stats.recordings}</div>
            </CardContent>
          </Card>
          <Card className="cyber-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-widest">In Trash</CardTitle>
              <Trash2 className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{stats.trashed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent files */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4 uppercase tracking-wider">Recent Captures</h2>
          {recentFiles.length === 0 ? (
            <Card className="cyber-card border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Clock className="h-10 w-10 mb-3 opacity-50" />
                <p className="tracking-wide">No captures yet. Take your first screenshot or recording!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentFiles.map((file) => (
                <Card key={file.id} className="cyber-card hover:border-primary/40 transition-all duration-300 cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {file.type === "screenshot" ? (
                        <Image className="h-8 w-8 text-primary shrink-0 group-hover:neon-text transition-all" />
                      ) : (
                        <Film className="h-8 w-8 text-accent shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(file.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
