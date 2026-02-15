// Placeholder for Count API types
export interface Count {
  id: string;
  itemId: string;
  quantity: number;
  location: string;
  timestamp: string;
  userId: string;
}

export interface CountSession {
  id: string;
  name: string;
  status: "active" | "completed" | "archived";
  startTime: string;
  endTime?: string;
  userId: string;
  counts: Count[];
}
