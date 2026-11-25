import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  ClipboardCheck,
  Clock3,
  FileText,
  GraduationCap,
  Menu,
  ScanLine,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { COLLEGE_INFO } from '../../utils/constants';
import { focusRing } from '../../utils/uiStyles';
import BrandMark from '../../components/common/BrandMark';
import {
  AUDIT_ROWS,
  FOOTER_LINKS,
  GATE_CHECKS,
  GATE_PREVIEW,
  HERO_COPY,
  NAV_LINKS,
  REQUEST_PREVIEW,
  ROLE_CARDS,
  WORKFLOW_STEPS,
} from './landingContent';

const ROLE_ICONS = { GraduationCap, ClipboardCheck, ScanLine, ShieldCheck };
const WORKFLOW_ICONS = [FileText, ClipboardCheck, ScanLine];

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function TimelineDot({ state }) {
  const styles = {
    done: 'border-orange-700 bg-orange-700 text-white',
    current: 'border-orange-700 bg-white text-orange-700',
    upcoming: 'border-slate-300 bg-white text-slate-300',
  };

  return (
    <span
      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${styles[state]}`}
      aria-hidden="true"
    >
      {state === 'done' ? <Check className="h-2.5 w-2.5" /> : <span className="h-1 w-1 rounded-full bg-current" />}
    </span>
  );
}

function RequestPreviewCard() {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-orange-700" />
          <span className="text-sm font-semibold text-slate-900">{REQUEST_PREVIEW.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Stage 1</span>
          <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
            {REQUEST_PREVIEW.status}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between px-5 pt-4 text-[11px] font-medium uppercase tracking-wide text-slate-500">
        <span>Reference</span>
        <span className="font-mono tracking-normal text-slate-600">{REQUEST_PREVIEW.reference}</span>
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-3.5 px-5 py-3.5 sm:grid-cols-2">
        {REQUEST_PREVIEW.fields.map((field) => (
          <div key={field.label}>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{field.label}</dt>
            <dd className="mt-0.5 text-sm font-medium text-slate-800">{field.value}</dd>
          </div>
        ))}
      </dl>

      <div className="border-t border-slate-200 bg-slate-50 px-5 py-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Request timeline</p>
        <ol className="mt-2.5 space-y-2.5">
          {REQUEST_PREVIEW.timeline.map((item) => (
            <li key={item.title} className="flex items-start gap-3">
              <TimelineDot state={item.state} />
              <div>
                <p className="text-xs font-medium text-slate-800">{item.title}</p>
                <p className="text-[11px] text-slate-500">{item.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function GatePreviewCard() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ScanLine className="h-4 w-4 text-orange-700" />
          <span className="text-sm font-semibold text-slate-900">{GATE_PREVIEW.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-700">Stage 2</span>
          <span className="rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-800">
            {GATE_PREVIEW.result}
          </span>
        </div>
      </div>

      <dl className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {GATE_PREVIEW.rows.map((row) => (
          <div key={row.label}>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{row.label}</dt>
            <dd className="mt-0.5 text-xs font-semibold text-slate-800">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-[11px] text-slate-500">
        <span className="font-mono text-slate-600">{GATE_PREVIEW.reference}</span>
        <span>{GATE_PREVIEW.footer}</span>
      </div>
    </div>
  );
}

function RoleCard({ role }) {
  const Icon = ROLE_ICONS[role.icon];

  return (
    <article className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <span className="flex h-9 w-9 items-center justify-center rounded-md border border-orange-100 bg-orange-50 text-orange-700">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">{role.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{role.description}</p>
      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
        <p className="text-[11px] font-semibold text-slate-800">{role.ui.label}</p>
        <p className="mt-1 text-[11px] text-slate-500">{role.ui.detail}</p>
      </div>
    </article>
  );
}

function AuditCard() {
  const statusBadgeStyles = {
    Valid: 'border-orange-200 bg-orange-50 text-orange-800',
    Approved: 'border-slate-300 bg-slate-100 text-slate-800',
    Pending: 'border-slate-200 bg-white text-slate-600',
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-orange-700" />
          <span className="text-sm font-semibold text-slate-900">Recent gate activity</span>
        </div>
        <span className="text-[11px] font-medium text-slate-500">Live campus log</span>
      </div>
      <div className="divide-y divide-slate-200">
        {AUDIT_ROWS.map((row) => (
          <div key={`${row.time}-${row.student}`} className="grid grid-cols-[64px_1fr_auto] items-center gap-3 px-5 py-3.5">
            <span className="font-mono text-[11px] text-slate-500">{row.time}</span>
            <div>
              <p className="text-xs font-medium text-slate-800">{row.student}</p>
              <p className="text-[11px] text-slate-500">{row.action}</p>
            </div>
            <span
              className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${statusBadgeStyles[row.status] || 'border-slate-200 bg-slate-50 text-slate-600'}`}
            >
              {row.status}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-[11px] text-slate-500">
        Records shown to authorised campus staff only.
      </div>
    </div>
  );
}

