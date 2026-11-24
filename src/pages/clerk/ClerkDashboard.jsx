import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import StatusBadge from '../../components/common/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { clerkApi } from '../../api/clerk.api';
import { PASS_STATUS } from '../../utils/constants';
import { formatDate } from '../../utils/dateUtils';
import { buttonPrimary, buttonSecondary, card, focusRing, input } from '../../utils/uiStyles';
import {
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Check,
  X,
  Eye,
  AlertTriangle,
  ChevronRight,
  Keyboard,
  ShieldAlert,
} from 'lucide-react';

const REJECTION_PRESETS = [
  'Parent confirmation required',
  'Exam / class schedule conflict',
  'Incomplete destination details',
  'Past campus curfew hours',
];

function getInitials(name) {
  if (!name) return 'ST';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

function getSlaBadgeInfo(createdAt, isEmergency, nowMs) {
  if (!createdAt) return { label: 'Waiting', urgent: Boolean(isEmergency) };
  const createdMs = new Date(createdAt).getTime();
  if (Number.isNaN(createdMs)) return { label: 'Waiting', urgent: Boolean(isEmergency) };
  const diffMins = Math.max(0, Math.floor((nowMs - createdMs) / 60000));
  let label = `${diffMins}m`;
  if (diffMins >= 60 * 24) {
    const days = Math.floor(diffMins / (60 * 24));
    const hrs = Math.floor((diffMins % (60 * 24)) / 60);
    label = hrs > 0 ? `${days}d ${hrs}h` : `${days}d`;
  } else if (diffMins >= 60) {
    const hrs = Math.floor(diffMins / 60);
    label = `${hrs}h`;
  }
  return {
    label: `Waiting ${label}`,
    urgent: Boolean(isEmergency) || diffMins >= 120,
  };
}

function sortPendingQueue(list) {
  return [...list].sort((a, b) => {
    const emergencyDiff = Number(Boolean(b.isEmergency)) - Number(Boolean(a.isEmergency));
    if (emergencyDiff !== 0) return emergencyDiff;
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeA - timeB;
  });
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

const ClerkDashboard = () => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const [processingIds, setProcessingIds] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showShortcutHint, setShowShortcutHint] = useState(false);

  const [approvingPass, setApprovingPass] = useState(null);
  const [approveRemarks, setApproveRemarks] = useState('');

  const [rejectingPass, setRejectingPass] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [bulkModalAction, setBulkModalAction] = useState(null); // 'approve' | 'reject' | null
  const [bulkRemarks, setBulkRemarks] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await clerkApi.getAllRequests();
        if (!cancelled) {
          setPasses(Array.isArray(data) ? data : []);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || 'Unable to load clerk queue.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const pendingPasses = sortPendingQueue(
    passes.filter((p) => p.status === PASS_STATUS.PENDING)
  );
  const approvedCount = passes.filter(
    (p) => p.status === PASS_STATUS.APPROVED || p.status === PASS_STATUS.USED
  ).length;
  const rejectedCount = passes.filter((p) => p.status === PASS_STATUS.REJECTED).length;

  const isAnyModalOpen = Boolean(approvingPass || rejectingPass || bulkModalAction);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) {
        return;
      }
      if (isAnyModalOpen) return;

      const key = e.key.toLowerCase();
      if (key === '?') {
        e.preventDefault();
        setShowShortcutHint((prev) => !prev);
        return;
      }
      if (pendingPasses.length === 0) return;

      const safeIndex = Math.min(activeIndex, pendingPasses.length - 1);
      const currentPass = pendingPasses[safeIndex];

      if (key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(Math.min(safeIndex + 1, pendingPasses.length - 1));
      } else if (key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(Math.max(safeIndex - 1, 0));
      } else if (key === 'a' && currentPass && !processingIds[currentPass.id]) {
        e.preventDefault();
        setApprovingPass(currentPass);
        setApproveRemarks('');
      } else if (key === 'r' && currentPass && !processingIds[currentPass.id]) {
        e.preventDefault();
        setRejectingPass(currentPass);
        setRejectionReason('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, isAnyModalOpen, pendingPasses, processingIds]);

  const handleRetry = () => {
    setLoading(true);
    setError('');
    setRefreshKey((k) => k + 1);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === pendingPasses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingPasses.map((p) => p.id));
    }
  };

  const toggleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirmApprove = async () => {
    if (!approvingPass) return;
    const id = approvingPass.id;
    const studentName = approvingPass.studentName;
    setProcessingIds((prev) => ({ ...prev, [id]: true }));
    try {
      await clerkApi.approveRequest(
        id,
        currentUser,
        approveRemarks.trim() || 'Approved via Clerk Dashboard'
      );
      addToast(`Gate Pass (${id}) for ${studentName} has been APPROVED!`, 'success');
      setApprovingPass(null);
      setApproveRemarks('');
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      setRefreshKey((k) => k + 1);
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Failed to approve request', 'error');
    } finally {
      setProcessingIds((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingPass) return;
    if (!rejectionReason.trim()) {
      addToast('Please specify a rejection reason.', 'warning');
      return;
    }
    const id = rejectingPass.id;
    setProcessingIds((prev) => ({ ...prev, [id]: true }));
    try {
      await clerkApi.rejectRequest(id, currentUser, rejectionReason.trim());
      addToast(`Gate Pass (${id}) REJECTED.`, 'info');
      setRejectingPass(null);
      setRejectionReason('');
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      setRefreshKey((k) => k + 1);
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Failed to reject pass', 'error');
    } finally {
      setProcessingIds((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleConfirmBulkAction = async () => {
    if (!bulkModalAction || selectedIds.length === 0) return;
    if (bulkModalAction === 'reject' && !bulkRemarks.trim()) {
      addToast('Please enter a rejection reason for bulk rejection.', 'warning');
      return;
    }
    setBulkProcessing(true);
    try {
      await clerkApi.bulkAction({
        ids: selectedIds,
        action: bulkModalAction,
        remarks: bulkModalAction === 'approve' ? bulkRemarks.trim() || 'Bulk approved by clerk' : undefined,
        rejectionReason: bulkModalAction === 'reject' ? bulkRemarks.trim() : undefined,
        clerkUser: currentUser,
      });
      addToast(
        `${selectedIds.length} pass request(s) ${bulkModalAction === 'approve' ? 'approved' : 'rejected'}.`,
        bulkModalAction === 'approve' ? 'success' : 'info'
      );
      setBulkModalAction(null);
      setBulkRemarks('');
      setSelectedIds([]);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Bulk action failed', 'error');
    } finally {
      setBulkProcessing(false);
    }
  };

  return (
    <DashboardLayout
      title={`Clerk Portal - ${currentUser?.name || 'Administrator'}`}
      subtitle="Review pending student gate pass applications and issue digital campus out-passes."
      action={
        <button
          type="button"
          onClick={() => setShowShortcutHint((prev) => !prev)}
          className={buttonSecondary}
        >
          <Keyboard className="h-4 w-4 text-orange-700" />
          Shortcuts (?)
        </button>
      }
    >
      {loading ? (
        <LoadingSpinner label="Loading clerk workspace data..." />
      ) : error ? (
        <ErrorState
          title="Unable to Load Clerk Workspace"
          description={error}
          onRetry={handleRetry}
        />
      ) : (
        <div className="space-y-6">
          {showShortcutHint && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-xs text-slate-800">
              <div className="flex flex-wrap items-center gap-4">
                <span className="font-semibold text-orange-900">Keyboard Triage Shortcuts:</span>
                <span><kbd className="rounded-md border border-slate-300 bg-white px-1.5 py-0.5 font-mono font-semibold">J</kbd> / <kbd className="rounded-md border border-slate-300 bg-white px-1.5 py-0.5 font-mono font-semibold">K</kbd> Navigate rows</span>
                <span><kbd className="rounded-md border border-slate-300 bg-white px-1.5 py-0.5 font-mono font-semibold">A</kbd> Approve focused</span>
                <span><kbd className="rounded-md border border-slate-300 bg-white px-1.5 py-0.5 font-mono font-semibold">R</kbd> Reject focused</span>
                <span><kbd className="rounded-md border border-slate-300 bg-white px-1.5 py-0.5 font-mono font-semibold">?</kbd> Toggle hint</span>
              </div>
              <button
                type="button"
                onClick={() => setShowShortcutHint(false)}
                className={`rounded-md p-1 text-slate-600 hover:bg-orange-100 ${focusRing}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              title="Pending Review"
              value={pendingPasses.length}
              icon={Clock}
              accent
              description="Emergency requests prioritized"
            />
            <StatTile
              title="Approved Passes"
              value={approvedCount}
              icon={CheckCircle2}
              accent
              description="Approved & active passes"
            />
            <StatTile
              title="Rejected Passes"
              value={rejectedCount}
              icon={XCircle}
              description="Denied passes"
            />
            <StatTile
              title="Total Requests"
              value={passes.length}
              icon={FileText}
              description="All time log"
            />
          </div>

          <div className={`${card} p-6`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Pending Gate Pass Requests</h3>
                <p className="text-xs text-slate-500">
                  Sorted with Emergency requests first, then longest waiting SLA
                </p>
              </div>
              <Link
                to="/clerk/pending-requests"
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-orange-800 hover:bg-orange-50 ${focusRing}`}
              >
                View All Pending <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {selectedIds.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-orange-200 bg-orange-50 px-4 py-3">
                <span className="text-xs font-semibold text-orange-900">
                  {selectedIds.length} pending request(s) selected
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkRemarks('');
                      setBulkModalAction('approve');
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-md bg-orange-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-800 ${focusRing}`}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Bulk Approve ({selectedIds.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkRemarks('');
                      setBulkModalAction('reject');
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 ${focusRing}`}
                  >
                    <X className="h-3.5 w-3.5" />
                    Bulk Reject ({selectedIds.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className={`rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 ${focusRing}`}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {pendingPasses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
                      <th className="w-10 px-3 py-3">
                        <input
                          type="checkbox"
                          aria-label="Select all pending passes"
                          checked={selectedIds.length === pendingPasses.length && pendingPasses.length > 0}
                          onChange={toggleSelectAll}
                          className={`h-4 w-4 cursor-pointer rounded-md border-slate-300 text-orange-700 ${focusRing}`}
                        />
                      </th>
                      <th className="px-4 py-3">Pass & SLA</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Reason & Destination</th>
                      <th className="px-4 py-3">Requested Exit</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {pendingPasses.map((p, idx) => {
                      const sla = getSlaBadgeInfo(p.createdAt, p.isEmergency, nowMs);
                      const isRowBusy = Boolean(processingIds[p.id]);
                      const isFocused = idx === Math.min(activeIndex, pendingPasses.length - 1);
                      return (
                        <tr
                          key={p.id}
                          onClick={() => setActiveIndex(idx)}
                          className={isFocused ? 'bg-orange-50' : 'hover:bg-slate-50'}
                        >
                          <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              aria-label={`Select pass ${p.id}`}
                              checked={selectedIds.includes(p.id)}
                              onChange={() => toggleSelectRow(p.id)}
                              className={`h-4 w-4 cursor-pointer rounded-md border-slate-300 text-orange-700 ${focusRing}`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className="block font-mono text-xs font-semibold text-slate-900">{p.id}</span>
                            <span
                              className={`mt-1 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                                sla.urgent
                                  ? 'border-orange-200 bg-orange-50 text-orange-800'
                                  : 'border-slate-200 bg-slate-100 text-slate-700'
                              }`}
                            >
                              <Clock className="h-2.5 w-2.5" />
                              {sla.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {p.photo ? (
                                <img
                                  src={p.photo}
                                  alt={p.studentName}
                                  className="h-7 w-7 rounded-md border border-slate-200 object-cover"
                                />
                              ) : (
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-900 text-[10px] font-bold text-white">
                                  {getInitials(p.studentName)}
                                </div>
                              )}
                              <div>
                                <span className="block text-xs font-semibold text-slate-900">{p.studentName}</span>
                                <span className="text-[10px] text-slate-500">
                                  {p.rollNumber} - {p.department}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <span className="block text-xs font-semibold text-slate-800">{p.reason}</span>
                              <span className="text-[11px] text-slate-500">{p.destination}</span>
                              {p.isEmergency && (
                                <span className="ml-1 inline-flex items-center gap-0.5 rounded-md border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-orange-800">
                                  <ShieldAlert className="h-2.5 w-2.5" />
                                  EMERGENCY
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">
                            {formatDate(p.exitDate)} ({p.exitTime})
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={p.status} size="sm" />
                          </td>
                          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => navigate(`/clerk/request-details?id=${p.id}`)}
                                className={`rounded-md bg-slate-100 p-1.5 text-slate-700 hover:bg-slate-200 ${focusRing}`}
                                title="Review Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                disabled={isRowBusy}
                                onClick={() => {
                                  setApprovingPass(p);
                                  setApproveRemarks('');
                                }}
                                className={`inline-flex items-center gap-1 rounded-md bg-orange-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-800 disabled:opacity-50 ${focusRing}`}
                              >
                                <Check className="h-3.5 w-3.5" />
                                {isRowBusy ? 'Working...' : 'Approve'}
                              </button>
                              <button
                                type="button"
                                disabled={isRowBusy}
                                onClick={() => {
                                  setRejectingPass(p);
                                  setRejectionReason('');
                                }}
                                className={`inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 ${focusRing}`}
                              >
                                <X className="h-3.5 w-3.5" />
                                Reject
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
              <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 py-10 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-orange-700" />
                <p className="text-sm font-semibold text-slate-800">All caught up!</p>
                <p className="mt-1 text-xs text-slate-500">There are no pending gate pass requests waiting for review.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        isOpen={Boolean(approvingPass)}
        onClose={() => setApprovingPass(null)}
        title={`Confirm Approval (${approvingPass?.id})`}
      >
        <div className="space-y-4">
          <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-xs text-orange-900">
            <p className="font-semibold">
              Approve gate pass for {approvingPass?.studentName} ({approvingPass?.rollNumber})?
            </p>
            <p className="mt-0.5 text-slate-700">
              {approvingPass?.reason} - {approvingPass?.destination}
            </p>
          </div>
          <div>
            <label htmlFor="approveRemarks" className="mb-1 block text-xs font-semibold text-slate-700">
              Clerk Remarks (Optional)
            </label>
            <textarea
              id="approveRemarks"
              rows={2}
              value={approveRemarks}
              onChange={(e) => setApproveRemarks(e.target.value)}
              placeholder="e.g. Verified parent call / Return before 08:30 PM"
              className={input}
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setApprovingPass(null)}
              className={buttonSecondary}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmApprove}
              disabled={approvingPass ? Boolean(processingIds[approvingPass.id]) : false}
              className={buttonPrimary}
            >
              <Check className="h-4 w-4" />
              {approvingPass && processingIds[approvingPass.id] ? 'Approving...' : 'Confirm Approval'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(rejectingPass)}
        onClose={() => setRejectingPass(null)}
        title={`Reject Gate Pass (${rejectingPass?.id})`}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-md border border-orange-200 bg-orange-50 p-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-700" />
            <div className="text-xs text-orange-900">
              <p className="font-semibold">Student: {rejectingPass?.studentName}</p>
              <p className="mt-0.5">Please specify an official reason for rejecting this out-pass request.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {REJECTION_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setRejectionReason(preset)}
                className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold ${
                  rejectionReason === preset
                    ? 'border-orange-700 bg-orange-700 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                } ${focusRing}`}
              >
                {preset}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="rejectionReason" className="mb-1 block text-xs font-semibold text-slate-700">
              Reason for Rejection *
            </label>
            <textarea
              id="rejectionReason"
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Parent approval missing / Invalid leave date / Exam scheduled"
              className={`${input} mt-1`}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setRejectingPass(null)}
              className={buttonSecondary}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmReject}
              disabled={rejectingPass ? Boolean(processingIds[rejectingPass.id]) : false}
              className={`inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 ${focusRing}`}
            >
              {rejectingPass && processingIds[rejectingPass.id] ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(bulkModalAction)}
        onClose={() => setBulkModalAction(null)}
        title={
          bulkModalAction === 'approve'
            ? `Bulk Approve ${selectedIds.length} Request(s)`
            : `Bulk Reject ${selectedIds.length} Request(s)`
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            {bulkModalAction === 'approve'
              ? `All ${selectedIds.length} selected pending gate passes will be approved and issued QR codes.`
              : `Provide an official rejection reason applied to all ${selectedIds.length} selected passes.`}
          </p>

          {bulkModalAction === 'reject' && (
            <div className="flex flex-wrap gap-1.5">
              {REJECTION_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setBulkRemarks(preset)}
                  className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold ${
                    bulkRemarks === preset
                      ? 'border-orange-700 bg-orange-700 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  } ${focusRing}`}
                >
                  {preset}
                </button>
              ))}
            </div>
          )}

          <div>
            <label htmlFor="bulkRemarksInput" className="mb-1 block text-xs font-semibold text-slate-700">
              {bulkModalAction === 'approve' ? 'Clerk Remarks (Optional)' : 'Rejection Reason *'}
            </label>
            <textarea
              id="bulkRemarksInput"
              rows={3}
              value={bulkRemarks}
              onChange={(e) => setBulkRemarks(e.target.value)}
              placeholder={
                bulkModalAction === 'approve'
                  ? 'Optional remarks for approved batch...'
                  : 'Enter reason for bulk rejection...'
              }
              className={input}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setBulkModalAction(null)}
              disabled={bulkProcessing}
              className={buttonSecondary}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmBulkAction}
              disabled={bulkProcessing}
              className={
                bulkModalAction === 'approve'
                  ? buttonPrimary
                  : `inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 ${focusRing}`
              }
            >
              {bulkProcessing
                ? 'Processing...'
                : bulkModalAction === 'approve'
                ? 'Approve Selected'
                : 'Reject Selected'}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default ClerkDashboard;
