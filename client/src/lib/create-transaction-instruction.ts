/**
 * Helper function to create transaction instructions
 * Works with the Buffer polyfill to avoid issues
 */
import { PublicKey, TransactionInstruction, AccountMeta } from '@solana/web3.js';

export interface InstructionParams {
  keys: Array<{
    pubkey: PublicKey;
    isSigner: boolean;
    isWritable: boolean;
  }>;
  programId: PublicKey;
  data: Buffer | Uint8Array;
}

/**
 * Create a TransactionInstruction object
 */
export function createTransactionInstruction(params: InstructionParams): TransactionInstruction {
  const { keys, programId, data } = params;
  
  // Convert keys to AccountMeta
  const accountMetas: AccountMeta[] = keys.map(key => ({
    pubkey: key.pubkey,
    isSigner: key.isSigner,
    isWritable: key.isWritable
  }));

  // Create instruction with data (always convert to Buffer to be safe)
  // Avoid using instanceof since Buffer is polyfilled
  return new TransactionInstruction({
    keys: accountMetas,
    programId,
    data: Buffer.from(data)
  });
}