import React, { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction,
  LAMPORTS_PER_SOL, SendTransactionError
} from "@solana/web3.js";
import { Buffer } from "buffer";
import "./style.css";

window.Buffer = Buffer;

const PROGRAM_ID = new PublicKey("DsCjkVs9MHokhCgH1UA24kqnG8Bk1rjeN7SprtLuLyNh");
const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const disc = async (name) => Buffer.from(
  await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`global:${name}`))
).subarray(0, 8);
const jarPda = (creator) => PublicKey.findProgramAddressSync(
  [Buffer.from("jar"), creator.toBuffer()], PROGRAM_ID
)[0];
const amountBytes = (n) => {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(n));
  return b;
};
const shortError = (e) => e?.message || String(e);
const toPublicKey = (value) => {
  try { return new PublicKey(value.trim()); }
  catch { throw new Error("Enter a valid Solana creator wallet address."); }
};

function App() {
  const [wallet, setWallet] = useState(null);
  const [creatorAddress, setCreatorAddress] = useState("");
  const [amount, setAmount] = useState("0.01");
  const [balance, setBalance] = useState(null);
  const [jarInfo, setJarInfo] = useState(null);
  const [status, setStatus] = useState("Connect Phantom and select Solana Devnet.");
  const [busy, setBusy] = useState(false);
  const [recipient, setRecipient] = useState("");

  const refreshInfo = useCallback(async (creator) => {
    if (!creator) return;
    try {
      const [walletLamports, info] = await Promise.all([
        wallet ? connection.getBalance(wallet, "confirmed") : Promise.resolve(null),
        connection.getAccountInfo(jarPda(creator), "confirmed")
      ]);
      if (walletLamports !== null) setBalance(walletLamports / LAMPORTS_PER_SOL);
      if (!info) {
        setJarInfo({ exists: false, address: jarPda(creator).toBase58(), creator: creator.toBase58() });
      } else if (!info.owner.equals(PROGRAM_ID) || info.data.length < 57) {
        setJarInfo({ exists: true, invalid: true, address: jarPda(creator).toBase58(), creator: creator.toBase58() });
      } else {
        setJarInfo({
          exists: true,
          address: jarPda(creator).toBase58(),
          creator: creator.toBase58(),
          lamports: info.lamports,
          sol: info.lamports / LAMPORTS_PER_SOL,
          totalTips: Number(info.data.readBigUInt64LE(40)) / LAMPORTS_PER_SOL,
          tipCount: Number(info.data.readBigUInt64LE(48)),
          rentMinimum: await connection.getMinimumBalanceForRentExemption(info.data.length, "confirmed")
        });
      }
    } catch (e) {
      setStatus(`Could not refresh Devnet data: ${shortError(e)}`);
    }
  }, [wallet]);

  async function connect() {
    const provider = window.phantom?.solana || window.solana;
    if (!provider?.isPhantom) {
      setStatus("Phantom extension not found. Install/unlock Phantom and try again.");
      return;
    }
    try {
      const response = await provider.connect();
      const pubkey = new PublicKey(response.publicKey.toString());
      setWallet(pubkey);
      setCreatorAddress(pubkey.toBase58());
      setStatus("Wallet connected. Confirm Phantom is set to Solana Devnet.");
    } catch (e) {
      setStatus(`Wallet connection failed: ${shortError(e)}`);
    }
  }

  useEffect(() => {
    if (wallet && creatorAddress) {
      try { refreshInfo(toPublicKey(creatorAddress)); }
      catch { setJarInfo(null); }
    }
  }, [wallet, creatorAddress, refreshInfo]);

  async function sendInstruction(label, keys, data, creator, ixOverride) {
    const provider = window.phantom?.solana || window.solana;
    if (!wallet || !provider) {
      setStatus("Connect Phantom first.");
      return;
    }
    setBusy(true);
    try {
      const tx = new Transaction().add(ixOverride || new TransactionInstruction({ programId: PROGRAM_ID, keys, data }));
      const latest = await connection.getLatestBlockhash("confirmed");
      tx.feePayer = wallet;
      tx.recentBlockhash = latest.blockhash;
      const signed = await provider.signTransaction(tx);
      let signature;
      try {
        signature = await connection.sendRawTransaction(signed.serialize(), {
          skipPreflight: false, preflightCommitment: "confirmed", maxRetries: 3
        });
      } catch (sendError) {
        if (sendError instanceof SendTransactionError && typeof sendError.getLogs === "function") {
          const logs = await sendError.getLogs(connection).catch(() => null);
          if (logs?.length) throw new Error(`${shortError(sendError)}\nProgram logs:\n${logs.join("\n")}`);
        }
        throw sendError;
      }
      const confirmation = await connection.confirmTransaction({ signature, ...latest }, "confirmed");
      if (confirmation.value.err) throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      setStatus(`${label} successful: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
      await refreshInfo(creator);
    } catch (e) {
      console.error(`${label} transaction error:`, e);
      setStatus(`${label} failed: ${shortError(e)}`);
      if (creator) await refreshInfo(creator);
    } finally {
      setBusy(false);
    }
  }

  async function initialize() {
    if (!wallet) return setStatus("Connect Phantom first.");
    let creator;
    try { creator = toPublicKey(creatorAddress); } catch (e) { return setStatus(shortError(e)); }
    if (!creator.equals(wallet)) return setStatus("Only the connected wallet can initialize its own jar. Set creator address to your connected wallet.");
    if (jarInfo?.exists) return setStatus("This creator's jar already exists.");
    await sendInstruction("Initialize", [
      { pubkey: wallet, isSigner: true, isWritable: true },
      { pubkey: jarPda(wallet), isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ], await disc("initialize"), wallet);
  }

  async function tip() {
    if (!wallet) return setStatus("Connect Phantom first.");
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0 || n * LAMPORTS_PER_SOL < 1) return setStatus("Enter an amount greater than 0 SOL.");
    let creator;
    try { creator = toPublicKey(creatorAddress); } catch (e) { return setStatus(shortError(e)); }
    if (!jarInfo?.exists || jarInfo.invalid) return setStatus("No valid jar found for this creator address.");
    if (balance !== null && balance < n + 0.01) return setStatus(`Insufficient wallet balance for ${n} SOL plus fees.`);
    await sendInstruction("Tip", [
      { pubkey: wallet, isSigner: true, isWritable: true },
      { pubkey: creator, isSigner: false, isWritable: false },
      { pubkey: jarPda(creator), isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ], Buffer.concat([await disc("tip"), amountBytes(Math.round(n * LAMPORTS_PER_SOL))]), creator);
  }

  async function withdraw() {
    if (!wallet) return setStatus("Connect Phantom first.");
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return setStatus("Enter an amount greater than 0 SOL.");
    let creator;
    try { creator = toPublicKey(creatorAddress); } catch (e) { return setStatus(shortError(e)); }
    if (!creator.equals(wallet)) return setStatus("Only the creator wallet can withdraw. Connect the jar owner wallet.");
    if (!jarInfo?.exists || jarInfo.invalid) return setStatus("No valid jar found for this creator.");
    const available = Math.max(0, (jarInfo.lamports - (jarInfo.rentMinimum ?? 0)) / LAMPORTS_PER_SOL);
    if (n > available) return setStatus(`Only ${available.toFixed(6)} SOL is withdrawable; rent reserve must remain in the jar.`);
    await sendInstruction("Withdraw", [
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: jarPda(creator), isSigner: false, isWritable: true }
    ], Buffer.concat([await disc("withdraw"), amountBytes(Math.round(n * LAMPORTS_PER_SOL))]), creator);
  }

  async function sendSol() {
    if (!wallet) return setStatus("Connect Phantom first.");
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return setStatus("Enter an amount greater than 0 SOL.");
    let to;
    try { to = toPublicKey(recipient); } catch { return setStatus("Enter a valid recipient address."); }
    if (balance !== null && balance < n + 0.001) return setStatus("Insufficient wallet balance for this transfer plus fees.");
    await sendInstruction("Send SOL", [], null, null, SystemProgram.transfer({
      fromPubkey: wallet, toPubkey: to, lamports: Math.round(n * LAMPORTS_PER_SOL)
    }));
  }

  async function refresh() {
    try {
      if (!creatorAddress) return;
      await refreshInfo(toPublicKey(creatorAddress));
      setStatus("Devnet account data refreshed.");
    } catch (e) { setStatus(shortError(e)); }
  }

  return <main>
    <header><small>SOLANA · DEVNET LAB</small><h1>Tip Jar</h1><p>Anchor program · PDA account · Phantom wallet</p></header>
    <section>
      <h2>1. Wallet</h2>
      <button disabled={busy} onClick={connect}>{wallet ? "Reconnect Phantom" : "Connect Phantom"}</button>
      <p className="small">{wallet?.toBase58() || "Wallet not connected"}</p>
      {wallet && <p className="small">Your Devnet balance: {balance === null ? "Loading…" : `${balance.toFixed(6)} SOL`}</p>}
      <h2>2. Creator jar</h2>
      <label>Creator wallet address</label>
      <input value={creatorAddress} onChange={e => setCreatorAddress(e.target.value)} placeholder="Paste creator's Solana address" />
      <label>Derived jar PDA</label>
      <code>{jarInfo?.address || (creatorAddress ? "Refresh to derive jar PDA" : "Connect wallet or enter creator address")}</code>
      <button className="secondary" disabled={busy || !wallet} onClick={refresh}>Refresh jar details</button>
      {jarInfo && <p className="small">{!jarInfo.exists ? "Jar not initialized for this creator." : jarInfo.invalid ? "PDA exists but owner/account data does not match this program." : `Jar balance: ${jarInfo.sol.toFixed(6)} SOL · Total tips: ${jarInfo.totalTips.toFixed(6)} SOL · Tip count: ${jarInfo.tipCount}`}</p>}
      <button className="secondary" disabled={busy || !wallet || creatorAddress !== wallet.toBase58()} onClick={initialize}>Initialize my jar</button>
      <h2>3. Tip / withdraw</h2>
      <label>Amount (SOL)</label>
      <input type="number" min="0.000000001" step="0.001" value={amount} onChange={e => setAmount(e.target.value)} />
      <div className="actions"><button disabled={busy || !wallet} onClick={tip}>Send tip</button><button className="secondary" disabled={busy || !wallet} onClick={withdraw}>Creator withdraw</button></div>
      <h2>4. Send SOL (System Program transfer)</h2>
      <label>Recipient address</label>
      <input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="Recipient Solana address" />
      <button disabled={busy || !wallet} onClick={sendSol}>Send SOL (uses amount above)</button>
      <label>Status / transaction</label><p className="status">{busy ? "Waiting for Phantom confirmation…" : status}</p>
      <p className="small">Devnet only. Never enter a seed phrase or private key in this app.</p>
    </section>
  </main>;
}

createRoot(document.getElementById("root")).render(<App />);