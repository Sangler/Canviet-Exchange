/**
 * Browser compatibility detection and user notifications
 * Supports older iOS (>= 11) and Android (>= 6) devices
 */

export interface BrowserInfo {
  name: string;
  version: string;
  os: string;
  osVersion: string;
  isSupported: boolean;
  isMobile: boolean;
}

/**
 * Detect browser information from user agent
 */
export function detectBrowser(): BrowserInfo {
  if (typeof window === 'undefined') {
    return {
      name: 'unknown',
      version: '0',
      os: 'unknown',
      osVersion: '0',
      isSupported: true,
      isMobile: false,
    };
  }

  const ua = navigator.userAgent;
  let name = 'unknown';
  let version = '0';
  let os = 'unknown';
  let osVersion = '0';
  let isMobile = false;

  // Detect OS
  if (/Android/i.test(ua)) {
    os = 'Android';
    const match = ua.match(/Android\s+([\d.]+)/);
    osVersion = match ? match[1] : '0';
    isMobile = true;
  } else if (/iPad|iPhone|iPod/.test(ua)) {
    os = 'iOS';
    const match = ua.match(/OS\s+([\d_]+)/);
    osVersion = match ? match[1].replace(/_/g, '.') : '0';
    isMobile = true;
  } else if (/Windows/.test(ua)) {
    os = 'Windows';
  } else if (/Mac OS X/.test(ua)) {
    os = 'macOS';
  } else if (/Linux/.test(ua)) {
    os = 'Linux';
  }

  // Detect browser
  if (/Chrome/.test(ua) && !/Edge|Edg/.test(ua)) {
    name = 'Chrome';
    const match = ua.match(/Chrome\/([\d.]+)/);
    version = match ? match[1] : '0';
  } else if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
    name = 'Safari';
    const match = ua.match(/Version\/([\d.]+)/);
    version = match ? match[1] : '0';
  } else if (/Firefox/.test(ua)) {
    name = 'Firefox';
    const match = ua.match(/Firefox\/([\d.]+)/);
    version = match ? match[1] : '0';
  } else if (/Edg/.test(ua)) {
    name = 'Edge';
    const match = ua.match(/Edg\/([\d.]+)/);
    version = match ? match[1] : '0';
  } else if (/MSIE|Trident/.test(ua)) {
    name = 'Internet Explorer';
    const match = ua.match(/(?:MSIE |rv:)([\d.]+)/);
    version = match ? match[1] : '0';
  }

  // Check if browser is supported based on our targets
  const isSupported = checkBrowserSupport(name, version, os, osVersion);

  return {
    name,
    version,
    os,
    osVersion,
    isSupported,
    isMobile,
  };
}

/**
 * Check if browser meets minimum version requirements
 */
function checkBrowserSupport(
  browser: string,
  version: string,
  os: string,
  osVersion: string
): boolean {
  const versionNum = parseFloat(version);
  const osVersionNum = parseFloat(osVersion);

  // Check OS versions for mobile (warn only on very old devices ~2010-2015 era)
  if (os === 'iOS' && osVersionNum < 10) return false;
  if (os === 'Android' && osVersionNum < 5) return false;

  // Check browser versions (very-old thresholds)
  if (browser === 'Internet Explorer') return false; // No IE support
  if (browser === 'Chrome' && versionNum < 40) return false;
  if (browser === 'Firefox' && versionNum < 38) return false;
  if (browser === 'Safari' && versionNum < 9) return false;
  if (browser === 'Edge' && versionNum < 15) return false;

  return true;
}

/**
 * Check for specific feature support
 */
export function checkFeatureSupport(): {
  fetch: boolean;
  promise: boolean;
  arrow: boolean;
  asyncAwait: boolean;
  localStorage: boolean;
} {
  if (typeof window === 'undefined') {
    return {
      fetch: false,
      promise: false,
      arrow: false,
      asyncAwait: false,
      localStorage: false,
    };
  }

  return {
    fetch: typeof window.fetch === 'function',
    promise: typeof Promise !== 'undefined',
    arrow: true, // Will be transpiled by Next.js if not supported
    asyncAwait: true, // Will be transpiled by Next.js if not supported
    localStorage: typeof window.localStorage !== 'undefined',
  };
}

/**
 * Get browser compatibility warning message
 */
export function getCompatibilityWarning(browserInfo: BrowserInfo): string | null {
  if (browserInfo.isSupported) return null;

  if (browserInfo.name === 'Internet Explorer') {
    return 'Internet Explorer is not supported. Please use a modern browser like Chrome, Firefox, Safari, or Edge.';
  }

  if (browserInfo.os === 'iOS' && parseFloat(browserInfo.osVersion) < 10) {
    return `Your iOS version (${browserInfo.osVersion}) is outdated. Please update to iOS 10 or later for the best experience.`;
  }

  if (browserInfo.os === 'Android' && parseFloat(browserInfo.osVersion) < 5) {
    return `Your Android version (${browserInfo.osVersion}) is outdated. Please update to Android 5.0 or later for the best experience.`;
  }

  return `Your browser (${browserInfo.name} ${browserInfo.version}) may not be fully supported. Please update to the latest version for the best experience.`;
}

/**
 * Show compatibility warning to user
 * Returns true if warning was shown, false otherwise
 */
export function showCompatibilityWarning(): boolean {
  if (typeof window === 'undefined') return false;

  const browserInfo = detectBrowser();
  const warning = getCompatibilityWarning(browserInfo);

  if (!warning) return false;

  // Check if user has already dismissed the warning
  const dismissed = sessionStorage.getItem('browser-warning-dismissed');
  if (dismissed === 'true') return false;

  // Show warning (will be implemented in UI component)
  console.warn('Browser compatibility warning:', warning);
  console.info('Browser info:', browserInfo);

  return true;
}

/**
 * Dismiss compatibility warning for this session
 */
export function dismissCompatibilityWarning(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('browser-warning-dismissed', 'true');
  }
}
