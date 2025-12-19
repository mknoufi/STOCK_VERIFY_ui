#!/usr/bin/env node
/**
 * Frontend Port Detection Script
 * Detects which port the frontend is running on and outputs it as JSON
 * Used by TestSprite and other tools to dynamically find the frontend port
 */

const http = require('http');
const { promisify } = require('util');

const EXPO_PORTS = [19006, 19000, 19001, 19002, 8081];
const DEFAULT_WEB_PORT = 19006;
const DEFAULT_METRO_PORT = 8081;

/**
 * Check if a port is active by making a HEAD request
 */
async function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: port,
        method: 'HEAD',
        timeout: 1000,
      },
      (res) => {
        resolve({ port, active: true, status: res.statusCode });
      }
    );

    req.on('error', () => {
      resolve({ port, active: false });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ port, active: false });
    });

    req.end();
  });
}

/**
 * Detect which port is active
 */
async function detectPort() {
  // Check all ports in parallel
  const checks = await Promise.all(EXPO_PORTS.map(checkPort));

  // Find first active port
  const activePort = checks.find((check) => check.active);

  if (activePort) {
    return activePort.port;
  }

  // If no port found, check if we're in a web context
  // Default to web port if we can't detect
  return DEFAULT_WEB_PORT;
}

/**
 * Main execution
 */
async function main() {
  try {
    const port = await detectPort();
    const result = {
      port: port,
      url: `http://localhost:${port}`,
      detected: true,
      timestamp: new Date().toISOString(),
    };

    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    // Fallback to default
    const result = {
      port: DEFAULT_WEB_PORT,
      url: `http://localhost:${DEFAULT_WEB_PORT}`,
      detected: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };

    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }
}

main();
