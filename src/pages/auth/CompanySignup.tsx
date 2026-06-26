import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompanySignup } from '../../hooks/useMultiTenant';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useUIStore } from '../../stores/uiStore';
import { Building2, CheckCircle, Mail } from 'lucide-react';

export function CompanySignup() {
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);
  const signup = useCompanySignup();

  const [step, setStep] = useState(1);
  const [signupComplete, setSignupComplete] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [formData, setFormData] = useState({
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyIndustry: '',
    adminName: '',
    adminEmail: '',
    password: '',
    confirmPassword: '',
    plan: 'free',
    agreeTerms: false,
  });

  const handleNext = () => {
    if (step === 1) {
      if (!formData.companyName || !formData.companyEmail) {
        showToast('Please fill in company details', 'error');
        return;
      }
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.adminName || !formData.adminEmail || !formData.password) {
      showToast('Please fill in all admin details', 'error');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    if (!formData.agreeTerms) {
      showToast('Please agree to terms and conditions', 'error');
      return;
    }

    try {
      const result = await signup.mutateAsync({
        companyName: formData.companyName,
        companyEmail: formData.companyEmail,
        companyPhone: formData.companyPhone,
        companyIndustry: formData.companyIndustry,
        adminName: formData.adminName,
        adminEmail: formData.adminEmail,
        password: formData.password,
        plan: formData.plan as 'free' | 'pro' | 'enterprise',
      });

      setSignupEmail(formData.adminEmail);
      setSignupComplete(true);
      showToast('Company created successfully! Please verify your email.', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-center">Create Your Company Account</CardTitle>
        </CardHeader>
        <CardContent>
          {signupComplete ? (
            <div className="text-center space-y-4 py-6">
              <div className="flex justify-center">
                <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
                  <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Check Your Email</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                We've sent a verification link to <br />
                <span className="font-medium text-gray-900 dark:text-white">{signupEmail}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Click the link in the email to verify your account, or enter the verification code on the verification page.
              </p>
              
              <div className="pt-4 space-y-3">
                <Button 
                  onClick={() => navigate('/verify-email')}
                  className="w-full"
                >
                  Go to Verification Page
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => navigate('/login')}
                  className="w-full"
                >
                  Back to Login
                </Button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 pt-4">
                Didn't receive an email? Check your spam folder or use the verification page to resend.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 && (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Step 1 of 2: Company Information</p>

                <Input
                  label="Company Name"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Acme Corporation"
                  required
                />

                <Input
                  label="Company Email"
                  type="email"
                  value={formData.companyEmail}
                  onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                  placeholder="company@acme.com"
                  required
                />

                <Input
                  label="Phone (Optional)"
                  value={formData.companyPhone}
                  onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />

                <Input
                  label="Industry (Optional)"
                  value={formData.companyIndustry}
                  onChange={(e) => setFormData({ ...formData, companyIndustry: e.target.value })}
                  placeholder="Technology"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Plan</label>
                  <select
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  >
                    <option value="free">Free - Up to 5 employees</option>
                    <option value="pro">Pro - Up to 50 employees</option>
                    <option value="enterprise">Enterprise - 500+ employees</option>
                  </select>
                </div>

                <Button onClick={handleNext} className="w-full">
                  Next
                </Button>

                <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
                  Already have an account?{' '}
                  <a href="/login" className="text-blue-600 hover:underline">
                    Sign in
                  </a>
                </p>
              </>
            )}

            {step === 2 && (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Step 2 of 2: Admin Account</p>

                <Input
                  label="Admin Name"
                  value={formData.adminName}
                  onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                  placeholder="John Doe"
                  required
                />

                <Input
                  label="Admin Email"
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  placeholder="admin@company.com"
                  required
                />

                <Input
                  label="Password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter a strong password"
                  required
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Confirm password"
                  required
                />

                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={formData.agreeTerms}
                    onChange={(e) => setFormData({ ...formData, agreeTerms: e.target.checked })}
                    className="mt-1"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    I agree to the Terms of Service and Privacy Policy
                  </span>
                </label>

                <div className="flex gap-2">
                  <Button variant="ghost" onClick={handleBack} className="flex-1">
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={signup.isPending}>
                    {signup.isPending ? 'Creating...' : 'Create Account'}
                  </Button>
                </div>
              </>
            )}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
