import "server-only";

type Prediction = {
  status: string;
  output?: unknown;
  error?: string | null;
  urls?: { get?: string };
  detail?: unknown;
};

function isDone(status: string) {
  return status === "succeeded" || status === "successful";
}

function isFailed(status: string) {
  return status === "failed" || status === "canceled" || status === "cancelled";
}

function formatReplicateDetail(detail: unknown): string {
  if (detail == null) return "";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((x) =>
        typeof x === "object" && x !== null && "msg" in x
          ? String((x as { msg: unknown }).msg)
          : JSON.stringify(x)
      )
      .filter(Boolean)
      .join("; ");
  }
  return String(detail);
}

/**
 * שיפור דחיסה / חידוד לפי Real-ESRGAN ב-Replicate (דורש REPLICATE_API_TOKEN).
 * התוצאה — קישור HTTPS זמני לתמונה המעובדת.
 */
export async function upscaleWithRealEsrgan(imageUrl: string): Promise<string> {
  const token = process.env.REPLICATE_API_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "שירות שיפור AI לא מוגדר בשרת. הוסיפי REPLICATE_API_TOKEN בהגדרות הפריסה."
    );
  }

  const res = await fetch(
    "https://api.replicate.com/v1/models/nightmareai/real-esrgan/predictions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait=120",
      },
      body: JSON.stringify({
        input: {
          image: imageUrl,
          scale: 2,
          face_enhance: false,
        },
      }),
    }
  );

  let pred = (await res.json()) as Prediction;
  if (!res.ok) {
    throw new Error(
      formatReplicateDetail(pred.detail) || `Replicate: ${res.status}`
    );
  }

  let attempts = 0;
  while (!isDone(pred.status) && !isFailed(pred.status) && attempts < 90) {
    attempts += 1;
    await new Promise((r) => setTimeout(r, 1500));
    const getUrl = pred.urls?.get;
    if (!getUrl) break;
    const poll = await fetch(getUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    pred = (await poll.json()) as Prediction;
    if (!poll.ok) {
      throw new Error(formatReplicateDetail(pred.detail) || `Replicate poll: ${poll.status}`);
    }
  }

  if (isFailed(pred.status)) {
    throw new Error(pred.error || "שיפור התמונה נעצר עם שגיאה.");
  }

  const out = pred.output;
  if (typeof out !== "string" || !out.startsWith("http")) {
    throw new Error("אין קישור לתמונה משופרת — נסי שוב בעוד רגע.");
  }

  return out;
}
