import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import StatusBadge from '../../components/common/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { studentApi } from '../../api/student.api';
import { PASS_STATUS } from '../../utils/constants';
import { formatDate } from '../../utils/dateUtils';
import { buttonPrimary, card, focusRing } from '../../utils/uiStyles';
import {
  PlusCircle,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  QrCode,
  Eye,
  ShieldAlert,
  Home,
  Stethoscope,
  ShoppingBag,
  Briefcase,
  ChevronRight,
  RotateCcw,
  Timer,
  LogOut,
} from 'lucide-react';

function parseScheduleTimestamp(dateStr, timeStr) {
  if (!dateStr) return null;
  if (!timeStr) {
    const d = new Date(`${dateStr}T23:59:59`);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }
  const trimmed = String(timeStr).trim();
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = Number(match12[1]);
    const minutes = Number(match12[2]);
    const meridiem = match12[3].toUpperCase();
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const d = new Date(`${dateStr}T${hh}:${mm}:00`);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match24) {
    const hh = String(match24[1]).padStart(2, '0');
    const mm = String(match24[2]).padStart(2, '0');
    const d = new Date(`${dateStr}T${hh}:${mm}:00`);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }
  const fallback = new Date(`${dateStr} ${trimmed}`);
  return Number.isNaN(fallback.getTime()) ? null : fallback.getTime();
}

