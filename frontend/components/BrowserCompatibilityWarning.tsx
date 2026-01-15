import { useState, useEffect } from 'react';
import { detectBrowser, getCompatibilityWarning, dismissCompatibilityWarning } from '../lib/browserCompatibility';

/**
 * Browser compatibility warning banner
 * Shows on unsupported browsers with option to dismiss
 */
export default function BrowserCompatibilityWarning() {
  const [warning, setWarning] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if warning was already dismissed this session
    const dismissed = sessionStorage.getItem('browser-warning-dismissed');
    if (dismissed === 'true') return;

    // Detect browser and get warning message
    const browserInfo = detectBrowser();
    const warningMessage = getCompatibilityWarning(browserInfo);

    if (warningMessage) {
      setWarning(warningMessage);
      setVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    dismissCompatibilityWarning();
    setVisible(false);
  };

  if (!visible || !warning) return null;

  return (
    <div className="browser-warning" role="alert" aria-live="polite">
      <div className="browser-warning-content">
        <svg 
          className="browser-warning-icon" 
          width="20" 
          height="20" 
          viewBox="0 0 20 20" 
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm1 15H9v-2h2v2zm0-4H9V5h2v6z"
            fill="currentColor"
          />
        </svg>
        <p className="browser-warning-text">{warning}</p>
        <button
          type="button"
          className="browser-warning-dismiss"
          onClick={handleDismiss}
          aria-label={warning.includes('browser') ? 'Dismiss warning' : 'Dismiss warning'}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M14 1.41L12.59 0 7 5.59 1.41 0 0 1.41 5.59 7 0 12.59 1.41 14 7 8.41 12.59 14 14 12.59 8.41 7z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
