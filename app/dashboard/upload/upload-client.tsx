"use client";

import { ChangeEvent, DragEvent, useMemo, useState } from "react";
import type { ExtractedExif } from "@/lib/exif";
import type { MatchResult } from "@/lib/matcher";
import type { ReceiptOcrResult } from "@/lib/ocr";

type UploadFile = {
  id: string;
  file: File;
  preview_url: string | null;
  exif: ExtractedExif | null;
  ocr: ReceiptOcrResult | null;
  match_result: MatchResult | null;
  status:
    | "Selected"
    | "Extracting EXIF"
    | "OCR and matching"
    | "Ready to process"
    | "Archived"
    | "Error";
  error?: string;
  selected_record_r_number?: string;
  archive_result?: string;
};

const acceptedTypes = [
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "application/pdf",
];

function canPreview(file: File) {
  return file.type === "image/jpeg" || file.type === "image/png";
}

function createUploadFiles(files: File[]) {
  return files.map((file) => ({
    id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
    file,
    preview_url: canPreview(file) ? URL.createObjectURL(file) : null,
    exif: null,
    ocr: null,
    match_result: null,
    status: "Selected" as const,
  }));
}

export function UploadClient() {
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");

  const hasFiles = uploads.length > 0;

  const accepted = useMemo(
    () => ".jpg,.jpeg,.png,.heic,.heif,.pdf,image/jpeg,image/png,image/heic,image/heif,application/pdf",
    [],
  );

  function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((file) => {
      const lower = file.name.toLowerCase();
      return (
        acceptedTypes.includes(file.type) ||
        lower.endsWith(".heic") ||
        lower.endsWith(".heif") ||
        lower.endsWith(".pdf")
      );
    });

    if (files.length === 0) {
      setError("Choose JPG, PNG, HEIC, or PDF files.");
      return;
    }

    setError("");
    setUploads((current) => [...current, ...createUploadFiles(files)]);
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      addFiles(event.target.files);
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    addFiles(event.dataTransfer.files);
  }

  async function processAll() {
    if (!hasFiles) return;

    setError("");
    setSummary("");
    setIsProcessing(true);
    setUploads((current) =>
      current.map((upload) => ({
        ...upload,
        status: "Extracting EXIF",
        error: undefined,
      })),
    );

    const formData = new FormData();
    uploads.forEach((upload) => formData.append("files", upload.file));

    const response = await fetch("/api/upload/exif", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Could not extract EXIF data.");
      setUploads((current) =>
        current.map((upload) => ({ ...upload, status: "Error" })),
      );
      setIsProcessing(false);
      return;
    }

    const body = (await response.json()) as { files: ExtractedExif[] };
    const processedUploads = await Promise.all(
      uploads.map(async (upload, index) => {
        const exif = body.files[index] ?? {
          filename: upload.file.name,
          photo_taken_at: null,
          gps_lat: null,
          gps_lng: null,
        };

        setUploads((current) =>
          current.map((currentUpload) =>
            currentUpload.id === upload.id
              ? { ...currentUpload, exif, status: "OCR and matching" }
              : currentUpload,
          ),
        );

        const processForm = new FormData();
        processForm.append("file", upload.file);
        processForm.append("exif", JSON.stringify(exif));

        const processResponse = await fetch("/api/upload/process", {
          method: "POST",
          body: processForm,
        });

        if (!processResponse.ok) {
          const processBody = (await processResponse
            .json()
            .catch(() => null)) as { error?: string } | null;
          return {
            ...upload,
            exif,
            status: "Error" as const,
            error: processBody?.error ?? "Could not process receipt.",
          };
        }

        const processBody = (await processResponse.json()) as {
          ocr: ReceiptOcrResult;
          match_result: MatchResult;
          suggested_action: string;
        };

        return {
          ...upload,
          exif,
          ocr: processBody.ocr,
          match_result: processBody.match_result,
          selected_record_r_number:
            processBody.match_result.match?.record_r_number ??
            processBody.match_result.candidates?.[0]?.record_r_number,
          status: "Ready to process" as const,
        };
      }),
    );

    setUploads(processedUploads);
    setIsProcessing(false);
  }

  async function confirmAll() {
    setError("");
    setSummary("");
    setIsConfirming(true);
    let linked = 0;
    let created = 0;
    const nextUploads: UploadFile[] = [];

    for (const upload of uploads) {
      if (!upload.exif || !upload.ocr || !upload.match_result) {
        nextUploads.push(upload);
        continue;
      }

      const matchAction =
        upload.match_result.match || upload.selected_record_r_number
          ? "link"
          : "create";
      const selectedRecord =
        upload.match_result.match?.record_r_number ??
        upload.selected_record_r_number ??
        "";
      const formData = new FormData();
      formData.append("image_file", upload.file);
      formData.append("match_action", matchAction);
      formData.append("record_r_number", selectedRecord);
      formData.append(
        "entity_id",
        String(upload.match_result.match?.entity_id ?? 1),
      );
      formData.append("exif", JSON.stringify(upload.exif));
      formData.append("ocr_data", JSON.stringify(upload.ocr));

      const response = await fetch("/api/upload/archive", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
          connect_url?: string;
        } | null;
        nextUploads.push({
          ...upload,
          status: "Error",
          error:
            body?.connect_url && body.error
              ? `${body.error} Connect at ${body.connect_url}`
              : body?.error ?? "Archive failed.",
        });
        continue;
      }

      const body = (await response.json()) as {
        record_r_number: string;
        action: "link" | "create";
        attachment_link: string;
      };
      if (body.action === "link") linked += 1;
      if (body.action === "create") created += 1;
      nextUploads.push({
        ...upload,
        status: "Archived",
        archive_result: `${body.record_r_number} archived`,
      });
    }

    setUploads(nextUploads);
    setSummary(`${linked} matched and archived, ${created} new record created`);
    setIsConfirming(false);
  }

  const canConfirm = uploads.some((upload) => upload.match_result);

  return (
    <div className="mt-8">
      <label
        className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-foreground/30 px-6 py-10 text-center transition-colors hover:bg-foreground/5"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <span className="text-lg font-medium">Drop receipts here</span>
        <span className="mt-2 text-sm text-foreground/60">
          or click to select JPG, PNG, HEIC, or PDF files
        </span>
        <input
          accept={accepted}
          className="sr-only"
          multiple
          onChange={handleInput}
          type="file"
        />
      </label>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {summary ? <p className="mt-4 text-sm text-foreground/70">{summary}</p> : null}

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-sm text-foreground/65">
          {uploads.length} file{uploads.length === 1 ? "" : "s"} selected
        </p>
        <button
          className="h-10 rounded-md bg-foreground px-4 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!hasFiles || isProcessing}
          onClick={processAll}
          type="button"
        >
          {isProcessing ? "Processing..." : "Process All"}
        </button>
        <button
          className="h-10 rounded-md border border-foreground/20 px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canConfirm || isConfirming}
          onClick={confirmAll}
          type="button"
        >
          {isConfirming ? "Confirming..." : "Confirm All"}
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {uploads.map((upload) => (
          <article
            className="overflow-hidden rounded-md border border-foreground/10"
            key={upload.id}
          >
            <div className="flex aspect-[4/3] items-center justify-center bg-foreground/5">
              {upload.preview_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={upload.file.name}
                  className="h-full w-full object-contain"
                  src={upload.preview_url}
                />
              ) : (
                <span className="text-sm text-foreground/60">
                  {upload.file.type === "application/pdf" ||
                  upload.file.name.toLowerCase().endsWith(".pdf")
                    ? "PDF"
                    : "Preview unavailable"}
                </span>
              )}
            </div>
            <div className="space-y-3 p-4 text-sm">
              <div>
                <p className="font-medium">{upload.file.name}</p>
                <p className="text-foreground/60">{upload.status}</p>
                {upload.error ? (
                  <p className="mt-1 text-red-600">{upload.error}</p>
                ) : null}
                {upload.archive_result ? (
                  <p className="mt-1 text-foreground/70">
                    {upload.archive_result}
                  </p>
                ) : null}
              </div>
              <dl className="grid grid-cols-[130px_1fr] gap-2">
                <dt className="text-foreground/60">Original filename</dt>
                <dd className="break-words">{upload.exif?.filename ?? upload.file.name}</dd>
                <dt className="text-foreground/60">Date/time taken</dt>
                <dd>{upload.exif?.photo_taken_at ?? ""}</dd>
                <dt className="text-foreground/60">GPS latitude</dt>
                <dd>{upload.exif?.gps_lat ?? ""}</dd>
                <dt className="text-foreground/60">GPS longitude</dt>
                <dd>{upload.exif?.gps_lng ?? ""}</dd>
              </dl>
              {upload.ocr ? (
                <div className="border-t border-foreground/10 pt-3">
                  <p className="font-medium">OCR</p>
                  <dl className="mt-2 grid grid-cols-[130px_1fr] gap-2">
                    <dt className="text-foreground/60">Vendor</dt>
                    <dd>{upload.ocr.vendor ?? ""}</dd>
                    <dt className="text-foreground/60">Date</dt>
                    <dd>{upload.ocr.receipt_date ?? ""}</dd>
                    <dt className="text-foreground/60">Total</dt>
                    <dd>{upload.ocr.grand_total ?? ""}</dd>
                    <dt className="text-foreground/60">Receipt #</dt>
                    <dd>{upload.ocr.receipt_number ?? ""}</dd>
                    <dt className="text-foreground/60">Transaction</dt>
                    <dd>{upload.ocr.transaction_number ?? ""}</dd>
                  </dl>
                </div>
              ) : null}
              {upload.match_result ? (
                <div className="border-t border-foreground/10 pt-3">
                  <p className="font-medium">Match result</p>
                  {upload.match_result.match ? (
                    <p className="mt-2 text-sm">
                      Matched: {upload.match_result.match.record_r_number} –{" "}
                      {upload.match_result.match.vendor}{" "}
                      {String(upload.match_result.match.receipt_date).slice(0, 10)}{" "}
                      ${upload.match_result.match.grand_total ?? ""} (
                      {upload.match_result.confidence}%)
                    </p>
                  ) : upload.match_result.candidates?.length ? (
                    <label className="mt-2 block text-sm">
                      Pick a candidate
                      <select
                        className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
                        onChange={(event) =>
                          setUploads((current) =>
                            current.map((currentUpload) =>
                              currentUpload.id === upload.id
                                ? {
                                    ...currentUpload,
                                    selected_record_r_number: event.target.value,
                                  }
                                : currentUpload,
                            ),
                          )
                        }
                        value={upload.selected_record_r_number}
                      >
                        {upload.match_result.candidates.map((candidate) => (
                          <option
                            key={candidate.record_r_number}
                            value={candidate.record_r_number}
                          >
                            {candidate.record_r_number} – {candidate.vendor} –{" "}
                            {String(candidate.receipt_date).slice(0, 10)} – $
                            {candidate.grand_total ?? ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <p className="mt-2 text-sm">
                      No match — will create new record
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
