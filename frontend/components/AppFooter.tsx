import React from 'react';
import { CFooter } from '@coreui/react';

const AppFooter: React.FC = () => {
  return (
    <CFooter className="px-4">
      <div>
        <a href="#" target="_blank" rel="noopener noreferrer">
          SVN  Transfer
        </a>
        <span className="ms-1">&copy; 2025 Money Transfer Platform.</span>
      </div>
    </CFooter>
  );
};

export default React.memo(AppFooter);
