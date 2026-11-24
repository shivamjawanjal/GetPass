import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { COLLEGE_INFO } from '../../utils/constants';
import { focusRing } from '../../utils/uiStyles';
import BrandMark from '../../components/common/BrandMark';
import { FOOTER_LINKS, LEGAL_PAGES } from './landingContent';

const LegalPage = ({ page }) => {
  const { currentUser, role } = useAuth();
  const content = LEGAL_PAGES[page];
  const authTarget = currentUser && role ? `/${role}/dashboard` : '/login';
  const authLabel = currentUser && role ? 'Go to Dashboard' : 'Sign in';

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className={`flex items-center gap-2.5 rounded-md ${focusRing}`}>
            <BrandMark compact />
            <span className="flex flex-col">
              <span className="text-sm font-semibold leading-tight text-slate-900">Digital Gate Pass</span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                {COLLEGE_INFO.shortName} campus
              </span>
            </span>
          </Link>
          <Link
            to={authTarget}
            className={`rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-orange-700 hover:text-orange-700 ${focusRing}`}
          >
            {authLabel}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <Link to="/" className={`inline-flex rounded text-xs font-medium text-orange-700 hover:text-orange-800 ${focusRing}`}>
          Back to home
        </Link>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900">{content.title}</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">{content.intro}</p>

        <div className="mt-10 space-y-8">
          {content.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-base font-semibold text-slate-900">{section.heading}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{section.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-600">
          Questions about this page?{' '}
          <a href={`mailto:${COLLEGE_INFO.email}`} className={`rounded font-medium text-orange-700 hover:text-orange-800 ${focusRing}`}>
            {COLLEGE_INFO.email}
          </a>
        </div>
      </main>

      <footer className="border-t border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <BrandMark compact />
              <div>
                <p className="text-sm font-semibold text-white">Digital Gate Pass</p>
                <p className="mt-1 text-xs text-slate-400">{COLLEGE_INFO.name}</p>
              </div>
            </div>
            <div className="flex flex-col gap-1 text-xs text-slate-400 sm:items-end">
              <a href={`mailto:${COLLEGE_INFO.email}`} className={`hover:text-white ${focusRing}`}>
                {COLLEGE_INFO.email}
              </a>
              <span>{COLLEGE_INFO.phone}</span>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Copyright {new Date().getFullYear()} {COLLEGE_INFO.shortName}. All rights reserved.
            </p>
            <nav aria-label="Footer navigation" className="flex flex-wrap gap-5">
              <Link to="/" className={`rounded text-xs font-medium text-slate-400 hover:text-white ${focusRing}`}>
                Home
              </Link>
              {FOOTER_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`rounded text-xs font-medium text-slate-400 hover:text-white ${focusRing}`}
                >
                  {link.label}
                </Link>
              ))}
              <Link to={authTarget} className={`rounded text-xs font-medium text-slate-400 hover:text-white ${focusRing}`}>
                {authLabel}
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LegalPage;
