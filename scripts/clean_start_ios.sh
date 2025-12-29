
echo "Cleaning Expo Cache..."
rm -rf ~/.expo
rm -rf frontend/node_modules/.cache
rm -rf frontend/.expo
echo "Resetting Simulator..."
xcrun simctl shutdown all
xcrun simctl erase all
echo "Starting Frontend..."
cd frontend
npx expo start --clear --ios
