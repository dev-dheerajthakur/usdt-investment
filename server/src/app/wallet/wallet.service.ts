import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { HsmService } from './hsm.service';
import * as crypto from 'crypto'
import { ethers } from 'ethers';
import { UserService } from '../users/users.service';

@Injectable()
export class WalletService {
  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService
  ) {}

  async createWallet(userId: string): Promise<{saltHex: string, address: string}> {
    const masterSecret = process.env.MASTER_SECRET;
    const infoSecret = process.env.INFO_SECRET;
    // const saltDek = process.env.SALT_DEK;
    // const saltKek = process.env.SALT_KEK;
    // const seedDek = process.env.SEED_DEK;
    // const seedKek = process.env.SEED_KEK;
    // const PKDek = process.env.PK_DEK;
    // const PKKek = process.env.PK_KEK;

    if (!masterSecret || !infoSecret) {
        throw new Error('Wallet encryption env misconfigured');
    }

    try {
      const hsmService = new HsmService(masterSecret);
      const salt = crypto.randomBytes(32);
  
      const seed = hsmService.deriveSeed(userId, 'MATIC', salt, infoSecret);
      const root = ethers.HDNodeWallet.fromSeed(seed);
      const wallet = root.derivePath("m/44'/60'/0'/0/0");
  
      const saltHex = salt.toString('hex')
      // const encryptedSalt = hsmService.doubleLayerEncryption(salt, userId, saltDek, saltKek)
      // const encryptedSeed = hsmService.doubleLayerEncryption(seed, userId, seedDek, seedKek)
      // const encryptedPK = hsmService.doubleLayerEncryption(pkBuffer, userId, PKDek, PKKek)
  
      salt.fill(0)
      seed.fill(0)
      return { saltHex, address: wallet.address }
      
    } catch (error) {
      console.log(error)
      throw error
    }
  }
}