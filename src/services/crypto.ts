/**
 * BlinkMsg Cryptographic Engine
 * Uses hardware-accelerated Web Crypto API (SubtleCrypto)
 * AES-256-GCM authenticated encryption + PBKDF2 key derivation.
 */

export class CryptoService {
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
    const base64Key = btoa(String.fromCharCode(...new Uint8Array(exported)));

    return { cryptoKey, base64Key };
  }

  /**
   * Imports a base64 encoded raw key into CryptoKey
   */
  static async importKey(base64Key: string): Promise<CryptoKey> {
    const rawBinary = atob(base64Key);
    const rawBuffer = new Uint8Array(rawBinary.length);
    for (let i = 0; i < rawBinary.length; i++) {
      rawBuffer[i] = rawBinary.charCodeAt(i);
    }

    return await window.crypto.subtle.importKey(
      'raw',
      rawBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Derives a 256-bit AES key from a 6-digit room code or passphrase
   */
  static async deriveKeyFromCode(code: string, saltStr = 'BlinkMsg_Salt_2026'): Promise<CryptoKey> {
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

    const ciphertext = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));
    const ivBase64 = btoa(String.fromCharCode(...iv));

    return { ciphertext, iv: ivBase64 };
  }

  /**
   * Decrypts AES-256-GCM ciphertext
   */
  static async decrypt(ciphertext: string, ivBase64: string, cryptoKey: CryptoKey): Promise<string> {
    const rawCipher = atob(ciphertext);
    const cipherBuffer = new Uint8Array(rawCipher.length);
    for (let i = 0; i < rawCipher.length; i++) {
      cipherBuffer[i] = rawCipher.charCodeAt(i);
    }

    const rawIv = atob(ivBase64);
    const ivBuffer = new Uint8Array(rawIv.length);
    for (let i = 0; i < rawIv.length; i++) {
      ivBuffer[i] = rawIv.charCodeAt(i);
    }

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBuffer,
      },
      cryptoKey,
      cipherBuffer
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  }

  /**
   * Generates a 6-digit room code e.g. 748291
   */
  static generateRoomCode(): string {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    const code = (100000 + (array[0] % 900000)).toString();
    return code;
  }
}
