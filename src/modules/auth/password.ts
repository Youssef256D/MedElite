import { randomBytes } from "node:crypto";

import { argon2id, argon2Verify } from "hash-wasm";

const ARGON2_MEMORY_COST = 19456;
const ARGON2_TIME_COST = 2;
const ARGON2_PARALLELISM = 1;
const ARGON2_HASH_LENGTH = 32;
const ARGON2_SALT_LENGTH = 16;

export async function hashPassword(password: string) {
  return argon2id({
    password,
    salt: randomBytes(ARGON2_SALT_LENGTH),
    memorySize: ARGON2_MEMORY_COST,
    iterations: ARGON2_TIME_COST,
    parallelism: ARGON2_PARALLELISM,
    hashLength: ARGON2_HASH_LENGTH,
    outputType: "encoded",
  });
}

export async function verifyPassword(hash: string, password: string) {
  return argon2Verify({
    hash,
    password,
  });
}
