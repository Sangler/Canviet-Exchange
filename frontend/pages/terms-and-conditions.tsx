import React from 'react';
import AppSidebar from '../components/AppSidebar';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';

export default function TermsAndConditions() {
  return (
    <div>
      <AppSidebar />
      <div className="wrapper d-flex flex-column min-vh-100">
        <AppHeader />
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

              <section className="mb-5">
                <h2 className="h4 mb-3">4. Exchange Rates and Fees</h2>
                <p>
                  <strong>Exchange Rates:</strong> Our exchange rates are determined in real-time using cryptocurrency stablecoin (USDC) rates from Coinbase and USD/VND rates from trusted exchange rate APIs. The final rate includes:
                </p>
                <ul>
                  <li>Base rate from the market</li>
                  <li>Service margin (currently set per transaction)</li>
                  <li>Volume-based bonus rates (optional, based on transfer amount)</li>
                </ul>
                <p>
                  <strong>Fees:</strong> Transfer fees are clearly displayed before you confirm your transaction:
                </p>
                <ul>
                  <li>Transfers under $1,000 CAD: $1.50 CAD fee</li>
                  <li>Transfers of $1,000 CAD or more: No transfer fee</li>
                  <li>Credit card payments: 2% processing fee applies</li>
                </ul>
                <p className="text-medium-emphasis">
                  Note: Exchange rates may fluctuate due to market conditions, political events, and other factors. The rate shown at the time of your transfer confirmation is the rate that will be applied to your transaction.
                </p>
              </section>

              <section className="mb-5">
                <h2 className="h4 mb-3">5. Transfer Limits and Processing</h2>
                <p>
                  <strong>Minimum Transfer:</strong> $20 CAD<br />
                  <strong>Maximum Transfer:</strong> $9999 CAD per transaction per day
                </p>
                <p>
                  <strong>Processing Times:</strong>
                </p>
                <ul>
                  <li>Card payments: Instant to 1 business day before delivering to recipient(s)</li>
                  <li>E-transfers: 1-2 business days before delivering to recipient(s)</li>
                  <li>Bank wire transfers: 5-7 business days before delivering to recipient(s)</li>
                </ul>
              </section>

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
                <p>
                  We implement security measures to protect your data, but cannot guarantee absolute security of information transmitted over the internet.
                </p>
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
      </div>
    </div>
  );
}