function getValidityStatus(pass, nowMs) {
  if (!pass) return null;
  let targetMs = pass.validUntil ? new Date(pass.validUntil).getTime() : NaN;
  if (Number.isNaN(targetMs)) {
    targetMs = parseScheduleTimestamp(pass.returnDate, pass.returnTime);
  }
  if (!targetMs || Number.isNaN(targetMs)) return null;

  const diffMs = targetMs - nowMs;
  const absMins = Math.floor(Math.abs(diffMs) / 60000);
  const days = Math.floor(absMins / (60 * 24));
  const hours = Math.floor((absMins % (60 * 24)) / 60);
  const mins = absMins % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${mins}m`);
  const formatted = parts.join(' ');

  if (diffMs <= 0) {
    return {
      isExpired: true,
      label: `Validity window ended ${formatted} ago`,
    };
  }
  return {
    isExpired: false,
    isUrgent: diffMs < 60 * 60 * 1000,
    label: `Valid for ${formatted}`,
  };
}

const StatTile = ({ title, value, icon: Icon, description, accent = false }) => (
  <div className={`${card} p-5`}>
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{title}</p>
        <h3 className="mt-1.5 text-3xl font-semibold leading-none tracking-tight text-slate-900">{value}</h3>
      </div>
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border ${
          accent
            ? 'border-orange-200 bg-orange-50 text-orange-700'
            : 'border-slate-200 bg-slate-50 text-slate-600'
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
    </div>
    <p className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-500">{description}</p>
  </div>
);

const StudentDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!currentUser?.id) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const data = await studentApi.getMyRequests(currentUser.id);
        if (!cancelled) {
          setRequests(Array.isArray(data) ? data : []);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || 'Unable to load your gate passes.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, refreshKey]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleRetry = () => {
    setLoading(true);
    setError('');
    setRefreshKey((k) => k + 1);
  };

  const handleQuickReapply = (pass) => {
    navigate('/student/create-request', {
      state: {
        prefill: {
          reason: pass.reason,
          destination: pass.destination,
          remarks: pass.remarks || '',
          isEmergency: Boolean(pass.isEmergency),
          guardianContact: pass.guardianContact || '',
        },
      },
    });
  };

  const activeApprovedPass = requests.find((r) => r.status === PASS_STATUS.APPROVED);
  const checkedOutPass = requests.find((r) => r.status === PASS_STATUS.USED);

  const activeValidity = getValidityStatus(activeApprovedPass, nowMs);
  const checkedOutValidity = getValidityStatus(checkedOutPass, nowMs);

  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === PASS_STATUS.PENDING).length;
  const approvedCount = requests.filter((r) => r.status === PASS_STATUS.APPROVED).length;
  const rejectedCount = requests.filter((r) => r.status === PASS_STATUS.REJECTED).length;

  const recentRequests = requests.slice(0, 5);

  const quickTemplates = [
    {
      title: 'Home Visit',
      reason: 'Home Visit / Weekend Leave',
      destination: 'Home Address',
      icon: Home,
    },
    {
      title: 'Medical Checkup',
      reason: 'Medical Emergency',
      destination: 'City Hospital',
      icon: Stethoscope,
    },
    {
      title: 'Shopping / Market',
      reason: 'Personal Reason',
      destination: 'City Center Mall',
      icon: ShoppingBag,
    },
    {
      title: 'Internship / Project',
      reason: 'Project Work / Internship',
      destination: 'Tech Park / Industry Site',
      icon: Briefcase,
    },
  ];

  return (
    <DashboardLayout
      title={`Welcome back, ${currentUser?.name?.split(' ')[0] || 'Student'}`}
      subtitle="Manage your campus gate passes, request leave approvals, and access digital QR passes."
      action={
        <Link to="/student/create-request" className={buttonPrimary}>
          <PlusCircle className="h-4 w-4" />
          Create New Gate Pass
        </Link>
      }
    >
      {loading ? (
        <LoadingSpinner label="Loading dashboard..." />
      ) : error ? (
        <ErrorState
          title="Unable to Load Student Dashboard"
          description={error}
          onRetry={handleRetry}
        />
      ) : (
        <div className="space-y-6">
          {activeApprovedPass && (
            <div className="rounded-md border border-orange-800 bg-orange-700 p-6 text-white shadow-sm">
              <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-md border border-orange-800 bg-orange-800 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide">
                      Active Digital Pass
                    </span>
                    <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-xs font-semibold text-white">
                      {activeApprovedPass.id}
                    </span>
                    {activeValidity && (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-orange-300 bg-white px-2.5 py-0.5 text-xs font-semibold text-orange-800">
                        <Timer className="h-3.5 w-3.5" />
                        {activeValidity.label}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-semibold tracking-tight">Leave: {activeApprovedPass.reason}</h2>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-orange-50">
                    <span><strong>Destination:</strong> {activeApprovedPass.destination}</span>
                    <span><strong>Exit:</strong> {formatDate(activeApprovedPass.exitDate)} ({activeApprovedPass.exitTime})</span>
                    <span><strong>Return:</strong> {formatDate(activeApprovedPass.returnDate)} ({activeApprovedPass.returnTime})</span>
                  </div>
                </div>
                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate(`/student/approved-pass?id=${activeApprovedPass.id}`)}
                    className={`inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-xs font-semibold text-orange-800 hover:bg-slate-50 ${focusRing}`}
                  >
                    <QrCode className="h-4 w-4 text-orange-700" />
                    Show QR Code
                  </button>
                </div>
              </div>
            </div>
          )}

          {checkedOutPass && (
            <div className="rounded-md border border-slate-300 bg-slate-900 p-5 text-white shadow-sm">
              <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-orange-300">
                      <LogOut className="h-3.5 w-3.5" />
                      Checked Out at Gate
                    </span>
                    <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono text-xs font-semibold text-white">
                      {checkedOutPass.id}
                    </span>
                    {checkedOutValidity && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-semibold ${
                          checkedOutValidity.isExpired
                            ? 'bg-orange-700 text-white'
                            : 'bg-slate-800 text-slate-200'
                        }`}
                      >
                        <Timer className="h-3.5 w-3.5" />
                        {checkedOutValidity.isExpired
                          ? 'Return window elapsed - check in at gate'
                          : checkedOutValidity.label}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white">
                    {checkedOutPass.reason} - {checkedOutPass.destination}
                  </p>
                  <p className="text-xs text-slate-300">
                    Expected return by {formatDate(checkedOutPass.returnDate)} at {checkedOutPass.returnTime}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/student/approved-pass?id=${checkedOutPass.id}`)}
                  className={`inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-700 ${focusRing}`}
                >
                  <Eye className="h-4 w-4" />
                  View Pass Record
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              title="Total Requests"
              value={totalCount}
              icon={FileText}
              accent
              description="All submitted passes"
            />
            <StatTile
              title="Pending Review"
              value={pendingCount}
              icon={Clock}
              description="Awaiting clerk approval"
            />
            <StatTile
              title="Ready at Gate"
              value={approvedCount}
              icon={CheckCircle2}
              accent
              description="Approved & active QR passes"
            />
            <StatTile
              title="Rejected Requests"
              value={rejectedCount}
              icon={XCircle}
              description="Pass requests denied"
            />
          </div>

          <div className={`${card} p-6`}>
            <div className="mb-5">
              <h3 className="text-sm font-semibold tracking-tight text-slate-900">Quick Pass Presets</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Select a common reason for instant leave application
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {quickTemplates.map((tmpl, idx) => {
                const Icon = tmpl.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      navigate(
                        `/student/create-request?reason=${encodeURIComponent(tmpl.reason)}&destination=${encodeURIComponent(tmpl.destination)}`
                      )
                    }
                    className={`flex items-start gap-3 rounded-md border border-slate-200 bg-white p-4 text-left hover:bg-slate-50 ${focusRing}`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-orange-200 bg-orange-50 text-orange-700">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-xs font-semibold text-slate-900">{tmpl.title}</span>
                      <span className="mt-0.5 block text-[10px] text-slate-500">Click to apply preset</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col items-start justify-between gap-4 rounded-md border border-orange-200 bg-orange-50 p-5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-orange-700 text-white">
                <ShieldAlert className="h-5 w-5" />
              </span>
              <div className="text-xs text-orange-900">
                <h4 className="mb-1 text-sm font-semibold text-slate-900">Hostel & Gate Security Rules</h4>
                <p className="leading-relaxed text-slate-600">
                  Standard campus entry curfew is strictly <strong className="text-orange-800">08:30 PM</strong>. Digital QR passes must be presented to the guard at both exit and return. Late returns trigger security audit flags.
                </p>
              </div>
            </div>
          </div>

          <div className={`${card} p-6`}>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-slate-900">Recent Gate Pass Applications</h3>
                <p className="mt-0.5 text-xs text-slate-500">Your latest leave requests and their current status</p>
              </div>
              <Link
                to="/student/my-requests"
                className={`inline-flex items-center gap-1 rounded-md bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-800 hover:bg-orange-100 ${focusRing}`}
              >
                View All <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentRequests.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                      <th className="px-4 py-3">Pass ID</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3">Destination</th>
                      <th className="px-4 py-3">Exit Date & Time</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {recentRequests.map((req) => {
                      const canReapply =
                        req.status !== PASS_STATUS.PENDING && req.status !== PASS_STATUS.APPROVED;
                      return (
                        <tr key={req.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-900">{req.id}</td>
                          <td className="px-4 py-3.5 text-xs font-semibold text-slate-800">
                            {req.reason}
                            {req.isEmergency && (
                              <span className="ml-2 inline-flex items-center rounded-md border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-orange-800">
                                Emergency
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-600">{req.destination}</td>
                          <td className="px-4 py-3.5 text-xs text-slate-600">
                            {formatDate(req.exitDate)} at {req.exitTime}
                          </td>
                          <td className="px-4 py-3.5">
                            <StatusBadge status={req.status} size="sm" />
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {req.status === PASS_STATUS.APPROVED && (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/student/approved-pass?id=${req.id}`)}
                                  className={`inline-flex items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-semibold text-orange-800 hover:bg-orange-100 ${focusRing}`}
                                >
                                  <QrCode className="h-3 w-3" />
                                  QR Code
                                </button>
                              )}
                              {canReapply && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickReapply(req)}
                                  className={`inline-flex items-center gap-1 rounded-md border border-orange-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-orange-800 hover:bg-orange-50 ${focusRing}`}
                                  title="Re-apply with same reason and destination"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  Quick Re-apply
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => navigate(`/student/approved-pass?id=${req.id}`)}
                                className={`inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 ${focusRing}`}
                              >
                                <Eye className="h-3 w-3" />
                                View
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 py-12 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-md border border-orange-200 bg-orange-50 text-orange-700">
                  <FileText className="h-7 w-7" />
                </div>
                <p className="text-sm font-semibold text-slate-800">No gate passes yet</p>
                <p className="mt-1 text-xs text-slate-500">Submit your first request to get started.</p>
                <Link
                  to="/student/create-request"
                  className={`mt-5 inline-flex items-center gap-2 rounded-md bg-orange-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-orange-800 ${focusRing}`}
                >
                  <PlusCircle className="h-4 w-4" />
                  Create Pass Request
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default StudentDashboard;
