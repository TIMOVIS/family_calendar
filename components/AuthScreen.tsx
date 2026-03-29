import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, ArrowRight, BookOpen } from 'lucide-react';
import { authService, familyService } from '../services/supabaseService';
import { supabase } from '../lib/supabase';

interface AuthScreenProps {
  onAuthenticated: (userId: string, familyId: string, memberId: string) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [mode, setMode] = useState<'auth' | 'forgotPassword' | 'resetPassword'>('auth');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [resetEmail, setResetEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  // Check for password reset token in URL
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.get('type') === 'recovery' && hashParams.get('access_token')) {
      setMode('resetPassword');
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (isCreatingAccount) return;

        const { error: signUpError } = await authService.signUp(email, password, name);
        if (signUpError) throw signUpError;

        await new Promise(resolve => setTimeout(resolve, 200));

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          throw new Error('Please check your email to confirm your account, then sign in.');
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('Session not established. Please try again.');
        }

        const existingFamilies = await familyService.getUserFamilies(user.id);
        if (existingFamilies.length > 0) {
          onAuthenticated(user.id, existingFamilies[0].family.id, existingFamilies[0].id);
          return;
        }

        setIsCreatingAccount(true);
        try {
          const { family, member } = await familyService.createFamily(
            `${name}'s Study Space`,
            user.id,
            name,
            '🎓',
            'indigo'
          );
          onAuthenticated(user.id, family.id, member.id);
        } finally {
          setIsCreatingAccount(false);
        }
      } else {
        const { error: signInError } = await authService.signIn(email, password);
        if (signInError) throw signInError;

        await new Promise(resolve => setTimeout(resolve, 100));

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('User not found after sign in');

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Session not established. Please try again.');

        const families = await familyService.getUserFamilies(user.id);

        if (families.length === 0) {
          // Auto-create study space for returning users who don't have one
          const userData = user.user_metadata;
          const { family, member } = await familyService.createFamily(
            `${userData?.name || 'My'} Study Space`,
            user.id,
            userData?.name || 'Student',
            '🎓',
            'indigo'
          );
          onAuthenticated(user.id, family.id, member.id);
        } else {
          onAuthenticated(user.id, families[0].family.id, families[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!resetEmail.trim()) {
        setError('Please enter your email address');
        return;
      }
      const { error: resetError } = await authService.resetPassword(resetEmail.trim());
      if (resetError) throw resetError;
      setResetSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!resetPassword || !confirmResetPassword) {
      setError('Please enter and confirm your new password');
      return;
    }
    if (resetPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (resetPassword !== confirmResetPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { error: updateError } = await authService.updatePassword(resetPassword);
      if (updateError) throw updateError;
      setResetSuccess(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const families = await familyService.getUserFamilies(user.id);
        if (families.length > 0) {
          onAuthenticated(user.id, families[0].family.id, families[0].id);
          return;
        }
      }
      setTimeout(() => {
        setMode('auth');
        setResetPassword('');
        setConfirmResetPassword('');
        setResetSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold">Setting up your study space...</h1>
        </div>
      </div>
    );
  }

  // Password reset form
  if (mode === 'resetPassword') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 flex flex-col items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-[2.5rem] p-8 sm:p-12 shadow-2xl max-w-md w-full border border-white/20 animate-fade-in-up">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Set new password</h2>
          </div>
          {resetSuccess ? (
            <div className="text-center text-white">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-bold text-lg">Password updated!</p>
              <p className="text-indigo-200 text-sm mt-1">Signing you in...</p>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-200" />
                <input type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} required placeholder="New password" minLength={6}
                  className="w-full bg-white/20 border border-white/30 rounded-xl pl-12 pr-4 py-3 text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50" />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-200" />
                <input type="password" value={confirmResetPassword} onChange={e => setConfirmResetPassword(e.target.value)} required placeholder="Confirm new password"
                  className="w-full bg-white/20 border border-white/30 rounded-xl pl-12 pr-4 py-3 text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50" />
              </div>
              {error && <p className="text-red-300 text-sm font-medium text-center">{error}</p>}
              <button type="submit" className="w-full bg-white text-indigo-700 font-bold py-3 rounded-xl hover:bg-indigo-50 transition-colors">
                Update Password
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Forgot password form
  if (mode === 'forgotPassword') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 flex flex-col items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-[2.5rem] p-8 sm:p-12 shadow-2xl max-w-md w-full border border-white/20 animate-fade-in-up">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Reset your password</h2>
            <p className="text-indigo-200 text-sm">We'll send a link to your email</p>
          </div>
          {resetSuccess ? (
            <div className="text-center text-white">
              <div className="text-4xl mb-3">📧</div>
              <p className="font-bold text-lg">Check your inbox!</p>
              <p className="text-indigo-200 text-sm mt-1">Click the link in the email to reset your password.</p>
              <button onClick={() => { setMode('auth'); setResetSuccess(false); }} className="mt-6 text-white/80 hover:text-white text-sm underline">
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-200" />
                <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required placeholder="your@email.com"
                  className="w-full bg-white/20 border border-white/30 rounded-xl pl-12 pr-4 py-3 text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50" />
              </div>
              {error && <p className="text-red-300 text-sm font-medium text-center">{error}</p>}
              <button type="submit" className="w-full bg-white text-indigo-700 font-bold py-3 rounded-xl hover:bg-indigo-50 transition-colors">
                Send Reset Link
              </button>
              <button type="button" onClick={() => setMode('auth')} className="w-full text-white/70 hover:text-white text-sm font-medium py-2">
                Back to sign in
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Main sign-in / sign-up form
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 flex flex-col items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-[2.5rem] p-8 sm:p-12 shadow-2xl max-w-md w-full border border-white/20 animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl">
              <BookOpen className="w-10 h-10 text-indigo-600" />
            </div>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-1">11+ Planner</h1>
          <p className="text-indigo-200">
            {isSignUp ? 'Create your study account' : 'Welcome back — sign in to continue'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-200" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="Your name"
                className="w-full bg-white/20 border border-white/30 rounded-xl pl-12 pr-4 py-3 text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-200" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              className="w-full bg-white/20 border border-white/30 rounded-xl pl-12 pr-4 py-3 text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-200" />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
              className="w-full bg-white/20 border border-white/30 rounded-xl pl-12 pr-4 py-3 text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-300/30 rounded-xl p-3">
              <p className="text-red-200 text-sm font-medium text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-indigo-700 font-black py-3.5 rounded-xl hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-60 text-lg"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {isSignUp ? 'Create account' : 'Sign in'}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center space-y-3">
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
            className="text-white/80 hover:text-white text-sm font-medium transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
          {!isSignUp && (
            <div>
              <button
                onClick={() => { setMode('forgotPassword'); setError(''); }}
                className="text-indigo-300 hover:text-white text-sm transition-colors"
              >
                Forgot your password?
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
