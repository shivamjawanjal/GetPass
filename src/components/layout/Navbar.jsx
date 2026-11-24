import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { COLLEGE_INFO, ROLES } from '../../utils/constants';
import { focusRing } from '../../utils/uiStyles';
import BrandMark from '../common/BrandMark';
import NotificationCenter from '../common/NotificationCenter';
import { LogOut, Shield, User, ChevronDown, UserCheck, Menu, Search } from 'lucide-react';

function getInitials(name) {
  if (!name) return 'U';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const Navbar = ({ onOpenMobileMenu, mobileMenuOpen = false, onOpenCommandPalette }) => {
  const { currentUser, role, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState(null); // null | 'notifications' | 'role' | 'profile'
  const [avatarFailed, setAvatarFailed] = useState(false);
  const menusRef = useRef(null);

  useEffect(() => {
    if (!activeMenu) return undefined;

    const handlePointerDown = (e) => {
      if (menusRef.current && !menusRef.current.contains(e.target)) {
        setActiveMenu(null);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveMenu(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMenu]);

  const toggleMenu = (menuName) => {
    setActiveMenu((prev) => (prev === menuName ? null : menuName));
  };

  const handleLogout = async () => {
    setActiveMenu(null);
    await logout();
    navigate('/login');
  };

  const handleRoleSwitch = async (targetRole) => {
    setActiveMenu(null);
    await switchRole(targetRole);
    navigate(`/${targetRole}/dashboard`);
  };

  const showAvatarImg = Boolean(currentUser?.avatar) && !avatarFailed;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-2">
          {/* Left: Mobile Drawer Toggle + Brand */}
          <div className="flex items-center gap-2.5">
            {currentUser && onOpenMobileMenu && (
              <button
                type="button"
                onClick={onOpenMobileMenu}
                aria-label="Open navigation menu"
                aria-expanded={mobileMenuOpen}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-orange-700 md:hidden ${focusRing}`}
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
            )}

            <Link to="/" className={`flex items-center gap-3 rounded-md ${focusRing}`}>
              <BrandMark />
              <span>
                <span className="block text-sm font-bold leading-tight tracking-tight text-slate-900">
                  Digital Gate Pass
                </span>
                <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:block">
                  {COLLEGE_INFO.name}
                </span>
              </span>
            </Link>
          </div>

          {/* Right: Command Palette, Notifications, Role Switcher, Profile */}
          {currentUser ? (
            <div ref={menusRef} className="flex items-center gap-2 sm:gap-3">
              {onOpenCommandPalette && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenu(null);
                    onOpenCommandPalette();
                  }}
                  aria-label="Open quick search (Ctrl+K)"
                  className={`inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-orange-700 sm:px-3 ${focusRing}`}
                >
                  <Search className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                  <span className="hidden sm:inline">Quick Search</span>
                  <kbd className="hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-500 lg:inline">
                    Ctrl+K
                  </kbd>
                </button>
              )}

              <NotificationCenter
                isOpen={activeMenu === 'notifications'}
                onToggle={() => toggleMenu('notifications')}
                onClose={() => setActiveMenu(null)}
              />

              {/* Demo Role Switcher Dropdown */}
              <div className="relative hidden md:block">
                <button
                  type="button"
                  onClick={() => toggleMenu('role')}
                  aria-haspopup="menu"
                  aria-expanded={activeMenu === 'role'}
                  className={`inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 ${focusRing}`}
                >
                  <UserCheck className="h-3.5 w-3.5 text-orange-700" aria-hidden="true" />
                  <span>Switch Role ({role?.toUpperCase()})</span>
                  <ChevronDown className="h-3 w-3 text-slate-500" aria-hidden="true" />
                </button>

                {activeMenu === 'role' && (
                  <div
                    role="menu"
                    aria-label="Demo role switcher"
                    className="absolute right-0 z-40 mt-2 w-52 rounded-md border border-slate-200 bg-white py-1.5 shadow-sm"
                  >
                    <div className="mb-1 border-b border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Demo Role Switcher
                    </div>
                    {Object.values(ROLES).map((r) => (
                      <button
                        key={r}
                        type="button"
                        role="menuitem"
                        onClick={() => handleRoleSwitch(r)}
                        className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium capitalize hover:bg-slate-100 ${focusRing} ${
                          role === r ? 'font-bold text-orange-700' : 'text-slate-700'
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${role === r ? 'bg-orange-700' : 'bg-slate-300'}`}
                          aria-hidden="true"
                        />
                        {r} Portal
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => toggleMenu('profile')}
                  aria-haspopup="menu"
                  aria-expanded={activeMenu === 'profile'}
                  className={`flex items-center gap-2.5 rounded-md border border-transparent p-1 pr-2 hover:border-slate-200 hover:bg-slate-100 ${focusRing}`}
                >
                  {showAvatarImg ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      onError={() => setAvatarFailed(true)}
                      className="h-8 w-8 rounded-md border border-slate-300 object-cover"
                    />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white">
                      {getInitials(currentUser.name)}
                    </span>
                  )}
                  <span className="hidden text-left sm:block">
                    <span className="block text-xs font-semibold leading-none text-slate-900">
                      {currentUser.name}
                    </span>
                    <span className="mt-0.5 block text-[10px] font-medium text-slate-500">
                      {currentUser.rollNumber || currentUser.email}
                    </span>
                  </span>
                  <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-700">
                    {role}
                  </span>
                </button>

                {activeMenu === 'profile' && (
                  <div
                    role="menu"
                    aria-label="Account menu"
                    className="absolute right-0 z-40 mt-2 w-56 rounded-md border border-slate-200 bg-white py-2 shadow-sm"
                  >
                    <div className="border-b border-slate-200 px-4 py-2.5">
                      <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                      <p className="mt-0.5 truncate text-[10px] text-slate-500">{currentUser.email}</p>
                    </div>

                    {role === ROLES.STUDENT && (
                      <Link
                        to="/student/profile"
                        role="menuitem"
                        onClick={() => setActiveMenu(null)}
                        className={`flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-orange-700 ${focusRing}`}
                      >
                        <User className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                        My Profile
                      </Link>
                    )}

                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className={`mt-1 flex w-full items-center gap-2.5 border-t border-slate-200 px-4 py-2 text-left text-xs font-semibold text-slate-900 hover:bg-slate-100 ${focusRing}`}
                    >
                      <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Link
              to="/login"
              className={`inline-flex items-center gap-2 rounded-md bg-orange-700 px-5 py-2 text-sm font-bold text-white hover:bg-orange-800 ${focusRing}`}
            >
              <Shield className="h-4 w-4" aria-hidden="true" />
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
