import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@archmock/db";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://archmock:archmock_dev@localhost:5433/archmock";

const client = postgres(connectionString, { max: 10 });
export const db = drizzle(client, { schema });
