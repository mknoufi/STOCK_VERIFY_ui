# Data Model: Comprehensive App Improvements

**Date**: 2025-12-24
**Feature**: 002-system-modernization-and-enhancements
**Status**: Complete

## Overview

This document defines the data entities and their relationships for the STOCK_VERIFY comprehensive improvements. It covers new entities for real-time updates, offline sync, theme preferences, and analytics.

---

## Entity Diagram

```text
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│      User       │────▶│  CountSession   │────▶│   CountLine     │
│  (existing)     │     │   (existing)    │     │   (existing)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                        │                       │
        ▼                        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ UserPreferences │     │  WebSocketConn  │     │   ItemLock      │
│     (new)       │     │     (memory)    │     │     (new)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                         │
                        ┌─────────────────┐              │
                        │   SyncQueue     │◀─────────────┘
                        │  (SQLite/new)   │
                        └─────────────────┘
```

---

## Entities

### 1. UserPreferences (New - MongoDB)

Stores user-specific theme and display preferences.

```typescript
interface UserPreferences {
  _id: ObjectId;
  user_id: string;           // Reference to User

  // Theme settings
  color_scheme: 'light' | 'dark' | 'system';
  primary_color: string;     // Hex color code, default: '#007AFF'
  font_size: 'small' | 'medium' | 'large';
  font_scale: number;        // 0.85, 1.0, 1.15

  // Notification settings
  push_notifications: boolean;
  sound_enabled: boolean;
  vibration_enabled: boolean;

  // Timestamps
  created_at: Date;
  updated_at: Date;
}
```

**Collection**: `user_preferences`
**Indexes**: `{ user_id: 1 }` (unique)

---

### 2. ItemLock (New - MongoDB)

Tracks temporary locks on items during offline sync conflict resolution.

```typescript
interface ItemLock {
  _id: ObjectId;
  item_code: string;         // ERP item code
  session_id: string;        // Reference to CountSession
  locked_by: string;         // User ID who created the lock
  locked_at: Date;
  expires_at: Date;          // Auto-release after 15 minutes
  reason: 'offline_sync' | 'conflict_resolution' | 'manual';
}
```

**Collection**: `item_locks`
**Indexes**:
- `{ item_code: 1 }` (unique)
- `{ expires_at: 1 }` (TTL index for auto-cleanup)

---

### 3. SyncQueue (New - SQLite on device)

Local queue for offline operations pending sync.

```sql
CREATE TABLE sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation TEXT NOT NULL,         -- 'count_update', 'session_complete', 'session_start'
  entity_type TEXT NOT NULL,       -- 'count_line', 'session'
  entity_id TEXT,                  -- Optional: existing entity ID
  payload TEXT NOT NULL,           -- JSON serialized operation data
  created_at INTEGER NOT NULL,     -- Unix timestamp
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  status TEXT DEFAULT 'pending',   -- 'pending', 'syncing', 'synced', 'failed', 'conflict'
  error_message TEXT,
  synced_at INTEGER
);

CREATE INDEX idx_sync_queue_status ON sync_queue(status);
CREATE INDEX idx_sync_queue_created ON sync_queue(created_at);
```

---

### 4. WebSocketConnection (In-Memory)

Runtime tracking of active WebSocket connections (not persisted).

```python
@dataclass
class WebSocketConnection:
    websocket: WebSocket
    user_id: str
    role: str                # 'admin', 'supervisor', 'staff'
    connected_at: datetime
    last_ping: datetime
    device_id: Optional[str]
```

---

### 5. VarianceAnalytics (New - MongoDB)

Aggregated analytics data for variance reporting.

```typescript
interface VarianceAnalytics {
  _id: ObjectId;

  // Time period
  period_type: 'daily' | 'weekly' | 'monthly';
  period_start: Date;
  period_end: Date;

  // Metrics
  total_items_counted: number;
  items_with_variance: number;
  variance_rate: number;          // Percentage: (items_with_variance / total_items) * 100
  accuracy_score: number;         // 100 - variance_rate

  // Breakdown
  variance_by_category: Record<string, {
    count: number;
    total_variance_value: number;
  }>;

  variance_by_reason: Record<string, number>;  // reason -> count

  // Comparison
  previous_period_accuracy: number;
  accuracy_change: number;        // Delta from previous period

  // Metadata
  session_ids: string[];          // Sessions included in this period
  generated_at: Date;
  generated_by: string;           // System or user who triggered
}
```

