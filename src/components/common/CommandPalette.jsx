import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../utils/constants';
import { focusRing } from '../../utils/uiStyles';
import {
  Search,
  LayoutDashboard,
  PlusCircle,
  FileText,
  QrCode,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  Scan,
  History,
  Users,
  UserCheck,
  ShieldAlert,
  ListFilter,
  BarChart3,
  Home,
  LogOut,
  CornerDownLeft,
  X,
  Keyboard,
} from 'lucide-react';

function getRoleCommands(role) {
  switch (role) {
    case ROLES.STUDENT:
      return [
        { id: 'nav-student-dash', group: 'Navigation', label: 'Student Dashboard', subtitle: 'Overview and active pass status', path: '/student/dashboard', icon: LayoutDashboard },
        { id: 'act-student-new', group: 'Quick Actions', label: 'Request New Gate Pass', subtitle: 'Submit a new out-pass application', path: '/student/create-request', icon: PlusCircle },
        { id: 'nav-student-req', group: 'Navigation', label: 'My Requests', subtitle: 'Track and filter submitted passes', path: '/student/my-requests', icon: FileText },
        { id: 'act-student-qr', group: 'Quick Actions', label: 'View Approved QR Pass', subtitle: 'Open digital pass for gate scanning', path: '/student/approved-pass', icon: QrCode },
        { id: 'nav-student-profile', group: 'Navigation', label: 'Student Profile', subtitle: 'Update contact and hostel details', path: '/student/profile', icon: User },
      ];
    case ROLES.CLERK:
      return [
        { id: 'nav-clerk-dash', group: 'Navigation', label: 'Clerk Dashboard', subtitle: 'Review summary and urgent requests', path: '/clerk/dashboard', icon: LayoutDashboard },
        { id: 'act-clerk-pending', group: 'Quick Actions', label: 'Review Pending Queue', subtitle: 'Approve or reject waiting student passes', path: '/clerk/pending-requests', icon: Clock },
        { id: 'nav-clerk-approved', group: 'Navigation', label: 'Approved Passes', subtitle: 'Browse approved out-passes', path: '/clerk/approved-requests', icon: CheckCircle2 },
        { id: 'nav-clerk-rejected', group: 'Navigation', label: 'Rejected Passes', subtitle: 'Review declined pass requests', path: '/clerk/rejected-requests', icon: XCircle },
      ];
    case ROLES.GUARD:
      return [
        { id: 'nav-guard-dash', group: 'Navigation', label: 'Guard Dashboard', subtitle: 'Gate shift activity and recent logs', path: '/guard/dashboard', icon: LayoutDashboard },
        { id: 'act-guard-scan', group: 'Quick Actions', label: 'Open QR Scanner', subtitle: 'Verify student exit or return pass', path: '/guard/scan', icon: Scan },
        { id: 'nav-guard-history', group: 'Navigation', label: 'Scan History', subtitle: 'Inspect recorded gate verification logs', path: '/guard/scan-history', icon: History },
      ];
    case ROLES.ADMIN:
      return [
        { id: 'nav-admin-dash', group: 'Navigation', label: 'Admin Dashboard', subtitle: 'Campus-wide metrics and system health', path: '/admin/dashboard', icon: LayoutDashboard },
        { id: 'nav-admin-students', group: 'Navigation', label: 'Manage Students', subtitle: 'Directory, onboarding, and account status', path: '/admin/students', icon: Users },
        { id: 'nav-admin-clerks', group: 'Navigation', label: 'Manage Clerks', subtitle: 'Hostel review staff accounts', path: '/admin/clerks', icon: UserCheck },
        { id: 'nav-admin-guards', group: 'Navigation', label: 'Manage Guards', subtitle: 'Security gate personnel accounts', path: '/admin/guards', icon: ShieldAlert },
        { id: 'nav-admin-passes', group: 'Navigation', label: 'Gate Passes Register', subtitle: 'Audit every pass across campus', path: '/admin/gate-passes', icon: ListFilter },
        { id: 'act-admin-reports', group: 'Quick Actions', label: 'Analytics & Reports', subtitle: 'View trends and export gate logs', path: '/admin/reports', icon: BarChart3 },
      ];
    default:
      return [];
  }
}

