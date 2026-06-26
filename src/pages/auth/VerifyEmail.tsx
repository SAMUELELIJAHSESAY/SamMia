import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Mail, CheckCircle, XCircle, Loader } from 'lucide-react';

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);
  const setUser = useAuthStore((s) => s.setUser);
  const setSession = useAuthStore((s) => s.setSession);

  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error' | null>(null);
  const [email, setEmail] = useState('');
  const [canResend, setCanResend] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Check if user came from email link (token in URL)
  useEffect(() => {
    const handleEmailLinkVerification = async () => {
      const token = searchParams.get('token');
      const type = searchParams.get('type');

      if (type === 'email_change' || type === 'recovery') {
        return; // Not for email confirmation
      }

      if (token) {
        try {
          setIsLoading(true);

          // Exchange token for session
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'email_change',
          });

          if (error) {
            // Try alternative method
            const { error: altError } = await supabase.auth.verifyOtp({
              token_hash: token,
              type: 'signup',
            });

            if (altError) throw altError;
          }

          if (data?.user) {
            // Get profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();

            if (profile) {
              setUser(profile);
              setSession(data.session);
              setVerificationStatus('success');
              showToast('Email verified successfully! Redirecting...', 'success');

              setTimeout(() => {
                const role = profile.role;
                if (role === 'super_admin') {
                  navigate('/super-admin');
                } else {
                  navigate('/dashboard');
                }
              }, 2000);
            }
          }
        } catch (error: any) {
          setVerificationStatus('error');
          showToast(error.message || 'Verification failed', 'error');
        } finally {
          setIsLoading(false);
        }
      }
    };

    handleEmailLinkVerification();
  }, [searchParams, navigate, setUser, setSession, showToast]);

  // Handle manual verification code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !verificationCode) {
      showToast('Please enter both email and verification code', 'error');
      return;
    }

    try {
      setIsLoading(true);
      setVerificationStatus('pending');

      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: verificationCode,
        type: 'signup',
      });

      if (error) throw error;

      if (data?.user) {
        // Get profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profile) {
          setUser(profile);
          setSession(data.session);
          setVerificationStatus('success');
          showToast('Email verified successfully! Redirecting...', 'success');

          setTimeout(() => {
            const role = profile.role;
            if (role === 'super_admin') {
              navigate('/super-admin');
            } else {
              navigate('/dashboard');
            }
          }, 2000);
        }
      }
    } catch (error: any) {
      setVerificationStatus('error');
      showToast(error.message || 'Invalid verification code', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend verification email
  const handleResendEmail = async () => {
    if (!email) {
      showToast('Please enter your email address', 'error');
      return;
    }

    try {
      setIsLoading(true);

      const { error } = await supabase.auth.resendIdentityConfirmationLink(
        {
          email,
          type: 'signup',
        }
      );

      if (error) throw error;

      showToast('Verification email sent! Check your inbox.', 'success');
      setCanResend(false);
      setResendTimer(60);

      // 60 second countdown
      const interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      showToast(error.message || 'Failed to resend email', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600">
                <Mail className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-center">Verify Your Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {verificationStatus === 'success' ? (
              <div className="text-center space-y-3">
                <div className="flex justify-center">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                <h3 className="font-semibold text-green-600 dark:text-green-400">Email Verified!</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your email has been verified. Redirecting to your dashboard...
                </p>
              </div>
            ) : verificationStatus === 'error' ? (
              <div className="text-center space-y-3">
                <div className="flex justify-center">
                  <XCircle className="w-12 h-12 text-red-500" />
                </div>
                <h3 className="font-semibold text-red-600 dark:text-red-400">Verification Failed</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  The verification link may have expired. Please try again or enter your verification code below.
                </p>
              </div>
            ) : isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-3">
                <Loader className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-sm text-gray-600 dark:text-gray-400">Verifying your email...</p>
              </div>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Check your email for a verification link. Or enter the verification code below.
                  </p>
                </div>

                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />

                <Input
                  label="Verification Code"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-digit code from email"
                  maxLength={6}
                />

                <Button type="submit" className="w-full" isLoading={isLoading}>
                  Verify Email
                </Button>

                <div className="text-center">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    {resendTimer > 0 ? `Resend available in ${resendTimer}s` : "Didn't receive the email?"}
                  </p>
                  <button
                    type="button"
                    onClick={handleResendEmail}
                    disabled={!canResend || isLoading}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Resend verification email
                  </button>
                </div>
              </form>
            )}

            <div className="text-center">
              <a href="/login" className="text-sm text-gray-600 dark:text-gray-400 hover:underline">
                Back to login
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
