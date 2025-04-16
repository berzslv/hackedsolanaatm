import { PublicKey } from "@solana/web3.js";

const programId = new PublicKey("EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm"); 
const tokenMint = new PublicKey("59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk"); // HATM token mint

const [vaultAddress, _bump] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault"), tokenMint.toBuffer()],
  programId
);

console.log("Vault PDA Address:", vaultAddress.toBase58());