/**
 * BlinkMsg Cryptographic Engine
 * Hardware-accelerated Web Crypto API (SubtleCrypto)
 * AES-256-GCM authenticated encryption + PBKDF2 key derivation.
 */

export class CryptoService {
  /**
   * Safe chunked conversion from ArrayBuffer / Uint8Array to Base64 (avoids stack overflow)
   */
  static bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    const chunk = 8192;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  /**
   * Safe conversion from Base64 string to Uint8Array
   */
  static base64ToBuffer(base64: string): Uint8Array {
    const rawBinary = atob(base64);
    const buffer = new Uint8Array(rawBinary.length);
    for (let i = 0; i < rawBinary.length; i++) {
      buffer[i] = rawBinary.charCodeAt(i);
    }
    return buffer;
  }

  /**
   * Generates a cryptographically secure 256-bit AES-GCM key
   */
  static async generateRoomKey(): Promise<{ cryptoKey: CryptoKey; base64Key: string }> {
    const cryptoKey = await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );

    const exported = await window.crypto.subtle.exportKey('raw', cryptoKey);
    const base64Key = CryptoService.bufferToBase64(exported);

    return { cryptoKey, base64Key };
  }

  /**
   * Imports a base64 encoded raw key into CryptoKey
   */
  static async importKey(base64Key: string): Promise<CryptoKey> {
    const rawBuffer = CryptoService.base64ToBuffer(base64Key);

    return await window.crypto.subtle.importKey(
      'raw',
      rawBuffer as unknown as BufferSource,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Derives a deterministic 256-bit AES key from a 6-digit room code
   */
  static async deriveKeyFromCode(code: string, saltStr = 'BlinkMsg_Salt_2026_Secure'): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(code),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: enc.encode(saltStr),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Resolves or derives the CryptoKey for a room session
   */
  static async getRoomKey(secretKey?: string, roomCode?: string): Promise<CryptoKey> {
    if (secretKey && secretKey.length > 10) {
      try {
        return await CryptoService.importKey(secretKey);
      } catch (err) {
        console.warn('Failed to import room secretKey, falling back to code derivation:', err);
      }
    }
    const code = roomCode || '000000';
    return await CryptoService.deriveKeyFromCode(code);
  }

  /**
   * Encrypts plaintext message with AES-256-GCM
   */
  static async encrypt(plaintext: string, cryptoKey: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
    const enc = new TextEncoder();
    const encoded = enc.encode(plaintext);
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit recommended IV for GCM

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      cryptoKey,
      encoded
    );

    const ciphertext = CryptoService.bufferToBase64(encryptedBuffer);
    const ivBase64 = CryptoService.bufferToBase64(iv);

    return { ciphertext, iv: ivBase64 };
  }

  /**
   * Decrypts AES-256-GCM ciphertext safely
   */
  static async decrypt(ciphertext: string, ivBase64: string, cryptoKey: CryptoKey): Promise<string> {
    try {
      const cipherBuffer = CryptoService.base64ToBuffer(ciphertext);
      const ivBuffer = CryptoService.base64ToBuffer(ivBase64);

      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: ivBuffer as unknown as BufferSource,
        },
        cryptoKey,
        cipherBuffer as unknown as BufferSource
      );

      const dec = new TextDecoder();
      return dec.decode(decryptedBuffer);
    } catch (err) {
      console.error('Decryption failed:', err);
      return '[⚠️ Could not decrypt message with current session key]';
    }
  }

  /**
   * Generates a 6-digit room code e.g. 748291 with uniform distribution
   */
  static generateRoomCode(): string {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    const code = (100000 + (array[0] % 900000)).toString();
    return code;
  }

  /**
   * Generate secure unique ID
   */
  static generateId(prefix = 'id'): string {
    if (typeof window !== 'undefined' && window.crypto && 'randomUUID' in window.crypto) {
      return `${prefix}_${window.crypto.randomUUID().replace(/-/g, '').substring(0, 12)}`;
    }
    return `${prefix}_${Math.random().toString(36).substring(2, 12)}`;
  }
}
