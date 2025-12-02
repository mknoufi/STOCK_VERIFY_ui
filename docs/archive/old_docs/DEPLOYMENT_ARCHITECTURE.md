# STOCK_VERIFY_2 - Local Network Deployment Architecture

## 🌐 Network Topology

```
┌─────────────────────────────────────────────────────────────────────┐
│                    LOCAL NETWORK (192.168.x.x)                       │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  SQL SERVER (Existing System)                              │    │
│  │  - Read-only access for STOCK_VERIFY_2                     │    │
│  │  - Legacy data source                                      │    │
│  └────────────────────────────────────────────────────────────┘    │
│                              ↓ READ ONLY                             │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  MAIN SERVER (One System)                                  │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │  Python Backend (FastAPI/Flask)                      │  │    │
│  │  │  - REST API Server                                   │  │    │
│  │  │  - Port: 8000                                        │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │  MongoDB                                             │  │    │
│  │  │  - Working Database                                  │  │    │
│  │  │  - Port: 27017                                       │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │  Admin Web UI (React/Vue)                            │  │    │
│  │  │  - Full system control                               │  │    │
│  │  │  - Port: 3000                                        │  │    │
│  │  │  - Accessible: http://192.168.x.x:3000              │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────┘    │
│                              ↓ HTTP/REST                             │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  SUPERVISOR TERMINALS (Multiple Systems)                   │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │  Web Browser                                         │  │    │
│  │  │  - Supervisor Dashboard                              │  │    │
│  │  │  - Monitor staff progress                            │  │    │
│  │  │  - Review verifications                              │  │    │
│  │  │  - URL: http://192.168.x.x:3000/supervisor         │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────┘    │
│                              ↓ HTTP/REST                             │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  STAFF DEVICES (Mobile/Tablets)                            │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │  React Native App (Expo)                             │  │    │
│  │  │  - Stock counting                                    │  │    │
│  │  │  - Barcode scanning                                  │  │    │
│  │  │  - Verification recording                            │  │    │
│  │  │  - API: http://192.168.x.x:8000/api/v1             │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🖥️ System Components

### **1. Main Server (One System)**
**Hardware:** Desktop/Server computer on local network  
**IP Example:** 192.168.1.100  
**Roles:**
- Backend API server
- MongoDB database
- Admin web interface host

**Services Running:**
```bash
# Backend API
http://192.168.1.100:8000       # Python FastAPI/Flask

# MongoDB
mongodb://192.168.1.100:27017   # Database

# Admin Web UI
http://192.168.1.100:3000       # Admin Dashboard
```

**Admin Dashboard Features:**
- ✅ Full system configuration
- ✅ User management (create/edit staff, supervisors)
- ✅ Data sync controls (SQL Server → MongoDB)
- ✅ System monitoring and logs
- ✅ Reports and analytics
- ✅ Database backup/restore
- ✅ Override/approve verifications

---

### **2. Supervisor Terminals (Multiple Systems)**
**Hardware:** Desktop computers or tablets with browsers  
**Access:** Web browser pointing to main server  
**URL:** `http://192.168.1.100:3000/supervisor`

**Supervisor Dashboard Features:**
- ✅ Real-time staff activity monitoring
- ✅ View current counting progress
- ✅ Review completed verifications
- ✅ Assign items to staff
- ✅ Approve/reject discrepancies
- ✅ Generate shift reports
- ✅ View stock status
- ❌ NO system configuration (limited permissions)

**Access Control:**
```javascript
// Supervisor role restrictions
roles: {
  supervisor: {
    can_view: ['staff_activity', 'verifications', 'reports'],
    can_edit: ['approve_verification', 'assign_items'],
    cannot: ['system_config', 'user_management', 'database_sync']
  }
}
```

---

### **3. Staff Devices (Mobile/Tablets)**
**Hardware:** iOS/Android phones or tablets  
**App:** React Native + Expo  
**Network:** Connected to same WiFi network

**Mobile App Features:**
- ✅ Login with QR code or PIN
- ✅ Barcode scanning
- ✅ Item lookup
- ✅ Stock counting
- ✅ Photo capture (damaged items)
- ✅ Quick notes entry
- ✅ Offline mode support
- ✅ Sync when online

**API Connection:**
```typescript
// Mobile app configuration
const API_CONFIG = {
  baseURL: 'http://192.168.1.100:8000/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
}
```

---

## 🔄 Data Flow by User Role

### **Admin Flow (Main System)**

```
1. Admin logs into Admin Dashboard
   ↓
2. Initiates SQL Server sync
   ↓
3. Backend fetches data from SQL Server
   ↓
4. Data stored in MongoDB
   ↓
5. Admin assigns items to staff/supervisors
   ↓
6. Admin monitors overall system
```

### **Supervisor Flow (Terminal)**

```
1. Supervisor opens web browser
   ↓
2. Navigate to http://192.168.1.100:3000/supervisor
   ↓
3. Login with supervisor credentials
   ↓
4. View dashboard:
   - Staff locations/status
   - Items being counted
   - Pending approvals
   ↓
5. Review and approve verifications
   ↓
6. Generate reports for management
```

