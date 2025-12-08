/**
 * Session Type Definitions
 */

export type SessionType = "STANDARD" | "BLIND" | "STRICT";

export type SessionStatus = "OPEN" | "CLOSED" | "RECONCILE";

export interface Session {
  id: string;
  warehouse: string;
  staff_user: string; // references User.username
  staff_name: string;
  status: SessionStatus;
  type: SessionType;
  started_at: string; // ISO Date string
  closed_at?: string; // ISO Date string
  total_items: number;
  total_variance: number;
  notes?: string;
}

export interface SessionCreate {
  warehouse: string;
  type?: SessionType;
}

export interface SessionStats {
  total_sessions: number;
  active_sessions: number;
  total_scans_today: number;
  active_users: number;
  items_per_hour: number;
}
