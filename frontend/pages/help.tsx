import React from 'react';
import AppSidebar from '../components/AppSidebar';
import AppHeader from '../components/AppHeader';
import AppFooter from '../components/AppFooter';

export default function HelpPage() {
  return (
    <div>
      <AppSidebar />
      <div className="wrapper d-flex flex-column min-vh-100">
        <AppHeader />
        <div className="body flex-grow-1 px-4 py-4">
          <div className="container-lg">
            <div className="row justify-content-center">
              <div className="col-lg-10">
                <div className="card">
                  <div className="card-body p-4 p-md-5">
                    <h1 className="mb-4">Help Center</h1>
                    <p className="lead mb-5">
                      Welcome to CanViet Exchange Help Center. Find answers to frequently asked questions about sending money from Canada to Vietnam.
                    </p>

                    {/* Getting Started */}
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
                        <h3 className="h5 mb-2">How do I send money to Vietnam?</h3>
                        <ol className="ps-3">
                          <li>Log in to your account</li>
                          <li>Click "New Transfer" or navigate to the Transfers page</li>
                          <li>Enter the amount you want to send</li>
                          <li>Add recipient's bank details in Vietnam</li>
                          <li>Choose your payment method</li>
                          <li>Review and confirm your transfer</li>
                        </ol>
                      </div>

                      <div className="mb-4">
                        <h3 className="h5 mb-2">Why does my transfer take longer than expected?</h3>
                        <ul className="mb-0">
                          <li><strong>Card payments:</strong> 24-48 business hours</li>
                          <li><strong>E-Transfer:</strong> Within 24-48 hours</li>
                          <li><strong>Bank Transfer:</strong> 5-7 business days</li>
                        </ul>
                        <p className="mt-2 mb-0">
                          <em>Note: Processing time may vary based on payment method, recipient bank, and other factors.</em>
                        </p>
                      </div>
                    </section>

                    {/* Fees & Exchange Rates */}
                    <section className="mb-5">
                      <h2 className="h3 mb-3">Fees & Exchange Rates</h2>
                      
                      <div className="mb-4">
                        <h3 className="h5 mb-2">What are your fees?</h3>
                        <p className="mb-0">
                          <strong>Transfer Fee:</strong><br />
                          • $1.50 CAD for transfers under $1,000<br />
                          • FREE for transfers of $1,000 or more<br />
                          <br />
                          <strong>Additional Fees:</strong><br />
                          • Credit card payments may incur a 2% processing fee<br />
                          • No hidden fees - what you see is what you pay
                        </p>
                      </div>

                      <div className="mb-4">
                        <h3 className="h5 mb-2">How is your exchange rate calculated?</h3>
                        <p className="mb-0">
                          We use real-time market rates from trusted sources (Coinbase, ExchangeRate-API) and add a small margin. 
                          Our rate is calculated as: CAD → USDC → USD → VND to ensure accuracy and competitive pricing.
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
                          You'll see the status of all your transfers with details including transaction ID, amount, and delivery status.
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

                      <div className="mb-4">
                        <h3 className="h5 mb-2">Can I cancel a transfer?</h3>
                        <p className="mb-0">
                          Transfers can only be cancelled if they are still in "Pending" status. 
                          Contact our support team immediately if you need to cancel a transfer. 
                          Once approved or completed, transfers cannot be cancelled.
                        </p>
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

                      <div className="mb-4">
                        <h3 className="h5 mb-2">I forgot my password. How do I reset it?</h3>
                        <p className="mb-0">
                          Click "Forgot Password" on the login page, enter your email address, and follow the instructions 
                          sent to your email to reset your password.
                        </p>
                      </div>
                    </section>

                    {/* Contact Support */}
                    <section className="mb-4">
                      <h2 className="h3 mb-3">Still Need Help?</h2>
                      <div className="alert alert-info">
                        <h4 className="alert-heading h5">Contact Our Support Team</h4>
                        <p className="mb-2">
                          If you couldn't find the answer to your question, our support team is here to help!
                        </p>
                        <hr />
                        <p className="mb-0">
                          <strong>Email:</strong> support@canvietexchange.com<br />
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
        <AppFooter />
      </div>
    </div>
  );
}
