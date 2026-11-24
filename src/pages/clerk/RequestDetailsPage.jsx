import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import StatusBadge from '../../components/common/StatusBadge';
import { clerkApi } from '../../api/clerk.api';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { PASS_STATUS } from '../../utils/constants';
import { formatDate, formatDateTime } from '../../utils/dateUtils';
import { buttonSecondary, card, focusRing, input } from '../../utils/uiStyles';
import {
  ArrowLeft,
  Check,
  X,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  History,
} from 'lucide-react';

const REJECTION_PRESETS = [
  'Parent confirmation required',
  'Exam / class schedule conflict',
  'Incomplete destination details',
  'Past campus curfew hours',
  'Insufficient leave justification',
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

const RequestDetailsPage = () => {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('id');
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const [request, setRequest] = useState(null);
  const [studentHistory, setStudentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [clerkRemarks, setClerkRemarks] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!requestId) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const [data, allPasses] = await Promise.all([
          clerkApi.getRequestDetails(requestId),
          clerkApi.getAllRequests().catch(() => []),
        ]);
        if (!cancelled) {
          setRequest(data);
          if (data && Array.isArray(allPasses)) {
            const prior = allPasses.filter(
              (p) =>
                p.id !== data.id &&
                ((data.studentId && p.studentId === data.studentId) ||
                  (data.rollNumber && p.rollNumber === data.rollNumber))
            );
            setStudentHistory(prior);
          } else {
            setStudentHistory([]);
          }
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || 'Unable to load request details.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [requestId, refreshKey]);

  const handleApprove = async () => {
    if (!request) return;
    setProcessing(true);
    try {
      const updated = await clerkApi.approveRequest(
        request.id,
        currentUser,
        clerkRemarks.trim() || 'Clerk verification completed.'
      );
      setRequest(updated);
      setActionSuccessMessage('Gate pass approved successfully. Secure token and QR code generated.');
      addToast('Gate pass approved successfully!', 'success');
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Failed to approve request', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!request) return;
    if (!rejectionReason.trim()) {
      addToast('Please enter a rejection reason.', 'warning');
      return;
    }
    setProcessing(true);
    try {
      const updated = await clerkApi.rejectRequest(request.id, currentUser, rejectionReason.trim());
      setRequest(updated);
      setShowRejectModal(false);
      setActionSuccessMessage('Gate pass request has been rejected.');
      addToast('Gate pass request rejected.', 'info');
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Failed to reject request', 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Request Verification">
        <LoadingSpinner label="Retrieving request details..." />
      </DashboardLayout>
    );
  }

  if (error || !request) {
    return (
      <DashboardLayout title="Request Verification">
        <ErrorState
          title="Gate Pass Request Not Found"
          description={error || 'Unable to find the specified request record.'}
          onRetry={() => {
            if (requestId) {
              setLoading(true);
              setError('');
              setRefreshKey((k) => k + 1);
            } else {
              navigate('/clerk/dashboard');
            }
          }}
        />
      </DashboardLayout>
    );
  }

  const priorCount = studentHistory.length;
  const priorApprovals = studentHistory.filter(
    (p) => p.status === PASS_STATUS.APPROVED || p.status === PASS_STATUS.USED
  ).length;
  const priorRejections = studentHistory.filter((p) => p.status === PASS_STATUS.REJECTED).length;
  const priorEmergencies = studentHistory.filter((p) => p.isEmergency).length;

  return (
    <DashboardLayout
      title={`Review Request: ${request.id}`}
      subtitle="Inspect student credentials and out-pass details before authorizing campus departure."
      action={
        <button
          type="button"
          onClick={() => navigate('/clerk/dashboard')}
          className={`inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 ${focusRing}`}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
      }
    >
      <div className="mx-auto max-w-4xl space-y-6">
        {actionSuccessMessage && (
          <div className="flex items-center gap-3 rounded-md border border-orange-200 bg-orange-50 p-4">
            {request.status === PASS_STATUS.REJECTED ? (
              <AlertTriangle className="h-6 w-6 shrink-0 text-orange-700" />
            ) : (
              <CheckCircle2 className="h-6 w-6 shrink-0 text-orange-700" />
            )}
            <div>
              <p className="text-sm font-semibold text-slate-900">{actionSuccessMessage}</p>
              <p className="mt-0.5 text-xs text-orange-900">
                {request.status === PASS_STATUS.REJECTED
                  ? 'The rejection reason has been recorded on the request status.'
                  : 'The student can now access their digital QR pass from their portal dashboard.'}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6">
            <div className={`${card} flex flex-col items-center p-6 text-center`}>
              {request.photo ? (
                <img
                  src={request.photo}
                  alt={request.studentName}
                  className="mb-4 h-28 w-28 rounded-md border border-slate-200 object-cover"
                />
              ) : (
                <div className="mb-4 flex h-28 w-28 items-center justify-center rounded-md border border-slate-300 bg-slate-900 text-2xl font-bold text-white">
                  {getInitials(request.studentName)}
                </div>
              )}
              <h3 className="text-lg font-semibold text-slate-900">{request.studentName}</h3>
              <span className="mt-1 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-0.5 font-mono text-xs font-semibold text-orange-800">
                Roll No: {request.rollNumber}
              </span>

              <div className="mt-6 w-full space-y-3 border-t border-slate-200 pt-6 text-left text-xs">
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Department
                  </span>
                  <span className="font-medium text-slate-800">{request.department}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Current Semester
                  </span>
                  <span className="font-medium text-slate-800">{request.semester || 'N/A'}</span>
                </div>
                {request.guardianContact && (
                  <div>
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Guardian Contact
                    </span>
                    <span className="font-medium text-slate-800">{request.guardianContact}</span>
                  </div>
                )}
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Application Status
                  </span>
                  <div className="mt-1">
                    <StatusBadge status={request.status} />
                  </div>
                </div>
              </div>
            </div>

            <div className={`${card} p-5`}>
              <div className="mb-3 flex items-center gap-2">
                <History className="h-4 w-4 text-orange-700" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Student Pass History Summary
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
                  <span className="block text-[10px] text-slate-500">Prior Passes</span>
                  <span className="text-base font-bold text-slate-900">{priorCount}</span>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
                  <span className="block text-[10px] text-slate-500">Approvals</span>
                  <span className="text-base font-bold text-orange-800">{priorApprovals}</span>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
                  <span className="block text-[10px] text-slate-500">Rejections</span>
                  <span className="text-base font-bold text-slate-900">{priorRejections}</span>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
                  <span className="block text-[10px] text-slate-500">Emergency Count</span>
                  <span className="text-base font-bold text-slate-900">{priorEmergencies}</span>
                </div>
              </div>
              {studentHistory.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-slate-200 pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Recent Prior Passes
                  </p>
                  {studentHistory.slice(0, 3).map((hp) => (
                    <button
                      key={hp.id}
                      type="button"
                      onClick={() => navigate(`/clerk/request-details?id=${hp.id}`)}
                      className={`flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-left text-[11px] hover:bg-slate-50 ${focusRing}`}
                    >
                      <span className="truncate font-medium text-slate-800">
                        {hp.reason} ({formatDate(hp.exitDate)})
                      </span>
                      <StatusBadge status={hp.status} size="sm" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={`${card} space-y-6 p-6 sm:p-8 lg:col-span-2`}>
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h4 className="text-base font-semibold text-slate-900">Gate Pass Application Details</h4>
                <p className="mt-0.5 text-xs text-slate-500">Submitted on {formatDateTime(request.createdAt)}</p>
              </div>
              {request.isEmergency && (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  EMERGENCY
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Reason for Leaving
                </span>
                <span className="mt-1 block text-sm font-semibold text-slate-900">{request.reason}</span>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Destination Address
                </span>
                <span className="mt-1 block text-sm font-semibold text-slate-900">{request.destination}</span>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Requested Departure
                </span>
                <span className="mt-1 block text-xs font-medium text-slate-800">
                  {formatDate(request.exitDate)} at {request.exitTime}
                </span>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Expected Return
                </span>
                <span className="mt-1 block text-xs font-medium text-slate-800">
                  {formatDate(request.returnDate)} at {request.returnTime}
                </span>
              </div>
            </div>

            {request.remarks && (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-xs">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Additional Remarks / Student Notes
                </span>
                <p className="text-slate-700">{request.remarks}</p>
              </div>
            )}

            {request.reviewedBy && (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
                <span className="block font-semibold text-slate-900">Reviewer Audit Log:</span>
                <p className="mt-0.5">
                  Action taken by <strong>{request.reviewedBy}</strong> on{' '}
                  {formatDateTime(request.reviewedAt)}
                </p>
                {request.clerkRemarks && (
                  <p className="mt-1 text-slate-600">Remarks: "{request.clerkRemarks}"</p>
                )}
                {request.rejectionReason && (
                  <p className="mt-1 font-semibold text-orange-800">
                    Rejection Reason: "{request.rejectionReason}"
                  </p>
                )}
              </div>
            )}

            {request.status === PASS_STATUS.PENDING && (
              <div className="space-y-4 border-t border-slate-200 pt-6">
                <div>
                  <label htmlFor="clerkRemarksInput" className="mb-1 block text-xs font-semibold text-slate-700">
                    Clerk Remarks on Approval (Optional)
                  </label>
                  <textarea
                    id="clerkRemarksInput"
                    rows={2}
                    value={clerkRemarks}
                    onChange={(e) => setClerkRemarks(e.target.value)}
                    placeholder="e.g. Verified guardian confirmation / Return before curfew..."
                    className={input}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setRejectionReason('');
                      setShowRejectModal(true);
                    }}
                    disabled={processing}
                    className={`inline-flex items-center gap-2 rounded-md bg-slate-900 px-6 py-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 ${focusRing}`}
                  >
                    <X className="h-4 w-4" />
                    Reject Request
                  </button>
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={processing}
                    className={`inline-flex items-center gap-2 rounded-md bg-orange-700 px-6 py-3 text-xs font-semibold text-white hover:bg-orange-800 disabled:opacity-50 ${focusRing}`}
                  >
                    <Check className="h-4 w-4" />
                    {processing ? 'Approving...' : 'Approve Gate Pass'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title={`Reject Gate Pass Application (${request.id})`}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-md border border-orange-200 bg-orange-50 p-3 text-xs text-orange-900">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-700" />
            <div>
              <p className="font-semibold">Specify Reason for Rejection:</p>
              <p className="mt-0.5">Select a preset chip below or enter a custom explanation for the student.</p>
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

          <textarea
            rows={4}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g. Parent permission required / Exam schedule conflict / Incomplete remarks"
            className={`${input} mt-1`}
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowRejectModal(false)}
              className={buttonSecondary}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmReject}
              disabled={processing}
              className={`inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 ${focusRing}`}
            >
              {processing ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default RequestDetailsPage;
