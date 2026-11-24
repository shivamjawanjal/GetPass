import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import QRCodeDisplay from '../../components/qr/QRCodeDisplay';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import StatusBadge from '../../components/common/StatusBadge';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { studentApi } from '../../api/student.api';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { COLLEGE_INFO, PASS_STATUS } from '../../utils/constants';
import { formatDate, formatDateTime } from '../../utils/dateUtils';
import { buttonPrimary, buttonSecondary, card, focusRing } from '../../utils/uiStyles';
import {
  ArrowLeft,
  Printer,
  ShieldCheck,
  UserCheck,
  Clock,
  CheckCircle2,
  XCircle,
  QrCode,
  LogOut,
  LogIn,
  Ban,
  Maximize2,
  X,
  RotateCcw,
} from 'lucide-react';

function getInitials(name) {
  if (!name) return 'ST';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

function buildLifecycleSteps(pass) {
  const status = pass.status;
  const isRejected = status === PASS_STATUS.REJECTED;
  const isCancelled = status === PASS_STATUS.CANCELLED;
  const isExpired = status === PASS_STATUS.EXPIRED;
  const isApprovedOrBeyond = status === PASS_STATUS.APPROVED || status === PASS_STATUS.USED;
  const isExited = status === PASS_STATUS.USED || Boolean(pass.returnedAt);
  const isReturned = Boolean(pass.returnedAt);

  return [
    {
      id: 'submitted',
      label: 'Submitted',
      detail: pass.createdAt ? formatDateTime(pass.createdAt) : 'Application filed',
      state: 'done',
      icon: Clock,
    },
    {
      id: 'review',
      label: 'Clerk Review',
      detail: isRejected
        ? `Rejected${pass.reviewedBy ? ` by ${pass.reviewedBy}` : ''}`
        : isCancelled
        ? 'Cancelled by student'
        : isApprovedOrBeyond
        ? `Authorized${pass.reviewedBy ? ` by ${pass.reviewedBy}` : ''}`
        : 'Awaiting clerk verification',
      state: isRejected || isCancelled ? 'stopped' : isApprovedOrBeyond ? 'done' : 'active',
      icon: isRejected ? XCircle : isCancelled ? Ban : CheckCircle2,
    },
    {
      id: 'qr',
      label: 'Approved / QR Ready',
      detail: isApprovedOrBeyond
        ? 'Digital QR token active'
        : isExpired
        ? 'Validity expired'
        : isRejected || isCancelled
        ? 'Not issued'
        : 'Generated on approval',
      state: isApprovedOrBeyond ? 'done' : isExpired || isRejected || isCancelled ? 'stopped' : 'upcoming',
      icon: QrCode,
    },
    {
      id: 'exit',
      label: 'Gate Exit',
      detail: isExited
        ? pass.usedAt
          ? `Scanned out ${formatDateTime(pass.usedAt)}`
          : 'Scanned at campus gate'
        : status === PASS_STATUS.APPROVED
        ? 'Present QR at exit gate'
        : 'Pending approval',
      state: isExited ? 'done' : status === PASS_STATUS.APPROVED ? 'active' : 'upcoming',
      icon: LogOut,
    },
    {
      id: 'returned',
      label: 'Returned',
      detail: isReturned
        ? `Checked in ${formatDateTime(pass.returnedAt)}`
        : isExited
        ? 'Awaiting return check-in'
        : 'After campus exit',
      state: isReturned ? 'done' : isExited ? 'active' : 'upcoming',
      icon: LogIn,
    },
  ];
}

const PassDetailsPage = () => {
  const [searchParams] = useSearchParams();
  const passIdFromUrl = searchParams.get('id');
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const [pass, setPass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showFullScreenQr, setShowFullScreenQr] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (passIdFromUrl) {
          const data = await studentApi.getPassDetails(passIdFromUrl);
          if (!cancelled) {
            setPass(data);
            setError('');
          }
        } else if (currentUser?.id) {
          const myPasses = await studentApi.getMyRequests(currentUser.id);
          const approved = myPasses.find((p) => p.status === PASS_STATUS.APPROVED) || myPasses[0] || null;
          if (!cancelled) {
            setPass(approved);
            setError('');
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || 'Failed to load pass details.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [passIdFromUrl, currentUser?.id, refreshKey]);

  useEffect(() => {
    if (!showFullScreenQr) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setShowFullScreenQr(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showFullScreenQr]);

  const handlePrint = () => {
    window.print();
  };

  const handleConfirmCancel = async () => {
    if (!pass) return;
    setCancelling(true);
    try {
      const updated = await studentApi.cancelRequest(pass.id);
      setPass(updated);
      setShowCancelDialog(false);
      addToast(`Gate pass (${pass.id}) cancelled.`, 'info');
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Failed to cancel pass', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const handleQuickReapply = () => {
    if (!pass) return;
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

  if (loading) {
    return (
      <DashboardLayout title="Digital Gate Pass">
        <LoadingSpinner label="Retrieving digital gate pass record..." />
      </DashboardLayout>
    );
  }

  if (error || !pass) {
    return (
      <DashboardLayout title="Digital Gate Pass">
        <ErrorState
          title="Gate Pass Not Found"
          description={error || "We couldn't locate the specified gate pass record."}
          onRetry={() => {
            if (passIdFromUrl) {
              setLoading(true);
              setError('');
              setRefreshKey((k) => k + 1);
            } else {
              navigate('/student/my-requests');
            }
          }}
        />
      </DashboardLayout>
    );
  }

  const timelineSteps = buildLifecycleSteps(pass);
  const canShowQr = pass.status === PASS_STATUS.APPROVED || pass.status === PASS_STATUS.USED;

  return (
    <DashboardLayout
      title="Digital Gate Pass Document"
      subtitle="Official student campus out-pass document. Present QR code at the security main gate."
      action={
        <div className="no-print flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className={`inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 ${focusRing}`}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          {pass.status === PASS_STATUS.PENDING && (
            <button
              type="button"
              onClick={() => setShowCancelDialog(true)}
              className={`inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 ${focusRing}`}
            >
              <Ban className="h-4 w-4 text-orange-700" />
              Cancel Request
            </button>
          )}
          {pass.status !== PASS_STATUS.PENDING && pass.status !== PASS_STATUS.APPROVED && (
            <button type="button" onClick={handleQuickReapply} className={buttonSecondary}>
              <RotateCcw className="h-4 w-4" />
              Quick Re-apply
            </button>
          )}
          {canShowQr && (
            <button
              type="button"
              onClick={() => setShowFullScreenQr(true)}
              className={buttonSecondary}
            >
              <Maximize2 className="h-4 w-4 text-orange-700" />
              Full-Screen QR
            </button>
          )}
          <button type="button" onClick={handlePrint} className={buttonPrimary}>
            <Printer className="h-4 w-4" />
            Print Pass Document
          </button>
        </div>
      }
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-gate-pass, #printable-gate-pass * {
            visibility: visible;
          }
          #printable-gate-pass {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="mx-auto max-w-2xl space-y-6">
        <div className={`no-print ${card} p-5`}>
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Pass Lifecycle Timeline
          </h3>
          <ol className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            {timelineSteps.map((step) => {
              const Icon = step.icon;
              const isDone = step.state === 'done';
              const isActive = step.state === 'active';
              const isStopped = step.state === 'stopped';
              return (
                <li
                  key={step.id}
                  className={`rounded-md border p-3 ${
                    isDone
                      ? 'border-orange-200 bg-orange-50'
                      : isActive
                      ? 'border-orange-700 bg-white'
                      : isStopped
                      ? 'border-slate-300 bg-slate-100'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                        isDone
                          ? 'bg-orange-700 text-white'
                          : isActive
                          ? 'border border-orange-700 bg-orange-50 text-orange-700'
                          : isStopped
                          ? 'bg-slate-800 text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-xs font-semibold text-slate-900">{step.label}</span>
                  </div>
                  <p className="mt-2 text-[11px] leading-snug text-slate-600">{step.detail}</p>
                </li>
              );
            })}
          </ol>
        </div>

        <div id="printable-gate-pass" className={`${card} overflow-hidden border border-slate-200`}>
          <div className="border-b border-slate-800 bg-slate-900 p-6 text-center text-white">
            <div className="mb-2 flex items-center justify-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-sm font-semibold text-slate-900">
                {COLLEGE_INFO.shortName}
              </div>
              <div className="text-left">
                <h3 className="text-sm font-semibold uppercase leading-none tracking-wide">
                  {COLLEGE_INFO.name}
                </h3>
                <p className="mt-0.5 text-[11px] text-slate-300">{COLLEGE_INFO.address}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-700 pt-3">
              <span className="rounded-md border border-orange-800 bg-orange-800 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                Official Digital Gate Pass
              </span>
              <span className="font-mono text-xs font-semibold text-white">ID: {pass.id}</span>
            </div>
          </div>

          <div className="space-y-6 p-6 sm:p-8">
            <div className="flex flex-col items-center gap-5 rounded-md border border-slate-200 bg-slate-50 p-4 sm:flex-row">
              {pass.photo ? (
                <img
                  src={pass.photo}
                  alt={pass.studentName}
                  className="h-20 w-20 shrink-0 rounded-md border border-slate-200 object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-slate-900 text-xl font-bold text-white">
                  {getInitials(pass.studentName)}
                </div>
              )}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <h4 className="text-lg font-semibold text-slate-900">{pass.studentName}</h4>
                  <StatusBadge status={pass.status} size="sm" />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                  <p>
                    <strong className="text-slate-900">Roll No:</strong> {pass.rollNumber}
                  </p>
                  <p>
                    <strong className="text-slate-900">Semester:</strong> {pass.semester || 'N/A'}
                  </p>
                  <p className="col-span-2">
                    <strong className="text-slate-900">Department:</strong> {pass.department}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3.5">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Reason for Leaving
                </span>
                <span className="mt-0.5 block text-sm font-semibold text-slate-800">{pass.reason}</span>
                {pass.isEmergency && (
                  <span className="mt-1 inline-block rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-800">
                    EMERGENCY PASS
                  </span>
                )}
              </div>

              <div className="rounded-md border border-slate-200 bg-slate-50 p-3.5">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Destination
                </span>
                <span className="mt-0.5 block text-sm font-semibold text-slate-800">{pass.destination}</span>
              </div>

              <div className="rounded-md border border-slate-200 bg-slate-50 p-3.5">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Scheduled Exit
                </span>
                <span className="mt-0.5 block text-sm font-semibold text-slate-800">
                  {formatDate(pass.exitDate)} at {pass.exitTime}
                </span>
              </div>

              <div className="rounded-md border border-slate-200 bg-slate-50 p-3.5">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Expected Return
                </span>
                <span className="mt-0.5 block text-sm font-semibold text-slate-800">
                  {formatDate(pass.returnDate)} at {pass.returnTime}
                </span>
              </div>
            </div>

            {pass.reviewedBy && (
              <div className="rounded-md border border-orange-200 bg-orange-50 p-3.5 text-xs">
                <div className="flex items-center gap-2 font-semibold text-orange-900">
                  <UserCheck className="h-4 w-4 text-orange-700" />
                  Reviewed & Authorized By: {pass.reviewedBy}
                </div>
                {pass.clerkRemarks && (
                  <p className="mt-1 pl-6 text-slate-600">{pass.clerkRemarks}</p>
                )}
              </div>
            )}

            {pass.status === PASS_STATUS.REJECTED && (
              <div className="rounded-md border border-orange-200 bg-orange-50 p-4 text-xs text-orange-900">
                <span className="block font-semibold">Rejection Reason:</span>
                <p className="mt-1">{pass.rejectionReason || 'Request denied by administration.'}</p>
              </div>
            )}

            {canShowQr ? (
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <QRCodeDisplay
                  value={pass.token}
                  passId={pass.id}
                  studentName={pass.studentName}
                />
                <div className="no-print flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowFullScreenQr(true)}
                    className={`inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 ${focusRing}`}
                  >
                    <Maximize2 className="h-3.5 w-3.5 text-orange-700" />
                    Open High-Contrast Gate Scan View
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-slate-200 bg-slate-100 p-6 text-center">
                <p className="text-sm font-semibold text-slate-700">QR Pass Not Available</p>
                <p className="mt-1 text-xs text-slate-500">
                  QR verification codes are generated automatically upon Clerk approval.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-orange-700" />
                Digital gate pass record
              </span>
              <span>St. Xavier Institute Security Gate Verification</span>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={handleConfirmCancel}
        title="Cancel Gate Pass Request"
        message={`Cancel pending pass (${pass.id}) for "${pass.reason}"? This cannot be undone.`}
        confirmText="Yes, Cancel Pass"
        cancelText="Keep Pass"
        type="danger"
        loading={cancelling}
      />

      {showFullScreenQr && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="fullscreen-qr-title"
          className="no-print fixed inset-0 z-50 flex flex-col items-center justify-between bg-white p-6 text-slate-900"
        >
          <div className="flex w-full max-w-lg items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 id="fullscreen-qr-title" className="text-base font-bold text-slate-900">
                High-Contrast Gate Scan Mode
              </h2>
              <p className="text-xs text-slate-600">
                {pass.studentName} - {pass.rollNumber}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowFullScreenQr(false)}
              className={`inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 ${focusRing}`}
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>

          <div className="flex flex-col items-center justify-center space-y-5">
            <div className="rounded-md border-2 border-slate-900 bg-white p-5">
              {pass.token ? (
                <QRCodeSVG
                  value={pass.token}
                  size={280}
                  level="H"
                  includeMargin={true}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              ) : (
                <div className="flex h-64 w-64 items-center justify-center bg-slate-100 text-xs text-slate-600">
                  QR Token Unavailable
                </div>
              )}
            </div>

            <div className="space-y-1 text-center">
              <p className="font-mono text-base font-bold tracking-wider text-slate-900">{pass.id}</p>
              <p className="text-sm font-semibold text-slate-800">{pass.reason}</p>
              <p className="text-xs text-slate-600">
                Exit: {formatDate(pass.exitDate)} ({pass.exitTime}) | Return: {formatDate(pass.returnDate)} ({pass.returnTime})
              </p>
            </div>
          </div>

          <p className="text-center text-xs font-medium text-slate-500">
            Hold device steady under security scanner. Press Esc or Close when finished.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PassDetailsPage;
