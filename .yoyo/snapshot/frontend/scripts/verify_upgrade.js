const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Upgrade Status...');

// 1. Check package.json
const pkgPath = path.join(__dirname, '../package.json');
const pkg = require(pkgPath);

const expected = {
  'react': '19.1.0',
  'react-native': '0.81.5'
};

let errors = 0;

console.log('\n📦 Checking Dependencies:');
for (const [dep, version] of Object.entries(expected)) {
  const installed = pkg.dependencies[dep];
  if (installed === version) {
    console.log(`✅ ${dep}: ${installed}`);
  } else {
    console.error(`❌ ${dep}: Expected ${version}, found ${installed}`);
    errors++;
  }
}

// 2. Check .env
console.log('\n⚙️  Checking Configuration:');
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('EXPO_PUBLIC_BACKEND_PORT=8001')) {
    console.log('✅ EXPO_PUBLIC_BACKEND_PORT is 8001');
  } else {
    console.error('❌ EXPO_PUBLIC_BACKEND_PORT is missing or incorrect');
    errors++;
  }
} else {
  console.error('❌ .env file missing');
  errors++;
}

if (errors === 0) {
  console.log('\n✨ Upgrade Verification PASSED!');
  process.exit(0);
} else {
  console.error(`\n🚫 Upgrade Verification FAILED with ${errors} errors.`);
  process.exit(1);
}
