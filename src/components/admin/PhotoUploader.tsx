"use client";

import { useCallback, useRef, useState } from "react";
import { ImagePlus, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { addPhotoToAlbum } from "@/lib/db";
import { cn } from "@/lib/cn";

interface Props {
  albumId: string;
  projectId: string;
  onUploaded?: () => void | Promise<void>;
}

export function PhotoUploader({ albumId, projectId, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length === 0) {
        toast.error("נא לבחור קבצי תמונה (JPG/PNG/WebP).");
        return;
      }

      setUploading(true);
      setProgress({ done: 0, total: files.length });

      let success = 0;
      for (const file of files) {
        try {
          await addPhotoToAlbum({ albumId, projectId, file });
          success++;
        } catch (err) {
          console.error("upload failed", err);
        } finally {
          setProgress((p) => ({ ...p, done: p.done + 1 }));
        }
      }

      setUploading(false);
      if (success > 0) {
        toast.success(
          success === 1
            ? "התמונה הועלתה."
            : `הועלו ${success} תמונות.`
        );
      }
      if (success < files.length) {
        toast.error(
          `${files.length - success} תמונות נכשלו. נסו שוב או בדקו את הקבצים.`
        );
      }
      await onUploaded?.();
    },
    [albumId, projectId, toast, onUploaded]
  );

  return (
    <div
      className={cn(
        "relative rounded-2xl border-2 border-dashed border-eggplant/20 bg-white/60 p-6 transition-colors",
        dragOver && "border-gold-400 bg-gold-50/40"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (uploading) return;
        if (e.dataTransfer.files.length > 0) {
          void handleFiles(e.dataTransfer.files);
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            void handleFiles(e.target.files);
            e.target.value = "";
          }
        }}
      />

      <div className="flex flex-col items-center gap-3 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-eggplant/10 text-eggplant">
          {uploading ? (
            <UploadCloud className="h-5 w-5 animate-pulse" />
          ) : (
            <ImagePlus className="h-5 w-5" />
          )}
        </span>

        {uploading ? (
          <>
            <p className="font-medium text-eggplant">
              מעלה {progress.done} מתוך {progress.total}...
            </p>
            <div className="h-1.5 w-full max-w-xs rounded-full bg-cream-300 overflow-hidden">
              <div
                className="h-full bg-gold-400 transition-all"
                style={{
                  width: `${(progress.done / progress.total) * 100}%`,
                }}
              />
            </div>
          </>
        ) : (
          <>
            <p className="font-medium text-eggplant">
              גררו תמונות לכאן, או בחרו מהמחשב
            </p>
            <p className="text-xs text-ink-muted">
              כל תמונה תקבל מספר עוקב אוטומטי. אפשר להעלות במקבץ.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => inputRef.current?.click()}
              >
                בחירת קבצים
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
