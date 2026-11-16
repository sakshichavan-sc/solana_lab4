import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { PublicKey, SystemProgram, TransactionInstruction, Transaction } from "@solana/web3.js";
import { createHash } from "crypto";

const PROGRAM_ID = new PublicKey("DsCjkVs9MHokhCgH1UA24kqnG8Bk1rjeN7SprtLuLyNh");
const disc = (name: string) => createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
const u64le = (n: bigint) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(n); return b; };
const pdaFor = (creator: PublicKey) => PublicKey.findProgramAddressSync(
  [Buffer.from("jar"), creator.toBuffer()], PROGRAM_ID
)[0];

describe("tip-jar (raw instructions; generated IDL not required)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const connection = provider.connection;
  const creator = provider.wallet.publicKey;
  const jar = pdaFor(creator);

  async function send(ix: TransactionInstruction) {
    return provider.sendAndConfirm(new Transaction().add(ix), []);
  }

  it("initializes or verifies the creator PDA", async () => {
    const info = await connection.getAccountInfo(jar);
    if (info) {
      expect(info.owner.equals(PROGRAM_ID)).to.equal(true);
      return;
    }
    await send(new TransactionInstruction({ programId: PROGRAM_ID, keys: [
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: jar, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ], data: disc("initialize") }));
    const created = await connection.getAccountInfo(jar);
    expect(created).not.to.equal(null);
    expect(created!.owner.equals(PROGRAM_ID)).to.equal(true);
  });

  it("sends a small tip and increments the counter", async () => {
    const before = await connection.getAccountInfo(jar);
    if (!before) throw new Error("Initialize the PDA before testing tips.");
    const countBefore = Number(before.data.readBigUInt64LE(48));
    const ix = new TransactionInstruction({ programId: PROGRAM_ID, keys: [
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: creator, isSigner: false, isWritable: false },
      { pubkey: jar, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ], data: Buffer.concat([disc("tip"), u64le(10_000n)]) });
    await send(ix);
    const after = await connection.getAccountInfo(jar);
    expect(after).not.to.equal(null);
    expect(Number(after!.data.readBigUInt64LE(48))).to.equal(countBefore + 1);
  });

  it("rejects a zero-amount tip", async () => {
    const ix = new TransactionInstruction({ programId: PROGRAM_ID, keys: [
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: creator, isSigner: false, isWritable: false },
      { pubkey: jar, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ], data: Buffer.concat([disc("tip"), u64le(0n)]) });
    let failed = false;
    try {
      await send(ix);
    } catch {
      failed = true;
    }
    expect(failed, "zero-amount tip should be rejected").to.equal(true);
  });
});
