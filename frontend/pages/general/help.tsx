import React, { useState, useEffect } from 'react';
import SuspendedModal from '../../components/SuspendedModal';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';
import { useLanguage } from '../../context/LanguageContext';
import { useColorModes } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilMoon, cilSun, cilArrowLeft } from '@coreui/icons';

export default function HelpPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const { colorMode, setColorMode } = useColorModes('coreui-free-react-admin-template-theme');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    title: '',
    topic: '',
    content: ''
  });
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [userDataLoaded, setUserDataLoaded] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);

  // Check if user is suspended and scroll to help form
  useEffect(() => {
    if (token && user) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.suspended === true || payload.kycStatus === 'suspended') {
          setIsSuspended(true);
          // Scroll to help form after a short delay to ensure DOM is ready
          setTimeout(() => {
            const formSection = document.getElementById('help-form-section');
            if (formSection) {
              formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 500);
        }
      } catch (e) {
        console.error('Failed to parse token:', e);
      }
    }
  }, [token, user]);

  // Auto-fill user data when authenticated
  useEffect(() => {
    if (user && !userDataLoaded) {
      // Fetch full user details if logged in
      if (token) {
        fetch('/api/users/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        .then(res => res.json())
        .then(data => {
          // Backend returns { user: {...}, complete: boolean }
          const userData = data.user || data;
          if (userData.firstName && userData.lastName && userData.email) {
            setFormData(prev => ({
              ...prev,
              firstName: userData.firstName,
              lastName: userData.lastName,
              email: userData.email
            }));
            setUserDataLoaded(true);
          } else if (user.email) {
            setFormData(prev => ({
              ...prev,
              email: user.email
            }));
            setUserDataLoaded(true);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch user data:', err);
          // If fetch fails, at least set email from token
          if (user.email) {
            setFormData(prev => ({
              ...prev,
              email: user.email
            }));
          }
          setUserDataLoaded(true);
        });
      }
    } else if (!user && userDataLoaded) {
      // Reset when user logs out
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        title: '',
        topic: '',
        content: ''
      });
      setUserDataLoaded(false);
    }
  }, [user, token, userDataLoaded]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !token) {
      alert('You must login before submitting a form');
      router.push('/login');
      return;
    }

    setSubmitStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch('/api/contributions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          title: formData.title,
          topic: formData.topic,
          content: formData.content
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit feedback');
      }

      setSubmitStatus('success');
      // Keep user info, only clear title and content
      setFormData(prev => ({ 
        ...prev,
        title: '', 
        content: '' 
      }));
      setTimeout(() => {
        setSubmitStatus('idle');
      }, 3000);
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

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
        <div className="body flex-grow-1 px-4 py-4">
          <div className="container-lg">
            <div className="row justify-content-center">
              <div className="col-lg-10">
                <div className="card">
                  <div className="card-body p-4 p-md-5">
                    <h1 className="mb-4">{t('help.helpCenter.title')}</h1>

                    <section className="mb-5">
                      <h2 className="h3 mb-3">{t('help.helpCenter.gettingStarted.title')}</h2>
                      
                      <div className="mb-4">
                        <h3 className="h5 mb-2">{t('help.helpCenter.gettingStarted.q1.q')}</h3>
                        <p className="mb-0">{t('help.helpCenter.gettingStarted.q1.a')}</p>
                      </div>
                    </section>

                    {/* Sending Money */}
                    <section className="mb-5">
                      <h2 className="h3 mb-3">{t('help.helpCenter.sendingMoney.title')}</h2>
                      
                      <div className="mb-4">
                        <h3 className="h5 mb-2">{t('help.helpCenter.sendingMoney.q1.q')}</h3>
                        <div dangerouslySetInnerHTML={{ __html: t('help.helpCenter.sendingMoney.q1.a') }} />
                      </div>
                    </section>

                    {/* Fees & Exchange Rates */}
                    <section className="mb-5">
                      <h2 className="h3 mb-3">{t('help.helpCenter.feesRates.title')}</h2>
                      
                      <div className="mb-4">
                        <h3 className="h5 mb-2">{t('help.helpCenter.feesRates.q1.q')}</h3>
                        <p className="mb-0" dangerouslySetInnerHTML={{ __html: t('help.helpCenter.feesRates.q1.a') }} />
                      </div>

                      <div className="mb-4">
                        <h3 className="h5 mb-2">{t('help.helpCenter.feesRates.q2.q')}</h3>
                        <p className="mb-0">{t('help.helpCenter.feesRates.q2.a')}</p>
                      </div>
                    </section>

                    {/* Tracking & Status */}
                    <section className="mb-5">
                      <h2 className="h3 mb-3">{t('help.helpCenter.tracking.title')}</h2>
                      
                      <div className="mb-4">
                        <h3 className="h5 mb-2">{t('help.helpCenter.tracking.q1.q')}</h3>
                        <p className="mb-0" dangerouslySetInnerHTML={{ __html: t('help.helpCenter.tracking.q1.a') }} />
                      </div>

                      <div className="mb-4">
                        <h3 className="h5 mb-2">{t('help.helpCenter.tracking.q2.q')}</h3>
                        <div dangerouslySetInnerHTML={{ __html: t('help.helpCenter.tracking.q2.a') }} />
                      </div>
                    </section>

                    {/* Troubleshooting */}
                    <section className="mb-5">
                      <h2 className="h3 mb-3">{t('help.helpCenter.troubleshooting.title')}</h2>
                      
                      <div className="mb-4">
                        <h3 className="h5 mb-2">{t('help.helpCenter.troubleshooting.q1.q')}</h3>
                        <p className="mb-0">{t('help.helpCenter.troubleshooting.q1.a')}
                        </p>
                      </div>

                      <div className="mb-4">
                        <h3 className="h5 mb-2">{t('help.helpCenter.troubleshooting.q2.q')}</h3>
                        <p className="mb-0">{t('help.helpCenter.troubleshooting.q2.a')}</p>
                      </div>

                      <div className="mb-4">
                        <h3 className="h5 mb-2">{t('help.helpCenter.troubleshooting.q3.q')}</h3>
                        <div className="mb-0" dangerouslySetInnerHTML={{ __html: t('help.helpCenter.troubleshooting.q3.a') }} />
                      </div>
                    </section>

                    {/* FAQ Submission Form */}
                    <section className="mb-5" id="help-form-section">
                      <h2 className="h3 mb-3">{t('help.helpCenter.submitQuestion.title')}</h2>
                      
                      {isSuspended && (
                        <div className="alert alert-warning" role="alert">
                          <strong>{t('help.helpCenter.submitQuestion.suspendedAlert.title')}</strong>
                          <p className="mb-0 mt-2">{t('help.helpCenter.submitQuestion.suspendedAlert.message')}</p>
                        </div>
                      )}
                      
                      <div className="card bg-light">
                        <div className="card-body">
                          <form onSubmit={handleSubmit}>
                            <div className="row">
                              <div className="col-md-6 mb-3">
                                <label htmlFor="firstName" className="form-label">{t('help.helpCenter.submitQuestion.form.firstName')}</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  id="firstName"
                                  name="firstName"
                                  value={formData.firstName}
                                  onChange={handleInputChange}
                                  placeholder={t('help.helpCenter.submitQuestion.form.firstName')}
                                  required
                                  disabled={submitStatus === 'submitting' || (userDataLoaded && !!formData.firstName)}
                                />
                              </div>

                              <div className="col-md-6 mb-3">
                                <label htmlFor="lastName" className="form-label">{t('help.helpCenter.submitQuestion.form.lastName')}</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  id="lastName"
                                  name="lastName"
                                  value={formData.lastName}
                                  onChange={handleInputChange}
                                  placeholder={t('help.helpCenter.submitQuestion.form.lastName')}
                                  required
                                  disabled={submitStatus === 'submitting' || (userDataLoaded && !!formData.lastName)}
                                />
                              </div>
                            </div>

                            <div className="mb-3">
                              <label htmlFor="email" className="form-label">{t('help.helpCenter.submitQuestion.form.email')}</label>
                              <input
                                type="email"
                                className="form-control"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder={t('help.helpCenter.submitQuestion.form.email')}
                                required
                                disabled={submitStatus === 'submitting' || (userDataLoaded && !!formData.email)}
                              />
                            </div>

                            <div className="mb-3">
                              <label htmlFor="topic" className="form-label">{t('help.helpCenter.submitQuestion.form.topic')}</label>
                              <select
                                id="topic"
                                name="topic"
                                className="form-select"
                                value={formData.topic}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === 'other') {
                                    setFormData(prev => ({ ...prev, topic: val, title: '' }));
                                  } else {
                                    setFormData(prev => ({ ...prev, topic: val, title: val }));
                                  }
                                }}
                                disabled={submitStatus === 'submitting'}
                                required
                              >
                                <option value="">{t('help.helpCenter.submitQuestion.form.topicPlaceholder')}</option>
                                {t('help.helpCenter.submitQuestion.form.topicOptions', { returnObjects: true }).map((opt: string, idx: number) => (
                                  <option key={idx} value={opt}>{opt}</option>
                                ))}
                              </select>

                              {formData.topic === 'other' || formData.topic === t('help.helpCenter.submitQuestion.form.topicOptions', { returnObjects: true })[8] ? (
                                <div className="mt-2">
                                  <input
                                    type="text"
                                    className="form-control"
                                    id="title"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleInputChange}
                                    placeholder={t('help.helpCenter.submitQuestion.form.titlePlaceholder')}
                                    maxLength={100}
                                    required
                                    disabled={submitStatus === 'submitting'}
                                  />
                                  <small className="text-muted">{formData.title.length}/100 {t('help.helpCenter.submitQuestion.form.charactersLimit')}</small>
                                  <small className="text-muted d-block">{t('help.helpCenter.submitQuestion.form.titleNote')}</small>
                                </div>
                              ) : (
                                formData.title && (
                                  <small className="text-muted d-block mt-2">{t('help.helpCenter.submitQuestion.form.titleNote')}</small>
                                )
                              )}
                            </div>

                            <div className="mb-3">
                              <label htmlFor="content" className="form-label">{t('help.helpCenter.submitQuestion.form.content')}</label>
                              <textarea
                                className="form-control"
                                id="content"
                                name="content"
                                rows={5}
                                value={formData.content}
                                onChange={handleInputChange}
                                placeholder={t('help.helpCenter.submitQuestion.form.contentPlaceholder')}
                                maxLength={300}
                                required
                                disabled={submitStatus === 'submitting'}
                              />
                              <small className="text-muted">{formData.content.length}/300 {t('help.helpCenter.submitQuestion.form.charactersLimit')}</small>
                            </div>

                            {errorMessage && (
                              <div className="alert alert-danger" role="alert">
                                {errorMessage}
                              </div>
                            )}

                            {submitStatus === 'success' && (
                              <div className="alert alert-success" role="alert">
                                {t('help.helpCenter.submitQuestion.form.successMessage')}
                              </div>
                            )}

                            <div className="d-flex gap-2">
                              {!token ? (
                                <button 
                                  type="button" 
                                  className="btn btn-primary"
                                  onClick={() => router.push('/login')}
                                >
                                  {t('help.helpCenter.submitQuestion.form.loginButton')}
                                </button>
                              ) : (
                                <button 
                                  type="submit" 
                                  className="btn btn-primary"
                                  disabled={submitStatus === 'submitting' || submitStatus === 'success'}
                                >
                                  {submitStatus === 'submitting' ? (
                                    <>
                                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                      {t('help.helpCenter.submitQuestion.form.submittingButton')}
                                    </>
                                  ) : submitStatus === 'success' ? (
                                    '✓ ' + t('help.helpCenter.submitQuestion.form.submitButton')
                                  ) : (
                                    t('help.helpCenter.submitQuestion.form.submitButton')
                                  )}
                                </button>
                              )}
                            </div>
                          </form>
                        </div>
                      </div>
                    </section>

                    {/* Suspended account modal rendered on this page */}
                    <SuspendedModal open={isSuspended} onClose={() => setIsSuspended(false)} />

                    {/* Contact Support */}
                    <section className="mb-4">
                      <h2 className="h3 mb-3">{t('help.helpCenter.stillNeedHelp.title')}</h2>
                      <div className="alert alert-info show">
                        <h4 className="alert-heading h5">{t('help.helpCenter.stillNeedHelp.contactTeam')}</h4>
                        <p className="mb-2">{t('help.helpCenter.stillNeedHelp.intro')}</p>
                        
                        <hr />
                        {t('help.helpCenter.stillNeedHelp.details', { returnObjects: true }).map((detail: string, idx: number) => (
                          <p key={idx} className="mb-0" dangerouslySetInnerHTML={{ __html: detail }} />
                        ))}
                      </div>
                    </section>

                    {/* Back to Home */}
                    <div className="text-center mt-5">
                      <a href="/transfers" className="btn btn-primary">
                        {t('help.helpCenter.stillNeedHelp.actions.submitQuestion')}
                      </a>
                      <a href="/dashboard" className="btn btn-outline-secondary ms-2">
                        {t('help.helpCenter.stillNeedHelp.actions.viewHistory')}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
