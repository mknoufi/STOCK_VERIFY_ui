import * as SQLite from 'expo-sqlite';
import type { CreateCountLinePayload, Item } from "@/types/scan";

const DB_NAME = 'stock_verify.db';

export interface LocalItem {
  barcode: string;
  name: string;
  category: string;
  verified: number; // 0 or 1
  last_sync: string;
}

export interface PendingVerification {
  id?: number;
  barcode: string;
  verified: number;
  timestamp: string;
  username: string;
  variance: number;
  status?: string; // 'pending', 'locked', 'error'
}

export interface PendingCountLine {
  id?: number;
  session_id: string;
  item_code: string;
  payload_json: string;
  created_at: string;
}

let cachedDb: SQLite.SQLiteDatabase | null = null;

const ensureSchema = async (db: SQLite.SQLiteDatabase) => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS items (
      barcode TEXT PRIMARY KEY,
      name TEXT,
      category TEXT,
      verified INTEGER DEFAULT 0,
      last_sync TEXT
    );

    CREATE TABLE IF NOT EXISTS pending_verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT,
      verified INTEGER,
      timestamp TEXT,
      username TEXT,
      variance INTEGER,
      status TEXT DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS pending_count_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      item_code TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // Migration: Add status column if it doesn't exist (for existing installs)
  try {
    await db.execAsync('ALTER TABLE pending_verifications ADD COLUMN status TEXT DEFAULT "pending"');
  } catch {
    // Column likely exists or other error we can ignore for now
  }
};


/**
 * Initialize the local database and create tables if they don't exist.
 */
export const initDb = async () => {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await ensureSchema(db);

  console.log('Local database initialized');
  return db;
};

/**
 * Get the database instance.
 */
export const getDb = async () => {
  if (cachedDb) return cachedDb;
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await ensureSchema(db);
  cachedDb = db;
  return db;
};

/**
 * Save items to local database.
 */
export const saveLocalItems = async (items: LocalItem[]) => {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const item of items) {
      await db.runAsync(
        'INSERT OR REPLACE INTO items (barcode, name, category, verified, last_sync) VALUES (?, ?, ?, ?, ?)',
        [item.barcode, item.name, item.category, item.verified, item.last_sync]
      );
    }
  });
};

/**
 * Get all local items.
 */
export const getLocalItems = async (): Promise<LocalItem[]> => {
  const db = await getDb();
  return await db.getAllAsync<LocalItem>('SELECT * FROM items');
};

/**
 * Add a pending verification.
 */
export const addPendingVerification = async (verification: PendingVerification) => {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO pending_verifications (barcode, verified, timestamp, username, variance, status) VALUES (?, ?, ?, ?, ?, ?)',
    [verification.barcode, verification.verified, verification.timestamp, verification.username, verification.variance, verification.status || 'pending']
  );
};

/**
 * Get all pending verifications (only those with status 'pending').
 */
export const getPendingVerifications = async (): Promise<PendingVerification[]> => {
  const db = await getDb();
  return await db.getAllAsync<PendingVerification>('SELECT * FROM pending_verifications WHERE status = "pending"');
};

/**
 * Update the status of a pending verification.
 */
export const updatePendingVerificationStatus = async (id: number, status: string) => {
  const db = await getDb();
  await db.runAsync('UPDATE pending_verifications SET status = ? WHERE id = ?', [status, id]);
};

/**
 * Delete a pending verification.
 */
export const deletePendingVerification = async (id: number) => {
  const db = await getDb();
  await db.runAsync('DELETE FROM pending_verifications WHERE id = ?', [id]);
};

/**
 * Clear pending verifications after successful sync.
 */
export const clearPendingVerifications = async (ids: number[]) => {
  const db = await getDb();
  if (ids.length === 0) return;

  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(`DELETE FROM pending_verifications WHERE id IN (${placeholders})`, ids);
};

const mapLocalItemToAppItem = (row: LocalItem): Partial<Item> => {
  return {
    id: row.barcode,
    item_code: row.barcode,
    barcode: row.barcode,
    name: row.name,
    item_name: row.name,
    category: row.category,
  };
};

/**
 * Convenience wrapper used by screens expecting a `localDb` object.
 */
export const localDb = {
  async getItemByBarcode(barcode: string): Promise<Partial<Item> | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<LocalItem>(
      "SELECT * FROM items WHERE barcode = ?",
      [barcode],
    );
    if (!row) return null;
    return mapLocalItemToAppItem(row);
  },

  async savePendingVerification(payload: CreateCountLinePayload): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      "INSERT INTO pending_count_lines (session_id, item_code, payload_json, created_at) VALUES (?, ?, ?, ?)",
      [
        payload.session_id,
        payload.item_code,
        JSON.stringify(payload),
        new Date().toISOString(),
      ],
    );
  },
};
