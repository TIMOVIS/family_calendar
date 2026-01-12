import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, Crown, Key, ArrowRight } from 'lucide-react';
import { authService, familyService } from '../services/supabaseService';
import { supabase } from '../lib/supabase';

interface AuthScreenProps {
  onAuthenticated: (userId: string, familyId: string, memberId: string) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'select' | 'admin' | 'memberLogin' | 'memberJoin' | 'forgotPassword' | 'resetPassword'>('select');
  
  // Admin mode states
  const [isSignUp, setIsSignUp] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminName, setAdminName] = useState('');
  
  // Member login mode states
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  
  // Forgot password mode states
  const [resetEmail, setResetEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  
  // Member join mode states (for first time joining)
  const [joinName, setJoinName] = useState('');
  const [joinEmail, setJoinEmail] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [joinCode, setJoinCode] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCreatingFamily, setIsCreatingFamily] = useState(false);
  const [showFamilySelection, setShowFamilySelection] = useState(false);
  const [userFamilies, setUserFamilies] = useState<any[]>([]);

  // Check for existing session on mount - but always show selection screen first
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Session exists, but we'll still show the selection screen
        // User can choose to continue or switch accounts
        setLoading(false);
      } else {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  // Admin: Sign up or sign in
  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (isCreatingFamily) {
          return;
        }
        
        const { data: signUpData, error: signUpError } = await authService.signUp(adminEmail, adminPassword, adminName);
        if (signUpError) throw signUpError;
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          throw new Error('Please check your email to confirm your account, then sign in.');
        }
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (!session || !session.access_token) {
          throw new Error('Session not established. Please try again.');
        }
        
        const existingFamilies = await familyService.getUserFamilies(user.id);
        if (existingFamilies.length > 0) {
          onAuthenticated(user.id, existingFamilies[0].family.id, existingFamilies[0].id);
          return;
        }
        
        setIsCreatingFamily(true);
        try {
          const { family, member } = await familyService.createFamily(
            `${adminName}'s Family`,
            user.id,
            adminName,
            '👤',
            'indigo'
          );
          
          onAuthenticated(user.id, family.id, member.id);
        } finally {
          setIsCreatingFamily(false);
        }
      } else {
        const { error: signInError } = await authService.signIn(adminEmail, adminPassword);
        if (signInError) throw signInError;
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('User not found after signin');
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (!session || !session.access_token) {
          throw new Error('Session not established. Please try again.');
        }
        
        const families = await familyService.getUserFamilies(user.id);
        
        if (families.length === 0) {
          const userData = user.user_metadata;
          const { family, member } = await familyService.createFamily(
            `${userData?.name || 'My'} Family`,
            user.id,
            userData?.name || 'User',
            '👤',
            'indigo'
          );
          onAuthenticated(user.id, family.id, member.id);
        } else if (families.length === 1) {
          onAuthenticated(user.id, families[0].family.id, families[0].id);
        } else {
          setUserFamilies(families);
          setShowFamilySelection(true);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Member: Sign in
  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: signInError } = await authService.signIn(memberEmail, memberPassword);
      if (signInError) throw signInError;
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not found after signin');
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (!session || !session.access_token) {
        throw new Error('Session not established. Please try again.');
      }
      
      const families = await familyService.getUserFamilies(user.id);
      
      if (families.length === 0) {
        throw new Error('You are not a member of any family. Please join a family first.');
      } else if (families.length === 1) {
        onAuthenticated(user.id, families[0].family.id, families[0].id);
      } else {
        setUserFamilies(families);
        setShowFamilySelection(true);
      }
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  // Member: Join family with code (first time)
  const handleMemberJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!joinName.trim() || !joinEmail.trim() || !joinPassword.trim() || !joinCode.trim()) {
      setError('All fields are required');
      return;
    }

    setLoading(true);

    try {
      const { data: signUpData, error: signUpError } = await authService.signUp(
        joinEmail.trim(),
        joinPassword,
        joinName.trim()
      );
      
      if (signUpError && !signUpError.message.includes('already exists')) {
        throw signUpError;
      }

      if (signUpError && signUpError.message.includes('already exists')) {
        const { error: signInError } = await authService.signIn(joinEmail.trim(), joinPassword);
        if (signInError) throw signInError;
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Account created/signed in but session not established. Please try again.');
      }
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (!session || !session.access_token) {
        throw new Error('Session not established. Please try again.');
      }

      const { family, member } = await familyService.joinFamilyByCode(
        joinCode.trim().toUpperCase(),
        user.id,
        joinName.trim(),
        '👤',
        'indigo'
      );

      onAuthenticated(user.id, family.id, member.id);
    } catch (err: any) {
      setError(err.message || 'Failed to join family. Please check the code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFamily = (family: any, memberId: string) => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        onAuthenticated(user.id, family.id, memberId);
      }
    });
  };

  // Forgot password: Request reset
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
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Reset password: Update password
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

      // After successful password reset, try to get user and authenticate
      setResetSuccess(true);
      
      // Wait a moment for the session to be established
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // User is authenticated, try to load their families
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
      
      // If no auto-login, redirect to login after delay
      setTimeout(() => {
        setMode('select');
        setResetPassword('');
        setConfirmResetPassword('');
        setResetSuccess(false);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Check if we're on a password reset link
  useEffect(() => {
    const checkResetToken = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');

      if (type === 'recovery' && accessToken) {
        // User clicked the reset link from email
        setMode('resetPassword');
      }
    };

    checkResetToken();
  }, []);

  if (loading && !showFamilySelection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h1 className="text-3xl font-bold">Loading fam.ly...</h1>
          <p className="text-lg">Getting your family's schedule ready.</p>
        </div>
      </div>
    );
  }

  if (showFamilySelection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-[2.5rem] p-8 sm:p-12 shadow-2xl max-w-2xl w-full border border-white/20 animate-fade-in-up">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Select a Family</h2>
            <p className="text-indigo-100">Choose which family to access</p>
          </div>

          <div className="space-y-4 mb-6">
            {userFamilies.map((item) => (
              <button
                key={item.family.id}
                onClick={() => handleSelectFamily(item.family, item.id)}
                className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-2xl p-6 text-left transition-all border border-white/20 hover:border-white/40"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl">
                    🏡
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white">{item.family.name}</h3>
                    <p className="text-indigo-100 text-sm">
                      {item.role === 'admin' ? '👑 Admin' : 'Member'}
                    </p>
                  </div>
                  <ArrowRight className="w-6 h-6 text-white/70" />
                </div>
              </button>
            ))}
          </div>

          <div className="border-t border-white/20 pt-6 text-center">
            <button
              onClick={() => {
                supabase.auth.signOut();
                window.location.reload();
              }}
              className="text-white/80 hover:text-white text-sm underline"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Initial selection screen
  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-[2.5rem] p-8 sm:p-12 shadow-2xl max-w-md w-full border border-white/20 animate-fade-in-up">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-xl">
                <span className="text-4xl">🏡</span>
              </div>
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight mb-2">fam.ly</h1>
            <p className="text-indigo-100">Your family's shared calendar</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setMode('admin')}
              className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-2xl p-6 text-left transition-all border border-white/20 hover:border-white/40 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Crown className="w-7 h-7 text-yellow-300" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">I am the family admin</h3>
                  <p className="text-indigo-100 text-sm">Sign up or log in to create and manage your family</p>
                </div>
                <ArrowRight className="w-6 h-6 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </button>

            <button
              onClick={() => setMode('memberLogin')}
              className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-2xl p-6 text-left transition-all border border-white/20 hover:border-white/40 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Key className="w-7 h-7 text-indigo-300" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">I am a family member</h3>
                  <p className="text-indigo-100 text-sm">Join a family using the code from your admin</p>
                </div>
                <ArrowRight className="w-6 h-6 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Admin mode: Sign up or sign in
  if (mode === 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-[2.5rem] p-8 sm:p-12 shadow-2xl max-w-md w-full border border-white/20 animate-fade-in-up">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                <Crown className="w-10 h-10 text-yellow-300" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Family Admin</h2>
            <p className="text-indigo-100">
              {isSignUp ? 'Create your account and family' : 'Sign in to manage your family'}
            </p>
          </div>

          <form onSubmit={handleAdminAuth} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-white/90 text-sm font-medium mb-2">Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-200" />
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    required
                    placeholder="Your name"
                    className="w-full bg-white/20 border border-white/30 rounded-xl pl-12 pr-4 py-3 text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-200" />
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  className="w-full bg-white/20 border border-white/30 rounded-xl pl-12 pr-4 py-3 text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-200" />
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full bg-white/20 border border-white/30 rounded-xl pl-12 pr-4 py-3 text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
            </div>

            {!isSignUp && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgotPassword');
                    setError('');
                    setResetEmail(adminEmail); // Pre-fill with admin email
                  }}
                  className="text-white/80 hover:text-white text-sm underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-100 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || isCreatingFamily}
              className="w-full bg-white text-indigo-600 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  {isSignUp ? (isCreatingFamily ? 'Creating family...' : 'Creating account...') : 'Signing in...'}
                </>
              ) : (
                <>
                  {isSignUp ? 'Sign Up & Create Family' : 'Sign In'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 space-y-3">
            <div className="text-center">
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                }}
                className="text-white/80 hover:text-white text-sm underline"
              >
                {isSignUp
                  ? 'Already have an account? Sign in'
                  : "Don't have an account? Sign up"}
              </button>
            </div>
            
            <button
              onClick={() => {
                setMode('select');
                setError('');
                setAdminEmail('');
                setAdminPassword('');
                setAdminName('');
              }}
              className="w-full text-white/80 hover:text-white text-sm underline"
            >
              ← Back to options
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Member mode: Login
  if (mode === 'memberLogin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-[2.5rem] p-8 sm:p-12 shadow-2xl max-w-md w-full border border-white/20 animate-fade-in-up">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                <Key className="w-10 h-10 text-indigo-300" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Family Member Login</h2>
            <p className="text-indigo-100">Sign in to your family account</p>
          </div>

          <form onSubmit={handleMemberLogin} className="space-y-4">
            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-200" />
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  className="w-full bg-white/20 border border-white/30 rounded-xl pl-12 pr-4 py-3 text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-200" />
                <input
                  type="password"
                  value={memberPassword}
                  onChange={(e) => setMemberPassword(e.target.value)}
                  required
                  placeholder="••••••••"
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
              disabled={loading}
              className="w-full bg-white text-indigo-600 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 space-y-3">
            <div className="text-center space-y-2">
              <button
                onClick={() => {
                  setMode('forgotPassword');
                  setError('');
                  setResetEmail(memberEmail); // Pre-fill with login email
                }}
                className="text-white/80 hover:text-white text-sm underline block w-full"
              >
                Forgot password?
              </button>
              <button
                onClick={() => {
                  setMode('memberJoin');
                  setError('');
                  setMemberEmail('');
                  setMemberPassword('');
                }}
                className="text-white/80 hover:text-white text-sm underline block w-full"
              >
                Join a family for the first time
              </button>
            </div>
            <button
              onClick={() => {
                setMode('select');
                setError('');
                setMemberEmail('');
                setMemberPassword('');
              }}
              className="w-full text-white/80 hover:text-white text-sm underline"
            >
              ← Back to options
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Member mode: Join with code (first time)
  if (mode === 'memberJoin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-[2.5rem] p-8 sm:p-12 shadow-2xl max-w-md w-full border border-white/20 animate-fade-in-up">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                <Key className="w-10 h-10 text-indigo-300" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Join a Family</h2>
            <p className="text-indigo-100">Enter your details and the join code from your family admin</p>
          </div>

          <form onSubmit={handleMemberJoin} className="space-y-4">
            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">Your Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-200" />
                <input
                  type="text"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  required
                  placeholder="Your name"
                  className="w-full bg-white/20 border border-white/30 rounded-xl pl-12 pr-4 py-3 text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-200" />
                <input
                  type="email"
                  value={joinEmail}
                  onChange={(e) => setJoinEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  className="w-full bg-white/20 border border-white/30 rounded-xl pl-12 pr-4 py-3 text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-200" />
                <input
                  type="password"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  required
                  placeholder="Create a password"
                  minLength={6}
                  className="w-full bg-white/20 border border-white/30 rounded-xl pl-12 pr-4 py-3 text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">Join Code</label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-200" />
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  required
                  placeholder="Enter join code"
                  maxLength={6}
                  className="w-full bg-white/20 border border-white/30 rounded-xl pl-12 pr-4 py-3 text-white text-center text-2xl font-bold tracking-widest placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50 uppercase"
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
              disabled={loading || !joinName.trim() || !joinEmail.trim() || !joinPassword.trim() || !joinCode.trim()}
              className="w-full bg-white text-indigo-600 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  Creating account...
                </>
              ) : (
                <>
                  Create Account & Join Family
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <div className="mt-6">
              <button
                onClick={() => {
                  setMode('memberLogin');
                  setError('');
                  setJoinName('');
                  setJoinEmail('');
                  setJoinPassword('');
                  setJoinCode('');
                }}
                className="w-full text-white/80 hover:text-white text-sm underline"
              >
                ← Back to login
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Forgot Password mode: Request password reset
  if (mode === 'forgotPassword') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-[2.5rem] p-8 sm:p-12 shadow-2xl max-w-md w-full border border-white/20 animate-fade-in-up">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                <Key className="w-10 h-10 text-indigo-300" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Reset Password</h2>
            <p className="text-indigo-100">
              {resetSuccess 
                ? 'Check your email for a password reset link!' 
                : 'Enter your email and we\'ll send you a reset link'}
            </p>
          </div>

          {resetSuccess ? (
            <div className="space-y-4">
              <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 text-green-100 text-sm text-center">
                <p className="mb-2">✅ Password reset email sent!</p>
                <p>Please check your email and click the link to reset your password.</p>
              </div>
              <button
                onClick={() => {
                  setMode('select');
                  setResetEmail('');
                  setResetSuccess(false);
                  setError('');
                }}
                className="w-full bg-white text-indigo-600 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all"
              >
                Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-white/90 text-sm font-medium mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-200" />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                    className="w-full bg-white/20 border border-white/30 rounded-xl pl-12 pr-4 py-3 text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                    autoFocus
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
                disabled={loading || !resetEmail.trim()}
                className="w-full bg-white text-indigo-600 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    Sending reset link...
                  </>
                ) : (
                  <>
                    Send Reset Link
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-6">
            <button
              onClick={() => {
                setMode('select');
                setResetEmail('');
                setError('');
                setResetSuccess(false);
              }}
              className="w-full text-white/80 hover:text-white text-sm underline"
            >
              ← Back to options
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Reset Password mode: Set new password (from email link)
  if (mode === 'resetPassword') {
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

          {resetSuccess ? (
            <div className="space-y-4">
              <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 text-green-100 text-sm text-center">
                <p>✅ Password reset successfully!</p>
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
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
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
                    value={confirmResetPassword}
                    onChange={(e) => setConfirmResetPassword(e.target.value)}
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
                disabled={loading || !resetPassword || !confirmResetPassword}
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

          <div className="mt-6">
            <button
              onClick={() => {
                setMode('select');
                setResetPassword('');
                setConfirmResetPassword('');
                setError('');
                setResetSuccess(false);
              }}
              className="w-full text-white/80 hover:text-white text-sm underline"
            >
              ← Back to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthScreen;