function SiteHeader({ dashboardPath }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <Link to="/" className={`flex items-center gap-3 rounded-md ${focusRing}`}>
          <BrandMark />
          <span className="flex flex-col">
            <span className="text-sm font-semibold leading-tight text-slate-900">Digital Gate Pass</span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              {COLLEGE_INFO.shortName} campus
            </span>
          </span>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`rounded text-sm font-medium text-slate-600 hover:text-orange-700 ${focusRing}`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to={dashboardPath || '/login'}
            className={`hidden rounded-md border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-800 hover:border-orange-700 hover:text-orange-700 md:inline-flex ${focusRing}`}
          >
            {dashboardPath ? 'Go to Dashboard' : 'Sign in'}
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            aria-controls="landing-mobile-nav"
            className={`inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 md:hidden ${focusRing}`}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div
          id="landing-mobile-nav"
          className="border-t border-slate-200 bg-white px-4 py-4 md:hidden"
        >
          <nav aria-label="Mobile navigation" className="flex flex-col gap-2">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-orange-700 ${focusRing}`}
              >
                {link.label}
              </a>
            ))}
            <Link
              to={dashboardPath || '/login'}
              onClick={() => setMobileOpen(false)}
              className={`mt-2 inline-flex items-center justify-center gap-2 rounded-md bg-orange-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-800 ${focusRing}`}
            >
              {dashboardPath ? 'Go to Dashboard' : 'Sign in'}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

function Hero({ dashboardPath }) {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-12 lg:items-start lg:gap-12 lg:px-10 lg:py-16">
        <div className="lg:col-span-6 lg:pt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">{HERO_COPY.eyebrow}</p>
          <h1 className="mt-4 max-w-xl text-3xl font-semibold leading-[1.14] tracking-tight text-slate-900 sm:text-4xl lg:text-[44px]">
            {HERO_COPY.headline}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">{HERO_COPY.description}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to={dashboardPath || HERO_COPY.primaryCta.to}
              className={`inline-flex items-center justify-center gap-2 rounded-md bg-orange-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-800 ${focusRing}`}
            >
              {dashboardPath ? 'Go to Dashboard' : HERO_COPY.primaryCta.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={HERO_COPY.secondaryCta.href}
              className={`inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 ${focusRing}`}
            >
              {HERO_COPY.secondaryCta.label}
            </a>
          </div>

          <p className="mt-5 max-w-xl text-xs leading-5 text-slate-500">{HERO_COPY.note}</p>

          <dl className="mt-8 grid grid-cols-1 gap-3 border-t border-slate-200 pt-6 sm:grid-cols-3">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Requests</dt>
              <dd className="mt-1 text-xs font-medium text-slate-800">Digital out-pass forms</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Approvals</dt>
              <dd className="mt-1 text-xs font-medium text-slate-800">Hostel clerk review queue</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Verification</dt>
              <dd className="mt-1 text-xs font-medium text-slate-800">Signed QR gate checks</dd>
            </div>
          </dl>
        </div>

        <div className="space-y-4 lg:col-span-6">
          <RequestPreviewCard />
          <GatePreviewCard />
        </div>
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section id="how-it-works" className="border-b border-slate-200 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <SectionHeading
          eyebrow="How it works"
          title="From leave request to logged exit"
          description="Three connected steps, with real-time status visible to everyone who needs it."
        />
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {WORKFLOW_STEPS.map((step, index) => {
            const Icon = WORKFLOW_ICONS[index];
            return (
              <li
                key={step.number}
                className="flex flex-col rounded-lg border border-slate-200 bg-slate-50/70 p-5 sm:p-6"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <span className="text-xs font-semibold tracking-[0.16em] text-orange-700">{step.number}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Step</span>
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
                <div className="mt-auto pt-5">
                  <div className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-xs">
                    <Icon className="h-3.5 w-3.5 text-slate-500" />
                    {step.ui}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function RolesSection() {
  return (
    <section id="roles" className="bg-slate-50 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <SectionHeading
          eyebrow="Built for the whole process"
          title="One system for each desk involved"
          description="The request, the approval and the gate check stay connected, so staff never have to reconcile a paper register with a phone call."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ROLE_CARDS.map((role) => (
            <RoleCard key={role.title} role={role} />
          ))}
        </div>
      </div>
    </section>
  );
}

function GateChecksSection() {
  return (
    <section id="gate-checks" className="border-t border-slate-200 bg-white py-16 sm:py-20">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-10">
        <div>
          <SectionHeading
            eyebrow={GATE_CHECKS.eyebrow}
            title={GATE_CHECKS.title}
            description={GATE_CHECKS.description}
          />
          <ul className="mt-6 space-y-3">
            {GATE_CHECKS.points.map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                <Check className="mt-1 h-4 w-4 shrink-0 text-orange-700" />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <AuditCard />
      </div>
    </section>
  );
}

function CallToAction({ dashboardPath }) {
  return (
    <section className="border-t border-slate-200 bg-slate-50 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-6 rounded-lg border border-slate-200 bg-white p-8 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              Use the campus portal
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Sign in with the account issued by the college. If you need access, contact the portal administrator.
            </p>
          </div>
          <Link
            to={dashboardPath || '/login'}
            className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-orange-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-800 ${focusRing}`}
          >
            {dashboardPath ? 'Go to Dashboard' : 'Sign in to portal'}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function SiteFooter({ dashboardPath }) {
  return (
    <footer className="border-t border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-8 border-b border-slate-800 pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <BrandMark compact />
            <div>
              <p className="text-sm font-semibold text-white">Digital Gate Pass</p>
              <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">{COLLEGE_INFO.name}</p>
              <p className="mt-1 text-xs text-slate-400">{COLLEGE_INFO.address}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 text-xs text-slate-400 sm:items-end">
            <a href={`mailto:${COLLEGE_INFO.email}`} className={`hover:text-white ${focusRing}`}>
              {COLLEGE_INFO.email}
            </a>
            <span>{COLLEGE_INFO.phone}</span>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Copyright {new Date().getFullYear()} {COLLEGE_INFO.shortName}. All rights reserved.
          </p>
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-5">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`rounded text-xs font-medium text-slate-400 hover:text-white ${focusRing}`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to={dashboardPath || '/login'}
              className={`rounded text-xs font-medium text-slate-400 hover:text-white ${focusRing}`}
            >
              {dashboardPath ? 'Go to Dashboard' : 'Sign in'}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

const LandingPage = () => {
  const { currentUser, role } = useAuth();
  const dashboardPath = currentUser && role ? `/${role}/dashboard` : null;

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <SiteHeader dashboardPath={dashboardPath} />
      <main className="flex-1">
        <Hero dashboardPath={dashboardPath} />
        <WorkflowSection />
        <RolesSection />
        <GateChecksSection />
        <CallToAction dashboardPath={dashboardPath} />
      </main>
      <SiteFooter dashboardPath={dashboardPath} />
    </div>
  );
};

export default LandingPage;
