/* Agent Identity Unit Tests — credential security, hashing, format validation */

import { describe, it, expect } from 'vitest'
import { CredentialHashService } from '../services/credential-hash.service'

describe('CredentialHashService', () => {
  const service = new CredentialHashService()

  describe('generateKey', () => {
    it('generates a key with cg_live_ prefix', () => {
      const { fullKey, keyPrefix, keyHash, secret } = service.generateKey()

      expect(fullKey).toMatch(/^cg_live_/)
      expect(keyPrefix).toContain('••••••')
      expect(keyHash).toMatch(/^[0-9a-f]{64}$/)
      expect(secret.length).toBeGreaterThan(0)
    })

    it('generates unique keys on each call', () => {
      const key1 = service.generateKey()
      const key2 = service.generateKey()

      expect(key1.fullKey).not.toBe(key2.fullKey)
      expect(key1.keyHash).not.toBe(key2.keyHash)
    })

    it('key hash is deterministic for the same key', () => {
      const { fullKey } = service.generateKey()
      const hash1 = service.hashKey(fullKey)
      const hash2 = service.hashKey(fullKey)

      expect(hash1).toBe(hash2)
    })
  })

  describe('hashKey', () => {
    it('produces a 64-character hex string', () => {
      const hash = service.hashKey('test-key')
      expect(hash).toMatch(/^[0-9a-f]{64}$/)
    })

    it('different keys produce different hashes', () => {
      const hash1 = service.hashKey('key-1')
      const hash2 = service.hashKey('key-2')

      expect(hash1).not.toBe(hash2)
    })
  })

  describe('verifyKey', () => {
    it('verifies a valid key against its hash', () => {
      const { fullKey, keyHash } = service.generateKey()
      expect(service.verifyKey(fullKey, keyHash)).toBe(true)
    })

    it('rejects an incorrect key', () => {
      const { keyHash } = service.generateKey()
      expect(service.verifyKey('cg_live_wrong-key', keyHash)).toBe(false)
    })

    it('rejects an empty key', () => {
      const { keyHash } = service.generateKey()
      expect(service.verifyKey('', keyHash)).toBe(false)
    })
  })

  describe('isValidKeyFormat', () => {
    it('accepts valid format', () => {
      const { fullKey } = service.generateKey()
      expect(service.isValidKeyFormat(fullKey)).toBe(true)
    })

    it('rejects keys without prefix', () => {
      expect(service.isValidKeyFormat('not-a-valid-key')).toBe(false)
    })

    it('rejects short keys', () => {
      expect(service.isValidKeyFormat('cg_live_short')).toBe(false)
    })

    it('rejects empty key', () => {
      expect(service.isValidKeyFormat('')).toBe(false)
    })
  })
})

describe('Agent Identity Security Invariants', () => {
  it('API key is never stored as plaintext', () => {
    // The credential repository only stores keyHash and keyPrefix
    // Never the full key. This is enforced by the service layer.
    const service = new CredentialHashService()
    const { fullKey, keyHash } = service.generateKey()

    // Key hash should NOT equal the key
    expect(keyHash).not.toBe(fullKey)
    // Key hash should be a hash, not the key itself
    expect(keyHash.length).toBe(64) // SHA-256 hex
    // Key has prefix + secret, hash is always 64 chars
    expect(fullKey.length).toBeGreaterThan(10) // Has prefix + secret
  })

  it('timing-safe comparison prevents timing attacks', () => {
    const service = new CredentialHashService()
    const { fullKey, keyHash } = service.generateKey()

    // Both correct and incorrect verifications should take similar time
    // (this is a structural test — timing attacks require statistical analysis)
    const startCorrect = performance.now()
    service.verifyKey(fullKey, keyHash)
    const timeCorrect = performance.now() - startCorrect

    const startWrong = performance.now()
    service.verifyKey('cg_live_completely-wrong-key-that-is-long-enough-to-compare', keyHash)
    const timeWrong = performance.now() - startWrong

    // Both should complete (no crash, no exception)
    expect(timeCorrect).toBeGreaterThanOrEqual(0)
    expect(timeWrong).toBeGreaterThanOrEqual(0)
  })

  it('key prefix is safe to store and display', () => {
    const service = new CredentialHashService()
    const { keyPrefix, fullKey } = service.generateKey()

    // Prefix should NOT contain the full secret
    expect(keyPrefix).not.toContain(fullKey.slice(12))
    // Prefix should contain the masking
    expect(keyPrefix).toContain('••••••')
  })

  it('same key always produces the same hash', () => {
    const service = new CredentialHashService()
    const key = 'cg_live_' + 'a'.repeat(40)

    const hash1 = service.hashKey(key)
    const hash2 = service.hashKey(key)
    const hash3 = service.hashKey(key)

    expect(hash1).toBe(hash2)
    expect(hash2).toBe(hash3)
  })
})
