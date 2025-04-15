import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, Token } from "@solana/spl-token";
import fs from 'fs';
import path from 'path';

// This script deploys and initializes the Referral Staking program

async function main() {
  // Configure the client
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  console.log("Deploying Referral Staking Program");
  console.log("Provider wallet:", provider.wallet.publicKey.toString());

  // Load token authority
  const tokenKeypairPath = path.resolve("token-keypair-original.json");
  const tokenKeypairData = JSON.parse(fs.readFileSync(tokenKeypairPath, 'utf-8'));
  const tokenAuthority = Keypair.fromSecretKey(
    Buffer.from(tokenKeypairData)
  );
  console.log("Token authority:", tokenAuthority.publicKey.toString());

  // The token mint address - this is the existing token
  const tokenMintAddress = new PublicKey("59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk");
  console.log("Token mint address:", tokenMintAddress.toString());

  try {
    // After building and deploying with Anchor CLI, load the deployed program
    // Get programId from Anchor.toml or from the keypair
    const programId = new PublicKey("EnGhdovdYhHk4nsHEJr6gmV5cYfrx53ky19RD56eRRGm");
    console.log("Program ID:", programId.toString());

    const idl = JSON.parse(
      fs.readFileSync("target/idl/referral_staking.json", "utf8")
    );
    
    const program = new Program(idl, programId, provider);
    
    // Find the PDA for the global state
    const [globalStateAddress, globalStateBump] = await PublicKey.findProgramAddress(
      [Buffer.from("global_state")],
      programId
    );
    console.log("Global state address:", globalStateAddress.toString());
    
    // Find the PDA for the vault
    const [vaultAddress, vaultBump] = await PublicKey.findProgramAddress(
      [Buffer.from("vault"), tokenMintAddress.toBuffer()],
      programId
    );
    console.log("Vault address:", vaultAddress.toString());
    
    // Initialize the program with our desired configuration
    console.log("Initializing program...");
    
    // Configuration parameters
    const rewardRate = new anchor.BN(1200); // 12% daily rewards (in basis points)
    const unlockDuration = new anchor.BN(7 * 24 * 60 * 60); // 7 days in seconds
    const earlyUnstakePenalty = new anchor.BN(1000); // 10% penalty (in basis points)
    const minStakeAmount = new anchor.BN(10); // Minimum 10 tokens to stake
    const referralRewardRate = new anchor.BN(300); // 3% referral rewards (in basis points)
    
    try {
      // Initialize the program
      const tx = await program.methods
        .initialize(
          rewardRate,
          unlockDuration,
          earlyUnstakePenalty,
          minStakeAmount,
          referralRewardRate
        )
        .accounts({
          authority: provider.wallet.publicKey,
          tokenMint: tokenMintAddress,
          vault: vaultAddress,
          globalState: globalStateAddress,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();
        
      console.log("Program initialized successfully!");
      console.log("Transaction signature:", tx);
      
      // Add some tokens to the reward pool
      // First, get the token account for the wallet
      console.log("Adding tokens to reward pool...");
      const walletTokenAccount = await Token.getAssociatedTokenAddress(
        TOKEN_PROGRAM_ID,
        tokenMintAddress,
        provider.wallet.publicKey
      );
      
      const addToRewardPoolTx = await program.methods
        .addToRewardPool(new anchor.BN(50000)) // 50,000 tokens for rewards
        .accounts({
          authority: provider.wallet.publicKey,
          globalState: globalStateAddress,
          userTokenAccount: walletTokenAccount,
          vault: vaultAddress,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
        
      console.log("Added tokens to reward pool!");
      console.log("Transaction signature:", addToRewardPoolTx);
      
      console.log("\nDeployment Summary:");
      console.log("-------------------");
      console.log("Program ID:", programId.toString());
      console.log("Global State:", globalStateAddress.toString());
      console.log("Vault:", vaultAddress.toString());
      console.log("Token Mint:", tokenMintAddress.toString());
      console.log("Configuration:");
      console.log("- APY:", (rewardRate.toNumber() * 365) / 100, "%");
      console.log("- Unlock Duration:", unlockDuration.toNumber() / 86400, "days");
      console.log("- Early Unstake Penalty:", earlyUnstakePenalty.toNumber() / 100, "%");
      console.log("- Minimum Stake:", minStakeAmount.toString(), "tokens");
      console.log("- Referral Reward Rate:", referralRewardRate.toNumber() / 100, "%");
      
    } catch (err) {
      console.error("Error initializing program:", err);
    }
    
  } catch (err) {
    console.error("Error deploying program:", err);
    throw err;
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);