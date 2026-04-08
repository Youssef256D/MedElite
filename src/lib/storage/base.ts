import type { Readable } from "node:stream";

export type ByteRange = {
  start: number;
  end: number;
};

export type PutObjectInput = {
  key: string;
  body: Buffer;
  contentType: string;
};

export type StoredObject = {
  key: string;
  contentType: string;
  contentLength: number;
  path?: string;
};

export interface StorageProvider {
  putObject(input: PutObjectInput): Promise<StoredObject>;
  putObjectFromPath(input: { key: string; sourcePath: string; contentType: string }): Promise<StoredObject>;
  createReadStream(key: string, range?: ByteRange): Promise<{ stream: Readable; object: StoredObject }>;
  statObject(key: string): Promise<StoredObject | null>;
  deleteObject(key: string): Promise<void>;
  ensureDirectories(paths: string[]): Promise<void>;
}
