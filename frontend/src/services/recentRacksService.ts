import AsyncStorage from "@react-native-async-storage/async-storage";

const keyFor = (sessionId: string, floor: string | null | undefined) => {
  const f = (floor || "").trim() || "__unknown__";
  return `recent_racks:${sessionId}:${f}`;
};

const normalize = (v: string) => (v || "").trim();

export const RecentRacksService = {
  async getRecent(sessionId: string, floor: string | null | undefined, limit = 5): Promise<string[]> {
    try {
      const k = keyFor(sessionId, floor);
      const raw = await AsyncStorage.getItem(k);
      if (!raw) return [];
      const arr = JSON.parse(raw) as string[];
      return Array.isArray(arr) ? arr.slice(0, limit) : [];
    } catch {
      return [];
    }
  },

  async addRecent(sessionId: string, floor: string | null | undefined, rack: string, max = 5): Promise<void> {
    try {
      const k = keyFor(sessionId, floor);
      const current = await RecentRacksService.getRecent(sessionId, floor, max + 5);
      const value = normalize(rack);
      if (!value) return;
      const existing = new Set<string>();
      const next: string[] = [];
      // Unshift new value
      next.push(value);
      existing.add(value.toLowerCase());
      // Append the rest, dedup by lowercase
      for (const r of current) {
        const rv = normalize(r);
        const low = rv.toLowerCase();
        if (!existing.has(low)) {
          next.push(rv);
          existing.add(low);
        }
        if (next.length >= max) break;
      }
      await AsyncStorage.setItem(k, JSON.stringify(next));
    } catch {
      // ignore
    }
  },

  async clear(sessionId: string, floor: string | null | undefined): Promise<void> {
    try {
      const k = keyFor(sessionId, floor);
      await AsyncStorage.removeItem(k);
    } catch {
      // ignore
    }
  },
};
