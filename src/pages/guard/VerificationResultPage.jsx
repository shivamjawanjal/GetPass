import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { guardApi } from '../../api/guard.api';
import { PASS_STATUS } from '../../utils/constants';
import { formatDate, formatDateTime } from '../../utils/dateUtils';
import { CheckCircle2, XCircle, Scan, History, LogIn } from 'lucide-react';
import { buttonPrimary, buttonSecondary, card } from '../../utils/uiStyles';

const VERIFICATION_STORAGE_KEY = 'guard_last_verification';

const readStoredVerification = (passIdFromUrl) => {
  try {
    const raw = sessionStorage.getItem(VERIFICATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (passIdFromUrl && parsed?.pass?.id && parsed.pass.id !== passIdFromUrl) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const getInitials = (name) => {
  if (!name) return 'ST';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
};

const VerificationResultPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const passIdFromUrl = searchParams.get('passId');
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const [verificationResult, setVerificationResult] = useState(() => {
    return location.state?.result || readStoredVerification(passIdFromUrl);
  });
  const [loading, setLoading] = useState(
    () => !location.state?.result && !readStoredVerification(passIdFromUrl) && Boolean(passIdFromUrl)
  );
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    if (location.state?.result) {
      try {
        sessionStorage.setItem(VERIFICATION_STORAGE_KEY, JSON.stringify(location.state.result));
      } catch {
        // Ignore storage errors
      }
      return;
    }

    if (verificationResult || !passIdFromUrl) {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const matches = guardApi.lookupPass ? await guardApi.lookupPass(passIdFromUrl) : [];
        const matchedPass = Array.isArray(matches)
          ? matches.find((p) => p.id === passIdFromUrl) || matches[0]
          : null;

        if (!cancelled && matchedPass) {
          const reconstructed = {
            isValid:
              matchedPass.status === PASS_STATUS.APPROVED ||
              matchedPass.status === PASS_STATUS.USED,
            scanType: matchedPass.returnedAt ? 'entry' : 'exit',
            reason:
              matchedPass.status === PASS_STATUS.REJECTED
                ? 'Pass Was Rejected by Clerk'
                : matchedPass.status === PASS_STATUS.PENDING
                  ? 'Pass Still Awaiting Clerk Approval'
                  : matchedPass.status === PASS_STATUS.EXPIRED
                    ? 'Pass Has Expired'
                    : matchedPass.status === PASS_STATUS.CANCELLED
                      ? 'Pass Was Cancelled by Student'
                      : null,
            pass: matchedPass,
            log: {
              passId: matchedPass.id,
              studentName: matchedPass.studentName,
              rollNumber: matchedPass.rollNumber,
              guardName: currentUser?.name || 'Gate Security',
              gate: currentUser?.gate || 'Main Gate',
              scanType: matchedPass.returnedAt ? 'entry' : 'exit',
              scanTime: matchedPass.returnedAt || matchedPass.reviewedAt || matchedPass.createdAt,
            },
          };
          setVerificationResult(reconstructed);
          try {
            sessionStorage.setItem(VERIFICATION_STORAGE_KEY, JSON.stringify(reconstructed));
          } catch {
            // Ignore storage errors
          }
        }
      } catch {
        // Leave null to render clean empty state
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.state, passIdFromUrl, verificationResult, currentUser]);

  const handleLogReturnCheckIn = async () => {
    const pass = verificationResult?.pass;
    if (!pass) return;

    setCheckingIn(true);
    try {
      const gate = verificationResult?.log?.gate || currentUser?.gate || 'Main Gate';
      const response = await guardApi.checkIn({
        passId: pass.id,
        token: pass.token,
        gate,
        guardId: currentUser?.id,
        guardUser: currentUser,
      });

      const updatedResult = {
        isValid: true,
        scanType: 'entry',
        reason: null,
        pass: response?.pass || { ...pass, returnedAt: new Date().toISOString() },
        log: response?.log || {
          passId: pass.id,
          studentName: pass.studentName,
          rollNumber: pass.rollNumber,
          guardName: currentUser?.name || 'Gate Security',
          gate,
          result: 'VALID',
          scanType: 'entry',
          scanTime: new Date().toISOString(),
          notes: 'Student Return Check-In Verified',
        },
      };

      setVerificationResult(updatedResult);
      try {
        sessionStorage.setItem(VERIFICATION_STORAGE_KEY, JSON.stringify(updatedResult));
      } catch {
        // Ignore storage errors
      }
      addToast(`Return check-in logged for ${pass.studentName}.`, 'success');
    } catch (err) {
      addToast(
        err?.response?.data?.message || err?.message || 'Failed to record return check-in.',
        'error'
      );
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Scan Verification Result">
        <LoadingSpinner label="Loading verification record..." />
      </DashboardLayout>
    );
  }

  if (!verificationResult) {
    return (
      <DashboardLayout title="Scan Verification Result">
        <div className="mx-auto max-w-xl">
          <div className={`${card} p-8 text-center`}>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-orange-700">
              <Scan className="h-7 w-7" />
            </div>
            <h2 className="mt-5 text-lg font-semibold text-slate-900">No verification result to display</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Scan a student gate pass QR code or look up a pass to view its verification outcome here.
            </p>
            <Link to="/guard/scan" className={`${buttonPrimary} mt-6`}>
              <Scan className="h-4 w-4" />
              Go to QR Scanner
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { isValid, reason, pass, log } = verificationResult;
  const isReturnScan =
    verificationResult.scanType === 'entry' ||
    log?.scanType === 'entry' ||
    Boolean(pass?.returnedAt);
  const canCheckInReturn = pass?.status === PASS_STATUS.USED && !pass?.returnedAt;

  return (
    <DashboardLayout title="Scan Verification Result">
      <div className="mx-auto max-w-xl space-y-6">
        {isValid ? (
          <div className={`${card} p-6 text-center sm:p-8`}>
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-md border border-orange-200 bg-orange-50 text-orange-700">
              {isReturnScan ? <LogIn className="h-12 w-12" /> : <CheckCircle2 className="h-12 w-12" />}
            </div>

            <span className="mb-3 inline-block rounded-md bg-orange-700 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              {isReturnScan ? 'Return Check-In Verified' : 'Exit Verification Passed'}
            </span>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              {isReturnScan ? 'RETURN CHECK-IN LOGGED' : 'VALID GATE PASS'}
            </h2>

            {pass && (
              <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-5 text-left">
                <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
                  {pass.photo ? (
                    <img
                      src={pass.photo}
                      alt={pass.studentName}
                      className="h-16 w-16 shrink-0 rounded-md border border-slate-300 object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-slate-900 text-base font-semibold text-white">
                      {getInitials(pass.studentName)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900">{pass.studentName}</h3>
                      <StatusBadge status={pass.status} size="sm" />
                    </div>
                    <p className="font-mono text-xs font-semibold text-orange-700">
                      Roll: {pass.rollNumber}
                    </p>
                    <p className="text-[11px] text-slate-500">{pass.department}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Reason
                    </span>
                    <span className="font-semibold text-slate-800">{pass.reason}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Destination
                    </span>
                    <span className="font-semibold text-slate-800">{pass.destination}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Expected Return
                    </span>
                    <span className="font-semibold text-slate-800">
                      {formatDate(pass.returnDate)} at {pass.returnTime}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Pass ID
                    </span>
                    <span className="font-mono font-semibold text-slate-900">{pass.id}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 rounded-md border border-orange-200 bg-orange-50 p-4 text-center">
              <span className="block text-lg font-semibold tracking-wide text-orange-800">
                {isReturnScan ? 'CAMPUS RE-ENTRY RECORDED' : 'ALLOW STUDENT EXIT'}
              </span>
              <p className="mt-1 text-xs text-slate-600">
                Verified at {formatDateTime(log?.scanTime || pass?.returnedAt)} by {log?.guardName || 'Security'} ({log?.gate || 'Main Gate'})
              </p>
            </div>

            {canCheckInReturn && !isReturnScan && (
              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-left">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs font-semibold text-slate-900">Student Returning to Campus?</p>
                    <p className="text-[11px] text-slate-500">
                      This pass is currently checked out. Log their return check-in when they re-enter.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={checkingIn}
                    onClick={handleLogReturnCheckIn}
                    className={`${buttonPrimary} shrink-0 px-4 py-2 text-xs`}
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    {checkingIn ? 'Logging...' : 'Log Return Check-In'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-md border border-slate-800 bg-slate-900 p-6 text-center text-white sm:p-8">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-md border border-orange-700 bg-orange-700 text-white">
              <XCircle className="h-12 w-12" />
            </div>

            <span className="mb-3 inline-block rounded-md bg-orange-700 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              Gate Exit Verification Failed
            </span>
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              INVALID FOR EXIT
            </h2>

            <div className="mt-6 rounded-md border border-slate-200 bg-white p-5 text-left text-slate-900">
              <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-xs text-orange-900">
                <span className="block text-sm font-semibold">Reason:</span>
                <span className="mt-0.5 block text-sm text-orange-800">
                  {reason || 'Token Expired or Invalid Signature'}
                </span>
              </div>

              {pass && (
                <div className="mt-4 space-y-2 text-xs text-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <strong>Pass ID:</strong> <span className="font-mono">{pass.id}</span>
                    </span>
                    <StatusBadge status={pass.status} size="sm" />
                  </div>
                  <p>
                    <strong>Student:</strong> {pass.studentName} ({pass.rollNumber})
                  </p>
                  <p>
                    <strong>Destination:</strong> {pass.destination}
                  </p>
                </div>
              )}

              {canCheckInReturn && (
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <p className="mb-2 text-xs font-medium text-slate-700">
                    Already exited earlier? Record the student's return check-in below:
                  </p>
                  <button
                    type="button"
                    disabled={checkingIn}
                    onClick={handleLogReturnCheckIn}
                    className={`${buttonPrimary} w-full py-2.5 text-xs`}
                  >
                    <LogIn className="h-4 w-4" />
                    {checkingIn ? 'Logging Return Check-In...' : 'Log Return Check-In'}
                  </button>
                </div>
              )}
            </div>

            <div className="mt-6 rounded-md border border-slate-700 bg-slate-800 p-4 text-center">
              <span className="block text-lg font-semibold tracking-wide text-white">
                DENY CAMPUS EXIT
              </span>
              <p className="mt-1 text-xs text-slate-300">
                Security log recorded at {formatDateTime(log?.scanTime)}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => navigate('/guard/scan')}
            className={`${buttonPrimary} w-full py-3 sm:flex-1`}
          >
            <Scan className="h-4 w-4" />
            Scan Next Gate Pass
          </button>
          <Link
            to="/guard/scan-history"
            className={`${buttonSecondary} w-full py-3 sm:flex-1`}
          >
            <History className="h-4 w-4 text-slate-500" />
            View Scan History
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default VerificationResultPage;
