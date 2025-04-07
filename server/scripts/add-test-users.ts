import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function addTestUsers() {
  try {
    console.log("Adding test users to the database...");

    // Check if user with referral code AKIPB0 already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.referralCode, "AKIPB0"));

    if (existingUser) {
      console.log("User with referral code AKIPB0 already exists");
    } else {
      // Add test user with AKIPB0 referral code
      await db.insert(users).values({
        walletAddress: "GkWjUyVBSPbQe7bjkZAzPgbQUyCq4WLiqKgYLFsADvck",
        username: "test_user",
        referralCode: "AKIPB0",
        createdAt: new Date()
      });
      console.log("Added test user with referral code AKIPB0");
    }

    // Add more test users as needed

    console.log("Done!");
    process.exit(0);
  } catch (error) {
    console.error("Error adding test users:", error);
    process.exit(1);
  }
}

addTestUsers();