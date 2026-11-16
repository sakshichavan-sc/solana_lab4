// Usage (from project root): node scripts/set-program-id.mjs
// After `anchor keys sync`, declare_id! in lib.rs holds YOUR real program ID.
// This copies that ID into the tests, the dApp and the docs so everything matches.
import { readFileSync, writeFileSync } from "node:fs";

const lib = readFileSync("programs/tip-jar/src/lib.rs", "utf8");
const newId = lib.match(/declare_id!\("([1-9A-HJ-NP-Za-km-z]{32,44})"\)/)?.[1];
if (!newId) throw new Error("declare_id! not found in lib.rs");

const files = ["tests/tip-jar.ts", "app/src/main.jsx", "README.md", "TRANSACTION_SIGNATURES.md", "scripts/demo.mjs"];
for (const f of files) {
  const src = readFileSync(f, "utf8");
  // 1) the PROGRAM_ID constant in code files
  let out = src.replace(/(PROGRAM_ID\s*=\s*new PublicKey\(")[1-9A-HJ-NP-Za-km-z]{32,44}("\))/g, `$1${newId}$2`);
  // 2) the Program ID mentions in the docs
  out = out.replace(/(Program ID[^`\n]*`)[1-9A-HJ-NP-Za-km-z]{32,44}(`)/g, `$1${newId}$2`);
  out = out.replace(/(## Program ID\n`)[1-9A-HJ-NP-Za-km-z]{32,44}(`)/g, `$1${newId}$2`);
  out = out.replace(/(solana program show )[1-9A-HJ-NP-Za-km-z]{32,44}/g, `$1${newId}`);
  if (out !== src) { writeFileSync(f, out); console.log("updated", f); }
}
console.log("Program ID everywhere =", newId);
