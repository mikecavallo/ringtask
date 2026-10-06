import { describe, expect, it } from 'vitest';
import { Keypair, type ParsedTransactionWithMeta } from '@solana/web3.js';
import { isPaymentToTreasury } from '../src/services/payments-solana.js';

const treasury = Keypair.generate().publicKey;
const payer = Keypair.generate().publicKey;

function tx(received: number, err: unknown = null): ParsedTransactionWithMeta {
  return {
    meta: { err, preBalances: [10_000_000, 0], postBalances: [10_000_000 - received - 5000, received] },
    transaction: { message: { accountKeys: [{ pubkey: payer }, { pubkey: treasury }] } },
  } as unknown as ParsedTransactionWithMeta;
}

describe('Solana payment verification', () => {
  it('accepts a transfer of at least the quoted amount to the treasury', () => {
    expect(isPaymentToTreasury(tx(1_000_000), treasury.toBase58(), 1_000_000)).toBe(true);
  });
  it('rejects underpayment, failed transactions, and other recipients', () => {
    expect(isPaymentToTreasury(tx(1), treasury.toBase58(), 1_000_000)).toBe(false);
    expect(isPaymentToTreasury(tx(1_000_000, { InstructionError: [0, 'x'] }), treasury.toBase58(), 1_000_000)).toBe(false);
    expect(isPaymentToTreasury(tx(1_000_000), Keypair.generate().publicKey.toBase58(), 1_000_000)).toBe(false);
  });
});
