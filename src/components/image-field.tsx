"use client";

import { useId, useRef, useState } from "react";

import { browserClient } from "@/lib/supabase/browser";

const MAX_EDGE = 2000;

/**
 * Shrinks a phone photo to at most 2000px on its long edge as a JPEG, so the
 * website stays fast. PNG posters keep their format (text stays crisp).
 */
async function prepare(file: File): Promise<{ blob: Blob; ext: string }> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") {
    return { blob: file, ext: file.name.split(".").pop() || "bin" };
  }
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const keepPng = file.type === "image/png";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, keepPng ? "image/png" : "image/jpeg", 0.85),
    );
    if (!blob) throw new Error("encode failed");
    return { blob, ext: keepPng ? "png" : "jpg" };
  } catch {
    // HEIC and other formats the browser can't decode: upload as-is.
    return { blob: file, ext: file.name.split(".").pop() || "bin" };
  }
}

async function upload(file: File, folder: string) {
  const { blob, ext } = await prepare(file);
  const base = file.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const path = `${folder}/${Date.now().toString(36)}-${base || "photo"}.${ext}`;
  const supabase = browserClient();
  const { error } = await supabase.storage
    .from("site-media")
    .upload(path, blob, { contentType: blob.type || undefined, cacheControl: "31536000" });
  if (error) throw error;
  return supabase.storage.from("site-media").getPublicUrl(path).data.publicUrl;
}

/** One photo. Stores the public URL in a hidden input named `name`. */
export function ImageField({
  name,
  label,
  defaultValue = "",
  folder,
  hint,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  folder: string;
  hint?: string;
}) {
  const [url, setUrl] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  async function onPick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      setUrl(await upload(file, folder));
    } catch (e) {
      setError(e instanceof Error ? `Upload failed: ${e.message}` : "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <span className="label" id={`${id}-label`}>
        {label}
      </span>
      <input type="hidden" name={name} value={url} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex aspect-[4/3] w-full max-w-[220px] items-center justify-center overflow-hidden rounded-md border border-line bg-sunken">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element -- external Storage URL, sized by CSS
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="px-3 text-center text-[13px] text-ink-3">No photo</span>
          )}
        </div>
        <div className="flex flex-col items-start gap-2">
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-labelledby={`${id}-label`}
            onChange={(e) => onPick(e.target.files?.[0])}
          />
          <label htmlFor={id} className="btn btn-secondary btn-sm cursor-pointer" aria-disabled={busy}>
            {busy ? "Uploading…" : url ? "Replace photo" : "Choose photo"}
          </label>
          {url && !busy && (
            <button type="button" className="text-[13px] text-ink-2 underline" onClick={() => setUrl("")}>
              Remove
            </button>
          )}
          {error && (
            <p role="alert" className="text-[13px] text-danger">
              {error}
            </p>
          )}
          {hint && <p className="hint mt-0 max-w-xs">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

/** Several photos. Stores a JSON array of public URLs in a hidden input. */
export function GalleryField({
  name,
  label,
  defaultValue = [],
  folder,
  hint,
}: {
  name: string;
  label: string;
  defaultValue?: string[];
  folder: string;
  hint?: string;
}) {
  const [urls, setUrls] = useState<string[]>(defaultValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const id = useId();

  async function onPick(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    try {
      const added: string[] = [];
      for (const file of Array.from(files)) added.push(await upload(file, folder));
      setUrls((u) => [...u, ...added]);
    } catch (e) {
      setError(e instanceof Error ? `Upload failed: ${e.message}` : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  function move(i: number, d: -1 | 1) {
    setUrls((u) => {
      const next = [...u];
      const j = i + d;
      if (j < 0 || j >= next.length) return u;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  return (
    <div>
      <span className="label" id={`${id}-label`}>
        {label}
      </span>
      <input type="hidden" name={name} value={JSON.stringify(urls)} />
      {urls.length > 0 && (
        <ul className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {urls.map((u, i) => (
            <li key={u} className="overflow-hidden rounded-md border border-line bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element -- external Storage URL */}
              <img src={u} alt="" className="aspect-[4/3] w-full object-cover" />
              <div className="flex items-center justify-between gap-1 px-2 py-1.5 text-[12px]">
                <span className="flex gap-1">
                  <button type="button" className="px-1.5 py-1 text-ink-2 hover:text-ink" onClick={() => move(i, -1)} aria-label="Move earlier">
                    ←
                  </button>
                  <button type="button" className="px-1.5 py-1 text-ink-2 hover:text-ink" onClick={() => move(i, 1)} aria-label="Move later">
                    →
                  </button>
                </span>
                <button
                  type="button"
                  className="px-1.5 py-1 text-danger"
                  onClick={() => setUrls((x) => x.filter((_, k) => k !== i))}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <input
        id={id}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-labelledby={`${id}-label`}
        onChange={(e) => {
          onPick(e.target.files);
          e.target.value = "";
        }}
      />
      <label htmlFor={id} className="btn btn-secondary btn-sm cursor-pointer">
        {busy ? "Uploading…" : "Add photos"}
      </label>
      {error && (
        <p role="alert" className="mt-2 text-[13px] text-danger">
          {error}
        </p>
      )}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}
