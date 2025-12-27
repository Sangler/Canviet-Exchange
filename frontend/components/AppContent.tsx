import React, { Suspense } from 'react';
import { CContainer, CSpinner } from '@coreui/react';
import Dashboard from '../pages/dashboard';

const AppContent: React.FC = () => {
  return (
    <CContainer className="px-4" lg>
      <Suspense fallback={<CSpinner color="primary" />}>
        <Dashboard />
      </Suspense>
    </CContainer>
  );
};

export default React.memo(AppContent);
