import React, { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../utils/constants';
import { focusRing } from '../../utils/uiStyles';
import {
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
  ShieldAlert,
  UserCheck,
  BarChart3,
  ListFilter,
  X,
  LogOut,
} from 'lucide-react';

function getMenuItems(role) {
  switch (role) {
    case ROLES.STUDENT:
      return [
        { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
        { label: 'Create Gate Pass', path: '/student/create-request', icon: PlusCircle },
        { label: 'My Requests', path: '/student/my-requests', icon: FileText },
        { label: 'Approved Pass', path: '/student/approved-pass', icon: QrCode },
        { label: 'Profile', path: '/student/profile', icon: User },
      ];
    case ROLES.CLERK:
      return [
        { label: 'Dashboard', path: '/clerk/dashboard', icon: LayoutDashboard },
        { label: 'Pending Requests', path: '/clerk/pending-requests', icon: Clock },
        { label: 'Approved Passes', path: '/clerk/approved-requests', icon: CheckCircle2 },
        { label: 'Rejected Passes', path: '/clerk/rejected-requests', icon: XCircle },
      ];
    case ROLES.GUARD:
      return [
        { label: 'Dashboard', path: '/guard/dashboard', icon: LayoutDashboard },
        { label: 'Scan QR Code', path: '/guard/scan', icon: Scan },
        { label: 'Scan History', path: '/guard/scan-history', icon: History },
      ];
    case ROLES.ADMIN:
      return [
        { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'Manage Students', path: '/admin/students', icon: Users },
        { label: 'Manage Clerks', path: '/admin/clerks', icon: UserCheck },
        { label: 'Manage Guards', path: '/admin/guards', icon: ShieldAlert },
        { label: 'Gate Passes Register', path: '/admin/gate-passes', icon: ListFilter },
        { label: 'Analytics & Reports', path: '/admin/reports', icon: BarChart3 },
      ];
    default:
      return [];
  }
}

const SidebarNavContent = ({ role, menuItems, onNavigate }) => (
  <>
    <div className="p-4 pb-2">
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
        <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-widest text-slate-500">
          Active Workspace
        </span>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-orange-700" aria-hidden="true" />
          <span className="text-xs font-bold capitalize text-slate-900">{role} Portal</span>
        </div>
      </div>
    </div>

    <nav aria-label="Portal navigation" className="flex-1 space-y-0.5 px-3 py-2">
      <p className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-500">
        Navigation
      </p>
      {menuItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2.5 text-xs font-semibold ${focusRing} ${
                isActive
                  ? 'bg-orange-700 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-orange-700'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  </>
);

const Sidebar = ({ mobileOpen = false, onClose }) => {
  const { role, switchRole, logout } = useAuth();
  const navigate = useNavigate();
  const menuItems = getMenuItems(role);

  useEffect(() => {
    if (!mobileOpen) return undefined;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow || 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileOpen, onClose]);

  const handleMobileRoleSwitch = async (targetRole) => {
    await switchRole(targetRole);
    if (onClose) onClose();
    navigate(`/${targetRole}/dashboard`);
  };

  const handleMobileLogout = async () => {
    if (onClose) onClose();
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden min-h-[calc(100vh-4rem)] w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <SidebarNavContent role={role} menuItems={menuItems} />
        <div className="border-t border-slate-200 p-4">
          <p className="text-center text-[9px] font-medium tracking-wide text-slate-500">
            SXIET Digital Gate Pass v2.0
          </p>
        </div>
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 flex md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
        >
          <div
            className="fixed inset-0 bg-slate-900/75"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside className="relative z-10 flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5">
              <span className="text-sm font-bold tracking-tight text-slate-900">Portal Menu</span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close navigation menu"
                className={`rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-orange-700 ${focusRing}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <SidebarNavContent role={role} menuItems={menuItems} onNavigate={onClose} />

            {/* Accessible Mobile Role Switcher */}
            <div className="border-t border-slate-200 px-3 py-3">
              <p className="px-2 pb-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">
                Demo Role Switcher
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.values(ROLES).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleMobileRoleSwitch(r)}
                    className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-xs font-semibold capitalize ${focusRing} ${
                      role === r
                        ? 'border-orange-700 bg-orange-50 text-orange-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${role === r ? 'bg-orange-700' : 'bg-slate-300'}`}
                      aria-hidden="true"
                    />
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200 p-3">
              <button
                type="button"
                onClick={handleMobileLogout}
                className={`flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100 ${focusRing}`}
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
