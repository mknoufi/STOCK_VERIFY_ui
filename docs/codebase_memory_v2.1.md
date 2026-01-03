# STOCK_VERIFY_2.1 Codebase Memory

**Version:** 2.1
**Generated:** 2025-11-30
**Purpose:** Canonical technical memory for STOCK_VERIFY 2.1 architecture, stacks, flows, and data models.

---

## ⚙️ Tech Stack Overview

| Layer | Technology | Version |
|--------|-------------|----------|
| Backend | FastAPI | 0.115.8 |
| Backend | Python | 3.10+ |
| Database | MongoDB | 8.0 (Motor 3.7.1) |
| Database | SQL Server | 2019 (Read-only) |
| Frontend | React Native | 0.81.5 |
| Frontend | Expo | ~54.0.29 |
| State | Zustand | 5.0.9 |
| Styling | StyleSheet + Custom Theme System | N/A |
| Auth | JWT (Authlib) | ≥1.4.0 |

---

## 🧱 Data Flow Architecture

1. **Sync Service** (FastAPI)
   - Reads items from SQL Server (`tabItem`, `tabBin`)
   - Updates reference data in MongoDB

2. **MongoDB as Working DB**
   - Stores user verifications, enriched data, and corrections

3. **Frontend**
   - Barcode scanning, item counting, and discrepancy resolution

---

## 🧩 MongoDB Schema Highlights

**items**

```json
{
  "item_code": "ITM-001",
  "barcode": "1234567890",
  "item_name": "Sample Item",
  "stock_qty": 100,
  "verified_qty": 98,
  "variance": -2,
  "verified_by": "staff1",
  "verified_at": "2025-11-30T10:00:00Z",
  "rack": "R-12",
  "floor": "2",
  "hsn_code": "94054090",
  "mrp": 120.5,
  "brand_name": "Generic",
  "uom_name": "Nos",
  "enrichment_history": []
}
```

---

## 🗄️ SQL Server → MongoDB Field Mapping

| ERP Table          | SQL Field       | Mongo Field        | Description            |
| ------------------ | --------------- | ------------------ | ---------------------- |
| Products           | ProductCode     | item_code          | Unique item identifier |
| Products           | ProductName     | item_name          | Item name              |
| Products           | HSNCode         | hsn_code           | HSN classification     |
| Brands             | BrandName       | brand_name         | Brand name             |
| ProductBatches     | Stock           | stock_qty          | ERP stock quantity     |
| Warehouses         | WarehouseName   | warehouse          | Storage location       |
| InvTransactionMaster| TransactionDate| last_purchase_date | Recent purchase        |
| Parties            | PartyName       | last_purchase_supplier| Supplier info       |

---

## 🔄 Sync Logic

**Periodic Sync:**

- Every 60 min
- Compares SQL `LastModified` timestamps
- Updates MongoDB accordingly

**Real-Time Sync:**

- When item scanned → verify SQL quantity
- Update MongoDB if mismatch detected

---

## 🧠 Admin Panel Components

| Component             | Purpose                           |
| --------------------- | --------------------------------- |
| Security Dashboard    | Logs, Sessions, Failed Logins     |
| Field Mapping Editor  | Dynamic SQL-Mongo field mapping   |
| System Health Monitor | Displays sync/DB status           |
| Reports Module        | Variance + verification analytics |

---

## 🧾 Environment Configuration

**Backend `.env`:**

```
MONGO_URL=mongodb://localhost:27017
DB_NAME=stock_verify
SQL_SERVER_HOST=192.168.1.109
SQL_SERVER_PORT=1433
SQL_SERVER_USER=readonly_user
SQL_SERVER_PASSWORD=***
JWT_SECRET=********
JWT_REFRESH_SECRET=********
```

---
