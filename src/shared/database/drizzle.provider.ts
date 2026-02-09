import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export const DRIZZLE_TOKEN = 'DRIZZLE_DB';

export type DrizzleDB = ReturnType<typeof createDrizzleConnection>;

export function createDrizzleConnection() {
  const connectionString =
    process.env.DATABASE_URL ||
    `postgres://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`;

  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return drizzle(client, { schema });
}

export const drizzleProvider = {
  provide: DRIZZLE_TOKEN,
  useFactory: () => createDrizzleConnection(),
};
