/**
 * Phase 62.0 — S3-compatible blob store (Cloudflare R2 / AWS S3).
 */

import "server-only";

import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import type { CreativeBlobS3Config } from "./config";
import type { CreativeBlobHead, CreativeBlobPutInput, CreativeBlobStore } from "./types";

async function streamToUint8Array(body: unknown): Promise<Uint8Array> {
  if (!body) return new Uint8Array();
  if (body instanceof Uint8Array) return body;
  if (Buffer.isBuffer(body)) return new Uint8Array(body);
  const stream = body as AsyncIterable<Uint8Array>;
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  const total = chunks.reduce((sum, c) => sum + c.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

export function createS3CompatibleCreativeBlobStore(
  config: CreativeBlobS3Config,
): CreativeBlobStore {
  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });

  return {
    id: "s3",
    isConfigured: () => true,
    async putObject(input: CreativeBlobPutInput): Promise<CreativeBlobHead> {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: input.key,
          Body: Buffer.from(input.bytes),
          ContentType: input.mimeType,
        }),
      );
      return { byteSize: input.bytes.byteLength, mimeType: input.mimeType };
    },
    async getObjectBytes(key: string): Promise<Uint8Array> {
      const response = await client.send(
        new GetObjectCommand({ Bucket: config.bucket, Key: key }),
      );
      return streamToUint8Array(response.Body);
    },
    async deleteObject(key: string): Promise<void> {
      await client.send(
        new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
      );
    },
    async headObject(key: string): Promise<CreativeBlobHead | null> {
      try {
        const response = await client.send(
          new HeadObjectCommand({ Bucket: config.bucket, Key: key }),
        );
        return {
          byteSize: Number(response.ContentLength ?? 0),
          mimeType: response.ContentType,
        };
      } catch {
        return null;
      }
    },
  };
}
