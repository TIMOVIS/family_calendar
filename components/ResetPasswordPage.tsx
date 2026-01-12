import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, CheckCircle } from 'lucide-react';
import { authService, familyService } from '../services/supabaseService';
import { supabase } from '../lib/supabase';

interface ResetPasswordPageProps {
  onAuthenticated: (userId: string, familyId: string, memberId: string) => void;
}

const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onAuthenticated }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  // Check if we have a valid reset token
  useEffect(() => {
    const checkResetToken = async () => {
      try {
        // Check URL hash for Supabase reset token (primary method)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        if (type === 'recovery' && accessToken) {
          // We have a valid reset token
          setIsValidToken(true);
          
          // Set the session with the recovery tokens
          // Supabase sends both access_token and refresh_token in the hash
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (sessionError) {
            console.error('Error setting session:', sessionError);
            setError('Invalid or expired reset link. Please request a new password reset.');
            setIsValidToken(false);
          } else {
            // Clear the hash from URL for security
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        } else {
          // Check query parameters (alternative format - less common)
          const urlParams = new URLSearchParams(window.location.search);
          const token = urlParams.get('token');
          const tokenHash = urlParams.get('token_hash');
          const queryType = urlParams.get('type');

          if (queryType === 'recovery' && (token || tokenHash)) {
            setIsValidToken(true);
            // Note: Query parameter format may require different handling
            // For now, we'll show the form but the password update might fail
            // The hash format is the standard Supabase method
          } else {
            setError('No valid reset token found. Please request a new password reset.');
            setIsValidToken(false);
          }
        }
      } catch (err) {
        console.error('Error checking reset token:', err);
        setError('Error validating reset link. Please try again.');
        setIsValidToken(false);
      }
    };

    checkResetToken();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Please enter and confirm your new password');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await authService.updatePassword(newPassword);
      if (updateError) throw updateError;

      setSuccess(true);
      
      // Wait a moment for the session to be established
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Try to get user and authenticate
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          const families = await familyService.getUserFamilies(user.id);
          if (families.length > 0) {
            // Auto-login if they have a family
            onAuthenticated(user.id, families[0].family.id, families[0].id);
            return;
          }
        } catch (err) {
          console.error('Error loading families after password reset:', err);
        }
      }
      
      // If no auto-login, show success and redirect after delay
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isValidToken === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-[2.5rem] p-8 sm:p-12 shadow-2xl max-w-md w-full border border-white/20 animate-fade-in-up">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-lg">Validating reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isValidToken === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-[2.5rem] p-8 sm:p-12 shadow-2xl max-w-md w-full border border-white/20 animate-fade-in-up">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center">
                <Lock className="w-10 h-10 text-red-300" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Invalid Reset Link</h2>
            <p className="text-indigo-100">{error || 'This password reset link is invalid or has expired.'}</p>
          </div>

          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-white text-indigo-600 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-[2.5rem] p-8 sm:p-12 shadow-2xl max-w-md w-full border border-white/20 animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
              <Lock className="w-10 h-10 text-indigo-300" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Set New Password</h2>
          <p className="text-indigo-100">Enter your new password below</p>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 text-green-100 text-sm text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5" />
                <p className="font-bold">Password reset successfully!</p>
              </div>
              <p className="mt-2">Redirecting to login...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">New Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-200" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Enter new password"
                  minLength={6}
                  className="w-full bg-white/20 border border-white/30 rounded-xl pl-12 pr-4 py-3 text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-200" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm new password"
                  minLength={6}
                  className="w-full bg-white/20 border border-white/30 rounded-xl pl-12 pr-4 py-3 text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-100 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword}
              className="w-full bg-white text-indigo-600 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  Resetting password...
                </>
              ) : (
                <>
                  Reset Password
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
