// Usage (from project root, after deploy):  node scripts/demo.mjs
// Runs initialize -> tip -> withdraw on Devnet with your CLI wallet, prints REAL signatures
// and writes them into TRANSACTION_SIGNATURES.md.
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import {
  Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

const PROGRAM_ID = new PublicKey("DsCjkVs9MHokhCgH1UA24kqnG8Bk1rjeN7SprtLuLyNh");
const walletPath = process.env.ANCHOR_WALLET || `${homedir()}/.config/solana/id.json`;
const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(walletPath, "utf8"))));
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

const disc = (n) => createHash("sha256").update(`global:${n}`).digest().subarray(0, 8);
const u64 = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
const [jar] = PublicKey.findProgramAddressSync([Buffer.from("jar"), payer.publicKey.toBuffer()], PROGRAM_ID);
const url = (s) => `https://explorer.solana.com/tx/${s}?cluster=devnet`;
const send = (keys, data) =>
  sendAndConfirmTransaction(connection, new Transaction().add(new TransactionInstruction({ programId: PROGRAM_ID, keys, data })), [payer]);

console.log("program:", PROGRAM_ID.toBase58());
console.log("creator:", payer.publicKey.toBase58());
console.log("jar PDA:", jar.toBase58());
if (!(await connection.getAccountInfo(PROGRAM_ID))?.executable) throw new Error("Program not deployed on Devnet at this ID. Run anchor deploy first.");

const res = {};
if (!(await connection.getAccountInfo(jar))) {
  res.init = await send([
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: jar, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ], disc("initialize"));
  console.log("initialize:", url(res.init));
} else console.log("jar already exists, skipping initialize");

res.tip = await send([
  { pubkey: payer.publicKey, isSigner: true, isWritable: true },
  { pubkey: payer.publicKey, isSigner: false, isWritable: false },
  { pubkey: jar, isSigner: false, isWritable: true },
  { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
], Buffer.concat([disc("tip"), u64(10_000_000)]));
console.log("tip:", url(res.tip));

const info = await connection.getAccountInfo(jar);
const rentMin = await connection.getMinimumBalanceForRentExemption(info.data.length);
const available = info.lamports - rentMin;
console.log(`jar: ${info.lamports} lamports, rent min ${rentMin}, withdrawable ${available}, tips ${info.data.readBigUInt64LE(48)}`);
res.withdraw = await send([
  { pubkey: payer.publicKey, isSigner: true, isWritable: true },
  { pubkey: jar, isSigner: false, isWritable: true },
], Buffer.concat([disc("withdraw"), u64(Math.floor(available / 2))]));
console.log("withdraw:", url(res.withdraw));

const line = (name, s) => s ? `- ${name} signature: \`${s}\`\n- ${name} Explorer URL: ${url(s)}\n` : "";
const md = readFileSync("TRANSACTION_SIGNATURES.md", "utf8").split("\n")[0] + "\n\nProgram ID: `" + PROGRAM_ID.toBase58() + "`\n\n" +
  line("Initialize", res.init) + "\n" + line("Tip", res.tip) + "\n" + line("Withdraw", res.withdraw) +
  "\nNever include private keys, wallet JSON files, seed phrases, or recovery phrases.\n";
if (res.init) writeFileSync("TRANSACTION_SIGNATURES.md", md);
else console.log("(initialize ran earlier; paste its signature manually from Explorer -> your wallet's history)");
