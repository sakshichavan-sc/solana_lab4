# Unit IV Lab — Reflection

## 1. Tip transaction account list

| Account | Signer? | Writable? | Owner / role |
|---|---:|---:|---|
| Tipper | Yes | Yes | System Program-owned wallet; pays the tip and transaction fee |
| Creator | No | No | System Program-owned wallet; identifies the jar owner |
| Jar PDA | No | Yes | Owned by the Tip Jar program; receives lamports and stores counters |
| System Program | No | No | Executable program invoked by the CPI transfer |

The tipper signs because SOL is debited from the tipper wallet. The jar is writable because its lamports and stored counters change. The program invokes the System Program to perform the wallet-to-PDA transfer.

## 2. Why derive the jar PDA and use `has_one`

The jar address is deterministic from the seeds `["jar", creator_pubkey]` and the Tip Jar program ID, so the client and program can independently derive the same PDA. The seeds constraint checks that the supplied jar is the correct PDA. `has_one = creator` additionally checks that the creator account supplied to the instruction matches the creator public key stored inside that jar. In the withdrawal instruction, the creator must also sign.

## 3. Where Phantom signing happens

The browser asks Phantom to approve and sign the transaction through the injected wallet provider. The app constructs the transaction and sends it to Phantom, but it never receives the wallet's private key or recovery phrase. After approval, the signed transaction is submitted to the Devnet RPC endpoint.

## 4. How to close the jar and recover rent

An additional creator-only instruction can use Anchor's `close = creator` account constraint on the jar PDA. The instruction should verify the creator with the PDA seeds and `has_one = creator`, then Anchor closes the account and transfers its remaining lamports (including the rent reserve) to the creator. The account is removed, so a later initialization can recreate it.
