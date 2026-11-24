import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { COLLEGE_INFO } from '../../utils/constants';
import { buttonPrimary, buttonSecondary, focusRing } from '../../utils/uiStyles';
import BrandMark from '../../components/common/BrandMark';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';

const NotFoundPage = () => {
  const { currentUser, role } = useAuth();
  const dashboardPath = role ? `/${role}/dashboard` : '/login';

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
          <Link to={currentUser ? dashboardPath : '/login'} className={buttonSecondary}>
            {currentUser ? 'My Dashboard' : 'Sign In'}
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md rounded-md border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-orange-700">
            <FileQuestion className="h-8 w-8" aria-hidden="true" />
          </div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            <span>404</span>
            <span>Page Not Found</span>
          </div>
          <h1 className="mb-2 text-xl font-bold tracking-tight text-slate-900">
            This route does not exist
          </h1>
          <p className="text-sm font-medium leading-relaxed text-slate-600">
            The page you requested may have moved or the URL may be mistyped. Return to your portal or the campus home page.
          </p>

          <div className="mt-7 flex flex-col gap-3">
            {currentUser ? (
              <Link to={dashboardPath} className={`${buttonPrimary} w-full py-3`}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Go to My Dashboard
              </Link>
            ) : (
              <Link to="/login" className={`${buttonPrimary} w-full py-3`}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Sign In to Portal
              </Link>
            )}
            <Link to="/" className={`${buttonSecondary} w-full py-2.5`}>
              <Home className="h-4 w-4" aria-hidden="true" />
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotFoundPage;
