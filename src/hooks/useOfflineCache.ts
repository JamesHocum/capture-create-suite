import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const MEDIA_CACHE = "screencraft-media-v1";
const MAX_CACHED = 20;

export function useOfflineCache(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;
    cacheRecentMedia(userId);
  }, [userId]);
}

async function cacheRecentMedia(userId: string) {
  try {
    const { data: files } = await supabase
      .from("media_files")
      .select("*")
      .eq("user_id", userId)
      .eq("is_trashed", false)
      .order("created_at", { ascending: false })
      .limit(MAX_CACHED);

    if (!files || files.length === 0) return;

    const cache = await caches.open(MEDIA_CACHE);

    for (const file of files) {
      const bucket = file.type === "screenshot" ? "screenshots" : "recordings";
      const { data: urlData } = await supabase.storage
        .from(bucket)
        .createSignedUrl(file.file_path, 86400);

      if (!urlData?.signedUrl) continue;

      // Use a stable cache key based on file path
      const cacheKey = `/offline-media/${bucket}/${file.file_path}`;
      const existing = await cache.match(cacheKey);
      if (existing) continue;

      try {
        const response = await fetch(urlData.signedUrl);
        if (response.ok) {
          await cache.put(cacheKey, response.clone());
        }
      } catch {
        // Network error, skip
      }
    }

    // Also cache the file metadata for offline listing
    const metaResponse = new Response(JSON.stringify(files), {
      headers: { "Content-Type": "application/json" },
    });
    await cache.put("/offline-media/metadata", metaResponse);
  } catch {
    // Offline or error, skip
  }
}

export async function getCachedMetadata() {
  try {
    const cache = await caches.open(MEDIA_CACHE);
    const response = await cache.match("/offline-media/metadata");
    if (response) return response.json();
  } catch {}
  return null;
}

export async function getCachedMediaUrl(bucket: string, filePath: string) {
  try {
    const cache = await caches.open(MEDIA_CACHE);
    const response = await cache.match(`/offline-media/${bucket}/${filePath}`);
    if (response) {
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }
  } catch {}
  return null;
}
