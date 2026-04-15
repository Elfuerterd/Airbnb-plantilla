import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CreditCard, Wallet, ChevronLeft, Shield, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PaymentPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchBooking();
  }, [bookingId, isAuthenticated]);

  const fetchBooking = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/bookings/${bookingId}`, {
        withCredentials: true
      });
      setBooking(response.data);
      
      if (response.data.payment_status === 'paid') {
        navigate('/bookings');
      }
    } catch (error) {
      console.error('Error fetching booking:', error);
      toast.error('Booking not found');
      navigate('/bookings');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    setProcessing(true);
    try {
      if (paymentMethod === 'stripe') {
        const response = await axios.post(
          `${API_URL}/api/payments/stripe/create-session`,
          {
            booking_id: bookingId,
            amount: booking.total,
            payment_method: 'stripe',
            origin_url: window.location.origin
          },
          { withCredentials: true }
        );
        
        // Redirect to Stripe Checkout
        window.location.href = response.data.url;
      } else if (paymentMethod === 'paypal') {
        const response = await axios.post(
          `${API_URL}/api/payments/paypal/create-order`,
          {
            booking_id: bookingId,
            amount: booking.total,
            payment_method: 'paypal',
            origin_url: window.location.origin
          },
          { withCredentials: true }
        );
        
        // For PayPal, we would typically use their SDK here
        // For now, show a message
        toast.info('PayPal integration requires additional setup. Please use Stripe for now.');
        setProcessing(false);
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.detail || 'Payment failed');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50" data-testid="payment-loading">
        <Header />
        <div className="container-app py-8">
          <div className="max-w-2xl mx-auto">
            <div className="h-8 w-48 rounded skeleton mb-6" />
            <div className="h-64 rounded-xl skeleton" />
          </div>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  return (
    <div className="min-h-screen bg-slate-50" data-testid="payment-page">
      <Header />

      <div className="container-app py-8">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
            data-testid="back-btn"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to booking
          </button>

          <h1 
            className="text-3xl font-bold text-slate-900 mb-8"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Complete your booking
          </h1>

          <div className="grid md:grid-cols-5 gap-8">
            {/* Payment Methods */}
            <div className="md:col-span-3 space-y-6">
              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                  Select payment method
                </h2>

                <div className="space-y-3">
                  {/* Stripe */}
                  <button
                    onClick={() => setPaymentMethod('stripe')}
                    className={`payment-method w-full flex items-center gap-4 ${
                      paymentMethod === 'stripe' ? 'selected' : ''
                    }`}
                    data-testid="payment-stripe"
                  >
                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-slate-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-slate-900">Credit or Debit Card</p>
                      <p className="text-sm text-slate-500">Powered by Stripe</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 ${
                      paymentMethod === 'stripe' 
                        ? 'border-rose-500 bg-rose-500' 
                        : 'border-slate-300'
                    }`}>
                      {paymentMethod === 'stripe' && (
                        <CheckCircle className="w-full h-full text-white" />
                      )}
                    </div>
                  </button>

                  {/* PayPal */}
                  <button
                    onClick={() => setPaymentMethod('paypal')}
                    className={`payment-method w-full flex items-center gap-4 ${
                      paymentMethod === 'paypal' ? 'selected' : ''
                    }`}
                    data-testid="payment-paypal"
                  >
                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-slate-900">PayPal</p>
                      <p className="text-sm text-slate-500">Pay with your PayPal account</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 ${
                      paymentMethod === 'paypal' 
                        ? 'border-rose-500 bg-rose-500' 
                        : 'border-slate-300'
                    }`}>
                      {paymentMethod === 'paypal' && (
                        <CheckCircle className="w-full h-full text-white" />
                      )}
                    </div>
                  </button>
                </div>
              </div>

              {/* Security Notice */}
              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl">
                <Shield className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800">Secure payment</p>
                  <p className="text-sm text-green-700">
                    Your payment information is encrypted and secure.
                  </p>
                </div>
              </div>

              {/* Pay Button */}
              <Button
                onClick={handlePayment}
                className="w-full h-14 bg-rose-500 hover:bg-rose-600 text-white font-medium text-lg"
                disabled={processing}
                data-testid="pay-btn"
              >
                {processing ? 'Processing...' : `Pay $${booking.total.toFixed(2)}`}
              </Button>
            </div>

            {/* Booking Summary */}
            <div className="md:col-span-2">
              <div className="bg-white rounded-xl p-6 border border-slate-200 sticky top-24">
                <h3 className="font-semibold text-slate-900 mb-4">Booking summary</h3>
                
                {/* Property Image */}
                {booking.property_image && (
                  <div className="aspect-[4/3] rounded-lg overflow-hidden mb-4">
                    <img
                      src={booking.property_image}
                      alt={booking.property_title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <h4 className="font-medium text-slate-900 mb-2">{booking.property_title}</h4>
                
                <div className="text-sm text-slate-600 space-y-1 mb-4">
                  <p>Check-in: {new Date(booking.check_in).toLocaleDateString()}</p>
                  <p>Check-out: {new Date(booking.check_out).toLocaleDateString()}</p>
                  <p>{booking.guests} guest{booking.guests > 1 ? 's' : ''} · {booking.nights} night{booking.nights > 1 ? 's' : ''}</p>
                </div>

                <div className="border-t border-slate-200 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">${booking.price_per_night} × {booking.nights} nights</span>
                    <span>${booking.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Service fee</span>
                    <span>${booking.service_fee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-2 border-t border-slate-200">
                    <span>Total</span>
                    <span>${booking.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
