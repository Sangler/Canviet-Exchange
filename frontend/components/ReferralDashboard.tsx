import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { CCard, CCardBody, CCardHeader, CButton, CSpinner, CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell, CBadge } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCopy, cilCheckAlt, cilUser, cilStar, cilPeople } from '@coreui/icons';

interface ReferralStats {
  referralCode: string;
  shareLink: string;
  stats: {
    totalReferrals: number;
    verifiedReferrals: number;
    points: number;
  };
  referrals: Array<{
    name: string;
    joinedAt: string;
    verified: boolean;
  }>;
}

export default function ReferralDashboard() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/users/referral/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch referral stats');
        }
        
        const data = await response.json();
        if (data.ok) {
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch referral stats:', err);
        setError('Unable to load referral information');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchStats();
    }
  }, [token]);

  const copyToClipboard = async () => {
    if (stats?.shareLink) {
      try {
        await navigator.clipboard.writeText(stats.shareLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  if (loading) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <CSpinner color="primary" />
          <p className="mt-3 text-medium-emphasis">{t('common.loading')}</p>
        </CCardBody>
      </CCard>
    );
  }

  if (error || !stats) {
    return (
      <CCard>
        <CCardBody className="text-center py-5">
          <p className="text-danger">{error || t('common.error')}</p>
        </CCardBody>
      </CCard>
    );
  }

  return (
    <div className="referral-dashboard">
      <CCard className="mb-4">
        <CCardHeader className="d-flex align-items-center">
          <CIcon icon={cilPeople} className="me-2" size="lg" />
          <strong>{t('referral.shareCode')}</strong>
        </CCardHeader>
        <CCardBody>
          <div className="mb-4">
            <h6 className="mb-2">{t('referral.yourCode')}</h6>
            <div className="d-flex align-items-center gap-2 mb-3">
              <div className="fs-3 fw-bold text-primary font-monospace letter-spacing-wide">
                {stats.referralCode}
              </div>
            </div>
            
            <h6 className="mb-2">{t('referral.shareCode')}</h6>
            <div className="d-flex gap-2">
              <input 
                type="text" 
                className="form-control" 
                value={stats.shareLink} 
                readOnly 
                onClick={(e) => e.currentTarget.select()}
              />
              <CButton 
                color={copied ? 'success' : 'primary'}
                onClick={copyToClipboard}
                className="d-flex align-items-center gap-2"
                style={{ minWidth: '120px' }}
              >
                <CIcon icon={copied ? cilCheckAlt : cilCopy} />
                {copied ? t('referral.copied') : t('referral.copyCode')}
              </CButton>
            </div>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <CCard className="text-center border-start border-primary border-4">
                <CCardBody>
                  <CIcon icon={cilUser} size="xl" className="text-primary mb-2" />
                  <div className="fs-2 fw-bold">{stats.stats.totalReferrals}</div>
                  <div className="text-medium-emphasis small">{t('referral.referrals')}</div>
                </CCardBody>
              </CCard>
            </div>
            <div className="col-md-4">
              <CCard className="text-center border-start border-success border-4">
                <CCardBody>
                  <CIcon icon={cilCheckAlt} size="xl" className="text-success mb-2" />
                  <div className="fs-2 fw-bold">{stats.stats.verifiedReferrals}</div>
                  <div className="text-medium-emphasis small">{t('dashboard.approved')}</div>
                </CCardBody>
              </CCard>
            </div>
            <div className="col-md-4">
              <CCard className="text-center border-start border-warning border-4">
                <CCardBody>
                  <CIcon icon={cilStar} size="xl" className="text-warning mb-2" />
                  <div className="fs-2 fw-bold">{stats.stats.points}</div>
                  <div className="text-medium-emphasis small">{t('referral.earnings')}</div>
                </CCardBody>
              </CCard>
            </div>
          </div>

          {stats.referrals.length > 0 && (
            <div>
              <h5 className="mb-3">{t('referral.referrals')}</h5>
              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>{t('help.name')}</CTableHeaderCell>
                    <CTableHeaderCell>{t('dashboard.date')}</CTableHeaderCell>
                    <CTableHeaderCell>{t('dashboard.status')}</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {stats.referrals.map((referral, idx) => (
                    <CTableRow key={idx}>
                      <CTableDataCell>{referral.name}</CTableDataCell>
                      <CTableDataCell>
                        {new Date(referral.joinedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </CTableDataCell>
                      <CTableDataCell>
                        {referral.verified ? (
                          <CBadge color="success">
                            <CIcon icon={cilCheckAlt} className="me-1" />
                            {t('dashboard.approved')}
                          </CBadge>
                        ) : (
                          <CBadge color="warning">{t('referral.pending')}</CBadge>
                        )}
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </div>
          )}

          {stats.referrals.length === 0 && (
            <div className="text-center py-4 bg-light rounded">
              <CIcon icon={cilPeople} size="3xl" className="text-medium-emphasis mb-3" />
              <h6 className="text-medium-emphasis">{t('dashboard.noRequests')}</h6>
              <p className="text-medium-emphasis mb-0 small">
                {t('referral.shareCode')}
              </p>
            </div>
          )}
        </CCardBody>
      </CCard>

      <CCard>
        <CCardBody>
          <h6 className="mb-3">{t('home.howItWorks.title')}</h6>
          <ol className="ps-3">
            <li className="mb-2">Share your referral code or link with friends</li>
            <li className="mb-2">Your friends sign up using your code</li>
            <li className="mb-2">When they complete KYC verification and make a first transaction, you earn <strong>2 points</strong></li>
            <li>Redeem points for <strong>NO transfer fee & higher exchange rate!</strong></li>
          </ol>
        </CCardBody>
      </CCard>
    </div>
  );
}
