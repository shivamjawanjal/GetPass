import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { clerkApi } from '../../api/clerk.api';
import { formatDate } from '../../utils/dateUtils';
import { badge, buttonPrimary, buttonSecondary, card, focusRing, input } from '../../utils/uiStyles';
import {
  Check,
  X,
  Eye,
  Clock,
  Search,
  Keyboard,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
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

const PendingRequestsPage = () => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [pendingPasses, setPendingPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const [searchTerm, setSearchTerm] = useState('');
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [processingIds, setProcessingIds] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showShortcutHint, setShowShortcutHint] = useState(false);

  const [approvingPass, setApprovingPass] = useState(null);
  const [approveRemarks, setApproveRemarks] = useState('');

  const [rejectingPass, setRejectingPass] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [bulkModalAction, setBulkModalAction] = useState(null);
  const [bulkRemarks, setBulkRemarks] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await clerkApi.getPendingRequests();
        if (!cancelled) {
          setPendingPasses(sortPendingQueue(Array.isArray(data) ? data : []));
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || 'Failed to load pending passes.');
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

  const filteredPasses = pendingPasses.filter((row) => {
    if (emergencyOnly && !row.isEmergency) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.trim().toLowerCase();
    return [row.id, row.studentName, row.rollNumber, row.department, row.reason, row.destination]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  const totalPages = Math.max(1, Math.ceil(filteredPasses.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const paginatedPasses = filteredPasses.slice(startIdx, startIdx + pageSize);

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
      if (paginatedPasses.length === 0) return;

      const safeIdx = Math.min(activeIndex, paginatedPasses.length - 1);
      const currentPass = paginatedPasses[safeIdx];

      if (key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(Math.min(safeIdx + 1, paginatedPasses.length - 1));
      } else if (key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(Math.max(safeIdx - 1, 0));
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
  }, [activeIndex, isAnyModalOpen, paginatedPasses, processingIds]);

  const handleRetry = () => {
    setLoading(true);
    setError('');
    setRefreshKey((k) => k + 1);
  };

  const toggleSelectAll = () => {
    const pageIds = paginatedPasses.map((p) => p.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
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
    const name = approvingPass.studentName;
    setProcessingIds((prev) => ({ ...prev, [id]: true }));
    try {
      await clerkApi.approveRequest(
        id,
        currentUser,
        approveRemarks.trim() || 'Approved via Clerk Pending Queue'
      );
      addToast(`Gate Pass (${id}) for ${name} APPROVED!`, 'success');
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
      addToast('Please provide a rejection reason', 'warning');
      return;
    }
    const id = rejectingPass.id;
    setProcessingIds((prev) => ({ ...prev, [id]: true }));
    try {
      await clerkApi.rejectRequest(id, currentUser, rejectionReason.trim());
      addToast(`Pass (${id}) REJECTED`, 'info');
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
      addToast('Please specify a rejection reason for bulk rejection.', 'warning');
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
        `${selectedIds.length} request(s) ${bulkModalAction === 'approve' ? 'approved' : 'rejected'}.`,
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
      title="Pending Gate Pass Requests"
      subtitle="Emergency requests are sorted to the top with live SLA wait-time indicators."
      action={
        <button
          type="button"
          onClick={() => setShowShortcutHint((prev) => !prev)}
          className={buttonSecondary}
        >
          <Keyboard className="h-4 w-4 text-orange-700" />
          Triage Shortcuts (?)
        </button>
      }
    >
      {loading ? (
        <LoadingSpinner label="Loading pending requests..." />
      ) : error ? (
        <ErrorState
          title="Unable to Load Pending Queue"
          description={error}
          onRetry={handleRetry}
        />
      ) : (
        <div className="space-y-4">
          {showShortcutHint && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-xs text-slate-800">
              <div className="flex flex-wrap items-center gap-4">
                <span className="font-semibold text-orange-900">Keyboard Triage:</span>
                <span><kbd className="rounded-md border border-slate-300 bg-white px-1.5 py-0.5 font-mono font-semibold">J</kbd> / <kbd className="rounded-md border border-slate-300 bg-white px-1.5 py-0.5 font-mono font-semibold">K</kbd> Move row</span>
                <span><kbd className="rounded-md border border-slate-300 bg-white px-1.5 py-0.5 font-mono font-semibold">A</kbd> Approve row</span>
                <span><kbd className="rounded-md border border-slate-300 bg-white px-1.5 py-0.5 font-mono font-semibold">R</kbd> Reject row</span>
                <span><kbd className="rounded-md border border-slate-300 bg-white px-1.5 py-0.5 font-mono font-semibold">?</kbd> Toggle help</span>
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

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-orange-200 bg-orange-50 px-4 py-3">
              <span className="text-xs font-semibold text-orange-900">
                {selectedIds.length} request(s) selected for batch processing
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

          <div className={`${card} overflow-hidden`}>
            <div className="flex flex-col items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search pending passes by student, roll no, or reason..."
                  className={`w-full rounded-md border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-orange-700 focus:ring-2 focus:ring-orange-700 ${focusRing}`}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmergencyOnly((prev) => !prev);
                    setCurrentPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold ${
                    emergencyOnly
                      ? 'border-orange-700 bg-orange-700 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  } ${focusRing}`}
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Emergency Only
                </button>
                <span className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                  {filteredPasses.length > 0 ? startIdx + 1 : 0} - {Math.min(startIdx + pageSize, filteredPasses.length)} of {filteredPasses.length}
                </span>
              </div>
            </div>

            {paginatedPasses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      <th className="w-10 px-3 py-3.5">
                        <input
                          type="checkbox"
                          aria-label="Select all passes on current page"
                          checked={
                            paginatedPasses.length > 0 &&
                            paginatedPasses.every((p) => selectedIds.includes(p.id))
                          }
                          onChange={toggleSelectAll}
                          className={`h-4 w-4 cursor-pointer rounded-md border-slate-300 text-orange-700 ${focusRing}`}
                        />
                      </th>
                      <th className="px-4 py-3.5">Pass ID & SLA</th>
                      <th className="px-4 py-3.5">Student Info</th>
                      <th className="px-4 py-3.5">Reason & Destination</th>
                      <th className="px-4 py-3.5">Exit / Return Schedule</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
                    {paginatedPasses.map((row, idx) => {
                      const sla = getSlaBadgeInfo(row.createdAt, row.isEmergency, nowMs);
                      const isRowBusy = Boolean(processingIds[row.id]);
                      const isFocused = idx === Math.min(activeIndex, paginatedPasses.length - 1);
                      return (
                        <tr
                          key={row.id}
                          onClick={() => setActiveIndex(idx)}
                          className={isFocused ? 'bg-orange-50' : 'hover:bg-slate-50'}
                        >
                          <td className="px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              aria-label={`Select pass ${row.id}`}
                              checked={selectedIds.includes(row.id)}
                              onChange={() => toggleSelectRow(row.id)}
                              className={`h-4 w-4 cursor-pointer rounded-md border-slate-300 text-orange-700 ${focusRing}`}
                            />
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`${badge} inline-block font-mono font-semibold`}>
                              {row.id}
                            </span>
                            <div className="mt-1">
                              <span
                                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                                  sla.urgent
                                    ? 'border-orange-200 bg-orange-50 text-orange-800'
                                    : 'border-slate-200 bg-slate-100 text-slate-700'
                                }`}
                              >
                                <Clock className="h-2.5 w-2.5" />
                                {sla.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              {row.photo ? (
                                <img
                                  src={row.photo}
                                  alt={row.studentName}
                                  className="h-8 w-8 rounded-md border border-slate-200 object-cover"
                                />
                              ) : (
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-900 text-[10px] font-bold text-white">
                                  {getInitials(row.studentName)}
                                </div>
                              )}
                              <div>
                                <span className="block text-xs font-semibold text-slate-900">{row.studentName}</span>
                                <span className="text-[10px] text-slate-500">
                                  Roll: {row.rollNumber} | {row.department}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div>
                              <span className="block text-xs font-semibold text-slate-800">{row.reason}</span>
                              <span className="text-[11px] text-slate-500">{row.destination}</span>
                              {row.isEmergency && (
                                <span className="ml-1 inline-flex items-center gap-0.5 rounded-md border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-orange-800">
                                  <ShieldAlert className="h-2.5 w-2.5" />
                                  EMERGENCY
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-600">
                            <p className="font-medium text-slate-800">
                              Exit: {formatDate(row.exitDate)} ({row.exitTime})
                            </p>
                            <p className="text-slate-500">
                              Return: {formatDate(row.returnDate)} ({row.returnTime})
                            </p>
                          </td>
                          <td className="px-4 py-3.5">
                            <StatusBadge status={row.status} size="sm" />
                          </td>
                          <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => navigate(`/clerk/request-details?id=${row.id}`)}
                                className={`rounded-md bg-slate-100 p-1.5 text-slate-700 hover:bg-slate-200 ${focusRing}`}
                                title="View Full Request"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                disabled={isRowBusy}
                                onClick={() => {
                                  setApprovingPass(row);
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
                                  setRejectingPass(row);
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
              <div className="p-8">
                <EmptyState
                  title="No pending pass requests"
                  description="There are currently no student requests matching your filter."
                />
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 p-4">
                <span className="text-xs font-semibold text-slate-600">
                  Page {safePage} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={safePage === 1}
                    className={`rounded-md border border-slate-300 bg-white p-1.5 text-slate-700 hover:bg-slate-100 disabled:opacity-40 ${focusRing}`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={safePage === totalPages}
                    className={`rounded-md border border-slate-300 bg-white p-1.5 text-slate-700 hover:bg-slate-100 disabled:opacity-40 ${focusRing}`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        isOpen={Boolean(approvingPass)}
        onClose={() => setApprovingPass(null)}
        title={`Approve Pass (${approvingPass?.id})`}
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
            <label htmlFor="pendingApproveRemarks" className="mb-1 block text-xs font-semibold text-slate-700">
              Clerk Remarks (Optional)
            </label>
            <textarea
              id="pendingApproveRemarks"
              rows={2}
              value={approveRemarks}
              onChange={(e) => setApproveRemarks(e.target.value)}
              placeholder="Optional instructions or verification notes..."
              className={input}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setApprovingPass(null)} className={buttonSecondary}>
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmApprove}
              disabled={approvingPass ? Boolean(processingIds[approvingPass.id]) : false}
              className={buttonPrimary}
            >
              <Check className="h-4 w-4" />
              {approvingPass && processingIds[approvingPass.id] ? 'Approving...' : 'Confirm Approve'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(rejectingPass)}
        onClose={() => setRejectingPass(null)}
        title={`Reject Pass (${rejectingPass?.id})`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Provide official rejection feedback for <strong>{rejectingPass?.studentName}</strong>:
          </p>
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
          <textarea
            rows={3}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Reason for rejection (e.g., Parent confirmation needed)..."
            className={`${input} mt-1`}
          />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setRejectingPass(null)} className={buttonSecondary}>
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmReject}
              disabled={rejectingPass ? Boolean(processingIds[rejectingPass.id]) : false}
              className={`inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 ${focusRing}`}
            >
              {rejectingPass && processingIds[rejectingPass.id] ? 'Processing...' : 'Confirm Reject'}
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
              ? `All ${selectedIds.length} selected pending gate passes will be approved.`
              : `Enter a rejection reason for all ${selectedIds.length} selected passes.`}
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
          <textarea
            rows={3}
            value={bulkRemarks}
            onChange={(e) => setBulkRemarks(e.target.value)}
            placeholder={
              bulkModalAction === 'approve'
                ? 'Optional clerk remarks for batch...'
                : 'Required rejection reason for batch...'
            }
            className={input}
          />
          <div className="flex justify-end gap-2 pt-2">
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

export default PendingRequestsPage;