### **Staff Flow (Mobile/Tablet)**

```
1. Staff opens mobile app
   ↓
2. Login (connects to API server)
   ↓
3. View assigned items list
   ↓
4. Scan barcode → App fetches item details
   ↓
5. Enter counted quantity
   ↓
6. Add notes/photos if needed
   ↓
7. Submit verification → Saved to MongoDB
   ↓
8. Repeat for next item
```

---

## 🏗️ Deployment Setup

### **Step 1: Main Server Setup**

**Requirements:**
- Windows/Linux server
- Python 3.11+
- MongoDB installed
- Node.js (for admin UI)
- Static IP or reserved DHCP on local network

**Installation Script:**
```bash
# Install dependencies
pip install -r requirements.txt

# Configure MongoDB
mongod --bind_ip 0.0.0.0 --port 27017

# Configure environment
cat > .env << EOF
SQL_SERVER_HOST=192.168.1.50
SQL_SERVER_PORT=1433
SQL_SERVER_DB=ERPDatabase
SQL_SERVER_USER=readonly_user
SQL_SERVER_PASS=secure_password

MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_DB=stock_verify

API_HOST=0.0.0.0
API_PORT=8000

ADMIN_UI_PORT=3000
EOF

# Start backend
python backend/server.py

# Start admin UI
cd admin-panel
npm install
npm run dev
```

### **Step 2: Firewall Configuration**

```bash
# Allow access from local network only
# Port 8000 - Backend API
# Port 27017 - MongoDB (admin only)
# Port 3000 - Web UI

# Windows Firewall
netsh advfirewall firewall add rule name="Stock Verify API" dir=in action=allow protocol=TCP localport=8000
netsh advfirewall firewall add rule name="Stock Verify Web" dir=in action=allow protocol=TCP localport=3000

# Linux (ufw)
sudo ufw allow from 192.168.1.0/24 to any port 8000
sudo ufw allow from 192.168.1.0/24 to any port 3000
```

### **Step 3: Mobile App Configuration**

**Build Configuration (`app.json`):**
```json
{
  "expo": {
    "name": "Stock Verify",
    "slug": "stock-verify",
    "version": "1.0.0",
    "extra": {
      "apiUrl": "http://192.168.1.100:8000/api/v1"
    },
    "android": {
      "package": "com.company.stockverify"
    },
    "ios": {
      "bundleIdentifier": "com.company.stockverify"
    }
  }
}
```

**Distribution Options:**
```bash
# Option 1: Development - Expo Go (testing)
npx expo start --lan

# Option 2: Production - Build APK/IPA
eas build --platform android --profile production
eas build --platform ios --profile production

# Option 3: Internal distribution
# - Android: Direct APK installation
# - iOS: TestFlight or Enterprise distribution
```

---

## 📱 User Interface Designs

### **Admin Dashboard Layout**

```
┌─────────────────────────────────────────────────────────┐
│  STOCK VERIFY - Admin Dashboard                         │
├─────────────────────────────────────────────────────────┤
│  [Dashboard] [Users] [Sync] [Reports] [Settings]        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  System Status:  ✅ Online    Last Sync: 2 min ago     │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Active    │  │  Completed  │  │ Discrepancies│   │
│  │   Staff     │  │   Today     │  │   Pending    │   │
│  │     12      │  │    245      │  │      8       │   │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                          │
│  Recent Activity:                                       │
│  ┌────────────────────────────────────────────────────┐│
│  │ 14:32  User: John    Item: ITEM001   Qty: 100     ││
│  │ 14:30  User: Sarah   Item: ITEM002   Qty: 50      ││
│  │ 14:28  User: Mike    Item: ITEM003   Qty: 75      ││
│  └────────────────────────────────────────────────────┘│
│                                                          │
│  [Sync from SQL Server]  [Generate Report]  [Backup]   │
└─────────────────────────────────────────────────────────┘
```

### **Supervisor Terminal Layout**

