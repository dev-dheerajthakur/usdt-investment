import * as crypto from 'crypto';

export class HsmService {
  private masterSecret: Buffer;
  constructor(masterSecretHex: string) {
    // In production: Get from AWS KMS, Azure Key Vault, etc.
    this.masterSecret = Buffer.from(masterSecretHex.replace('0x', ''), 'hex');

    if (this.masterSecret.length !== 64) {
      throw new Error('Master secret must be 64 bytes (128 hex characters)');
    }
  }

  /**
   * Derive Seed using HKDF
   * Formula: Seed = HKDF(MasterSecret, UserID, Salt)
   */
  deriveSeed(
    userId: string,
    chain: string,
    salt: Buffer,
    infoSecret: string,
  ): Buffer {
    const info = `custodial_wallet|${chain}|${infoSecret}|${userId}`;

    // Seed using HKDF-SHA256
    const seed = crypto.hkdfSync(
      'sha256',
      this.masterSecret,
      salt,
      Buffer.from(info),
      64,
    );

    return Buffer.isBuffer(seed) ? seed : Buffer.from(seed);
  }

  doubleLayerEncryption(
    data: Buffer,
    userId: string,
    dek: string,
    kek: string,
  ): string {
    const encryptedData = this.encryptWithDEK({ dek: Buffer.from(dek, 'hex'), userId, data });
    const wrappedData = this.encryptWithKEK({
      cipherData: encryptedData,
      kek: Buffer.from(kek, 'hex'),
      userId,
    });
    return wrappedData.toString('hex');
  }
  doubleLayerDecryption(
    data: Buffer,
    userId: string,
    dek: string,
    kek: string,
  ): Buffer {
    const encryptedData = this.decryptWithKEK({ kek: Buffer.from(kek, 'hex'), userId, payload: data });
    const wrappedData = this.decryptWithDEK({
      payload: encryptedData,
      dek: Buffer.from(dek, 'hex'),
      userId,
    });
    return wrappedData;
  }

  private encryptWithDEK({
    data,
    dek,
    userId,
  }: {
    data: Buffer;
    dek: Buffer;
    userId: string;
  }): Buffer {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);
    cipher.setAAD(Buffer.from(userId));

    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const combined = Buffer.concat([iv, authTag, encrypted]);
    return combined;
  }
  private encryptWithKEK({
    kek,
    cipherData,
    userId,
  }: {
    kek: Buffer;
    cipherData: Buffer;
    userId: string;
  }): Buffer {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', kek, iv);
    cipher.setAAD(Buffer.from(userId));

    const encrypted = Buffer.concat([
      cipher.update(cipherData),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    const combined = Buffer.concat([iv, authTag, encrypted]);
    return combined;
  }
  private decryptWithKEK({
    kek,
    payload,
    userId,
  }: {
    kek: Buffer;
    payload: Buffer;
    userId: string;
  }): Buffer {
    const iv = payload.subarray(0, 12);
    const authTag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', kek, iv);

    decipher.setAAD(Buffer.from(userId));
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }
  private decryptWithDEK({
    dek,
    payload,
    userId,
  }: {
    dek: Buffer;
    payload: Buffer;
    userId: string;
  }): Buffer {
    const iv = payload.subarray(0, 12);
    const authTag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', dek, iv);

    decipher.setAAD(Buffer.from(userId));
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }
}
