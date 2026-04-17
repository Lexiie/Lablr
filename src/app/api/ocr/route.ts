import { NextRequest, NextResponse } from "next/server";
import { analyzeLabel } from "@/agent/ocr"; // sesuaikan path kamu

export const runtime = "nodejs"; // pastikan Node runtime

const DEFAULT_MAX_UPLOAD_MB = 10;
const configuredMaxUploadMb = Number(process.env.OCR_UPLOAD_MAX_MB || DEFAULT_MAX_UPLOAD_MB);
const MAX_FILE_SIZE = (Number.isFinite(configuredMaxUploadMb) && configuredMaxUploadMb > 0
  ? configuredMaxUploadMb
  : DEFAULT_MAX_UPLOAD_MB) * 1024 * 1024;

const bad = (status: number, msg: string) =>
  NextResponse.json({ ok: false, error: msg }, { status });

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const imageUrl = (form.get("image_url") as string | null)?.trim() || null;

    if (!file && !imageUrl) return bad(400, "Provide 'file' or 'image_url'");

    // CASE A: pakai URL publik langsung
    if (imageUrl) {
      const data = await analyzeLabel(imageUrl);
      return NextResponse.json({ ok: true, data });
    }

    // CASE B: user upload file → konversi ke data URL (base64)
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        return bad(413, `File too large: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      }
      const buf = Buffer.from(await file.arrayBuffer());
      // tebak mime dari file.type; fallback ke image/jpeg
      const mime = (file.type && file.type.startsWith("image/")) ? file.type : "image/jpeg";
      const b64 = buf.toString("base64");
      const dataUrl = `data:${mime};base64,${b64}`;

      const data = await analyzeLabel(dataUrl);
      return NextResponse.json({ ok: true, data });
    }

    return bad(400, "Invalid form");
  } catch (e: any) {
    console.error("[/api/ocr] error:", e?.message);
    return bad(500, e?.message || "Server error");
  }
}
