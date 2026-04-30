"use client";

import { useEffect, useState } from "react";

/**
 * Hook הופך Blob ל-object URL ומנקה אותו אוטומטית.
 * שימוש: const url = useBlobUrl(photo.thumbnailBlob);
 */
export function useBlobUrl(blob: Blob | undefined | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);

  return url;
}
