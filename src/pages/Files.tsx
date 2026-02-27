import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Trash2, Image, Film, Search, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const Files = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "screenshot" | "recording">("all");

  const fetchFiles = async () => {
    if (!user) return;
    let query = supabase
      .from("media_files")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_trashed", false)
      .order("created_at", { ascending: false });

    if (filter !== "all") query = query.eq("type", filter);
    const { data } = await query;
    setFiles(data || []);
  };

  useEffect(() => { fetchFiles(); }, [user, filter]);

  const filtered = files.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));

  const handleDownload = async (file: any) => {
    const bucket = file.type === "screenshot" ? "screenshots" : "recordings";
    const { data } = await supabase.storage.from(bucket).download(file.file_path);
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

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground">All Files</h1>
          <p className="text-muted-foreground mt-1">{filtered.length} files</p>
        </div>

        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1">
            {(["all", "screenshot", "recording"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilter(f)}
                className="capitalize"
              >
                {f === "all" ? "All" : f + "s"}
              </Button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card className="bg-card/30 border-border/30 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mb-3 opacity-50" />
              <p>No files found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((file) => (
              <Card key={file.id} className="bg-card/50 border-border/50 group">
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
                        <p className="text-xs text-muted-foreground">{new Date(file.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
    </DashboardLayout>
  );
};

export default Files;
