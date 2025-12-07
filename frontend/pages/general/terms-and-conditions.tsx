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
  const { language, setLanguage } = useLanguage();
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


              <h1 className="mb-4">Terms and Conditions</h1>
              <p className="text-medium-emphasis mb-4">
                <strong>Last Updated:</strong> November 6, 2025
              </p>

              <section className="mb-5">
                <h2 className="h4 mb-3">1. Acceptance of Terms</h2>
                <p>
                  By accessing and using CanViet Exchange ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms and Conditions, please do not use our Service.
                </p>
              </section>

              <section className="mb-5">
                <h2 className="h4 mb-3">2. Service Description</h2>
                <p>
                  CanViet Exchange provides money transfer services from Canada (CAD) to Vietnam (VND). We facilitate the transfer of funds through various payment methods including debit cards, credit cards, e-transfers, and bank wire transfers.
                </p>
              </section>

              <section className="mb-5">
                <h2 className="h4 mb-3">3. User Eligibility</h2>
                <p>To use our Service, you must:</p>
                <ul>
                  <li>Be at least 18 years of age</li>
                  <li>Be a legal resident of Canada</li>
                  <li>Provide accurate and complete registration information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Be legally authorized to send funds from the accounts you use</li>
                </ul>
              </section>


                  <li>Base rate from the market</li>
                  <li>Service margin (currently set per transaction)</li>
                  <li>Volume-based bonus rates (optional, based on transfer amount)</li>
              

              <section className="mb-5">
                <h2 className="h4 mb-3">6. User Responsibilities</h2>
                <p>You agree to:</p>
                <ul>
                  <li>Provide accurate recipient information (bank details, account numbers)</li>
                  <li>Ensure you have authorization to send funds from your payment source</li>
                  <li>Not use the Service for illegal activities, money laundering, or fraud</li>
                  <li>Verify all transfer details before confirming submission</li>
                  <li>KYC process: You may be required to provide additional information for identity verification and AML due to regulations in your region</li>
                  <li>Fluctuating exchange rates: Be aware that exchange rates may vary between the time you initiate a transfer and when it is completed</li>
                  <li>Keep your account information secure and confidential</li>
                </ul>
              </section>

              <section className="mb-5">
                <h2 className="h4 mb-3">7. Privacy and Data Protection</h2>
                <p>
                  We collect and process personal information in accordance with our Privacy Policy. By using our Service, you consent to our collection, use, and disclosure of your personal information as described in our Privacy Policy.
                </p>
                
                <h3 className="h5 mb-3 mt-4">Know Your Customer (KYC) Requirements</h3>
                <p>
                  As a financial service provider operating in Canada, we are required by law to implement Know Your Customer (KYC) procedures to comply with:
                </p>
                <ul>
                  <li><strong>Proceeds of Crime (Money Laundering) and Terrorist Financing Act (PCMLTFA)</strong></li>
                  <li><strong>Financial Transactions and Reports Analysis Centre of Canada (FINTRAC)</strong> regulations</li>
                  <li><strong>Anti-Money Laundering (AML)</strong> and Counter-Terrorist Financing (CTF) requirements</li>
                </ul>

                <h3 className="h5 mb-3 mt-4">Why We Collect Your Information</h3>
                <p>We collect your personal information and identity documents for the following purposes:</p>
                <ul>
                  <li><strong>Identity Verification:</strong> To confirm you are who you claim to be and prevent identity theft or fraud</li>
                  <li><strong>Legal Compliance:</strong> To meet regulatory requirements under Canadian federal and provincial laws</li>
                  <li><strong>Risk Assessment:</strong> To evaluate and manage potential risks associated with money laundering, terrorist financing, or other illegal activities</li>
                  <li><strong>Transaction Monitoring:</strong> To detect and report suspicious transactions as required by law</li>
                  <li><strong>Service Provision:</strong> To process your transfer requests accurately and securely</li>
                </ul>

                <h3 className="h5 mb-3 mt-4">How We Secure Your Information</h3>
                <p>We take the security and confidentiality of your personal information seriously and implement multiple layers of protection:</p>
                <ul>
                  <li><strong>Encryption:</strong> All data transmitted between your device and our servers is encrypted using industry-standard SSL/TLS protocols</li>
                  <li><strong>Secure Storage:</strong> Personal information and documents are stored in encrypted databases with restricted access</li>
                  <li><strong>Data Minimization:</strong> We only collect information that is necessary for regulatory compliance and service provision</li>
                </ul>

                <h3 className="h5 mb-3 mt-4">Data Retention and Your Rights</h3>
                <p>
                  We retain your personal information for as long as required by Canadian law (typically 5-7 years after your last transaction) to comply with record-keeping obligations under FINTRAC regulations.
                </p>

                <h3 className="h5 mb-3 mt-4">Data Security Disclaimer</h3>
                
              </section>

              <section className="mb-5">
                <h2 className="h4 mb-3">8. Prohibited Activities</h2>
                <p>You may not use our Service to:</p>
                <ul>
                  <li>Send funds for illegal goods or services</li>
                  <li>Engage in money laundering or terrorist financing</li>
                  <li>Violate any laws or regulations in Canada or Vietnam</li>
                  <li>Impersonate another person or entity</li>
                  <li>Use fraudulent payment methods</li>
                  <li>Attempt to manipulate exchange rates or fees</li>
                </ul>
              </section>

              <section className="mb-5">
                <h2 className="h4 mb-3">9. Cancellations and Refunds</h2>
                <p>
                  <strong>Before Processing:</strong> You may cancel a transfer before it has been processed. Contact us immediately for assistance.
                </p>
                <p>
                  <strong>After Processing:</strong> Once a transfer has been processed and sent to the recipient's bank, it cannot be cancelled or reversed.
                </p>
                <p>
                  <strong>Refunds:</strong> Refunds are issued in the original currency (CAD) and may be subject to exchange rate differences. Processing fees are non-refundable except in cases of service error.
                </p>
              </section>

              <section className="mb-5">
                <h2 className="h4 mb-3">10. Liability and Disclaimers</h2>
                <p>
                  <strong>Service Availability:</strong> While we strive to provide uninterrupted service, we do not guarantee that the Service will be available at all times. We are not liable for any loss resulting from service downtime.
                </p>
                <p>
                  <strong>Exchange Rate Fluctuations:</strong> We are not responsible for losses due to exchange rate changes between the time you initiate and complete a transfer.
                </p>
                <p>
                  <strong>Third-Party Services:</strong> We rely on third-party payment processors and banks. We are not liable for delays or failures caused by these third parties.
                </p>
                <p>
                  <strong>Maximum Liability:</strong> Our total liability for any claim related to our Service is limited to the amount of the specific transaction in question.
                </p>
              </section>

              <section className="mb-5">
                <h2 className="h4 mb-3">11. Dispute Resolution</h2>
                <p>
                  If you have a complaint or dispute regarding our Service, please contact us at services@canvietexchange.com. We will work to resolve issues within 30 business days.
                </p>
                <p>
                  Any disputes that cannot be resolved through negotiation shall be subject to the laws of the Province of British Columbia, Canada, and the federal laws of Canada applicable therein.
                </p>
              </section>

              <section className="mb-5">
                <h2 className="h4 mb-3">12. Changes to Terms</h2>
                <p>
                  We reserve the right to modify these Terms and Conditions at any time. We will notify users of significant changes via email or through a notice on our website. Your continued use of the Service after changes constitute acceptance of the modified terms.
                </p>
              </section>

              <section className="mb-5">
                <h2 className="h4 mb-3">13. Termination</h2>
                <p>
                  We reserve the right to suspend or terminate your account and access to our Service at any time, without notice, for conduct that we believe violates these Terms and Conditions or is harmful to other users, us, or third parties, or for any other reason.
                </p>
              </section>

              <section className="mb-5">
                <h2 className="h4 mb-3">14. Contact Information</h2>
                <p>
                  If you have any questions about these Terms and Conditions, please contact us via:
                </p>
                <p>
                  <strong>Email:</strong> services@canvietexchange.com<br />
                  <strong>Website:</strong> www.canvietexchange.com
                </p>
              </section>

              <section className="mb-4">
                <h2 className="h4 mb-3">15. Acknowledgment</h2>
                <p>
                  By using CanViet Exchange, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
                </p>
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
