declare module "heic-convert" {
  export default function heicConvert(options: {
    buffer: Buffer;
    format: "JPEG" | "PNG";
    quality?: number;
  }): Promise<Buffer>;
}
