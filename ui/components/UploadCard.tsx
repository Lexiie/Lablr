"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type UploadCardProps = {
  onSubmit: (payload: { file?: File; imageUrl?: string }) => Promise<void> | void;
  isSubmitting?: boolean;
};

const OCR_SPACE_SAFE_MAX_BYTES = 850 * 1024;
const MAX_IMAGE_DIMENSION = 1800;
const MIN_LOSSY_QUALITY = 0.45;

async function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to compress image"));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

function hasTransparency(context: CanvasRenderingContext2D, width: number, height: number): boolean {
  try {
    const imageData = context.getImageData(0, 0, width, height).data;
    const pixelCount = width * height;
    const sampleStep = Math.max(1, Math.floor(pixelCount / 120_000));

    for (let pixel = 0; pixel < pixelCount; pixel += sampleStep) {
      const alpha = imageData[pixel * 4 + 3];
      if (alpha < 250) {
        return true;
      }
    }
  } catch {
    return false;
  }

  return false;
}

async function optimizeImageForOCR(file: File): Promise<File> {
  if (file.size <= OCR_SPACE_SAFE_MAX_BYTES) {
    return file;
  }

  if (file.type === "image/gif") {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    let width = Math.max(1, Math.round(bitmap.width * scale));
    let height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      return file;
    }

    let quality = 0.86;
    let outputMime = "image/jpeg";
    let outputExtension = "jpg";
    let blob: Blob | null = null;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      canvas.width = width;
      canvas.height = height;
      context.clearRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);

      if (attempt === 0 && hasTransparency(context, width, height)) {
        outputMime = "image/webp";
        outputExtension = "webp";
      }

      blob = await canvasToBlob(canvas, outputMime, quality);
      if (blob.size <= OCR_SPACE_SAFE_MAX_BYTES) {
        break;
      }

      if (quality > MIN_LOSSY_QUALITY) {
        quality = Math.max(MIN_LOSSY_QUALITY, quality - 0.1);
      } else {
        width = Math.max(640, Math.round(width * 0.85));
        height = Math.max(640, Math.round(height * 0.85));
      }
    }

    if (!blob || blob.size >= file.size) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}-optimized.${outputExtension}`, { type: outputMime });
  } finally {
    bitmap.close();
  }
}

export default function UploadCard({ onSubmit, isSubmitting = false }: UploadCardProps) {
  const [file, setFile] = useState<File | undefined>();
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isDragActive, setIsDragActive] = useState(false);
  const [isPreparingImage, setIsPreparingImage] = useState(false);

  const [filePreviewUrl, setFilePreviewUrl] = useState<string>("");

  useEffect(() => {
    if (!file) {
      setFilePreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setFilePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const previewUrl = useMemo(() => {
    if (file && filePreviewUrl) {
      return filePreviewUrl;
    }
    if (imageUrl.trim().length > 0) {
      return imageUrl.trim();
    }
    return "";
  }, [file, filePreviewUrl, imageUrl]);

  const resetPreview = useCallback(() => {
    setFile(undefined);
    setImageUrl("");
  }, []);

  const handleFileSelect = useCallback((selectedFile: File | undefined) => {
    if (!selectedFile) {
      setFile(undefined);
      return;
    }
    if (!selectedFile.type.startsWith("image/")) {
      console.warn("UploadCard: Only image files are allowed.");
      setFile(undefined);
      return;
    }
    setImageUrl("");
    setFile(selectedFile);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);

    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    let preparedFile = file;
    if (file) {
      setIsPreparingImage(true);
      try {
        preparedFile = await optimizeImageForOCR(file);
      } catch (error) {
        console.warn("UploadCard: image optimization failed, using original file", error);
      } finally {
        setIsPreparingImage(false);
      }
    }

    await onSubmit({
      file: preparedFile,
      imageUrl: imageUrl.trim().length > 0 ? imageUrl.trim() : undefined,
    });
  }, [file, imageUrl, onSubmit]);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <header className="space-y-3 text-slate-200">
          <div className="inline-flex items-center rounded-full border border-emerald-700/60 bg-emerald-950/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
            Input Panel
          </div>
          <h2 className="text-xl font-semibold leading-tight sm:text-2xl">Upload product label</h2>
          <p className="max-w-xl text-sm leading-relaxed text-slate-300">
            Drop an image or paste a URL. Only one image is processed per analysis.
          </p>
        </header>

        <label
          htmlFor="label-upload"
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragActive(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragActive(false);
          }}
          onDrop={handleDrop}
          className={`group relative flex min-h-44 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-all ${
            isDragActive
              ? "border-emerald-400 bg-emerald-950/30"
              : "border-slate-700 bg-slate-950"
          }`}
        >
          <input
            id="label-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => handleFileSelect(event.target.files?.[0])}
          />
          <div className="flex flex-col items-center gap-2 px-6 py-8 text-center text-slate-200">
            <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
              Drag & Drop
            </span>
            <p className="text-sm text-slate-300">
              or click to browse your files
            </p>
            {file && (
              <p className="text-xs text-slate-300">
                Selected: <strong className="font-medium text-slate-200">{file.name}</strong>
              </p>
            )}
          </div>
        </label>

        <div className="space-y-2">
          <label htmlFor="image-url" className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
            Or analyze by image URL
          </label>
          <div className="flex gap-2">
            <input
              id="image-url"
              type="url"
              placeholder="https://example.com/label.jpg"
              className="h-11 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              value={imageUrl}
              onChange={(event) => {
                setImageUrl(event.target.value);
                setFile(undefined);
              }}
            />
            {previewUrl && (
              <button
                type="button"
                onClick={resetPreview}
                className="h-11 rounded-xl border border-slate-600 px-3 py-2 text-sm text-slate-200 transition hover:border-emerald-700 hover:bg-emerald-950/30"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {previewUrl && (
          <figure className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/80">
            <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2 text-xs uppercase tracking-[0.16em] text-slate-400">
              <span>Preview</span>
              <span className="text-slate-500">1 image</span>
            </div>
            <img src={previewUrl} alt="Label preview" className="max-h-72 w-full object-contain bg-slate-950/80" />
          </figure>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex h-11 items-center rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
            disabled={isSubmitting || isPreparingImage || (!file && imageUrl.trim().length === 0)}
          >
            {isPreparingImage ? "Optimizing image…" : isSubmitting ? "Analyzing…" : "Run Lablr"}
          </button>
        </div>
      </form>
    </section>
  );
}
