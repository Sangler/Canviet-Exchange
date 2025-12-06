import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';
import { useLanguage } from '../../context/LanguageContext';
import { useColorModes } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilMoon, cilSun, cilArrowLeft } from '@coreui/icons';

export default function HelpPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const { colorMode, setColorMode } = useColorModes('coreui-free-react-admin-template-theme');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    title: '',
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
                    <h1 className="mb-4">Help Center</h1>

                    <section className="mb-5">
                      <h2 className="h3 mb-3">Getting Started</h2>
                      
                      <div className="mb-4">
                        <h3 className="h5 mb-2">Do I need to verify my identity?</h3>
                        <p className="mb-0">
                          Email verification is required for all accounts. Additional identity verification may be required 
                          for larger transfers to comply with Canadian financial regulations.
                        </p>
                      </div>
                    </section>

                    {/* Sending Money */}
                    <section className="mb-5">
                      <h2 className="h3 mb-3">Sending Money</h2>
                      
                      <div className="mb-4">
                        <h3 className="h5 mb-2">Why does my transfer take longer than expected?</h3>
                        <ul className="mb-0">
                          <li><strong>Card payments:</strong> within 24 business hours</li>
                          <li><strong>E-Transfer:</strong> Within 24 business hours</li>
                          <li><strong>Electronic Funds Transfers (EFT):</strong> 5-7 business days</li>
                        </ul>
                        <p className="mt-2 mb-0">
                          <em>Note: Processing time may vary based on payment method, recipient bank, and other factors.</em>
                        </p>
                      </div>
                    </section>

                    {/* Fees & Exchange Rates */}
                    <section className="mb-5">
                      <div className="mb-4">
                        <h3 className="h5 mb-2">How is your exchange rate calculated?</h3>
                        <p className="mb-0">
                          In order to have <strong>an appealing rate</strong>, we use stablecoin-backed dollar sent to Recipient region and exchange it for native currency. 
                          Our rate is calculated as: CAD → USDC → USD → VND to ensure accuracy and better pricing.
                        </p>
                      </div>

                      <div className="mb-4">
                        <h3 className="h5 mb-2">Will the exchange rate change after I submit?</h3>
                        <p className="mb-0">
                          The exchange rate shown at the time of confirmation is locked in for your transfer. 
                          Rates are updated every 60 seconds to reflect current market conditions.
                        </p>
                      </div>
                    </section>

                    {/* Tracking & Status */}
                    <section className="mb-5">
                      <h2 className="h3 mb-3">Tracking & Status</h2>
                      
                      <div className="mb-4">
                        <h3 className="h5 mb-2">How do I track my transfer?</h3>
                        <p className="mb-0">
                          Log in to your account and navigate to "Transfer History" in the dashboard. 
                          You'll see the status of all your transfers with details including transaction ID, amount, and delivery status. You can also share the tracking link with your recipient.
                        </p>
                      </div>

                      <div className="mb-4">
                        <h3 className="h5 mb-2">What do the different statuses mean?</h3>
                        <ul className="mb-0">
                          <li><strong>Pending:</strong> We've received your request and are processing it</li>
                          <li><strong>Approved:</strong> Transfer approved and funds are being sent to recipient</li>
                          <li><strong>Completed:</strong> Recipient has received the money</li>
                          <li><strong>Rejected:</strong> Transfer could not be processed (contact support)</li>
                        </ul>
                      </div>
                    </section>

                    {/* Troubleshooting */}
                    <section className="mb-5">
                      <h2 className="h3 mb-3">Troubleshooting</h2>
                      
                      <div className="mb-4">
                        <h3 className="h5 mb-2">My transfer is taking longer than expected. What should I do?</h3>
                        <p className="mb-0">
                          Processing times can vary based on payment method, recipient bank policies, weekends, and holidays. 
                          If your transfer is significantly delayed beyond the estimated delivery time, please contact our support team 
                          with your transaction ID.
                        </p>
                      </div>

                      <div className="mb-4">
                        <h3 className="h5 mb-2">I entered the wrong recipient information. What can I do?</h3>
                        <p className="mb-0">
                          Contact support immediately if the transfer is still in "Pending" status. We may be able to correct 
                          the information or cancel the transfer. Once approved or completed, we cannot modify recipient details.
                        </p>
                      </div>

                      <div className="mb-4">
                        <h3 className="h5 mb-2">Why was my transfer rejected?</h3>
                        <p className="mb-0">
                          Transfers may be rejected due to incorrect recipient information, compliance issues, 
                          insufficient verification, or payment processing failures. Check your email for specific details 
                          or contact support for assistance.
                        </p>
                      </div>
                    </section>

                    {/* FAQ Submission Form */}
                    <section className="mb-5" id="help-form-section">
                      <h2 className="h3 mb-3">Submit Your Question</h2>
                      
                      {isSuspended && (
                        <div className="alert alert-warning" role="alert">
                          <strong>Account Suspended</strong>
                          <p className="mb-0 mt-2">
                            Your account has been suspended due to multiple duplicate identity attempts. 
                            Please use the form below to contact our support team for assistance with your account.
                          </p>
                        </div>
                      )}
                      
                      <div className="card bg-light">
                        <div className="card-body">
                          <form onSubmit={handleSubmit}>
                            <div className="row">
                              <div className="col-md-6 mb-3">
                                <label htmlFor="firstName" className="form-label">First Name</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  id="firstName"
                                  name="firstName"
                                  value={formData.firstName}
                                  onChange={handleInputChange}
                                  placeholder="Enter your first name"
                                  required
                                  disabled={submitStatus === 'submitting' || (userDataLoaded && !!formData.firstName)}
                                />
                              </div>

                              <div className="col-md-6 mb-3">
                                <label htmlFor="lastName" className="form-label">Last Name</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  id="lastName"
                                  name="lastName"
                                  value={formData.lastName}
                                  onChange={handleInputChange}
                                  placeholder="Enter your last name"
                                  required
                                  disabled={submitStatus === 'submitting' || (userDataLoaded && !!formData.lastName)}
                                />
                              </div>
                            </div>

                            <div className="mb-3">
                              <label htmlFor="email" className="form-label">Email</label>
                              <input
                                type="email"
                                className="form-control"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="Enter your email"
                                required
                                disabled={submitStatus === 'submitting' || (userDataLoaded && !!formData.email)}
                              />
                            </div>

                            <div className="mb-3">
                              <label htmlFor="title" className="form-label">Question/Topic Title</label>
                              <input
                                type="text"
                                className="form-control"
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                placeholder="Brief title for your question..."
                                maxLength={300}
                                required
                                disabled={submitStatus === 'submitting'}
                              />
                              <small className="text-muted">{formData.title.length}/300 characters</small>
                            </div>

                            <div className="mb-3">
                              <label htmlFor="content" className="form-label">Your Question/Feedback</label>
                              <textarea
                                className="form-control"
                                id="content"
                                name="content"
                                rows={5}
                                value={formData.content}
                                onChange={handleInputChange}
                                placeholder="Please describe your question or provide feedback in detail..."
                                maxLength={1000}
                                required
                                disabled={submitStatus === 'submitting'}
                              />
                              <small className="text-muted">{formData.content.length}/1000 characters</small>
                            </div>

                            {errorMessage && (
                              <div className="alert alert-danger" role="alert">
                                {errorMessage}
                              </div>
                            )}

                            {submitStatus === 'success' && (
                              <div className="alert alert-success" role="alert">
                                <strong>Thank you!</strong> Your feedback has been submitted successfully. Our team will review it shortly.
                              </div>
                            )}

                            <div className="d-flex gap-2">
                              <button 
                                type="submit" 
                                className="btn btn-primary"
                                disabled={submitStatus === 'submitting' || submitStatus === 'success'}
                              >
                                {submitStatus === 'submitting' ? (
                                  <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Submitting...
                                  </>
                                ) : submitStatus === 'success' ? (
                                  '✓ Submitted'
                                ) : (
                                  'Submit Feedback'
                                )}
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    </section>

                    {/* Contact Support */}
                    <section className="mb-4">
                      <h2 className="h3 mb-3">Still Need Help?</h2>
                      <div className="alert alert-info show">
                        <h4 className="alert-heading h5">Contact Our Support Team</h4>
                        <p className="mb-2">
                          If you couldn't find the answer to your question, contact our support team directly!
                        </p>
                        
                        <hr />
                        <p className="mb-0">
                          <strong>Email:</strong> services@canvietexchange.com<br />
                          <strong>Hours:</strong> Monday - Friday, 9:00 AM - 5:00 PM PST<br />
                          <strong>Response Time:</strong> Within 24 hours
                        </p>
                      </div>
                    </section>

                    {/* Back to Home */}
                    <div className="text-center mt-5">
                      <a href="/transfers" className="btn btn-primary">
                        Start a Transfer
                      </a>
                      <a href="/dashboard" className="btn btn-outline-secondary ms-2">
                        Go to Dashboard
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
