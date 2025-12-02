/**
 * Dynamic Port Configuration for TestSprite
 * Automatically detects which port the frontend is running on
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PORT_DETECTION_SCRIPT = path.join(PROJECT_ROOT, 'scripts', 'detect-frontend-port.js');

/**
 * Check if a port is active
 */
function checkPort(port) {
  return new Promise((resolve) => {
    const http = require('http');
    const req = http.request(
      {
        hostname: 'localhost',
        port: port,
        method: 'HEAD',
        timeout: 1000,
      },
      (res) => {
        resolve(true);
      }
    );
    
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

/**
 * Detect frontend port dynamically
 * For TestSprite web testing, prioritizes web ports (19006) over Metro (8081)
 */
async function detectFrontendPort() {
  try {
    // Check web ports first (for TestSprite web testing)
    const webPorts = [19006, 19000, 19001, 19002];
    for (const port of webPorts) {
      const isActive = await checkPort(port);
      if (isActive) {
        console.log(`✅ Found active web port: ${port}`);
        return port;
      }
    }
    
    // Fallback: Try to use the Node.js detection script
    const result = execSync(`node "${PORT_DETECTION_SCRIPT}"`, {
      encoding: 'utf8',
      cwd: PROJECT_ROOT,
      timeout: 5000,
    });
    
    const portInfo = JSON.parse(result);
    const detectedPort = portInfo.port;
    
    // If detected port is Metro (8081), prefer web port for TestSprite
    if (detectedPort === 8081) {
      console.log('⚠️  Metro port detected (8081), but TestSprite needs web port');
      console.log('💡 Start Expo web server: cd frontend && npm run web');
      return 19006; // Default to web port for TestSprite
    }
    
    return detectedPort || 19006;
  } catch (error) {
    console.warn('Failed to detect port dynamically, using default:', error.message);
    return 19006; // Default Expo web port for TestSprite
  }
}

/**
 * Update TestSprite configuration with detected port
 */
async function updateTestSpriteConfig() {
  const detectedPort = await detectFrontendPort();
  
  const configPath = path.join(__dirname, 'tmp', 'config.json');
  let config = {};
  
  // Read existing config if it exists
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      console.warn('Could not read existing config, creating new one');
    }
  }
  
  // Update port
  config.localPort = detectedPort;
  config.frontendUrl = `http://localhost:${detectedPort}`;
  config.portDetected = true;
  config.portDetectionTime = new Date().toISOString();
  
  // Ensure directory exists
  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  // Write updated config
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  console.log(`✅ TestSprite configured to use port: ${detectedPort}`);
  console.log(`   Frontend URL: http://localhost:${detectedPort}`);
  
  return detectedPort;
}

// Export for use in other scripts
module.exports = {
  detectFrontendPort,
  updateTestSpriteConfig,
};

// If run directly, update config
if (require.main === module) {
  updateTestSpriteConfig()
    .then((port) => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error updating config:', error);
      process.exit(1);
    });
}

