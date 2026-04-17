import { NextRequest, NextResponse } from "next/server";
import { analyzeLabel } from "@/agent/ocr";
import { explainIngredients } from "@/agent/explain";

const DEFAULT_MAX_UPLOAD_MB = 10;
const configuredMaxUploadMb = Number(process.env.OCR_UPLOAD_MAX_MB || DEFAULT_MAX_UPLOAD_MB);
const MAX_FILE_SIZE = (Number.isFinite(configuredMaxUploadMb) && configuredMaxUploadMb > 0
  ? configuredMaxUploadMb
  : DEFAULT_MAX_UPLOAD_MB) * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

async function readFileFromRequest(request: NextRequest): Promise<{ buffer: Buffer; mime: string } | null> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.startsWith("multipart/form-data")) {
    return null;
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return null;
  }

  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB.`);
  }

  const arrayBuffer = await file.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    mime: file.type,
  };
}

function bufferToDataUrl(file: { buffer: Buffer; mime: string }): string {
  return `data:${file.mime};base64,${file.buffer.toString("base64")}`;
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let imageUrl: string | undefined;

    if (contentType.startsWith("application/json")) {
      const { image_url } = (await request.json()) as { image_url?: string };
      if (typeof image_url === "string" && image_url.trim().length > 0) {
        imageUrl = image_url.trim();
      }
    } else {
      const file = await readFileFromRequest(request);
      if (file) {
        imageUrl = bufferToDataUrl(file);
      }
    }

    if (!imageUrl) {
      return NextResponse.json({ error: "image_url or image file is required" }, { status: 400 });
    }

    const ocrResult = await analyzeLabel(imageUrl);
    const explanation = await explainIngredients(ocrResult);

    return NextResponse.json({
      ocr: ocrResult,
      explanation,
    });
  } catch (error) {
    console.error("/api/analyze", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
