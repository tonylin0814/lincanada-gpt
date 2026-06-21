"use client";

import { ChangeEvent, DragEvent, FormEvent, useMemo, useState } from "react";
import type { ExtractedExif } from "@/lib/exif";
import type { MatchResult } from "@/lib/matcher";
import type { ReceiptOcrResult } from "@/lib/ocr";
import type { Receipt, ReceiptItem } from "@/types/licanada_gpt";

type UploadFile = {
  id: string;
  file: File;
  preview_url: string | null;
  exif: ExtractedExif | null;
  ocr: ReceiptOcrResult | null;
  match_result: MatchResult | null;
  status:
    | "Selected"
    | "Reading image"
    | "Matching"
    | "Ready"
    | "Uploading"
    | "Error";
  error?: string;
  selected_record_r_number?: string;
};

type SavedReview = {
  receipt: Receipt;
  items: ReceiptItem[];
  archive_action: "link" | "create";
};

type UploadClientProps = {
  categories: string[];
  hasGoogleConnection: boolean;
  hasGoogleFolder: boolean;
};

const acceptedTypes = [
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "application/pdf",
];

const emptyOcr: ReceiptOcrResult = {
  vendor: null,
  vendor_address: null,
  store_number: null,
  receipt_number: null,
  transaction_number: null,
  authorization_code: null,
  receipt_date: null,
  receipt_time: null,
  category: null,
  subtotal: null,
  taxes: [],
  tips: null,
  grand_total: null,
  payment_method: null,
};

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

function toNullableString(value: FormDataEntryValue | null) {
  const stringValue = String(value || "").trim();
  return stringValue || null;
}

function toNullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : null;
}

function dateInputValue(value: Date | string | null) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function getTaxRows(taxes: unknown) {
  const rows = Array.isArray(taxes) ? taxes : [];

  return [0, 1].map((index) => {
    const tax = rows[index];
    if (!tax || typeof tax !== "object") {
      return { name: "", amount: "" };
    }

    const entry = tax as Record<string, unknown>;
    return {
      name: String(entry.name ?? entry.type ?? ""),
      amount: String(entry.amount ?? ""),
    };
  });
}

function getDrivePreviewUrl(url: string | null) {
  if (!url) return null;

  const fileMatch = url.match(/\/file\/d\/([^/]+)/);
  const openMatch = url.match(/[?&]id=([^&]+)/);
  const id = fileMatch?.[1] ?? openMatch?.[1];

  if (!id) return url;
  return `https://drive.google.com/file/d/${id}/preview`;
}

function buildSavePayload(form: HTMLFormElement, review: SavedReview) {
  const formData = new FormData(form);
  const taxes = [0, 1]
    .map((index) => ({
      name: String(formData.get(`tax_name_${index}`) || "").trim(),
      amount: String(formData.get(`tax_amount_${index}`) || "").trim(),
    }))
    .filter((tax) => tax.name || tax.amount);

  return {
    vendor: String(formData.get("vendor") ?? ""),
    receipt_date: String(formData.get("receipt_date") ?? ""),
    category: String(formData.get("category") ?? ""),
    subtotal: toNullableString(formData.get("subtotal")),
    taxes,
    tips: toNullableString(formData.get("tips")),
    grand_total: toNullableString(formData.get("grand_total")),
    payment_method: toNullableString(formData.get("payment_method")),
    receipt_number: toNullableString(formData.get("receipt_number")),
    transaction_number: toNullableString(formData.get("transaction_number")),
    authorization_code: toNullableString(formData.get("authorization_code")),
    review_notes: toNullableString(formData.get("review_notes")),
    items: review.items.map((item) => ({
      id: item.id,
      item_name: String(formData.get(`item_name_${item.id}`) ?? ""),
      adjusted_item_name:
        toNullableString(formData.get(`adjusted_item_name_${item.id}`)) ??
        String(formData.get(`item_name_${item.id}`) ?? ""),
      item_category: String(formData.get(`item_category_${item.id}`) ?? ""),
      item_qty: toNullableString(formData.get(`item_qty_${item.id}`)),
      item_price: toNullableString(formData.get(`item_price_${item.id}`)),
      item_total_price: toNullableString(
        formData.get(`item_total_price_${item.id}`),
      ),
    })),
  };
}

