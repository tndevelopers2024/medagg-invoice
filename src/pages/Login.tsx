import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lock, Mail, User, AlertCircle, Briefcase } from 'lucide-react';
import logoImage from '@/assets/logo.png';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiFetch, setAuthToken } from '@/lib/apiClient';

const DEPARTMENTS = [
  'HR',
  'DIGITAL MARKETING (SOFTWARE)',
  'SALES',
  'DIRECTOR',
  'FINANCE',
  'BUSINESS DEVELOPMENT',
  'OTHERS',
];

const Login = () => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [resetLinkSent, setResetLinkSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      try {
        await apiFetch('/api/auth/me');
        navigate('/dashboard');
      } catch {
        localStorage.removeItem('authToken');
        localStorage.removeItem('loggedInUser');
      }
    };
    checkSession();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await apiFetch<{ token: string; user: any }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (!result?.token) {
        toast({
          title: 'Login failed',
          description: 'Invalid response from server.',
          variant: 'destructive',
        });
        return;
      }

      setAuthToken(result.token);
      localStorage.setItem('loggedInUser', JSON.stringify(result.user));

      toast({
        title: 'Welcome back!',
        description: `Logged in as ${result.user?.name || result.user?.email || email}`,
      });
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error)?.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (password.length < 6) {
        toast({
          title: 'Sign up failed',
          description: 'Password must be at least 6 characters.',
          variant: 'destructive',
        });
        return;
      }

      await apiFetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          fullName: name || email.split('@')[0],
          department,
        }),
      });

      // Store department in localStorage for admin to see
      if (department) {
        const storedDepartments = localStorage.getItem('userDepartments');
        const departments = storedDepartments ? JSON.parse(storedDepartments) : {};
        departments[email.trim().toLowerCase()] = department;
        localStorage.setItem('userDepartments', JSON.stringify(departments));
      }

      setSignupSuccess(true);
      toast({
        title: 'Account Created!',
        description: 'Your account is pending approval. The Website Head will review and activate your account.',
      });
    } catch (error) {
      toast({
        title: 'Sign up failed',
        description: (error as Error)?.message || 'Could not create account.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Local mock flow: generate reset token and store in localStorage
      const mockToken = Math.random().toString(36).substring(2, 15);
      const resetData = {
        token: mockToken,
        email: email,
        expires: Date.now() + 3600000, // 1 hour
      };
      localStorage.setItem('passwordResetToken', JSON.stringify(resetData));

      toast({
        title: 'Reset link generated',
        description: 'Click the button below to reset your password.',
      });

      setResetLinkSent(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please ensure both passwords are identical.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const resetDataStr = localStorage.getItem('passwordResetToken');
      if (!resetDataStr) {
        toast({
          title: 'Invalid reset link',
          description: 'The reset link has expired or is invalid.',
          variant: 'destructive',
        });
        return;
      }

      const resetData = JSON.parse(resetDataStr);

      if (Date.now() > resetData.expires) {
        localStorage.removeItem('passwordResetToken');
        toast({
          title: 'Link expired',
          description: 'The reset link has expired. Please request a new one.',
          variant: 'destructive',
        });
        return;
      }

      // Not implemented server-side yet. This is kept as local mock for now.
      localStorage.removeItem('passwordResetToken');
      toast({
        title: 'Password updated successfully',
        description: 'You can now login with your new password.',
      });

      setIsResetPassword(false);
      setIsForgotPassword(false);
      setIsLoginMode(true);
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setDepartment('');
    setSignupSuccess(false);
    setResetLinkSent(false);
  };

  const openResetPasswordPage = () => {
    setIsForgotPassword(false);
    setIsResetPassword(true);
    setResetLinkSent(false);
    setPassword('');
    setConfirmPassword('');
  };

  if (signupSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-lg mb-4 p-2">
              <img src={logoImage} alt="Medagg Healthcare" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Medagg Healthcare</h1>
          </div>

          <Card className="shadow-xl border-border/50">
            <CardContent className="pt-6">
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your account has been created and is pending approval. The Website Head will review your request and activate your account. You will be able to login once approved.
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => {
                  setSignupSuccess(false);
                  setIsLoginMode(true);
                  resetForm();
                }}
                className="w-full"
              >
                Back to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isResetPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-lg mb-4 p-2">
              <img src={logoImage} alt="Medagg Healthcare" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Medagg Healthcare</h1>
            <p className="text-muted-foreground mt-2">Reset Your Password</p>
          </div>

          <Card className="shadow-xl border-border/50">
            <CardHeader className="pb-4 text-center">
              <h2 className="text-xl font-semibold">Create New Password</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your new password below
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Updating...' : 'Update Password'}
                </Button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetPassword(false);
                      setIsLoginMode(true);
                      resetForm();
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    Back to Login
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-lg mb-4 p-2">
              <img src={logoImage} alt="Medagg Healthcare" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Medagg Healthcare</h1>
            <p className="text-muted-foreground mt-2">Reset Your Password</p>
          </div>

          <Card className="shadow-xl border-border/50">
            <CardHeader className="pb-4 text-center">
              <h2 className="text-xl font-semibold">Forgot Password</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Only active accounts can reset their password
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading || resetLinkSent}>
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>

                {resetLinkSent && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={openResetPasswordPage}
                  >
                    Open Reset Password
                  </Button>
                )}

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      resetForm();
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    Back to Login
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-lg mb-4 p-2">
            <img src={logoImage} alt="Medagg Healthcare" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Medagg Healthcare</h1>
          <p className="text-muted-foreground mt-2">Hospital Invoice Management System</p>
        </div>

        <Card className="shadow-xl border-border/50">
          <CardHeader className="pb-4 text-center">
            <h2 className="text-xl font-semibold">{isLoginMode ? 'Sign In' : 'Sign Up'}</h2>
            {!isLoginMode && (
              <p className="text-sm text-muted-foreground mt-1">
                New accounts require approval from the Website Head
              </p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={isLoginMode ? handleSignIn : handleSignUp} className="space-y-4">
              {!isLoginMode && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}

              {!isLoginMode && (
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                    <Select value={department} onValueChange={setDepartment}>
                      <SelectTrigger className="pl-10">
                        <SelectValue placeholder="Select Department" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map((dept) => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
                {!isLoginMode && (
                  <p className="text-xs text-muted-foreground">Password must be at least 6 characters</p>
                )}
              </div>

              {isLoginMode && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      resetForm();
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading 
                  ? (isLoginMode ? 'Signing in...' : 'Creating account...') 
                  : (isLoginMode ? 'Sign In' : 'Create Account')}
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginMode(!isLoginMode);
                    resetForm();
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  {isLoginMode 
                    ? "Don't have an account? Sign up" 
                    : "Already have an account? Sign in"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          © 2026 Medagg Healthcare. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
