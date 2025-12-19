#!/bin/bash
set -euo pipefail

echo "▶ Switching to main"
git checkout main
git pull origin main

echo "▶ Creating stabilization branch"
if git show-ref --verify --quiet refs/heads/fix/expo54-ci-stabilization; then
    echo "Branch fix/expo54-ci-stabilization already exists. Deleting it to start fresh..."
    git branch -D fix/expo54-ci-stabilization
fi

git checkout -b fix/expo54-ci-stabilization

echo "▶ Writing corrected frontend/package.json"
mkdir -p frontend
# UPDATED: react-native-safe-area-context set to 5.4.0 to resolve peer dependency conflict with expo-router
# UPDATED: @types/react-native set to ^0.73.0 because that is the latest documented version available
cat > frontend/package.json <<'JSON'
{
  "name": "frontend",
  "version": "1.0.0",
  "private": true,
  "main": "index.js",
  "engines": {
    "node": ">=18.18 <21",
    "npm": ">=10 <11"
  },
  "scripts": {
    "postinstall": "patch-package",
    "prestart": "npm run update-ip",
    "start": "npx expo start",
    "start:tunnel": "npx expo start --tunnel",
    "reset-project": "node ./scripts/reset-project.js",
    "update-ip": "node ./scripts/update-ip.js",
    "android": "npx expo start --android",
    "ios": "npx expo start --ios",
    "web": "npx expo start --web",
    "web:clear": "npx expo start --web --clear",
    "lint": "expo lint",
    "test": "NODE_OPTIONS=--experimental-vm-modules jest",
    "typecheck": "tsc --noEmit",
    "build:web": "expo export -p web",
    "ci": "npm run lint && npm run typecheck && npm run test",
    "preflight": "npm run lint && npm run typecheck && npm run test && npm run build:web",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  },
  "dependencies": {
    "expo": "~54.0.29",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "react-native": "0.76.6",
    "@expo/ngrok": "^4.1.3",
    "@expo/vector-icons": "^15.0.3",
    "@react-native-async-storage/async-storage": "2.2.0",
    "@react-native-community/datetimepicker": "8.4.4",
    "@react-native-community/netinfo": "11.4.1",
    "@sentry/react-native": "7.2.0",
    "@shopify/flash-list": "2.0.2",
    "@tanstack/react-query": "^5.59.16",
    "@tanstack/react-query-devtools": "^5.59.16",
    "axios": "^1.7.9",
    "date-fns": "^4.1.0",
    "expo-blur": "~15.0.7",
    "expo-brightness": "~14.0.7",
    "expo-camera": "~17.0.9",
    "expo-clipboard": "~8.0.7",
    "expo-constants": "~18.0.10",
    "expo-file-system": "~19.0.18",
    "expo-font": "~14.0.9",
    "expo-haptics": "~15.0.7",
    "expo-image": "~3.0.10",
    "expo-keep-awake": "~15.0.7",
    "expo-linear-gradient": "~15.0.7",
    "expo-linking": "~8.0.9",
    "expo-notifications": "~0.32.15",
    "expo-router": "~6.0.19",
    "expo-secure-store": "~15.0.8",
    "expo-sharing": "~14.0.7",
    "expo-splash-screen": "~31.0.11",
    "expo-status-bar": "~3.0.8",
    "expo-system-ui": "~6.0.8",
    "expo-web-browser": "~15.0.9",
    "lottie-react-native": "^7.1.0",
    "react-hook-form": "^7.68.0",
    "react-native-awesome-gallery": "^0.4.3",
    "react-native-chart-kit": "^6.12.0",
    "react-native-gesture-handler": "~2.14.0",
    "react-native-mmkv": "^3.2.0",
    "react-native-reanimated": "~3.16.1",
    "react-native-safe-area-context": "5.4.0",
    "react-native-screens": "~3.35.0",
    "react-native-spinkit": "^1.5.1",
    "react-native-svg": "15.8.0",
    "react-native-unistyles": "^2.0.0",
    "react-native-web": "^0.19.13",
    "react-native-webview": "13.6.4",
    "tsconfig-paths": "^4.2.0",
    "use-debounce": "^10.0.6",
    "zustand": "^5.0.9"
  },
  "devDependencies": {
    "@expo/cli": "~0.18.17",
    "@expo/metro-runtime": "~6.1.2",
    "@babel/core": "^7.26.0",
    "@babel/runtime": "^7.26.0",
    "typescript": "~5.3.3",
    "jest": "~29.7.0",
    "jest-expo": "~54.0.16",
    "babel-jest": "^29.7.0",
    "@types/jest": "29.5.14",
    "@types/react": "~18.2.66",
    "@types/react-dom": "~18.2.22",
    "@types/react-native": "^0.73.0",
    "eslint": "^9.3.0",
    "eslint-config-expo": "~10.0.0",
    "patch-package": "^8.0.1",
    "storybook": "^8.6.14",
    "@storybook/react": "^8.6.14",
    "@storybook/addon-essentials": "^8.6.14"
  }
}
JSON

echo "▶ Resetting dependencies and generating lockfile"
cd frontend
rm -rf node_modules package-lock.json
npm install
npm dedupe
npm ci
cd ..

echo "▶ Committing dependency baseline"
git add frontend/package.json frontend/package-lock.json
git commit -m "fix(frontend): align dependencies with Expo SDK 54 for CI stability"

echo "▶ Writing production Dockerfile"
cat > frontend/Dockerfile <<'DOCKER'
FROM node:20.11-alpine AS base
WORKDIR /app
RUN npm install -g npm@10.8.2

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV EXPO_NO_TELEMETRY=1
RUN npm run build:web

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
DOCKER

git add frontend/Dockerfile
git commit -m "chore(docker): add production-safe frontend Dockerfile"

echo "▶ Writing hardened GitHub Actions workflow"
mkdir -p .github/workflows
cat > .github/workflows/frontend.yml <<'YAML'
name: Frontend CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20.11.1
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: frontend
        run: npm ci

      - name: Lint
        working-directory: frontend
        run: npm run lint

      - name: Typecheck
        working-directory: frontend
        run: npm run typecheck

      - name: Test
        working-directory: frontend
        run: npm test

      - name: Build Web
        working-directory: frontend
        run: npm run build:web

      - name: Docker Build
        run: docker build -t stock-verify-frontend ./frontend
YAML

git add .github/workflows/frontend.yml
git commit -m "ci(frontend): enforce deterministic Expo CI pipeline"

echo "✅ ALL DONE"
echo "▶ Final step: git push origin fix/expo54-ci-stabilization"
