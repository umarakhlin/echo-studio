"use client";

import { useEffect, useState } from "react";

/**
 * Hook הופך Blob ל-object URL ומנקה אותו אוטומטית.
 * שימוש: const url = useBlobUrl(photo.thumbnailBlob);
 *
 * תמונות מה-API (JSON) מגיעות לעיתים עם `blob: {}` — לא מופע Blob אמיתי;
 * בלי בדיקה, `createObjectURL` נזרק (במיוחד ב-Safari).
 */
export function useBlobUrl(blob: Blob | undefined | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob || !(blob instanceof Blob)) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);

  return url;
}
