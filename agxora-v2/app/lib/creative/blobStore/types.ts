/**
 * Phase 62.0 — blob byte storage (S3-compatible, memory for tests).
 */

export type CreativeBlobPutInput = {
  readonly key: string;
  readonly bytes: Uint8Array;
  readonly mimeType: string;
};

export type CreativeBlobHead = {
  readonly byteSize: number;
  readonly mimeType?: string;
};

export type CreativeBlobStore = {
  readonly id: "memory" | "s3";
  putObject(input: CreativeBlobPutInput): Promise<CreativeBlobHead>;
  getObjectBytes(key: string): Promise<Uint8Array>;
  getObjectStream(key: string): Promise<ReadableStream<Uint8Array>>;
  deleteObject(key: string): Promise<void>;
  headObject(key: string): Promise<CreativeBlobHead | null>;
  isConfigured(): boolean;
};
