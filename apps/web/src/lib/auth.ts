import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@archmock/db";

export async function syncUser(clerkId: string) {
  try {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(clerkId);
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    const name = clerkUser.firstName || clerkUser.lastName
      ? [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ")
      : null;

    if (!email) return;

    await db
      .insert(users)
      .values({
        clerkId,
        email,
        name,
      })
      .onConflictDoUpdate({
        target: users.clerkId,
        set: { email, name },
      });
  } catch (err) {
    console.error("User sync failed:", err);
  }
}
