import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw, Trash2, Image, Film, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const Trash = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<any[]>([]);

  const fetchFiles = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("media_files")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_trashed", true)
      .order("trashed_at", { ascending: false });
    setFiles(data || []);
  };

  useEffect(() => { fetchFiles(); }, [user]);

  const handleRestore = async (id: string) => {
    await supabase.from("media_files").update({ is_trashed: false, trashed_at: null }).eq("id", id);
    toast({ title: "File restored" });
    fetchFiles();
  };

  const handleDelete = async (file: any) => {
    const bucket = file.type === "screenshot" ? "screenshots" : "recordings";
    await supabase.storage.from(bucket).remove([file.file_path]);
    await supabase.from("media_files").delete().eq("id", file.id);
    toast({ title: "Permanently deleted" });
    fetchFiles();
  };

  const daysLeft = (trashedAt: string) => {
    const diff = 30 - Math.floor((Date.now() - new Date(trashedAt).getTime()) / 86400000);
    return Math.max(0, diff);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Trash</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Items are permanently deleted after 30 days
          </p>
        </div>

        {files.length === 0 ? (
          <Card className="bg-card/30 border-border/30 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Trash2 className="h-12 w-12 mb-3 opacity-50" />
              <p>Trash is empty</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map((file) => (
              <Card key={file.id} className="bg-card/50 border-border/50 opacity-75">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {file.type === "screenshot" ? (
                        <Image className="h-6 w-6 text-primary shrink-0" />
                      ) : (
                        <Film className="h-6 w-6 text-accent shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{file.name}</p>
                        <p className="text-xs text-destructive">{daysLeft(file.trashed_at)} days left</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleRestore(file.id)}>
                        <RotateCcw className="h-4 w-4 text-accent" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(file)}>
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
    </DashboardLayout>
  );
};

export default Trash;
