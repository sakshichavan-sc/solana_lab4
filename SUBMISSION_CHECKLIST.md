# Unit IV Practical — Final Checklist

## Source and configuration
- [x] Anchor Tip Jar program source included
- [x] PDA uses `[b"jar", creator]`
- [x] Tip uses System Program CPI
- [x] Creator withdrawal checks `has_one = creator`
- [x] Rent-exempt minimum is retained
- [x] Program ID is consistent across source, config, tests and app
- [x] React + Phantom Devnet dApp source included
- [x] Creator address can be entered to tip another creator
- [x] Raw-instruction tests included

## Must be completed on your own Devnet wallet before submission
- [ ] Confirm local Anchor/Solana toolchain versions
- [ ] Run `anchor build` successfully
- [ ] Deploy / upgrade the program on Devnet
- [ ] Save real initialize transaction signature
- [ ] Save real tip transaction signature
- [ ] Save real creator withdrawal signature
- [ ] Run `npm test` against the deployed Devnet program
- [ ] Run `npm run build` in `app/`
- [ ] Test Phantom connect, initialize, tip, refresh and withdraw
- [ ] Add real screenshots to `screenshots/`
- [ ] Complete `TRANSACTION_SIGNATURES.md`

Do not tick the Devnet/evidence items until you have actually completed them. Devnet transactions and screenshots must be your own.
