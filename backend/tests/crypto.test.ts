import { describe, it, expect } from 'vitest';
import { encryptCredential, decryptCredential } from '../src/utils/crypto.js';

describe('Cryptography (AES-256-GCM) Tests', () => {
  const validKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const samplePlaintext = 'my_secret_ethereal_password_123!';

  it('should encrypt and decrypt a sensitive credential accurately', () => {
    const ciphertext = encryptCredential(samplePlaintext, validKey);
    expect(ciphertext).not.toBe(samplePlaintext);
    expect(ciphertext.split(':').length).toBe(3); // iv:authTag:ciphertext

    const decrypted = decryptCredential(ciphertext, validKey);
    expect(decrypted).toBe(samplePlaintext);
  });

  it('should throw error when encrypting with invalid key length', () => {
    expect(() => encryptCredential(samplePlaintext, 'short_key')).toThrow();
  });

  it('should throw error when decrypting tampered ciphertext', () => {
    const ciphertext = encryptCredential(samplePlaintext, validKey);
    const parts = ciphertext.split(':');
    // Tamper with encrypted data payload
    const tampered = `${parts[0]}:${parts[1]}:deadbeef${parts[2]}`;
    expect(() => decryptCredential(tampered, validKey)).toThrow();
  });

  it('should throw error when decrypting with wrong key', () => {
    const ciphertext = encryptCredential(samplePlaintext, validKey);
    const wrongKey = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
    expect(() => decryptCredential(ciphertext, wrongKey)).toThrow();
  });
});
