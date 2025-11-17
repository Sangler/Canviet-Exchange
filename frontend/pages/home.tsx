import React, { useEffect } from "react";
import { useRouter } from "next/router";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect logged-in users to /transfers
  useEffect(() => {
    if (!loading && user) {
      router.replace('/transfers');
    }
  }, [user, loading, router]);

  // Show loading state while checking auth
  if (loading) {
    return null;
  }

  // If user is logged in, don't render (redirect happening)
  if (user) {
    return null;
  }

  // Guest home page content
  return (
    <div>
      <div className="wrapper d-flex flex-column min-vh-100">
        <AppHeader />

        <div className="body flex-grow-1 px-3 my-4">
          <div className="container-lg">
            <div className="row">
              <div className="col-12">
                {/* Hero Section */}
                <div className="card mb-4 border-0 bg-gradient">
                  <div className="card-body text-center py-5">
                    <h1 className="display-4 mb-3">Welcome to CanViet Exchange</h1>
                    <p className="lead text-medium-emphasis mb-4">
                      Send money from Canada{' '}
                      <img 
                        src="/flags/Flag_of_Canada.png" 
                        alt="Canada" 
                        className="icon-small" 
                      />
                      {' '}to Vietnam{' '}
                      <img 
                        src="/flags/Flag_of_Vietnam.png" 
                        alt="Vietnam" 
                        className="icon-small" 
                      />
                      {' '}with transparent rates and fast delivery.
                    </p>
                    <div className="d-flex gap-3 justify-content-center flex-wrap">
                      <a href="/register" className="btn btn-primary btn-lg">
                        Get Started
                      </a>
                      <a href="/login" className="btn btn-outline-primary btn-lg">
                        Sign In
                      </a>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="row mt-4">
                  <div className="col-md-4 mb-3">
                    <div className="card text-white bg-primary h-100">
                      <div className="card-body text-center">
                        <div className="fs-1 mb-3">⚡</div>
                        <h5 className="card-title">Fast Transfer</h5>
                        <p className="card-text">Most transfers delivered within 24-48 hours</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4 mb-3">
                    <div className="card text-white bg-success h-100">
                      <div className="card-body text-center">
                        <div className="fs-1 mb-3">💰</div>
                        <h5 className="card-title">Low Fees</h5>
                        <p className="card-text">Competitive rates with transparent pricing</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4 mb-3">
                    <div className="card text-white bg-info h-100">
                      <div className="card-body text-center">
                        <div className="fs-1 mb-3">🔒</div>
                        <h5 className="card-title">Secure</h5>
                        <p className="card-text">Encrypted transfers and verified partners</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* How It Works */}
                <div className="card mt-4">
                  <div className="card-header">
                    <h4 className="mb-0">How It Works</h4>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-3 mb-3 text-center">
                        <div className="display-6 mb-2">1️⃣</div>
                        <h6>Sign Up</h6>
                        <p className="text-medium-emphasis small">Create your free account</p>
                      </div>
                      <div className="col-md-3 mb-3 text-center">
                        <div className="display-6 mb-2">2️⃣</div>
                        <h6>Enter Details</h6>
                        <p className="text-medium-emphasis small">Add recipient information</p>
                      </div>
                      <div className="col-md-3 mb-3 text-center">
                        <div className="display-6 mb-2">3️⃣</div>
                        <h6>Pay Securely</h6>
                        <p className="text-medium-emphasis small">Choose your payment method</p>
                      </div>
                      <div className="col-md-3 mb-3 text-center">
                        <div className="display-6 mb-2">4️⃣</div>
                        <h6>Track Transfer</h6>
                        <p className="text-medium-emphasis small">Monitor your transaction</p>
                      </div>
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
