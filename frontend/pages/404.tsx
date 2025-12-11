import React from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useLanguage } from '../context/LanguageContext';
import { useColorModes } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilMoon, cilSun } from '@coreui/icons';

export default function Custom404() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const { colorMode, setColorMode } = useColorModes('coreui-free-react-admin-template-theme');

  return (
    <>
      <Head>
        <title>404 - Page Not Found | CanVietExchange</title>
      </Head>

      <div className="min-vh-100 d-flex flex-column">
        {/* Toolbar */}
        <div className="page-toolbar" role="navigation" aria-label="Page toolbar">
          <div className="toolbar-left">
            <a href="/" className="toolbar-brand">
              CanVietExchange
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

        {/* 404 Content */}
        <div className="flex-grow-1 d-flex align-items-center justify-content-center">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-md-6 text-center">
                <div className="error-template">
                  <h1 className="display-1 fw-bold text-primary">404</h1>
                  <h2 className="mb-4">{t('error404.title')}</h2>
                  <p className="lead mb-4">{t('error404.message')}</p>
                  <div className="d-flex gap-3 justify-content-center flex-wrap">
                    <button
                      onClick={() => router.back()}
                      className="btn btn-outline-primary"
                    >
                      {t('error404.goBack')}
                    </button>
                    <button
                      onClick={() => router.push('/transfers')}
                      className="btn btn-primary"
                    >
                      {t('error404.goToTransfers')}
                    </button>
                    <button
                      onClick={() => router.push('/')}
                      className="btn btn-outline-secondary"
                    >
                      {t('error404.goHome')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
