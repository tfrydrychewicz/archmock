import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://archmock:archmock_dev@localhost:5433/archmock";

async function reset() {
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  console.log("Dropping all tables...");
  await db.execute(sql`DROP SCHEMA public CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  await db.execute(sql`GRANT ALL ON SCHEMA public TO archmock`);
  await db.execute(sql`GRANT ALL ON SCHEMA public TO public`);

  await client.end();
  console.log("Done. Run 'pnpm db:migrate' to recreate schema, then 'pnpm db:seed'.");
}

reset().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
