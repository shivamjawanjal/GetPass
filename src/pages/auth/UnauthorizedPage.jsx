import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { COLLEGE_INFO } from '../../utils/constants';
import { buttonPrimary, buttonSecondary, focusRing } from '../../utils/uiStyles';
import BrandMark from '../../components/common/BrandMark';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';

const UnauthorizedPage = () => {
  const { currentUser, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleSwitchAccount = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className={`flex items-center gap-3 rounded-md ${focusRing}`}>
            <BrandMark compact />
            <span className="flex flex-col">
              <span className="text-sm font-bold leading-tight text-slate-900">Digital Gate Pass</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {COLLEGE_INFO.shortName} Campus
              </span>
            </span>
          </Link>
          <Link to="/" className={`rounded-md text-xs font-semibold text-slate-600 hover:text-orange-700 ${focusRing}`}>
            Back to home
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md rounded-md border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-orange-700">
            <ShieldAlert className="h-10 w-10" aria-hidden="true" />
          </div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            <span>403</span>
            <span>Access Restricted</span>
          </div>
          <h1 className="mb-2 text-xl font-bold tracking-tight text-slate-900">
            You do not have permission
          </h1>
          <p className="text-sm font-medium leading-relaxed text-slate-600">
            Your current account role (<strong className="capitalize text-slate-900">{role || 'guest'}</strong>) does not have permission to access this section of the Gate Pass system.
          </p>

          <div className="mt-7 flex flex-col gap-3">
            <Link
              to={role ? `/${role}/dashboard` : '/login'}
              className={`${buttonPrimary} w-full py-3`}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {currentUser ? 'Go to My Dashboard' : 'Go to Sign In'}
            </Link>

            {currentUser && (
              <button
                type="button"
                onClick={handleSwitchAccount}
                className={`${buttonSecondary} w-full py-2.5`}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign Out / Switch Account
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default UnauthorizedPage;