function matchLabel(match: MatchResult | null) {
  if (!match) return "Not matched yet";
  if (match.match) return `Matched ${match.match.record_r_number} (${match.confidence}%)`;
  if (match.candidates?.length) return "Pick a matching record";
  return "Will create a new record";
}

export function UploadClient({
  categories,
  hasGoogleConnection,
  hasGoogleFolder,
}: UploadClientProps) {
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const [savedReviews, setSavedReviews] = useState<SavedReview[]>([]);
  const [activeReviewIndex, setActiveReviewIndex] = useState(0);
  const [completedReviews, setCompletedReviews] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [isCancelingReview, setIsCancelingReview] = useState(false);
  const [error, setError] = useState("");

  const hasFiles = uploads.length > 0;
  const readyCount = uploads.filter((upload) => upload.ocr && upload.exif).length;
  const activeReview = savedReviews[activeReviewIndex] ?? null;
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
    setSavedReviews([]);
    setCompletedReviews(0);
    setActiveReviewIndex(0);
    setUploads((current) => [...current, ...createUploadFiles(files)]);
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      addFiles(event.target.files);
      event.target.value = "";
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    addFiles(event.dataTransfer.files);
  }

  function updateUpload(id: string, patch: Partial<UploadFile>) {
    setUploads((current) =>
      current.map((upload) =>
        upload.id === id ? { ...upload, ...patch } : upload,
      ),
    );
  }

  async function rematchUpload(upload: UploadFile, nextOcr: ReceiptOcrResult) {
    if (!upload.exif) return;

    updateUpload(upload.id, { status: "Matching", ocr: nextOcr });
    const response = await fetch("/api/upload/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exif: upload.exif, ocr: nextOcr }),
    });

    if (!response.ok) {
      updateUpload(upload.id, {
        status: "Error",
        error: "Could not match edited fields.",
      });
      return;
    }

    const body = (await response.json()) as { match_result: MatchResult };
    updateUpload(upload.id, {
      match_result: body.match_result,
      selected_record_r_number:
        body.match_result.match?.record_r_number ??
        body.match_result.candidates?.[0]?.record_r_number,
      status: "Ready",
      error: undefined,
    });
  }

  function updateOcrField(
    upload: UploadFile,
    field: keyof ReceiptOcrResult,
    value: string,
  ) {
    const current = upload.ocr ?? emptyOcr;
    const numericFields: Array<keyof ReceiptOcrResult> = [
      "subtotal",
      "tips",
      "grand_total",
    ];
    const nextOcr = {
      ...current,
      [field]: numericFields.includes(field) ? toNullableNumber(value) : value || null,
    } as ReceiptOcrResult;

    rematchUpload(upload, nextOcr);
  }

  function updateOcrTax(
    upload: UploadFile,
    index: number,
    field: "name" | "amount",
    value: string,
  ) {
    const current = upload.ocr ?? emptyOcr;
    const taxes = getTaxRows(current.taxes).map((tax) => ({
      name: tax.name,
      amount: toNullableNumber(tax.amount),
    }));
    taxes[index] = {
      ...taxes[index],
      [field]: field === "amount" ? toNullableNumber(value) : value,
    };
    const nextOcr = {
      ...current,
      taxes: taxes.filter((tax) => tax.name || tax.amount !== null),
    };

    rematchUpload(upload, nextOcr);
  }

  async function processAll() {
    if (!hasFiles) return;

    setError("");
    setSavedReviews([]);
    setActiveReviewIndex(0);
    setCompletedReviews(0);
    setIsProcessing(true);
    setUploads((current) =>
      current.map((upload) => ({
        ...upload,
        status: "Reading image",
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
      setError("Could not read image metadata.");
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

        updateUpload(upload.id, { exif, status: "Matching" });

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
            error: processBody?.error ?? "Could not analyze receipt.",
          };
        }

        const processBody = (await processResponse.json()) as {
          ocr: ReceiptOcrResult;
          match_result: MatchResult;
        };

        return {
          ...upload,
          exif,
          ocr: processBody.ocr,
          match_result: processBody.match_result,
          selected_record_r_number:
            processBody.match_result.match?.record_r_number ??
            processBody.match_result.candidates?.[0]?.record_r_number,
          status: "Ready" as const,
        };
      }),
    );

    setUploads(processedUploads);
    setIsProcessing(false);
  }

  async function archiveAll() {
    setError("");
    setIsArchiving(true);
    const reviews: SavedReview[] = [];
    const failedUploads: UploadFile[] = [];

    for (const upload of uploads) {
      if (!upload.exif || !upload.ocr || !upload.match_result) {
        failedUploads.push(upload);
        continue;
      }

      updateUpload(upload.id, { status: "Uploading" });
      const selectedRecord = upload.selected_record_r_number ?? "";
      const matchAction = selectedRecord ? "link" : "create";
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
        } | null;
        failedUploads.push({
          ...upload,
          status: "Error",
          error: body?.error ?? "Could not upload receipt.",
        });
        continue;
      }

      const archiveBody = (await response.json()) as {
        record_r_number: string;
        action: "link" | "create";
      };
      const detail = await fetch(
        `/api/records/receipts/${encodeURIComponent(
          archiveBody.record_r_number,
        )}`,
      );

      if (detail.ok) {
        const detailBody = (await detail.json()) as Omit<
          SavedReview,
          "archive_action"
        >;
        reviews.push({ ...detailBody, archive_action: archiveBody.action });
      }

      if (upload.preview_url) URL.revokeObjectURL(upload.preview_url);
    }

    setUploads(failedUploads);
    setSavedReviews(reviews);
    setActiveReviewIndex(0);
    setCompletedReviews(0);
    setIsArchiving(false);
  }

  async function saveActiveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeReview) return;

    setError("");
    setIsSavingReview(true);
    const response = await fetch(
      `/api/records/receipts/${encodeURIComponent(
        activeReview.receipt.record_r_number,
      )}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildSavePayload(event.currentTarget, activeReview)),
      },
    );

    setIsSavingReview(false);
    if (!response.ok) {
      setError("Could not save receipt changes.");
      return;
    }

    setCompletedReviews((current) => current + 1);
    setActiveReviewIndex((current) => current + 1);
  }

  async function cancelActiveReview() {
    if (!activeReview) return;

    const isLast = activeReviewIndex >= savedReviews.length - 1;
    const confirmed = window.confirm(
      isLast
        ? `Cancel ${activeReview.receipt.record_r_number}? This removes the uploaded Google Drive file.`
        : `Cancel ${activeReview.receipt.record_r_number} and move to the next receipt? This removes the uploaded Google Drive file.`,
    );

    if (!confirmed) return;

    setError("");
    setIsCancelingReview(true);
    const response = await fetch("/api/upload/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        record_r_number: activeReview.receipt.record_r_number,
        archive_action: activeReview.archive_action,
      }),
    });
    setIsCancelingReview(false);

    if (!response.ok) {
      setError("Could not cancel this upload.");
      return;
    }

    setCompletedReviews((current) => current + 1);
    setActiveReviewIndex((current) => current + 1);
  }

  const canArchive = readyCount > 0 && hasGoogleFolder && hasGoogleConnection;

  return (
    <div className="mt-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border border-foreground/10 px-4 py-3 text-sm">
        <div>
          <p className="font-medium">Google Drive</p>
          <p className="mt-1 text-foreground/65">
            {hasGoogleFolder
              ? hasGoogleConnection
                ? "Connected and ready."
                : "Folder is set, but Google Drive is not connected yet."
              : "A Google Drive folder ID is required before archiving."}
          </p>
        </div>
        {!hasGoogleConnection ? (
          <a
            className="inline-flex h-10 items-center rounded-md bg-foreground px-4 text-sm font-medium text-background"
            href="/api/auth/google"
          >
            Connect Google Drive
          </a>
        ) : null}
      </div>

      {!activeReview ? (
        <>
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

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-foreground/65">
              {uploads.length} file{uploads.length === 1 ? "" : "s"} selected
              {readyCount > 0 ? `, ${readyCount} ready` : ""}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                className="h-12 min-w-36 rounded-md bg-blue-700 px-5 text-sm font-semibold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-700/40"
                disabled={!hasFiles || isProcessing}
                onClick={processAll}
                type="button"
              >
                {isProcessing ? "Reading..." : "Upload"}
              </button>
              {readyCount > 0 ? (
                <button
                  className="h-12 min-w-44 rounded-md bg-green-700 px-5 text-sm font-semibold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-green-700/40"
                  disabled={!canArchive || isArchiving}
                  onClick={archiveAll}
                  type="button"
                >
                  {isArchiving ? "Uploading..." : "Upload to Google Drive"}
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {uploads.map((upload) => (
              <UploadEditCard
                key={upload.id}
                onFieldBlur={updateOcrField}
                onRecordChange={(value) =>
                  updateUpload(upload.id, { selected_record_r_number: value })
                }
                onTaxBlur={updateOcrTax}
                categories={categories}
                upload={upload}
              />
            ))}
          </div>
        </>
      ) : (
        <SavedReceiptReview
          completed={completedReviews}
          categories={categories}
          isCanceling={isCancelingReview}
          isSaving={isSavingReview}
          onCancel={cancelActiveReview}
          onSubmit={saveActiveReview}
          review={activeReview}
          reviewIndex={activeReviewIndex}
          total={savedReviews.length}
        />
      )}

      {!activeReview && savedReviews.length > 0 && completedReviews >= savedReviews.length ? (
        <div className="mt-6 border border-green-700 bg-green-50 px-4 py-3 text-sm text-green-950">
          <p className="text-base font-semibold">Upload Success!</p>
          <p className="mt-1">
            {completedReviews}/{savedReviews.length} done. All uploaded receipts
            have been handled.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function UploadEditCard({
  upload,
  categories,
  onFieldBlur,
  onTaxBlur,
  onRecordChange,
}: {
  upload: UploadFile;
  categories: string[];
  onFieldBlur: (
    upload: UploadFile,
    field: keyof ReceiptOcrResult,
    value: string,
  ) => void;
  onTaxBlur: (
    upload: UploadFile,
    index: number,
    field: "name" | "amount",
    value: string,
  ) => void;
  onRecordChange: (value: string) => void;
}) {
  const ocr = upload.ocr;
  const taxRows = getTaxRows(ocr?.taxes);
  const matchOptions = [
    ...(upload.match_result?.match ? [upload.match_result.match] : []),
    ...(upload.match_result?.candidates ?? []),
  ];

  return (
    <article className="overflow-hidden rounded-md border border-foreground/10">
      <div className="grid gap-4 p-4 md:grid-cols-[180px_1fr]">
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
              {upload.file.name.toLowerCase().endsWith(".pdf")
                ? "PDF"
                : "Preview unavailable"}
            </span>
          )}
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <p className="font-medium">{upload.file.name}</p>
            <p className="text-foreground/60">{upload.status}</p>
            {upload.error ? (
              <p className="mt-1 text-red-600">{upload.error}</p>
            ) : null}
          </div>

          {upload.exif ? (
            <dl className="grid grid-cols-[130px_1fr] gap-2">
              <dt className="text-foreground/60">Original filename</dt>
              <dd className="break-words">{upload.exif.filename}</dd>
              <dt className="text-foreground/60">Date/time taken</dt>
              <dd>{upload.exif.photo_taken_at ?? ""}</dd>
              <dt className="text-foreground/60">GPS latitude</dt>
              <dd>{upload.exif.gps_lat ?? ""}</dd>
              <dt className="text-foreground/60">GPS longitude</dt>
              <dd>{upload.exif.gps_lng ?? ""}</dd>
            </dl>
          ) : null}
        </div>
      </div>

      {ocr ? (
        <div className="border-t border-foreground/10 p-4">
          <p className="text-sm font-semibold">Edit OCR fields to rematch</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {[
              ["vendor", "Vendor", ocr.vendor ?? ""],
              ["vendor_address", "Vendor Address", ocr.vendor_address ?? ""],
              ["receipt_date", "Receipt Date", ocr.receipt_date ?? ""],
              ["receipt_time", "Receipt Time", ocr.receipt_time ?? ""],
              ["subtotal", "Sub-Total", ocr.subtotal ?? ""],
              ["tips", "Tips", ocr.tips ?? ""],
              ["grand_total", "Total", ocr.grand_total ?? ""],
              ["payment_method", "Payment Method", ocr.payment_method ?? ""],
              ["receipt_number", "Receipt Number", ocr.receipt_number ?? ""],
              [
                "transaction_number",
                "Transaction Number",
                ocr.transaction_number ?? "",
              ],
            ].map(([field, label, value]) => (
              <label className="block text-sm" key={String(field)}>
                {label}
                <input
                  className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
                  defaultValue={String(value)}
                  onBlur={(event) =>
                    onFieldBlur(
                      upload,
                      field as keyof ReceiptOcrResult,
                      event.currentTarget.value,
                    )
                  }
                  type={field === "receipt_date" ? "date" : "text"}
                />
              </label>
            ))}
            <label className="block text-sm">
              Category
              <select
                className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
                defaultValue={ocr.category ?? "Other"}
                onBlur={(event) =>
                  onFieldBlur(upload, "category", event.currentTarget.value)
                }
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="mt-4">
            <legend className="text-sm font-medium">Taxes</legend>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              {taxRows.map((tax, index) => (
                <div className="grid gap-3 sm:grid-cols-2" key={index}>
                  <label className="block text-sm">
                    Tax name
                    <input
                      className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
                      defaultValue={tax.name}
                      onBlur={(event) =>
                        onTaxBlur(upload, index, "name", event.currentTarget.value)
                      }
                    />
                  </label>
                  <label className="block text-sm">
                    Amount
                    <input
                      className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
                      defaultValue={tax.amount}
                      onBlur={(event) =>
                        onTaxBlur(
                          upload,
                          index,
                          "amount",
                          event.currentTarget.value,
                        )
                      }
                    />
                  </label>
                </div>
              ))}
            </div>
          </fieldset>

          <div className="mt-4 border-t border-foreground/10 pt-4 text-sm">
            <p className="font-medium">{matchLabel(upload.match_result)}</p>
            {matchOptions.length > 0 ? (
              <label className="mt-2 block">
                Force match
                <select
                  className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
                  onChange={(event) => onRecordChange(event.currentTarget.value)}
                  value={upload.selected_record_r_number ?? ""}
                >
                  {matchOptions.map((candidate) => (
                    <option
                      key={candidate.record_r_number}
                      value={candidate.record_r_number}
                    >
                      {candidate.record_r_number} - {candidate.vendor} -{" "}
                      {String(candidate.receipt_date).slice(0, 10)} - $
                      {candidate.grand_total ?? ""}
                    </option>
                  ))}
                  <option value="">Create new record</option>
                </select>
              </label>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function SavedReceiptReview({
  review,
  categories,
  completed,
  total,
  reviewIndex,
  isSaving,
  isCanceling,
  onCancel,
  onSubmit,
}: {
  review: SavedReview;
  categories: string[];
  completed: number;
  total: number;
  reviewIndex: number;
  isSaving: boolean;
  isCanceling: boolean;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const receipt = review.receipt;
  const taxRows = getTaxRows(receipt.taxes);
  const previewUrl = getDrivePreviewUrl(receipt.attachment_link);
  const isLast = reviewIndex >= total - 1;

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-foreground/60">
            {completed + 1}/{total} done
          </p>
          <h2 className="text-xl font-semibold tracking-normal">
            Review {receipt.record_r_number}
          </h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="h-12 rounded-md border border-red-600 px-5 text-sm font-semibold uppercase tracking-wide text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isCanceling || isSaving}
            onClick={onCancel}
            type="button"
          >
            {isCanceling
              ? "Canceling..."
              : isLast
                ? "Cancel"
                : "Cancel This and Next"}
          </button>
          <button
            className="h-12 rounded-md bg-green-700 px-5 text-sm font-semibold uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:bg-green-700/40"
            disabled={isSaving || isCanceling}
            type="submit"
          >
            {isSaving ? "Saving..." : isLast ? "Save" : "Save and Next"}
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(320px,1fr)_minmax(0,1.35fr)]">
        <section className="border border-foreground/10 p-4">
          {previewUrl ? (
            <iframe
              className="h-[720px] w-full"
              src={previewUrl}
              title={`Receipt ${receipt.record_r_number}`}
            />
          ) : (
            <p className="text-sm text-foreground/60">No image yet</p>
          )}
        </section>

        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["vendor", "Vendor", receipt.vendor],
              ["receipt_date", "Date", dateInputValue(receipt.receipt_date)],
              ["subtotal", "Subtotal", receipt.subtotal ?? ""],
              ["tips", "Tips", receipt.tips ?? ""],
              ["grand_total", "Grand total", receipt.grand_total ?? ""],
              ["payment_method", "Payment method", receipt.payment_method ?? ""],
              ["receipt_number", "Receipt number", receipt.receipt_number ?? ""],
              [
                "transaction_number",
                "Transaction number",
                receipt.transaction_number ?? "",
              ],
              [
                "authorization_code",
                "Authorization code",
                receipt.authorization_code ?? "",
              ],
            ].map(([name, label, value]) => (
              <label className="block text-sm" key={String(name)}>
                {label}
                <input
                  className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
                  defaultValue={String(value)}
                  name={String(name)}
                  type={name === "receipt_date" ? "date" : "text"}
                />
              </label>
            ))}
            <label className="block text-sm">
              Category
              <select
                className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
                defaultValue={receipt.category}
                name="category"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="md:col-span-2">
              <legend className="text-sm font-medium">Taxes</legend>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                {taxRows.map((tax, index) => (
                  <div className="grid gap-3 sm:grid-cols-2" key={index}>
                    <label className="block text-sm">
                      Tax name
                      <input
                        className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
                        defaultValue={tax.name}
                        name={`tax_name_${index}`}
                      />
                    </label>
                    <label className="block text-sm">
                      Amount
                      <input
                        className="mt-2 h-10 w-full rounded-md border border-foreground/20 bg-background px-3"
                        defaultValue={tax.amount}
                        name={`tax_amount_${index}`}
                      />
                    </label>
                  </div>
                ))}
              </div>
            </fieldset>
            <label className="block text-sm md:col-span-2">
              Review notes
              <textarea
                className="mt-2 min-h-20 w-full rounded-md border border-foreground/20 bg-background px-3 py-2"
                defaultValue={receipt.review_notes ?? ""}
                name="review_notes"
              />
            </label>
          </div>

          <div className="overflow-x-auto border border-foreground/10">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-foreground/5">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Adjusted Item</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {review.items.length > 0 ? (
                  review.items.map((item) => (
                    <tr className="border-t border-foreground/10" key={item.id}>
                      {[
                        ["item_name", item.item_name],
                        [
                          "adjusted_item_name",
                          item.adjusted_item_name ?? item.item_name,
                        ],
                        ["item_category", item.item_category],
                        ["item_qty", item.item_qty ?? ""],
                        ["item_price", item.item_price ?? ""],
                        ["item_total_price", item.item_total_price ?? ""],
                      ].map(([field, value]) => (
                        <td className="px-3 py-2" key={field}>
                          <input
                            className="h-9 w-full rounded-md border border-foreground/20 bg-background px-2"
                            defaultValue={String(value)}
                            name={`${field}_${item.id}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-3 py-4 text-foreground/60" colSpan={6}>
                      No item rows extracted yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </form>
  );
}
