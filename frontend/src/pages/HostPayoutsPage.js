import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { DollarSign, ChevronLeft, Clock, CheckCircle, Wallet, TrendingUp, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const HostPayoutsPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user?.role !== 'host') {
      navigate('/');
      return;
    }
    fetchData();
  }, [isAuthenticated, user]);

  const fetchData = async () => {
    try {
      const [statsRes, payoutsRes] = await Promise.all([
        axios.get(`${API_URL}/api/host/stats`, { withCredentials: true }),
        axios.get(`${API_URL}/api/host/payouts`, { withCredentials: true })
      ]);
      setStats(statsRes.data);
      setPayouts(payoutsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load payout data');
    } finally {
      setLoading(false);
    }
  };

  const requestPayout = async () => {
    if (stats?.available_balance < 50) {
      toast.error('Minimum payout amount is $50');
      return;
    }

    setRequesting(true);
    try {
      await axios.post(`${API_URL}/api/host/payouts/request`, {}, { withCredentials: true });
      toast.success('Payout request submitted successfully!');
      fetchData();
    } catch (error) {
      console.error('Error requesting payout:', error);
      toast.error(error.response?.data?.detail || 'Failed to request payout');
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50" data-testid="payouts-loading">
        <Header />
        <div className="container-app py-8">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-3 gap-6 mb-8">
              {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl skeleton" />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="host-payouts-page">
      <Header />

      <div className="container-app py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate('/host/dashboard')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to dashboard
          </button>

          <h1 
            className="text-3xl font-bold text-slate-900 mb-8"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Payouts & Earnings
          </h1>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-sm text-slate-600">Total Earnings</span>
              </div>
              <p className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
                ${stats?.total_earnings?.toFixed(2) || '0.00'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Before platform fee (12%)</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-rose-600" />
                </div>
                <span className="text-sm text-slate-600">Available Balance</span>
              </div>
              <p className="text-2xl font-bold text-rose-600" style={{ fontFamily: 'Outfit, sans-serif' }}>
                ${stats?.available_balance?.toFixed(2) || '0.00'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Ready to withdraw</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm text-slate-600">Total Paid Out</span>
              </div>
              <p className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
                ${stats?.total_paid_out?.toFixed(2) || '0.00'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Withdrawn to date</p>
            </div>
          </div>

          {/* Request Payout */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Request Payout</h2>
                <p className="text-sm text-slate-500">
                  Minimum payout amount is $50. Payouts are processed within 3-5 business days.
                </p>
              </div>
              <Button
                onClick={requestPayout}
                disabled={requesting || (stats?.available_balance || 0) < 50}
                className="bg-rose-500 hover:bg-rose-600"
                data-testid="request-payout-btn"
              >
                {requesting ? 'Processing...' : `Request $${stats?.available_balance?.toFixed(2) || '0.00'}`}
              </Button>
            </div>
            {(stats?.available_balance || 0) < 50 && (
              <div className="flex items-center gap-2 mt-4 p-3 bg-yellow-50 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <p className="text-sm text-yellow-700">
                  You need at least $50 in available balance to request a payout.
                </p>
              </div>
            )}
          </div>

          {/* Payout History */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Payout History</h2>
            </div>
            
            {payouts.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {payouts.map((payout) => (
                  <div key={payout.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        payout.status === 'paid' ? 'bg-green-100' :
                        payout.status === 'pending' ? 'bg-yellow-100' :
                        'bg-slate-100'
                      }`}>
                        {payout.status === 'paid' ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : payout.status === 'pending' ? (
                          <Clock className="w-5 h-5 text-yellow-600" />
                        ) : (
                          <DollarSign className="w-5 h-5 text-slate-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">${payout.amount.toFixed(2)}</p>
                        <p className="text-sm text-slate-500">
                          {format(new Date(payout.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      payout.status === 'paid' ? 'bg-green-100 text-green-700' :
                      payout.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">No payouts yet</h3>
                <p className="text-slate-500">Your payout history will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostPayoutsPage;
