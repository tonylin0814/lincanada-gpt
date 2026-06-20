import exifr from "exifr";
import heicConvert from "heic-convert";

export type ExtractedExif = {
  filename: string;
  photo_taken_at: string | null;
  gps_lat: string | null;
  gps_lng: string | null;
};

function isHeic(filename: string, mimeType?: string) {
  const lower = filename.toLowerCase();
  return (
    lower.endsWith(".heic") ||
    lower.endsWith(".heif") ||
    mimeType === "image/heic" ||
    mimeType === "image/heif"
  );
}

function normalizeCoordinate(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return value.toFixed(7);
}

function normalizeDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  return null;
}

async function parseExif(buffer: Buffer) {
  const [metadata, gps] = await Promise.all([
    exifr.parse(buffer).catch(() => null),
    exifr.gps(buffer).catch(() => null),
  ]);

  return { metadata, gps };
}

async function convertHeicToJpeg(buffer: Buffer) {
  const converted = await heicConvert({
    buffer,
    format: "JPEG",
    quality: 1,
  });

  return Buffer.from(converted);
}

export async function extractExifFromFile(
  buffer: Buffer,
  filename: string,
  mimeType?: string,
): Promise<ExtractedExif> {
  let { metadata, gps } = await parseExif(buffer);

  if (!metadata && isHeic(filename, mimeType)) {
    const converted = await convertHeicToJpeg(buffer).catch(() => null);
    if (converted) {
      ({ metadata, gps } = await parseExif(converted));
    }
  }

  return {
    filename,
    photo_taken_at: normalizeDate(
      metadata?.DateTimeOriginal ?? metadata?.CreateDate ?? metadata?.ModifyDate,
    ),
    gps_lat: normalizeCoordinate(gps?.latitude ?? metadata?.latitude),
    gps_lng: normalizeCoordinate(gps?.longitude ?? metadata?.longitude),
  };
}
