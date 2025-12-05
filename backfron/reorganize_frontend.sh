#!/bin/bash

echo "🔄 Starting Frontend Logical Reorganization..."
echo "=============================================="

# Create new logical structure (already done)

# Move UI components
echo "�� Moving UI components..."
mv components/ui/* src/components/ui/ 2>/dev/null || true

# Move form components
echo "📝 Moving form components..."
mkdir -p src/components/forms
mv components/Input.tsx src/components/forms/ 2>/dev/null || true
mv components/SearchAutocomplete.tsx src/components/forms/ 2>/dev/null || true
mv components/DateRangePicker.tsx src/components/forms/ 2>/dev/null || true

# Move layout components
echo "🏗️ Moving layout components..."
mkdir -p src/components/layout
mv components/Header.tsx src/components/layout/ 2>/dev/null || true
mv components/Section.tsx src/components/layout/ 2>/dev/null || true
mv components/SettingGroup.tsx src/components/layout/ 2>/dev/null || true
mv components/SettingItem.tsx src/components/layout/ 2>/dev/null || true

# Move navigation components
echo "🧭 Moving navigation components..."
mkdir -p src/components/navigation
mv components/QuickActions.tsx src/components/navigation/ 2>/dev/null || true

# Move chart components
echo "📊 Moving chart components..."
mkdir -p src/components/charts
mv components/charts/* src/components/charts/ 2>/dev/null || true

# Move feedback components
echo "💬 Moving feedback components..."
mkdir -p src/components/feedback
mv components/Toast.tsx src/components/feedback/ 2>/dev/null || true
mv components/ToastProvider.tsx src/components/feedback/ 2>/dev/null || true
mv components/NetworkStatusBanner.tsx src/components/feedback/ 2>/dev/null || true
mv components/SystemStatus.tsx src/components/feedback/ 2>/dev/null || true
mv components/LoadingSkeleton.tsx src/components/feedback/ 2>/dev/null || true
mv components/LoadingSpinner.tsx src/components/feedback/ 2>/dev/null || true

# Move screens
echo "📱 Moving screens..."
mkdir -p src/screens/auth
mv app/login.tsx src/screens/auth/ 2>/dev/null || true
mv app/register.tsx src/screens/auth/ 2>/dev/null || true

mkdir -p src/screens/main
mv app/index.tsx src/screens/main/ 2>/dev/null || true
mv app/welcome.tsx src/screens/main/ 2>/dev/null || true
mv app/help.tsx src/screens/main/ 2>/dev/null || true

mkdir -p src/screens/admin
mv app/admin/* src/screens/admin/ 2>/dev/null || true

# Move app-level files
cp app/_layout.tsx src/screens/ 2>/dev/null || true

# Organize services
echo "🔧 Organizing services..."
mkdir -p src/services/api
mv services/api.ts src/services/api/ 2>/dev/null || true
mv services/enhancedApi.ts src/services/api/ 2>/dev/null || true
mv services/enhancedApiClient.ts src/services/api/ 2>/dev/null || true
mv services/enhancedDatabaseApi.ts src/services/api/ 2>/dev/null || true
mv services/itemVerificationApi.ts src/services/api/ 2>/dev/null || true
mv services/enrichmentApi.ts src/services/api/ 2>/dev/null || true
mv services/notesApi.ts src/services/api/ 2>/dev/null || true

mkdir -p src/services/storage
mv services/asyncStorageService.ts src/services/storage/ 2>/dev/null || true
mv services/mmkvStorage.ts src/services/storage/ 2>/dev/null || true

mkdir -p src/services/offline
mv services/offlineQueue.ts src/services/offline/ 2>/dev/null || true
mv services/offlineStorage.ts src/services/offline/ 2>/dev/null || true

mkdir -p src/services/monitoring
mv services/performanceService.ts src/services/monitoring/ 2>/dev/null || true
mv services/databaseStatusService.ts src/services/monitoring/ 2>/dev/null || true

mkdir -p src/services/utils
mv services/validationService.ts src/services/utils/ 2>/dev/null || true
mv services/errorHandler.ts src/services/utils/ 2>/dev/null || true
mv services/errorRecovery.ts src/services/utils/ 2>/dev/null || true
mv services/autoErrorFinder.ts src/services/utils/ 2>/dev/null || true
mv services/autoRecovery.ts src/services/utils/ 2>/dev/null || true
mv services/notificationService.ts src/services/utils/ 2>/dev/null || true
mv services/toastService.ts src/services/utils/ 2>/dev/null || true
mv services/themeService.ts src/services/utils/ 2>/dev/null || true
mv services/haptics.ts src/services/utils/ 2>/dev/null || true
mv services/queryClient.ts src/services/utils/ 2>/dev/null || true

# Move remaining services
mv services/* src/services/ 2>/dev/null || true

# Move stores
echo "🏪 Moving stores..."
mv store/* src/store/ 2>/dev/null || true

# Move types
echo "🏷️ Moving types..."
mv types/* src/types/ 2>/dev/null || true

# Move constants
echo "📋 Moving constants..."
mv constants/* src/constants/ 2>/dev/null || true

# Move utils
echo "🛠️ Moving utilities..."
mv utils/* src/utils/ 2>/dev/null || true

# Move hooks
echo "🪝 Moving hooks..."
mv hooks/* src/hooks/ 2>/dev/null || true

# Move assets
echo "🎨 Moving assets..."
mv assets/* src/assets/ 2>/dev/null || true

# Create index files for better imports
echo "📝 Creating index files..."

# Components index
cat > src/components/index.ts << 'EOL'
export * from './ui';
export * from './forms';
export * from './layout';
export * from './navigation';
export * from './charts';
export * from './feedback';
EOL

# Services index
cat > src/services/index.ts << 'EOL'
export * from './api';
export * from './storage';
export * from './offline';
export * from './monitoring';
export * from './utils';
EOL

# Main src index
cat > src/index.ts << 'EOL'
// Main entry point for src
export * from './components';
export * from './services';
export * from './store';
export * from './types';
export * from './utils';
export * from './hooks';
export * from './constants';
EOL

echo "✅ Frontend reorganization completed!"
echo "====================================="
echo ""
echo "📁 New Structure:"
echo "-----------------"
echo "src/"
echo "├── components/          # UI components by category"
echo "│   ├── ui/             # Basic UI primitives"
echo "│   ├── forms/          # Form components"
echo "│   ├── layout/         # Layout components"
echo "│   ├── navigation/     # Navigation components"
echo "│   ├── charts/         # Chart components"
echo "│   └── feedback/       # User feedback components"
echo "├── services/           # Business logic services"
echo "│   ├── api/            # API communication"
echo "│   ├── storage/        # Data persistence"
echo "│   ├── offline/        # Offline functionality"
echo "│   ├── monitoring/     # Performance monitoring"
echo "│   └── utils/          # Utility services"
echo "├── screens/            # Screen components"
echo "│   ├── auth/           # Authentication screens"
echo "│   ├── main/           # Main app screens"
echo "│   └── admin/          # Admin screens"
echo "├── store/              # State management"
echo "├── types/              # TypeScript definitions"
echo "├── hooks/              # Custom React hooks"
echo "├── utils/              # Utility functions"
echo "├── constants/          # App constants"
echo "└── assets/             # Static assets"
echo ""
echo "🔧 Next Steps:"
echo "-------------"
echo "1. Update all import statements in components"
echo "2. Update metro.config.js to include src/"
echo "3. Update tsconfig.json paths if needed"
echo "4. Run tests to ensure everything works"
echo "5. Gradually remove old directories after verification"
