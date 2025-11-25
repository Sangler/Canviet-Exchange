import React from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

interface StripePaymentFormProps {
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentError: (error: string) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}

export default function StripePaymentForm({ 
  onPaymentSuccess, 
  onPaymentError,
  isProcessing,
  setIsProcessing 
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      onPaymentError('Stripe has not loaded yet. Please wait and try again.');
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: `${window.location.origin}/transfers`,
        },
      });

      if (error) {
        onPaymentError(error.message || 'Payment failed');
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onPaymentSuccess(paymentIntent.id);
        setIsProcessing(false);
      } else {
        onPaymentError('Payment status is not successful. Please try again.');
        setIsProcessing(false);
      }
    } catch (err) {
      onPaymentError('An unexpected error occurred during payment processing.');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="stripe-payment-element">
        <PaymentElement />
      </div>
      
      <div className="form-group delivery-notice">
        <p className="notice-text">
          <strong>Expected delivery:</strong> 24-48 business hours
        </p>
        <p className="notice-subtext">
          Note: Processing speed may vary based on your payment method, delivery method, bank's policies and other factors such as third-party delays. 
          Consider that your transfer might take longer than expected—this is normal!
        </p>
      </div>

      <div className="form-group">
        <button 
          type="submit" 
          className="btn btn-primary btn-block"
          disabled={!stripe || isProcessing}
        >
          {isProcessing ? 'Processing Payment...' : 'Confirm Payment'}
        </button>
      </div>
    </form>
  );
}
