import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import AppSidebar from '../components/AppSidebar';
import RequireAuth from '../components/RequireAuth';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const { t } = useLanguage();
  const { token } = useAuth();
  const [receiveTransferEmails, setReceiveTransferEmails] = useState<boolean>(true);
  const [receiveNewEmails, setReceiveNewEmails] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const res = await fetch('/api/users/me', {
          credentials: 'include'
        });
        if (res.ok) {
          const json = await res.json();
          const u = json.user || {};
          if (typeof u.receiveTransferEmails === 'boolean') setReceiveTransferEmails(u.receiveTransferEmails);
          if (typeof u.receiveNewEmails === 'boolean') setReceiveNewEmails(u.receiveNewEmails);
        }
      } catch (e) {
        // ignore
      }
    };
    loadPrefs();
  }, [token]);

  const savePrefs = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ receiveTransferEmails, receiveNewEmails })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to save settings');
      }
      // Optional success feedback could be added
    } catch (e) {
      // Optional error feedback
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <RequireAuth>
      <div>
        <AppSidebar />
        <div className="wrapper d-flex flex-column min-vh-100">
          <AppHeader />
          <div className="body flex-grow-1 px-3">
              <div className="container-fluid" style={{ maxWidth: '900px' }}>
              <h1>{t('settings.title')}</h1>
              <p>{t('settings.notifications')}</p>
              <div className="card p-4 mt-3" style={{maxWidth:'820px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.24)'}}>
                {/* Item 1 */}
                <div className="d-flex align-items-start mb-4 pb-3" style={{borderBottom: '1px solid rgba(255,255,255,0.12)'}}>
                  <div className="me-3" style={{minWidth:'160px'}}>
                    <div
                      role="button"
                      aria-pressed={receiveTransferEmails}
                      aria-label={t('settings.receiveTransferEmails')}
                      onClick={() => setReceiveTransferEmails(!receiveTransferEmails)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px',
                        width: '150px',
                        height: '36px',
                        padding: '4px',
                        borderRadius: '18px',
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{
                        flex: 1,
                        textAlign: 'center',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        color: receiveTransferEmails ? '#0b0b0b' : 'rgba(255,255,255,0.6)',
                        background: receiveTransferEmails ? '#7A7AF5' : 'transparent',
                        borderRadius: '14px',
                        padding: '4px 8px'
                      }}>ON</span>
                      <span style={{
                        flex: 1,
                        textAlign: 'center',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        color: !receiveTransferEmails ? '#0b0b0b' : 'rgba(255,255,255,0.6)',
                        background: !receiveTransferEmails ? '#7A7AF5' : 'transparent',
                        borderRadius: '14px',
                        padding: '4px 8px'
                      }}>OFF</span>
                    </div>
                  </div>
                  <div className="flex-grow-1">
                    <label className="form-check-label mb-1" htmlFor="receiveTransferEmails" style={{cursor: 'pointer', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px'}}>
                      {t('settings.receiveTransferEmails')}
                    </label>
                    <div className="text-muted" style={{fontSize: '0.95rem'}}>{t('settings.receiveTransferEmailsDesc')}</div>
                  </div>
                </div>

                {/* Item 2 */}
                <div className="d-flex align-items-start mb-4">
                  <div className="me-3" style={{minWidth:'160px'}}>
                    <div
                      role="button"
                      aria-pressed={receiveNewEmails}
                      aria-label={t('settings.receiveNewEmails')}
                      onClick={() => setReceiveNewEmails(!receiveNewEmails)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px',
                        width: '150px',
                        height: '36px',
                        padding: '4px',
                        borderRadius: '18px',
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{
                        flex: 1,
                        textAlign: 'center',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        color: receiveNewEmails ? '#0b0b0b' : 'rgba(255,255,255,0.6)',
                        background: receiveNewEmails ? '#7A7AF5' : 'transparent',
                        borderRadius: '14px',
                        padding: '4px 8px'
                      }}>ON</span>
                      <span style={{
                        flex: 1,
                        textAlign: 'center',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        color: !receiveNewEmails ? '#0b0b0b' : 'rgba(255,255,255,0.6)',
                        background: !receiveNewEmails ? '#7A7AF5' : 'transparent',
                        borderRadius: '14px',
                        padding: '4px 8px'
                      }}>OFF</span>
                    </div>
                  </div>
                  <div className="flex-grow-1">
                    <label className="form-check-label mb-1" htmlFor="receiveNewEmails" style={{cursor: 'pointer', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px'}}>
                      {t('settings.receiveNewEmails')}
                    </label>
                    <div className="text-muted" style={{fontSize: '0.95rem'}}>{t('settings.receiveNewEmailsDesc')}</div>
                  </div>
                </div>

                <button className="btn btn-primary w-100 py-2 mt-2" onClick={savePrefs} disabled={saving} style={{fontSize: '1rem', fontWeight: 600, borderRadius: '12px'}}>
                  {saving ? t('settings.saving') : t('settings.saveChanges')}
                </button>
              </div>
            </div>
          </div>
          <AppFooter />
        </div>
      </div>
    </RequireAuth>
  );

}
