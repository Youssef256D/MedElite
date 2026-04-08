import { copyFile, mkdir, rm, stat, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";

import { env } from "@/lib/env";
import type { ByteRange, PutObjectInput, StorageProvider, StoredObject } from "@/lib/storage/base";

const MIME_BY_EXTENSION: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

export class LocalStorageProvider implements StorageProvider {
  constructor(
    private readonly root = path.resolve(/* turbopackIgnore: true */ process.cwd(), env.LOCAL_STORAGE_ROOT),
  ) {}

  private resolveKey(key: string) {
    return path.join(this.root, key);
  }

  async ensureDirectories(paths: string[]) {
    await Promise.all(paths.map((value) => mkdir(this.resolveKey(value), { recursive: true })));
  }

  async putObject(input: PutObjectInput): Promise<StoredObject> {
    const filePath = this.resolveKey(input.key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, input.body);

    return {
      key: input.key,
      contentLength: input.body.length,
      contentType: input.contentType,
      path: filePath,
    };
  }

  async putObjectFromPath(input: { key: string; sourcePath: string; contentType: string }): Promise<StoredObject> {
    const filePath = this.resolveKey(input.key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await copyFile(input.sourcePath, filePath);
    const stats = await stat(filePath);

    return {
      key: input.key,
      contentLength: stats.size,
      contentType: input.contentType,
      path: filePath,
    };
  }

  async statObject(key: string) {
    const filePath = this.resolveKey(key);

    try {
      const fileStats = await stat(filePath);
      const extension = path.extname(filePath).toLowerCase();
      return {
        key,
        contentLength: fileStats.size,
        contentType: MIME_BY_EXTENSION[extension] ?? "application/octet-stream",
        path: filePath,
      };
    } catch {
      return null;
    }
  }

  async createReadStream(key: string, range?: ByteRange) {
    const object = await this.statObject(key);

    if (!object?.path) {
      throw new Error(`Storage object not found for key ${key}`);
    }

    return {
      stream: createReadStream(object.path, range ? { start: range.start, end: range.end } : undefined),
      object,
    };
  }

  async deleteObject(key: string) {
    const filePath = this.resolveKey(key);
    await rm(filePath, { force: true });
  }
}
