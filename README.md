# Solana Unit IV Practical — Tip Jar

A working-source implementation of the Unit IV handout's Tip Jar flow: Anchor PDA program, Devnet configuration, raw-instruction tests, and a React + Phantom browser client.

## Features
- `initialize`: creates the creator's PDA using `[b"jar", creator]`.
- `tip`: any connected wallet can transfer SOL through the System Program CPI to a creator's jar.
- `withdraw`: only the stored creator can withdraw, and the rent-exempt minimum remains in the PDA.
- React dApp: connects Phantom, displays wallet balance and jar totals, initializes the connected creator's jar, tips a supplied creator address, and allows creator-only withdrawal.

## Important version note
The handout specifies Anchor CLI 1.2.1 and `@solana/kit` / Codama. This supplied starter archive was built around Anchor 0.31.1 and `@solana/web3.js` v1. The app and program in this archive use that same legacy SDK consistently; it is **not** a Kit/Codama-generated client implementation. Do not mix Kit and web3.js snippets in one client. If your instructor requires exact Kit/Codama compliance, this project needs that additional migration.

## Program ID
`DsCjkVs9MHokhCgH1UA24kqnG8Bk1rjeN7SprtLuLyNh`

The ID is kept consistent in `declare_id!`, `Anchor.toml`, tests and the browser app. Before deploying from a different machine, verify that `target/deploy/tip_jar-keypair.json` derives this same ID; otherwise run `anchor keys sync`, then update the app/test ID if the generated ID changes.

## Local setup (Windows PowerShell)
Install Rust, Solana/Agave CLI, Anchor CLI 0.31.1, Node.js 20+, and a Devnet-funded Solana keypair. Set the CLI to Devnet:

```powershell
solana config set --url devnet
solana address
solana balance
```

Update `Anchor.toml` wallet to your local keypair path if `~/.config/solana/id.json` is not where your keypair is stored.

From the project root:

```powershell
npm install
anchor keys list
anchor build
```

Deploy only after confirming the program ID and wallet:

```powershell
solana balance
anchor deploy
solana program show DsCjkVs9MHokhCgH1UA24kqnG8Bk1rjeN7SprtLuLyNh
```

The program ID shown by `anchor keys list` must match `declare_id!`, `Anchor.toml`, `tests/tip-jar.ts`, and `app/src/main.jsx`.

## Tests
The test suite sends transactions to the cluster configured in `Anchor.toml`. It is not a purely offline test. Run only after the program is deployed to Devnet and the configured wallet has enough Devnet SOL:

```powershell
anchor run test
```
(`anchor run` sets the `ANCHOR_PROVIDER_URL`/`ANCHOR_WALLET` variables the tests need; plain `npm test` fails without them.)

The tests initialize or verify the creator PDA, send a small tip and verify the counter, and reject a zero-value tip. Tests are stateful and a repeat run will reuse the existing PDA.

## Browser dApp

```powershell
cd app
npm install
npm run dev
```

Open the Vite localhost URL. Unlock Phantom and switch it to Solana Devnet/Testnet Mode. Connect your wallet. Use **Initialize my jar** for your own address. To tip someone else, paste their creator wallet address, refresh the jar details, enter an amount, and press **Send tip**. Only the connected creator wallet can withdraw from its jar.

Build check:

```powershell
npm run build
```

## Submission evidence still required
Do not fabricate screenshots or transaction signatures. After you personally run the program, collect:
1. `solana program show` / Explorer program page
2. Successful initialize transaction signature
3. Successful tip transaction signature and Explorer page
4. Jar state showing total tips and count
5. Successful creator withdrawal signature
6. Test output and running Phantom dApp

Record real transaction signatures in `TRANSACTION_SIGNATURES.md` and add real screenshots to `screenshots/`. A source-code archive alone cannot prove Devnet deployment or wallet transactions.
