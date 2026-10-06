import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL, clusterApiUrl, type ParsedTransactionWithMeta } from '@solana/web3.js';
import { randomUUID } from 'crypto';
import { config } from '../config.js';
import { addCredits } from './auth.js';

// Solana Pay-style payment tracking
// Agent sends SOL to our treasury with a unique reference → we detect it → add credits

const connection = new Connection(
  config.SOLANA_RPC_URL || clusterApiUrl('mainnet-beta'),
  'confirmed'
);

// EXPERIMENTAL: pending payments are held in memory and are lost on restart.
interface PendingPayment {
  id: string;
  userId: string;
  credits: number;
  amountSol: number;
  treasuryAddress: string;
  reference: string; // unique pubkey for tracking
  createdAt: number;
  status: 'pending' | 'confirmed' | 'expired';
}

const pendingPayments = new Map<string, PendingPayment>();

// SOL price (simplified — in production use an oracle or price feed)
const SOL_PRICE_USD = config.SOL_PRICE_USD || 150; // fallback, should be fetched live

// Credit pricing in USD
const CREDITS_PER_DOLLAR = 10;

export function getPaymentPackages(solPrice?: number) {
  const price = solPrice || SOL_PRICE_USD;
  return [
    { id: 'sol_10', credits: 10, usd: 1.00, sol: +(1.00 / price).toFixed(6) },
    { id: 'sol_50', credits: 50, usd: 4.00, sol: +(4.00 / price).toFixed(6) },
    { id: 'sol_200', credits: 200, usd: 12.00, sol: +(12.00 / price).toFixed(6) },
    { id: 'sol_1000', credits: 1000, usd: 50.00, sol: +(50.00 / price).toFixed(6) },
  ];
}

export async function createSolanaPayment(userId: string, packageId: string): Promise<{
  paymentId: string;
  treasuryAddress: string;
  amountSol: number;
  reference: string;
  solanaPayUrl: string;
  expiresAt: string;
}> {
  const treasuryAddress = config.SOLANA_TREASURY_ADDRESS;
  if (!treasuryAddress) throw new Error('Solana treasury address not configured');

  const packages = getPaymentPackages();
  const pkg = packages.find(p => p.id === packageId);
  if (!pkg) throw new Error(`Invalid package: ${packageId}`);

  // Generate a unique reference keypair for this payment
  // The agent includes this as a reference in the transfer instruction
  const referenceKeypair = Keypair.generate();
  const reference = referenceKeypair.publicKey.toBase58();

  const payment: PendingPayment = {
    id: randomUUID(),
    userId,
    credits: pkg.credits,
    amountSol: pkg.sol,
    treasuryAddress,
    reference,
    createdAt: Date.now(),
    status: 'pending',
  };

  pendingPayments.set(payment.id, payment);

  // Solana Pay URL — agents can parse this directly
  // Format: solana:<recipient>?amount=<amount>&reference=<reference>&label=RingTask&message=<credits>+credits
  const solanaPayUrl = `solana:${treasuryAddress}?amount=${pkg.sol}&reference=${reference}&label=RingTask&message=${pkg.credits}%20credits`;

  return {
    paymentId: payment.id,
    treasuryAddress,
    amountSol: pkg.sol,
    reference,
    solanaPayUrl,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
  };
}

export async function checkPaymentStatus(paymentId: string): Promise<{
  status: 'pending' | 'confirmed' | 'expired' | 'not_found';
  credits?: number;
  signature?: string;
}> {
  const payment = pendingPayments.get(paymentId);
  if (!payment) return { status: 'not_found' };

  if (payment.status === 'confirmed') {
    return { status: 'confirmed', credits: payment.credits };
  }

  // Check if expired (30 min)
  if (Date.now() - payment.createdAt > 30 * 60 * 1000) {
    payment.status = 'expired';
    return { status: 'expired' };
  }

  // Poll Solana for the transaction using the reference
  try {
    const referenceKey = new PublicKey(payment.reference);
    const signatures = await connection.getSignaturesForAddress(referenceKey, { limit: 1 });

    if (signatures.length > 0) {
      const sig = signatures[0];
      // Verify the transaction
      const tx = await connection.getParsedTransaction(sig.signature, { maxSupportedTransactionVersion: 0 });

      const expectedLamports = Math.round(payment.amountSol * LAMPORTS_PER_SOL);
      if (tx && isPaymentToTreasury(tx, payment.treasuryAddress, expectedLamports)) {
        // Transaction confirmed and pays the treasury at least the quoted amount
        payment.status = 'confirmed';
        await addCredits(payment.userId, payment.credits);
        return { status: 'confirmed', credits: payment.credits, signature: sig.signature };
      }
    }
  } catch (err) {
    // Reference not found yet — still pending
  }

  return { status: 'pending' };
}

// Poll all pending payments (called on interval)
export async function pollPendingPayments() {
  for (const [id, payment] of pendingPayments) {
    if (payment.status !== 'pending') continue;
    await checkPaymentStatus(id);
  }
}

/**
 * True when a confirmed, successful transaction increased the treasury's SOL balance
 * by at least `expectedLamports`. Without this check any transaction that merely
 * referenced the payment's reference key would have been accepted.
 */
export function isPaymentToTreasury(tx: ParsedTransactionWithMeta, treasuryAddress: string, expectedLamports: number): boolean {
  if (!tx.meta || tx.meta.err) return false;
  const keys = tx.transaction.message.accountKeys.map((k) => k.pubkey.toBase58());
  const idx = keys.indexOf(treasuryAddress);
  if (idx === -1) return false;
  const received = (tx.meta.postBalances[idx] ?? 0) - (tx.meta.preBalances[idx] ?? 0);
  return received >= expectedLamports;
}
