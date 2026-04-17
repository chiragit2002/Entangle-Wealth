// Stub — @solana/web3.js is not used but imported by @clerk/ui transitive deps
const noop = () => {};
class Stub {
  constructor(..._args: unknown[]) {}
}
export const Connection = Stub;
export const PublicKey = Stub;
export const Transaction = Stub;
export const VersionedTransaction = Stub;
export const VersionedMessage = Stub;
export type ConnectionConfig = unknown;
export type Cluster = string;
export type SendOptions = unknown;
export type Signer = unknown;
export type TransactionSignature = string;
export type TransactionVersion = unknown;
