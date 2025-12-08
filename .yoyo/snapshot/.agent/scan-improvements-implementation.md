# Scan Screen Improvements - Detailed Implementation

## All Changes Required

### 1. Add Auth Store Import (Line 8, after other imports)
```typescript
import { useAuthStore } from '@/store/authStore';
```

### 2. Get User from Auth Store (Line 231, after router)
```typescript
const { user, logout } = useAuthStore();
```

### 3. Add Logout Handler (After line 1860)
```typescript
const handleLogout = async () => {
  Alert.alert(
    'Logout',
    'Are you sure you want to logout?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        }
      }
    ]
  );
};
```

### 4. Update Header to Show Username and Logout (Lines 2022-2047)
**Replace entire header section with:**
```typescript
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Scan Items</Text>
          {user && (
            <Text style={styles.headerSubtitle}>{user.full_name || user.username}</Text>
          )}
        </View>
        <View style={styles.headerActions}>
          {/* Power Saving Indicator */}
          <PowerSavingIndicator powerState={powerState} compact />
          <TouchableOpacity
            onPress={() => updateWorkflowState({ autoIncrementEnabled: !workflowState.autoIncrementEnabled })}
            style={styles.toggleButton}
          >
            <Ionicons
              name={workflowState.autoIncrementEnabled ? "add-circle" : "add-circle-outline"}
              size={24}
              color={workflowState.autoIncrementEnabled ? "#00E676" : "#888"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push(`/staff/history?sessionId=${sessionId}`)}
            style={styles.historyButton}
          >
            <Ionicons name="list" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutButton}
          >
            <Ionicons name="log-out-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
```

### 5. Add Damage Quantity State (Line 370, in workflowState)
```typescript
damageQtyEnabled: false,
```

### 6. Add Damage Quantity to itemState (Line 332)
```typescript
damageQty: '',
```

### 7. Display UOM in Item Details (Around line 2250)
**Find the item details section and add UOM display after item name**

### 8. Remove Rack Field Requirement (Lines 2006, 2008, 2014)
**Change validation to not require rack**

### 9. Make MRP Optional
**Remove MRP validation/requirement**

### 10. Add Damage Quantity Toggle and Input (After Serial Number Toggle around line 2630)

### 11. Hide/Remove Rack Input (Lines 2478-2490)
**Comment out or remove rack input field**

## Styles to Add

```typescript
headerCenter: {
  flex: 1,
  alignItems: 'center',
},
headerSubtitle: {
  fontSize: 12,
  color: '#aaa',
  marginTop: 2,
},
logoutButton: {
  padding: 8,
  marginLeft: 8,
},
damageQtySection: {
  marginTop: 16,
  padding: 16,
  backgroundColor: '#2a2a2a',
  borderRadius: 12,
  borderLeftWidth: 4,
  borderLeftColor: '#FF5252',
},
dam

ageQtyToggleRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
},
damageQtyLabel: {
  fontSize: 16,
  fontWeight: '600',
  color: '#fff',
},
damageQtyInput: {
  backgroundColor: '#1a1a1a',
  borderRadius: 8,
  padding: 12,
  color: '#fff',
  fontSize: 16,
  borderWidth: 1,
  borderColor: '#FF5252',
},
```

## Next Steps
1. Implement import and auth changes
2. Update header with username and logout
3. Add damage quantity feature
4. Hide rack field
5. Make MRP optional
6. Display UOM
7. Update styles
8. Test all functionality