**Collection**: `variance_analytics`
**Indexes**:
- `{ period_type: 1, period_start: 1 }` (unique)
- `{ period_start: -1 }`

---

### 6. RealTimeEvent (New - Message Schema)

WebSocket message format for real-time updates.

```typescript
interface RealTimeEvent {
  type: 'session_update' | 'item_update' | 'count_complete' | 'user_activity' | 'system_alert';
  payload: {
    entity_id: string;
    entity_type: 'session' | 'item' | 'user';
    action: 'create' | 'update' | 'delete' | 'complete';
    data: Record<string, any>;
    actor: {
      user_id: string;
      username: string;
      role: string;
    };
  };
  timestamp: string;  // ISO 8601
  target_roles: string[];  // Which roles should receive this
}
```

---

## Existing Entities (Enhancements)

### User (Enhanced)

Add fields for enhanced authentication:

```typescript
// New fields to add
interface UserEnhancements {
  pin_hash: string;              // Already exists
  password_changed_at: Date;     // NEW: Track password changes
  pin_changed_at: Date;          // NEW: Track PIN changes
  failed_auth_attempts: number;  // NEW: For rate limiting
  last_failed_auth_at: Date;     // NEW: For lockout tracking
}
```

---

### CountSession (Enhanced)

Add fields for offline support:

```typescript
// New fields to add
interface CountSessionEnhancements {
  offline_created: boolean;      // NEW: Was session started offline?
  sync_status: 'synced' | 'pending' | 'conflict';  // NEW: Sync state
  conflict_items: string[];      // NEW: Item codes with conflicts
}
```

---

## Validation Rules

### UserPreferences

| Field | Rule |
|-------|------|
| `primary_color` | Must be valid hex color: `/^#[0-9A-Fa-f]{6}$/` |
| `font_scale` | Must be one of: 0.85, 1.0, 1.15 |

### ItemLock

| Field | Rule |
|-------|------|
| `expires_at` | Must be > `locked_at` |
| `expires_at` | Max duration: 15 minutes from `locked_at` |

### SyncQueue

| Field | Rule |
|-------|------|
| `max_retries` | Default 3, max 10 |
| `payload` | Must be valid JSON |

---

## State Transitions

### SyncQueue Status

```text
pending ─────▶ syncing ─────▶ synced
    │              │
    │              ▼
    │          failed ◀───── (retry if retry_count < max_retries)
    │              │
    │              ▼
    └──────▶ conflict ───▶ (requires manual resolution)
```

### ItemLock Lifecycle

```text
created ─────▶ active ─────▶ released
    │              │              │
    │              ▼              │
    │          expired ◀──────────┘
    │         (TTL auto-cleanup)
    │
    ▼
resolved ───▶ deleted
```

---

## Indexes Summary

| Collection | Index | Purpose |
|------------|-------|---------|
| `user_preferences` | `{ user_id: 1 }` unique | Fast lookup by user |
| `item_locks` | `{ item_code: 1 }` unique | Ensure one lock per item |
| `item_locks` | `{ expires_at: 1 }` TTL | Auto-cleanup expired locks |
| `variance_analytics` | `{ period_type: 1, period_start: 1 }` | Unique period aggregation |
| `users` | `{ barcode: 1 }` (existing) | Fast barcode lookup |
| `count_sessions` | `{ sync_status: 1 }` (new) | Find pending syncs |

---

## Migration Notes

1. **UserPreferences**: New collection, no migration needed. Create on first user access.
2. **ItemLock**: New collection, no migration needed. TTL index handles cleanup.
3. **VarianceAnalytics**: New collection. Backfill from existing session data optional.
4. **User enhancements**: Add fields with defaults for existing users.
5. **CountSession enhancements**: Add fields with defaults (`offline_created: false`, `sync_status: 'synced'`).
