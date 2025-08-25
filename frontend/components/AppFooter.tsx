import React from 'react';
import { CFooter } from '@coreui/react';

const AppFooter: React.FC = () => {
  return (
    <CFooter className="px-4">
      <div>
        <a href="https://nextransfer.com" target="_blank" rel="noopener noreferrer">
          nexTransfer
        </a>
        <span className="ms-1">&copy; 2025 Money Transfer Platform.</span>
      </div>
      <div className="ms-auto">
        <span className="me-1">Powered by</span>
        <a href="https://coreui.io/react" target="_blank" rel="noopener noreferrer">
          CoreUI React
        </a>
      </div>
    </CFooter>
  );
};

export default React.memo(AppFooter);
