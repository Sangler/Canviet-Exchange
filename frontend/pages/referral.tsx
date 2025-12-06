import React from 'react';
import Head from 'next/head';
import AppSidebar from '../components/AppSidebar';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';
import ReferralDashboard from '../components/ReferralDashboard';
import RequireAuth from '../components/RequireAuth';

export default function ReferralPage() {
  return (
    <RequireAuth>
      <Head>
        <title>Referral Program - CanViet Exchange</title>
        <meta name="description" content="Invite friends and earn rewards with CanViet Exchange referral program" />
      </Head>
      
      <div>
        <AppSidebar />
        <div className="wrapper d-flex flex-column min-vh-100">
          <AppHeader />
          <div className="body flex-grow-1 px-3">
            <div className="container-lg">
              <div className="row">
                <div className="col-12">
                  <h1 className="mb-4">Referral Program</h1>
                  <ReferralDashboard />
                </div>
              </div>
            </div>
          </div>
          <AppFooter />
        </div>
      </div>
    </RequireAuth>
  );
}
