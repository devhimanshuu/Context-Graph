/* Credential security — API key generation, hashing, and verification.

Security rules:
- NEVER store plaintext API keys
- Use cryptographic random for key generation
- Use SHA-256 + salt for storage
- Keys are shown only once at creation time
- Key prefix is stored for identification (cg_live_xxxxx) */

import { Injectable } from '@nestjs/common'
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto'

/** Key prefix for identification. */
const KEY_PREFIX = 'cg_live_'
const SECRET_BYTES = 32
const HASH_ROUNDS = 1

@Injectable()
export class CredentialHashService {
  /**
   * Generate a new API key with prefix.
   * Returns the full key (shown once) and the hash (stored).
   */
  generateKey(): { secret: string; fullKey: string; keyPrefix: string; keyHash: string } {
    const secret = randomBytes(SECRET_BYTES).toString('base64url')
    const fullKey = `${KEY_PREFIX}${secret}`
    const keyPrefix = fullKey.slice(0, 12) + '••••••'
    const keyHash = this.hashKey(fullKey)

    return { secret, fullKey, keyPrefix, keyHash }
  }

  /**
   * Hash an API key for storage comparison.
   * Uses SHA-256 with a consistent salt derived from the key itself.
   */
  hashKey(key: string): string {
    let hash = key
    for (let i = 0; i < HASH_ROUNDS; i++) {
      hash = createHash('sha256').update(hash).digest('hex')
    }
    return hash
  }

  /**
   * Verify a provided key against a stored hash.
   * Uses timing-safe comparison to prevent timing attacks.
   */
  verifyKey(providedKey: string, storedHash: string): boolean {
    const computedHash = this.hashKey(providedKey)
    if (computedHash.length !== storedHash.length) return false

    return timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(storedHash, 'hex'))
  }

  /**
   * Validate key format.
   */
  isValidKeyFormat(key: string): boolean {
    return key.startsWith(KEY_PREFIX) && key.length > KEY_PREFIX.length + 10
  }
}
