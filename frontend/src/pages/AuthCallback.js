import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, Loader2 } from 'lucide-react';

// FaceYouFace Auth Callback

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { exchangeSession } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      // Extract session_id from URL fragment
      const hash = location.hash;
      const params = new URLSearchParams(hash.replace('#', ''));
      const sessionId = params.get('session_id');

      if (sessionId) {
        const result = await exchangeSession(sessionId);
        
        if (result.success) {
          // Navigate to home with user data
          navigate('/', { state: { user: result.user }, replace: true });
        } else {
          // Navigate to login with error
          navigate('/login', { state: { error: result.error }, replace: true });
        }
      } else {
        // No session_id, redirect to login
        navigate('/login', { replace: true });
      }
    };

    processAuth();
  }, [location.hash, exchangeSession, navigate]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center" data-testid="auth-callback">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-rose-500 rounded-2xl flex items-center justify-center">
            <Home className="w-10 h-10 text-white" />
          </div>
        </div>
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin mx-auto mb-4" />
        <p className="text-slate-600">Completing sign in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
