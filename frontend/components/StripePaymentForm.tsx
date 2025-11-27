import React, { useImperativeHandle } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

interface StripePaymentFormProps {
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentError: (error: string) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
}

export type StripePaymentFormHandle = {
  confirmPayment: () => Promise<{ success: boolean; paymentIntentId?: string; error?: string }>;
};

const StripePaymentForm = React.forwardRef<StripePaymentFormHandle, StripePaymentFormProps>(
  ({ onPaymentSuccess, onPaymentError, isProcessing, setIsProcessing }, ref) => {
    const stripe = useStripe();
    const elements = useElements();

    // Expose confirmPayment to parent via ref
    useImperativeHandle(ref, () => ({
      confirmPayment: async () => {
        if (!stripe || !elements) {
          const msg = 'Stripe has not loaded yet. Please wait and try again.';
          return { success: false, error: msg };
        }

        setIsProcessing(true);

        try {
          const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            redirect: 'if_required',
            confirmParams: { return_url: `${window.location.origin}/transfers` },
          });

          if (error) {
            const msg = error.message || 'Payment failed';
            onPaymentError(msg);
            setIsProcessing(false);
            return { success: false, error: msg };
          }

          if (paymentIntent && paymentIntent.status === 'succeeded') {
            onPaymentSuccess(paymentIntent.id);
            setIsProcessing(false);
            return { success: true, paymentIntentId: paymentIntent.id };
          }

          const unknownMsg = 'Payment status is not successful. Please try again.';
          onPaymentError(unknownMsg);
          setIsProcessing(false);
          return { success: false, error: unknownMsg };
        } catch (err) {
          const msg = 'An unexpected error occurred during payment processing.';
          onPaymentError(msg);
          setIsProcessing(false);
          return { success: false, error: msg };
        }
      },
    }));

    // The parent controls confirmation; the form simply renders the PaymentElement.
    return (
      <div>
        <div className="stripe-payment-element">
          <PaymentElement />
        </div>
      </div>
    );
  }
);

export default StripePaymentForm;
