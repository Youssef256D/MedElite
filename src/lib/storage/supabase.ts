import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";

import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { supabaseAdmin } from "@/lib/supabase/server";
import type { ByteRange, PutObjectInput, StorageProvider, StoredObject } from "@/lib/storage/base";

function encodeStorageKey(key: string) {
  return key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export class SupabaseStorageProvider implements StorageProvider {
  private readonly bucket = env.SUPABASE_STORAGE_BUCKET;

  private bucketReady: Promise<void> | null = null;

  private get client() {
    if (!supabaseAdmin) {
      throw new AppError("Supabase storage is not configured.", "CONFIGURATION_ERROR", 500);
    }

    return supabaseAdmin;
  }

  private get objectUrl() {
    return `${env.SUPABASE_URL}/storage/v1/object/authenticated/${this.bucket}`;
  }

  async ensureDirectories() {
    return;
  }

  private async ensureBucket() {
    if (!this.bucketReady) {
      this.bucketReady = (async () => {
        const { data, error } = await this.client.storage.listBuckets();

        if (error) {
          throw new AppError(error.message, "STORAGE_ERROR", 500);
        }

        if (data.some((bucket) => bucket.id === this.bucket)) {
          return;
        }

        const { error: createError } = await this.client.storage.createBucket(this.bucket, {
          public: false,
          fileSizeLimit: env.MAX_UPLOAD_SIZE_BYTES,
        });

        if (createError && !createError.message.toLowerCase().includes("already exists")) {
          throw new AppError(createError.message, "STORAGE_ERROR", 500);
        }
      })();
    }

    await this.bucketReady;
  }

  async putObject(input: PutObjectInput): Promise<StoredObject> {
    await this.ensureBucket();
    const { error } = await this.client.storage.from(this.bucket).upload(input.key, input.body, {
      contentType: input.contentType,
      upsert: true,
    });

    if (error) {
      throw new AppError(error.message, "STORAGE_ERROR", 500);
    }

    return {
      key: input.key,
      contentLength: input.body.length,
      contentType: input.contentType,
    };
  }

  async putObjectFromPath(input: { key: string; sourcePath: string; contentType: string }): Promise<StoredObject> {
    await this.ensureBucket();

    const stream = createReadStream(input.sourcePath);
    const { error } = await this.client.storage.from(this.bucket).upload(input.key, stream, {
      contentType: input.contentType,
      upsert: true,
    });

    if (error) {
      const fallbackBody = await readFile(input.sourcePath);
      const { error: fallbackError } = await this.client.storage.from(this.bucket).upload(input.key, fallbackBody, {
        contentType: input.contentType,
        upsert: true,
      });

      if (fallbackError) {
        throw new AppError(fallbackError.message, "STORAGE_ERROR", 500);
      }

      return {
        key: input.key,
        contentLength: fallbackBody.length,
        contentType: input.contentType,
      };
    }

    const object = await this.statObject(input.key);

    if (!object) {
      throw new AppError("Uploaded object could not be verified in Supabase Storage.", "STORAGE_ERROR", 500);
    }

    return object;
  }

  async statObject(key: string) {
    await this.ensureBucket();
    const { data, error } = await this.client.storage.from(this.bucket).info(key);

    if (error) {
      if (error.message.toLowerCase().includes("not found")) {
        return null;
      }

      throw new AppError(error.message, "STORAGE_ERROR", 500);
    }

    return {
      key,
      contentLength: data.metadata?.size ?? 0,
      contentType: data.metadata?.mimetype ?? "application/octet-stream",
    };
  }

  async createReadStream(key: string, range?: ByteRange) {
    const object = await this.statObject(key);

    if (!object) {
      throw new AppError(`Storage object not found for key ${key}`, "STORAGE_ERROR", 404);
    }

    const response = await fetch(`${this.objectUrl}/${encodeStorageKey(key)}`, {
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: env.SUPABASE_SERVICE_ROLE_KEY!,
        ...(range ? { Range: `bytes=${range.start}-${range.end}` } : {}),
      },
      cache: "no-store",
    });

    if (!response.ok || !response.body) {
      throw new AppError("Supabase Storage could not stream the requested object.", "STORAGE_ERROR", response.status);
    }

    return {
      stream: Readable.fromWeb(
        response.body as unknown as import("node:stream/web").ReadableStream,
      ),
      object,
    };
  }

  async deleteObject(key: string) {
    await this.ensureBucket();
    const { error } = await this.client.storage.from(this.bucket).remove([key]);

    if (error && !error.message.toLowerCase().includes("not found")) {
      throw new AppError(error.message, "STORAGE_ERROR", 500);
    }
  }
}
