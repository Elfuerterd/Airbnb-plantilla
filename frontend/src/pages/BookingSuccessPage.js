import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, XCircle, Loader2, Home } from 'lucide-react';
import { Button } from '../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const BookingSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking'); // checking, success, failed
  const [attempts, setAttempts] = useState(0);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      pollPaymentStatus();
    } else {
      setStatus('failed');
    }
  }, [sessionId]);

  const pollPaymentStatus = async () => {
    const maxAttempts = 5;
    const pollInterval = 2000;

    if (attempts >= maxAttempts) {
      setStatus('failed');
      return;
    }

    try {
      const response = await axios.get(
        `${API_URL}/api/payments/stripe/status/${sessionId}`,
        { withCredentials: true }
      );

      if (response.data.payment_status === 'paid') {
        setStatus('success');
        return;
      } else if (response.data.status === 'expired') {
        setStatus('failed');
        return;
      }

      // Continue polling
      setAttempts(prev => prev + 1);
      setTimeout(pollPaymentStatus, pollInterval);
    } catch (error) {
      console.error('Error checking payment status:', error);
      setAttempts(prev => prev + 1);
      if (attempts + 1 >= maxAttempts) {
        setStatus('failed');
      } else {
        setTimeout(pollPaymentStatus, pollInterval);
      }
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4" data-testid="booking-success-page">
      <div className="max-w-md w-full text-center">
        {status === 'checking' && (
          <div className="animate-fade-in">
            <Loader2 className="w-16 h-16 text-rose-500 animate-spin mx-auto mb-6" />
            <h1 
              className="text-2xl font-bold text-slate-900 mb-2"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Processing your payment...
            </h1>
            <p className="text-slate-600">Please wait while we confirm your booking.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="animate-fade-in">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h1 
              className="text-2xl font-bold text-slate-900 mb-2"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Booking confirmed!
            </h1>
            <p className="text-slate-600 mb-8">
              Your payment was successful and your booking is now confirmed. 
              You'll receive a confirmation email shortly.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => navigate('/bookings')}
                className="bg-rose-500 hover:bg-rose-600"
                data-testid="view-bookings-btn"
              >
                View my bookings
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                data-testid="back-home-btn"
              >
                <Home className="w-4 h-4 mr-2" />
                Back to home
              </Button>
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div className="animate-fade-in">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
            <h1 
              className="text-2xl font-bold text-slate-900 mb-2"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Payment failed
            </h1>
            <p className="text-slate-600 mb-8">
              We couldn't process your payment. Please try again or contact support if the problem persists.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => navigate('/bookings')}
                className="bg-rose-500 hover:bg-rose-600"
              >
                View my bookings
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/')}
              >
                <Home className="w-4 h-4 mr-2" />
                Back to home
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingSuccessPage;