const CommandPaletteInner = ({ onClose }) => {
  const { role, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, []);

  const allCommands = useMemo(() => {
    const roleCommands = getRoleCommands(role);
    const general = [
      { id: 'nav-home', group: 'General', label: 'Campus Home Page', subtitle: 'Return to public overview', path: '/', icon: Home },
      { id: 'act-logout', group: 'General', label: 'Sign Out', subtitle: 'End current portal session', action: 'logout', icon: LogOut },
    ];
    return [...roleCommands, ...general];
  }, [role]);

  const filteredCommands = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return allCommands;
    return allCommands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(trimmed) ||
        cmd.subtitle.toLowerCase().includes(trimmed) ||
        cmd.group.toLowerCase().includes(trimmed)
    );
  }, [allCommands, query]);

  const safeActiveIndex = filteredCommands.length > 0 ? Math.min(activeIndex, filteredCommands.length - 1) : 0;

  const executeCommand = async (cmd) => {
    if (!cmd) return;
    onClose();
    if (cmd.action === 'logout') {
      await logout();
      navigate('/login');
      return;
    }
    if (cmd.path) {
      navigate(cmd.path);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredCommands.length > 0) {
        setActiveIndex((prev) => (prev + 1) % filteredCommands.length);
      }
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredCommands.length > 0) {
        setActiveIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      }
      return;
    }
    if (e.key === 'Enter' && filteredCommands[safeActiveIndex]) {
      e.preventDefault();
      executeCommand(filteredCommands[safeActiveIndex]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/75 px-4 pt-16 sm:pt-24"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick command palette"
        onKeyDown={handleKeyDown}
        className="w-full max-w-xl overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm"
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-orange-700" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Jump to a page or run an action..."
            aria-label="Search pages and actions"
            className="w-full bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close command palette"
            className={`rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 ${focusRing}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Command List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filteredCommands.length > 0 ? (
            <ul role="listbox" aria-label="Available commands" className="space-y-1">
              {filteredCommands.map((cmd, index) => {
                const Icon = cmd.icon;
                const isSelected = index === safeActiveIndex;
                return (
                  <li key={cmd.id} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => executeCommand(cmd)}
                      className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left ${focusRing} ${
                        isSelected
                          ? 'bg-orange-700 text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Icon
                          className={`h-4 w-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-500'}`}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className={`truncate text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                            {cmd.label}
                          </p>
                          <p className={`truncate text-[11px] ${isSelected ? 'text-orange-100' : 'text-slate-500'}`}>
                            {cmd.subtitle}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            isSelected
                              ? 'bg-orange-800 text-white'
                              : 'border border-slate-200 bg-slate-50 text-slate-500'
                          }`}
                        >
                          {cmd.group}
                        </span>
                        {isSelected && <CornerDownLeft className="h-3.5 w-3.5 text-white" aria-hidden="true" />}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="py-10 text-center">
              <p className="text-sm font-semibold text-slate-800">No matching commands</p>
              <p className="mt-1 text-xs text-slate-500">Try searching for dashboard, requests, scan, or reports.</p>
            </div>
          )}
        </div>

        {/* Keyboard Shortcuts Guide */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <Keyboard className="h-3.5 w-3.5 text-orange-700" aria-hidden="true" />
            <span>Shortcuts</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span>
              <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-800">
                Up/Down
              </kbd>{' '}
              Navigate
            </span>
            <span>
              <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-800">
                Enter
              </kbd>{' '}
              Open
            </span>
            <span>
              <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-800">
                Esc
              </kbd>{' '}
              Close
            </span>
            {role === ROLES.CLERK && (
              <span>
                <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-800">
                  J/K/A/R
                </kbd>{' '}
                Queue triage
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const CommandPalette = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return <CommandPaletteInner onClose={onClose} />;
};

export default CommandPalette;
