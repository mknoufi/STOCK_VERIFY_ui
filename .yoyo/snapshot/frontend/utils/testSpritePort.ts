/**
 * TestSprite Port Detection for Frontend
 * Provides port information for TestSprite and other testing tools
 */

import { Platform } from 'react-native';
import { getFrontendPortSync, getFrontendURLSync } from './portDetection';

/**
 * Get port for TestSprite testing
 * Returns the port the frontend is currently running on
 */
export const getTestSpritePort = (): number => {
  return getFrontendPortSync();
};

/**
 * Get frontend URL for TestSprite
 */
export const getTestSpriteURL = (): string => {
  return getFrontendURLSync();
};

/**
 * Export port info as JSON (for TestSprite config)
 */
export const getPortInfo = () => {
  const port = getTestSpritePort();
  return {
    port,
    url: `http://localhost:${port}`,
    platform: Platform.OS,
    detected: true,
    timestamp: new Date().toISOString(),
  };
};

export default {
  getTestSpritePort,
  getTestSpriteURL,
  getPortInfo,
};
