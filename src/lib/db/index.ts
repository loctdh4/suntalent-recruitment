import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Khởi tạo lười: chỉ kết nối khi thực sự dùng (tránh fail lúc build khi chưa có env).
let _db: PostgresJsDatabase<typeof schema> | undefined;

function getDb(): PostgresJsDatabase<typeof schema> {
  if (!_db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL chưa được cấu hình (xem .env.example).");
    }
    // prepare: false để tương thích connection pooler của Supabase (PgBouncer).
    const client = postgres(connectionString, { prepare: false });
    _db = drizzle(client, { schema });
  }
  return _db;
}

// Proxy giữ nguyên cách dùng `db.select()...` ở call site mà vẫn lười kết nối.
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop);
  },
});

export { schema };
