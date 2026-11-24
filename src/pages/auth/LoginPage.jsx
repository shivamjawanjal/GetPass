import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { COLLEGE_INFO, ROLES } from '../../utils/constants';
import FormInput from '../../components/forms/FormInput';
import BrandMark from '../../components/common/BrandMark';
import { focusRing } from '../../utils/uiStyles';
import {
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  QrCode,
  ClipboardCheck,
  ScanLine,
  Eye,
  EyeOff,
} from 'lucide-react';

const featureItems = [
  { label: 'Instant QR Code Generation', icon: QrCode },
  { label: 'Real-time Approval Tracking', icon: ClipboardCheck },
  { label: 'Digital Guard Verification', icon: ScanLine },
];

const DEMO_ACCOUNTS = [
  { role: ROLES.STUDENT, email: 'rahul.sharma@sxiet.edu.in', label: 'Student' },
  { role: ROLES.CLERK, email: 'clerk.sunita@sxiet.edu.in', label: 'Clerk' },
  { role: ROLES.GUARD, email: 'guard.ramesh@sxiet.edu.in', label: 'Guard' },
  { role: ROLES.ADMIN, email: 'admin@sxiet.edu.in', label: 'Admin' },
];

const LoginPage = () => {
  const [identifier, setIdentifier] = useState('rahul.sharma@sxiet.edu.in');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(ROLES.STUDENT);

  const { login, currentUser, role: activeRole } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleRoleQuickSelect = (role) => {
    setSelectedRole(role);
    const match = DEMO_ACCOUNTS.find((acc) => acc.role === role);
    if (match) {
      setIdentifier(match.email);
      setPassword('password123');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login(identifier, password, selectedRole);
      const userRole = res.user.role;
      addToast(`Welcome back, ${res.user.name}! Authenticated as ${userRole.toUpperCase()}`, 'success');

      const from = location.state?.from;
      const fromPath = from?.pathname;
      if (fromPath && userRole && fromPath.startsWith(`/${userRole}/`)) {
        navigate(`${fromPath}${from.search || ''}${from.hash || ''}`, { replace: true });
        return;
      }

      if (Object.values(ROLES).includes(userRole)) {
        navigate(`/${userRole}/dashboard`, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      addToast(err.message || 'Login failed. Please check credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Left Branding Panel */}
      <div className="hidden w-[45%] flex-col justify-between bg-slate-900 p-12 lg:flex">
        <div>
          <Link to="/" className={`inline-flex items-center gap-3 rounded-md ${focusRing}`}>
            <BrandMark />
            <div>
              <p className="text-lg font-bold leading-tight text-white">Digital Gate Pass</p>
              <p className="text-xs font-medium text-slate-300">{COLLEGE_INFO.name}</p>
            </div>
          </Link>
        </div>

        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5">
            <span className="h-3 w-1 rounded-md bg-orange-700" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-200">
              Campus Security System
            </span>
          </div>
          <p className="text-4xl font-bold leading-tight tracking-tight text-white">
            Smart Campus
            <br />
            Gate Management
          </p>
          <p className="max-w-xs text-sm font-medium leading-relaxed text-slate-300">
            Paperless, instant QR-based student gate pass requests with real-time clerk approvals and guard verification.
          </p>

          <div className="space-y-3 pt-2">
            {featureItems.map(({ label, icon: FeatureIcon }) => (
              <div key={label} className="flex items-center gap-3">
                <FeatureIcon className="h-4 w-4 shrink-0 text-orange-700" aria-hidden="true" />
                <span className="text-xs font-semibold text-slate-200">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-400">
            Copyright {new Date().getFullYear()} {COLLEGE_INFO.shortName}. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Login Panel */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Top Navigation Bar */}
          <div className="mb-6 flex items-center justify-between">
            <Link
              to="/"
              className={`inline-flex items-center gap-1.5 rounded-md text-xs font-semibold text-slate-600 hover:text-orange-700 ${focusRing}`}
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to home
            </Link>
            {currentUser && activeRole && (
              <Link
                to={`/${activeRole}/dashboard`}
                className={`inline-flex items-center gap-1 rounded-md text-xs font-semibold text-orange-700 hover:text-orange-800 ${focusRing}`}
              >
                Go to {activeRole} dashboard
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>

          {/* Mobile Logo */}
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <BrandMark />
            <div>
              <p className="text-sm font-bold leading-tight text-slate-900">Digital Gate Pass</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-700">
                {COLLEGE_INFO.name}
              </p>
            </div>
          </div>

          {/* Header (visible H1 across all viewports) */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sign in to your portal</h1>
            <p className="mt-1 text-sm font-medium text-slate-600">
              Enter your college credentials or quick-fill a sandbox role below.
            </p>
          </div>

          {/* Demo Sandbox Role Quick-Fill */}
          <div className="mb-6 rounded-md border border-slate-200 bg-white p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Demo Sandbox Quick-Fill
              </p>
              <span className="text-[10px] font-semibold text-slate-500">Password: password123</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {DEMO_ACCOUNTS.map(({ role: r, label }) => {
                const isActive = selectedRole === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRoleQuickSelect(r)}
                    className={`rounded-md border px-1 py-2 text-[11px] font-bold ${focusRing} ${
                      isActive
                        ? 'border-orange-700 bg-orange-700 text-white'
                        : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Login Form Card */}
          <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <FormInput
                label="Email Address / Roll Number"
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. rahul.sharma@sxiet.edu.in"
                required
                icon={User}
                autoComplete="username"
                hint="Enter your official college email or roll number"
              />

              <FormInput
                label="Password"
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                icon={Lock}
                autoComplete="current-password"
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className={`rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 ${focusRing}`}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                }
              />

              <button
                type="submit"
                disabled={loading}
                className={`mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-orange-700 px-4 py-3 text-sm font-bold text-white hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
              >
                {loading ? (
                  <>
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-white"
                      role="status"
                      aria-label="Authenticating"
                    />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In as {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-200 pt-5 text-center">
              <p className="text-xs font-medium text-slate-600">
                Need assistance?{' '}
                <a
                  href={`mailto:${COLLEGE_INFO.email}`}
                  className={`rounded-md font-bold text-orange-700 hover:text-orange-800 ${focusRing}`}
                >
                  Contact Campus IT Support
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
