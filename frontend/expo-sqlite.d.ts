declare module 'expo-sqlite' {
  export interface SQLiteDatabase {
    execAsync(sql: string): Promise<void>;

    withTransactionAsync<T>(task: () => Promise<T>): Promise<T>;

    runAsync(sql: string, params?: any[] | Record<string, any>): Promise<{ lastInsertRowId?: number; changes?: number }>;

    getAllAsync<T = any>(sql: string, params?: any[] | Record<string, any>): Promise<T[]>;

    getFirstAsync<T = any>(sql: string, params?: any[] | Record<string, any>): Promise<T | null>;
  }

  export function openDatabaseAsync(name: string): Promise<SQLiteDatabase>;
}
