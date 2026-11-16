# Solana Unit IV Practical — Tip Jar

Anchor program (PDA + System Program CPI + creator-only withdraw) deployed to Solana Devnet, with a React + Phantom browser dApp.

## Deployment
- Network: Devnet
- Program ID: `DsCjkVs9MHokhCgH1UA24kqnG8Bk1rjeN7SprtLuLyNh`
- Jar PDA (seeds ["jar", creator]): `GKXKkZbGc1ydRWwE6NGM5Zc1mkgEDjQ1Y6ahCT14Y1Yi`
- Real transaction signatures (initialize, tip, withdraw) with Explorer links: see TRANSACTION_SIGNATURES.md

## Program
- initialize: creates the creator's jar PDA.
- tip: transfers SOL from any wallet to the jar through a System Program CPI and updates the counters.
- withdraw: only the creator can withdraw (has_one = creator), and the rent-exempt minimum always stays in the jar.

## What was verified
- anchor build and anchor deploy succeeded on Devnet.
- scripts/demo.mjs ran initialize, tip and withdraw on Devnet successfully.
- anchor run test: 3 passing (initialize/verify PDA, tip increments counter, zero tip rejected).
- The dApp in app/ builds with npm run build and starts with npm run dev. Phantom wallet flow was not tested.

## Versions and notes
- Uses Anchor 0.31.1 and @solana/web3.js v1 (not the handout's Anchor 1.2.1 + Kit/Codama client).
- Building with Anchor 0.31.1 needed overflow-checks = true in the root Cargo.toml and dependency versions compatible with Rust 1.84 (blake3 pinned to 1.8.2 in Cargo.lock).

## How to run
    npm install
    anchor build
    anchor deploy
    node scripts/demo.mjs
    anchor run test
    cd app && npm install && npm run dev

Reflection answers are in REFLECTION.md.