```
┌─────────────────────────────────────────────────────────┐
│  STOCK VERIFY - Supervisor Dashboard                    │
├─────────────────────────────────────────────────────────┤
│  [Overview] [Staff] [Verifications] [Reports]           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Staff Status:                                          │
│  ┌────────────────────────────────────────────────────┐│
│  │ 👤 John Doe      Zone A    ✅ Active    Items: 23 ││
│  │ 👤 Sarah Smith   Zone B    ✅ Active    Items: 18 ││
│  │ 👤 Mike Johnson  Zone C    ⏸️  Break    Items: 15 ││
│  │ 👤 Lisa Brown    Zone D    ✅ Active    Items: 20 ││
│  └────────────────────────────────────────────────────┘│
│                                                          │
│  Pending Approvals: (8)                                 │
│  ┌────────────────────────────────────────────────────┐│
│  │ ITEM001  Expected: 100  Counted: 98  (-2)         ││
│  │ [View Details] [Approve] [Reject]                  ││
│  ├────────────────────────────────────────────────────┤│
│  │ ITEM002  Expected: 50   Counted: 52  (+2)         ││
│  │ [View Details] [Approve] [Reject]                  ││
│  └────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### **Mobile App Layout**

```
┌─────────────────────────┐
│  📱 STOCK VERIFY        │
├─────────────────────────┤
│  Welcome, John Doe      │
│  Zone: A                │
├─────────────────────────┤
│                         │
│  [📷 Scan Barcode]      │
│                         │
│  Assigned Items: 23     │
│  Completed: 18          │
│  Remaining: 5           │
│                         │
│  Current Item:          │
│  ┌─────────────────────┐│
│  │ ITEM001             ││
│  │ Widget Type A       ││
│  │                     ││
│  │ Expected: 100       ││
│  │                     ││
│  │ Counted: [___]      ││
│  │                     ││
│  │ Notes: [________]   ││
│  │                     ││
│  │ [📷] [Submit]       ││
│  └─────────────────────┘│
│                         │
│  [← Previous] [Skip →] │
└─────────────────────────┘
```

---

## 🔐 Network Security

### **Local Network Security Measures**

```
1. Network Isolation:
   ✅ Isolated VLAN for stock verification
   ✅ Firewall rules (local network only)
   ✅ No internet access required

2. Access Control:
   ✅ Role-based permissions (Admin/Supervisor/Staff)
   ✅ JWT authentication with expiry
   ✅ Device registration (MAC address whitelist)

3. Database Security:
   ✅ MongoDB authentication enabled
   ✅ SQL Server read-only user
   ✅ Encrypted connections (TLS)

4. Physical Security:
   ✅ Main server in secure location
   ✅ Regular backups to external storage
   ✅ UPS for power protection
```

---

## 📊 Offline Mode Support

### **Mobile App Offline Capabilities**

```javascript
// Mobile app offline queue
const offlineQueue = {
  // Store actions locally when offline
  queueAction: async (action) => {
    await AsyncStorage.setItem(
      `queue_${Date.now()}`,
      JSON.stringify(action)
    )
  },
  
  // Sync when back online
  syncQueue: async () => {
    const queue = await getQueuedActions()
    for (const action of queue) {
      try {
        await api.post(action.endpoint, action.data)
        await removeFromQueue(action.id)
      } catch (error) {
        console.log('Sync failed, will retry')
      }
    }
  }
}

// Auto-sync when network restored
NetInfo.addEventListener(state => {
  if (state.isConnected) {
    offlineQueue.syncQueue()
  }
})
```

---

## 🚀 Startup Sequence

### **Daily Startup Procedure**

```
1. Power on Main Server
   ↓
2. Start MongoDB service
   ↓
3. Start Backend API (python backend/server.py)
   ↓
4. Start Admin UI (npm run start in admin-panel/)
   ↓
5. Verify services running:
   - http://192.168.1.100:8000/health → ✅
   - http://192.168.1.100:3000 → ✅
   ↓
6. Admin logs in and initiates SQL Server sync
   ↓
7. Supervisors open their terminals
   ↓
8. Staff open mobile apps and start counting
```

### **Shutdown Procedure**

```
1. Staff complete their tasks and sync
   ↓
2. Supervisors review and approve pending items
   ↓
3. Admin generates end-of-day reports
   ↓
4. Admin initiates MongoDB backup
   ↓
5. Stop Backend API (Ctrl+C or systemctl stop)
   ↓
6. Stop MongoDB (mongod --shutdown)
   ↓
7. Power off Main Server
```

---

## 🛠️ Maintenance

### **Daily Tasks**
- ✅ Morning SQL Server sync
- ✅ Check system logs
- ✅ Monitor disk space
- ✅ Evening backup

### **Weekly Tasks**
- ✅ Review system performance
- ✅ Update staff assignments
- ✅ Clear old logs
- ✅ Test backup restoration

### **Monthly Tasks**
- ✅ System updates (backend/frontend)
- ✅ Database optimization
- ✅ Security audit
- ✅ User access review

---

## 📞 Support & Troubleshooting

### **Common Issues**

**Issue: Mobile app can't connect**
```
Solution:
1. Check WiFi connection
2. Verify IP address: 192.168.1.100
3. Ping server: ping 192.168.1.100
4. Check firewall: Port 8000 open?
5. Restart backend API
```

**Issue: Supervisor terminal blank**
```
Solution:
1. Check browser console (F12)
2. Verify URL: http://192.168.1.100:3000/supervisor
3. Clear browser cache
4. Check backend logs
5. Restart admin UI
```

**Issue: SQL Server sync fails**
```
Solution:
1. Check SQL Server connectivity
2. Verify read-only permissions
3. Check network cable/connection
4. Review error logs
5. Test connection manually
```

---

**Last Updated:** 2025-11-28  
**Deployment Type:** Local Network  
**Network Range:** 192.168.x.x  
**Status:** Production Ready ✅
