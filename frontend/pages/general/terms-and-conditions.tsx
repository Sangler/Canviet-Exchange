import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import SuspendedModal from '../../components/SuspendedModal';
import AppSidebar from '../../components/AppSidebar';
import AppHeader from '../../components/AppHeader';
import AppFooter from '../../components/AppFooter';
import { useLanguage } from '../../context/LanguageContext';
import { useColorModes } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilMoon, cilSun, cilArrowLeft } from '@coreui/icons';

export default function TermsAndConditions() {
  const { language, setLanguage, t } = useLanguage();
  const { colorMode, setColorMode } = useColorModes('coreui-free-react-admin-template-theme');
  const { token } = useAuth();
  const [isSuspended, setIsSuspended] = useState(false);

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.suspended === true || payload.kycStatus === 'suspended') {
          setIsSuspended(true);
        }
      } catch (e) {
        console.error('Failed to parse token:', e);
      }
    } else {
      setIsSuspended(false);
    }
  }, [token]);

  return (
    <div>
      <div className="wrapper d-flex flex-column min-vh-100">
                      {/* Unified page toolbar */}
                      <div className="page-toolbar" role="navigation" aria-label="Page toolbar">
                        <div className="toolbar-left">
                          <a href="/transfers" className="toolbar-back" aria-label="Back to Transfers">
                            <CIcon icon={cilArrowLeft} size="lg" />
                            <span className="d-none d-sm-inline ms-2">Back</span>
                          </a>
                        </div>
                        <div className="toolbar-right">
                          <div className="toolbar-lang" aria-label="Language selection">
                            <a
                              href="#"
                              onClick={(e) => { e.preventDefault(); setLanguage('en'); }}
                              className={language === 'en' ? 'lang-link active' : 'lang-link'}
                              aria-current={language === 'en' ? 'true' : undefined}
                            >
                              EN
                            </a>
                            <span className="divider-char" aria-hidden="true">|</span>
                            <a
                              href="#"
                              onClick={(e) => { e.preventDefault(); setLanguage('vi'); }}
                              className={language === 'vi' ? 'lang-link active' : 'lang-link'}
                              aria-current={language === 'vi' ? 'true' : undefined}
                            >
                              VI
                            </a>
                          </div>
                          <button
                            type="button"
                            className="toolbar-mode"
                            onClick={() => setColorMode(colorMode === 'dark' ? 'light' : 'dark')}
                            aria-label={`Toggle ${colorMode === 'dark' ? 'light' : 'dark'} mode`}
                            title="Toggle color mode"
                          >
                            <CIcon icon={colorMode === 'dark' ? cilSun : cilMoon} size="lg" />
                          </button>
                        </div>
                      </div>
        <div className="body flex-grow-1">
          <div className="container-lg px-4 py-5">
            <div className="card p-4 p-md-5">


              <h1 className="mb-4">{t('termsAndConditions.title')}</h1>
              <p className="text-medium-emphasis mb-4">
                <strong>{t('termsAndConditions.lastUpdated')}:</strong> November 6, 2025
              </p>

              <section className="mb-5">
                <h2 className="h4 mb-3">{t('termsAndConditions.section1.title')}</h2>
                <p>{t('termsAndConditions.section1.content')}</p>
              </section>

              <section className="mb-5">
                <h2 className="h4 mb-3">{t('termsAndConditions.section2.title')}</h2>
                <p>{t('termsAndConditions.section2.content')}</p>
              </section>

              <section className="mb-5">
                <h2 className="h4 mb-3">{t('termsAndConditions.section3.title')}</h2>
                <p>{t('termsAndConditions.section3.intro')}</p>
                <ul>
                  {t('termsAndConditions.section3.requirements', { returnObjects: true }).map((req: string, idx: number) => (
                    <li key={idx}>{req}</li>
                  ))}
                </ul>
              </section>

              <section className="mb-5">
                <h2 className="h4 mb-3">{t('termsAndConditions.section4.title')}</h2>
                <p>{t('termsAndConditions.section4.content')}</p>
                <ul>
                  {t('termsAndConditions.section4.responsibilities', { returnObjects: true }).map((resp: string, idx: number) => (
                    <li key={idx}>{resp}</li>
                  ))}
                </ul>
                <p dangerouslySetInnerHTML={{ __html: t('termsAndConditions.section4.kycNote') }} />
              </section>

              <section className="mb-5">
                <h2 className="h4 mb-3">{t('termsAndConditions.section5.title')}</h2>
                <p>{t('termsAndConditions.section5.content')}</p>
              </section>

              <section className="mb-5">
                <h2 className="h4 mb-3">{t('termsAndConditions.section6.title')}</h2>
                <p dangerouslySetInnerHTML={{ __html: t('termsAndConditions.section6.content') }} />
              </section>

              <section className="mb-5">
                <h2 className="h4 mb-3">{t('termsAndConditions.section7.title')}</h2>
                <p>{t('termsAndConditions.section7.intro')}</p>
                
                <h3 className="h5 mb-3 mt-4">{t('termsAndConditions.section7.kyc.title')}</h3>
                <p>{t('termsAndConditions.section7.kyc.intro')}</p>
                <ul>
                  {t('termsAndConditions.section7.kyc.requirements', { returnObjects: true }).map((req: string, idx: number) => (
                    <li key={idx} dangerouslySetInnerHTML={{ __html: req }} />
                  ))}
                </ul>

                <h3 className="h5 mb-3 mt-4">{t('termsAndConditions.section7.whyCollect.title')}</h3>
                <p>{t('termsAndConditions.section7.whyCollect.intro')}</p>
                <ul>
                  {t('termsAndConditions.section7.whyCollect.purposes', { returnObjects: true }).map((purpose: string, idx: number) => (
                    <li key={idx} dangerouslySetInnerHTML={{ __html: purpose }} />
                  ))}
                </ul>

                <h3 className="h5 mb-3 mt-4">{t('termsAndConditions.section7.howSecure.title')}</h3>
                <p>{t('termsAndConditions.section7.howSecure.intro')}</p>
                <ul>
                  {t('termsAndConditions.section7.howSecure.measures', { returnObjects: true }).map((measure: string, idx: number) => (
                    <li key={idx} dangerouslySetInnerHTML={{ __html: measure }} />
                  ))}
                </ul>

                <h3 className="h5 mb-3 mt-4">{t('termsAndConditions.section7.retention.title')}</h3>
                <p>{t('termsAndConditions.section7.retention.content')}</p>
              </section>

              <section className="mb-5">
                <h2 className="h4 mb-3">{t('termsAndConditions.section8.title')}</h2>
                <p>{t('termsAndConditions.section8.intro')}</p>
                <ul>
                  {t('termsAndConditions.section8.activities', { returnObjects: true }).map((activity: string, idx: number) => (
                    <li key={idx} dangerouslySetInnerHTML={{ __html: activity }} />
                  ))}
                </ul>
              </section>



              <section className="mb-5">
                <h2 className="h4 mb-3">{t('termsAndConditions.section9.title')}</h2>
                <p dangerouslySetInnerHTML={{ __html: t('termsAndConditions.section9.beforeProcessing') }} />
                <p dangerouslySetInnerHTML={{ __html: t('termsAndConditions.section9.afterProcessing') }} />
                <p dangerouslySetInnerHTML={{ __html: t('termsAndConditions.section9.refunds') }} />
              </section>

              <section className="mb-5">
                <h2 className="h4 mb-3">{t('termsAndConditions.section10.title')}</h2>
                <ul>
                  <li dangerouslySetInnerHTML={{ __html: t('termsAndConditions.section10.serviceAvailability') }} />
                  <li dangerouslySetInnerHTML={{ __html: t('termsAndConditions.section10.exchangeRate') }} />
                  <li dangerouslySetInnerHTML={{ __html: t('termsAndConditions.section10.thirdParty') }} />
                  <li dangerouslySetInnerHTML={{ __html: t('termsAndConditions.section10.maxLiability') }} />
                </ul>
              </section>

              <section className="mb-5">
                <h2 className="h4 mb-3">{t('termsAndConditions.section11.title')}</h2>
                <p>{t('termsAndConditions.section11.p1')}</p>
                <p>{t('termsAndConditions.section11.p2')}</p>
              </section>

              <section className="mb-5">
                <h2 className="h4 mb-3">{t('termsAndConditions.section12.title')}</h2>
                <p>{t('termsAndConditions.section12.content')}</p>
              </section>

              <section className="mb-5">
                <h2 className="h4 mb-3">{t('termsAndConditions.section13.title')}</h2>
                <p>{t('termsAndConditions.section13.content')}</p>
              </section>

              <section className="mb-5">
                <h2 className="h4 mb-3">{t('termsAndConditions.section14.title')}</h2>
                <p>{t('termsAndConditions.section14.intro')}</p>
                <p dangerouslySetInnerHTML={{ __html: t('termsAndConditions.section14.email') }} />
                <p dangerouslySetInnerHTML={{ __html: t('termsAndConditions.section14.website') }} />
              </section>

              <section className="mb-4">
                <h2 className="h4 mb-3">{t('termsAndConditions.section15.title')}</h2>
                <p>{t('termsAndConditions.section15.content')}</p>
                <strong>Thank you for choosing us!</strong>
              </section>

              <hr className="my-4" />

              <div className="text-center">
                <a href="/transfers" className="btn btn-primary">
                  Back to Transfers
                </a>
              </div>
            </div>

          </div>
        </div>
        <AppFooter />
        {/* Suspended account modal for terms page */}
        <SuspendedModal open={isSuspended} onClose={() => setIsSuspended(false)} />
      </div>
    </div>
  );
}
