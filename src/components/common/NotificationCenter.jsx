import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, AlertTriangle, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { ROLES, PASS_STATUS } from '../../utils/constants';
import { studentApi } from '../../api/student.api';
import { clerkApi } from '../../api/clerk.api';
import { guardApi } from '../../api/guard.api';
import { adminApi } from '../../api/admin.api';
import { focusRing } from '../../utils/uiStyles';

async function loadRoleAlerts(role, currentUser) {
  if (!currentUser || !role) return [];

  if (role === ROLES.STUDENT) {
    const passes = await studentApi.getMyRequests(currentUser.id);
    if (!Array.isArray(passes)) return [];
    const alerts = [];

    for (const p of passes) {
      if (p.status === PASS_STATUS.APPROVED) {
        alerts.push({
          id: `st-app-${p.id}`,
          title: 'Gate pass approved',
          detail: `${p.destination || 'Campus exit'} - QR ready for gate verification`,
          path: `/student/approved-pass?id=${p.id}`,
          type: 'accent',
          icon: CheckCircle2,
        });
      } else if (p.status === PASS_STATUS.PENDING) {
        alerts.push({
          id: `st-pen-${p.id}`,
          title: 'Pass awaiting clerk review',
          detail: `${p.destination || p.reason || 'Out-pass request'} submitted`,
          path: '/student/my-requests',
          type: 'neutral',
          icon: Clock,
        });
      } else if (p.status === PASS_STATUS.REJECTED) {
        alerts.push({
          id: `st-rej-${p.id}`,
          title: 'Pass request rejected',
          detail: p.rejectionReason || p.destination || 'Check review remarks',
          path: '/student/my-requests',
          type: 'neutral',
          icon: AlertTriangle,
        });
      }
      if (alerts.length >= 5) break;
    }
    return alerts;
  }

  if (role === ROLES.CLERK) {
    const pending = await clerkApi.getPendingRequests();
    if (!Array.isArray(pending)) return [];
    const sorted = [...pending].sort((a, b) => Number(Boolean(b.isEmergency)) - Number(Boolean(a.isEmergency)));
    return sorted.slice(0, 5).map((p) => ({
      id: `cl-pen-${p.id}`,
      title: p.isEmergency ? 'Emergency pass awaiting review' : 'Pending pass request',
      detail: `${p.studentName || 'Student'} - ${p.destination || p.reason || 'Out-pass'}`,
      path: `/clerk/request-details?id=${p.id}`,
      type: p.isEmergency ? 'accent' : 'neutral',
      icon: p.isEmergency ? AlertTriangle : Clock,
    }));
  }

  if (role === ROLES.GUARD) {
    const scans = await guardApi.getScanHistory();
    if (!Array.isArray(scans)) return [];
    return scans.slice(0, 5).map((scan, idx) => {
      const isInvalid = String(scan.result).toUpperCase() === 'INVALID';
      return {
        id: `gd-scan-${scan.id || idx}`,
        title: isInvalid ? 'Invalid scan flagged at gate' : 'Gate verification recorded',
        detail: `${scan.studentName || 'Unknown'} (${scan.rollNumber || 'N/A'}) - ${scan.notes || scan.gate || 'Main Gate'}`,
        path: '/guard/scan-history',
        type: isInvalid ? 'accent' : 'neutral',
        icon: isInvalid ? ShieldAlert : CheckCircle2,
      };
    });
  }

  if (role === ROLES.ADMIN) {
    const stats = await adminApi.getDashboardStats();
    if (!stats) return [];
    const alerts = [];
    if (stats.pendingPasses > 0) {
      alerts.push({
        id: 'ad-pending',
        title: `${stats.pendingPasses} pending pass request${stats.pendingPasses === 1 ? '' : 's'}`,
        detail: 'Open the gate passes register to inspect queue status',
        path: '/admin/gate-passes',
        type: 'accent',
        icon: Clock,
      });
    }
    alerts.push({
      id: 'ad-scans',
      title: `${stats.totalScans || 0} total gate scans logged`,
      detail: `${stats.approvedPasses || 0} active approved passes across campus`,
      path: '/admin/reports',
      type: 'neutral',
      icon: CheckCircle2,
    });
    return alerts;
  }

  return [];
}

const NotificationCenter = ({ isOpen, onToggle, onClose }) => {
  const { currentUser, role } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [readIds, setReadIds] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchAlerts = async () => {
      if (!currentUser || !role) {
        setAlerts([]);
        return;
      }
      setLoading(true);
      try {
        const items = await loadRoleAlerts(role, currentUser);
        if (!cancelled) {
          setAlerts(items);
        }
      } catch {
        if (!cancelled) {
          setAlerts([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchAlerts();
    return () => {
      cancelled = true;
    };
  }, [currentUser, role, isOpen]);

  const unreadCount = alerts.filter((a) => !readIds.includes(a.id)).length;

  const markAllRead = () => {
    setReadIds(alerts.map((a) => a.id));
  };

  const handleAlertClick = (alert) => {
    if (!readIds.includes(alert.id)) {
      setReadIds((prev) => [...prev, alert.id]);
    }
    onClose();
    if (alert.path) {
      navigate(alert.path);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        className={`relative flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-orange-700 ${focusRing}`}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-700 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="region"
          aria-label="Notifications"
          className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm sm:w-96"
        >
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-xs font-bold text-slate-900">Notifications</p>
              <p className="text-[11px] text-slate-500 capitalize">{role} portal alerts</p>
            </div>
            {alerts.length > 0 && unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-orange-700 hover:bg-orange-50 ${focusRing}`}
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 divide-y divide-slate-200 overflow-y-auto">
            {loading && alerts.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs font-medium text-slate-500">
                Checking portal alerts...
              </div>
            ) : alerts.length > 0 ? (
              alerts.map((alert) => {
                const Icon = alert.icon || Bell;
                const isRead = readIds.includes(alert.id);
                return (
                  <button
                    key={alert.id}
                    type="button"
                    onClick={() => handleAlertClick(alert)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 ${focusRing} ${
                      isRead ? 'bg-white opacity-75' : 'bg-orange-50/40'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
                        alert.type === 'accent'
                          ? 'border-orange-200 bg-orange-50 text-orange-700'
                          : 'border-slate-200 bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-bold text-slate-900">{alert.title}</p>
                        {!isRead && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-orange-700" aria-hidden="true" />
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-600">{alert.detail}</p>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-xs font-bold text-slate-800">All caught up</p>
                <p className="mt-1 text-[11px] text-slate-500">No active alerts for your {role} portal.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
