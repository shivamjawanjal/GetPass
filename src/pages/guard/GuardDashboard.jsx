import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import StatusBadge from '../../components/common/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { guardApi } from '../../api/guard.api';
import { PASS_STATUS } from '../../utils/constants';
import { formatDate, formatDateTime } from '../../utils/dateUtils';
import {
  Scan,
  CheckCircle2,
  XCircle,
  Users,
  ArrowRight,
  LogIn,
  Search,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { buttonPrimary, buttonSecondary, card, focusRing } from '../../utils/uiStyles';

const toLocalDateKey = (value) => {
  if (!value) return '';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const GuardDashboard = () => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [scanLogs, setScanLogs] = useState([]);
  const [checkedOutPasses, setCheckedOutPasses] = useState([]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkingInId, setCheckingInId] = useState(null);

  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResults, setLookupResults] = useState([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupSearched, setLookupSearched] = useState(false);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [logs, passes] = await Promise.all([
        guardApi.getScanHistory(),
        guardApi.lookupPass ? guardApi.lookupPass('') : Promise.resolve([]),
      ]);
      const safeLogs = Array.isArray(logs) ? logs : [];
      const safePasses = Array.isArray(passes) ? passes : [];

      setNowMs(Date.now());
      setScanLogs(safeLogs);
      setCheckedOutPasses(
        safePasses.filter((p) => p.status === PASS_STATUS.USED && !p.returnedAt)
      );
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load gate security data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [logs, passes] = await Promise.all([
          guardApi.getScanHistory(),
          guardApi.lookupPass ? guardApi.lookupPass('') : Promise.resolve([]),
        ]);
        if (cancelled) return;
        const safeLogs = Array.isArray(logs) ? logs : [];
        const safePasses = Array.isArray(passes) ? passes : [];
        setNowMs(Date.now());
        setScanLogs(safeLogs);
        setCheckedOutPasses(
          safePasses.filter((p) => p.status === PASS_STATUS.USED && !p.returnedAt)
        );
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || 'Failed to load gate security data.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const todayKey = toLocalDateKey(new Date(nowMs).toISOString());
  const todaysScans = scanLogs.filter((s) => toLocalDateKey(s.scanTime) === todayKey);
  const scansTodayCount = todaysScans.length;
  const returnedTodayCount = todaysScans.filter(
    (s) => s.result === 'VALID' && s.scanType === 'entry'
  ).length;
  const currentlyOutCount = checkedOutPasses.length;

  const handleReturnCheckIn = async (pass) => {
    setCheckingInId(pass.id);
    try {
      await guardApi.checkIn({
        passId: pass.id,
        token: pass.token,
        gate: currentUser?.gate || 'Main Gate',
        guardId: currentUser?.id,
        guardUser: currentUser,
      });
      addToast(`Return check-in logged for ${pass.studentName} (${pass.rollNumber}).`, 'success');
      await loadDashboardData();
      setLookupResults((prev) =>
        prev.map((item) =>
          item.id === pass.id ? { ...item, returnedAt: new Date().toISOString() } : item
        )
      );
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Failed to log return check-in.', 'error');
    } finally {
      setCheckingInId(null);
    }
  };

  const handleQuickLookup = async (e) => {
    e.preventDefault();
    const q = lookupQuery.trim();
    if (!q) return;

    setLookupLoading(true);
    setLookupSearched(true);
    try {
      const results = await guardApi.lookupPass(q);
      setLookupResults(Array.isArray(results) ? results : []);
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Pass lookup failed.', 'error');
      setLookupResults([]);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleQuickVerify = async (pass) => {
    try {
      const result = await guardApi.verifyGatePassToken(
        pass.token || pass.id,
        currentUser,
        currentUser?.gate || 'Main Gate'
      );
      try {
        sessionStorage.setItem('guard_last_verification', JSON.stringify(result));
      } catch {
        // Ignore storage errors
      }
      navigate(`/guard/verification-result${pass?.id ? `?passId=${encodeURIComponent(pass.id)}` : ''}`, {
        state: { result },
      });
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Verification failed.', 'error');
    }
  };

  return (
    <DashboardLayout
      title={`Gate Security - ${currentUser?.name || 'Gate Officer'}`}
      subtitle={`Assigned Post: ${currentUser?.gate || 'Main Gate'}. Live exit verification and return check-in desk.`}
    >
      {loading ? (
        <LoadingSpinner label="Loading gate security dashboard..." />
      ) : error ? (
        <ErrorState
          title="Unable to load Gate Security Dashboard"
          description={error}
          onRetry={loadDashboardData}
        />
      ) : (
        <div className="space-y-6">
          <div className="rounded-md border border-slate-800 bg-slate-900 p-6 text-center sm:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border border-orange-700 bg-orange-700 text-white">
              <Scan className="h-7 w-7" />
            </div>

            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Scan Student Gate Pass QR
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-300">
              Decode student QR codes via camera or image upload, verify gate exits, and record return check-ins.
            </p>

            <button
              type="button"
              onClick={() => navigate('/guard/scan')}
              className={`${buttonPrimary} mt-5 px-6 py-3`}
            >
              <Scan className="h-5 w-5" />
              Open QR Scanner Camera
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              title="Scans Today"
              value={scansTodayCount}
              icon={CheckCircle2}
              color="orange"
              description="Total gate verifications logged today"
            />
            <StatCard
              title="Currently Out"
              value={currentlyOutCount}
              icon={Users}
              color="slate"
              description="Checked-out students awaiting return"
            />
            <StatCard
              title="Returned Today"
              value={returnedTodayCount}
              icon={LogIn}
              color="slate"
              description="Student return check-ins logged today"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Checked-Out Students (Awaiting Return) */}
            <div className={`${card} p-6`}>
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-slate-900">
                    Checked-Out Students (Awaiting Return)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Students currently outside campus with active exit passes
                  </p>
                </div>
                <span className="rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-800">
                  {checkedOutPasses.length} Out
                </span>
              </div>

              {checkedOutPasses.length > 0 ? (
                <div className="divide-y divide-slate-200">
                  {checkedOutPasses.map((pass) => {
                    const isOverdue = pass.validUntil && new Date(pass.validUntil).getTime() < nowMs;
                    return (
                      <div
                        key={pass.id}
                        className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-slate-900">{pass.studentName}</span>
                            <span className="font-mono text-[11px] font-semibold text-slate-600">
                              {pass.rollNumber}
                            </span>
                            {isOverdue && (
                              <span className="inline-flex items-center gap-1 rounded-md border border-orange-300 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-800">
                                <Clock className="h-3 w-3" />
                                Overdue
                              </span>
                            )}
                          </div>
                          <p className="truncate text-[11px] text-slate-500">
                            Pass {pass.id} - {pass.destination} (Due: {formatDate(pass.returnDate)} {pass.returnTime})
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={checkingInId === pass.id}
                          onClick={() => handleReturnCheckIn(pass)}
                          className={`${buttonPrimary} shrink-0 px-3 py-1.5 text-xs`}
                        >
                          <LogIn className="h-3.5 w-3.5" />
                          {checkingInId === pass.id ? 'Logging...' : 'Log Return Check-In'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                  All checked-out students have returned to campus.
                </div>
              )}
            </div>

            {/* Quick Manual Pass Lookup */}
            <div className={`${card} p-6`}>
              <div className="mb-4 border-b border-slate-200 pb-3">
                <h3 className="text-sm font-semibold tracking-tight text-slate-900">
                  Quick Manual Pass Lookup
                </h3>
                <p className="text-xs text-slate-500">
                  Search by Pass ID, QR reference, roll number, or student name
                </p>
              </div>

              <form onSubmit={handleQuickLookup} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={lookupQuery}
                    onChange={(e) => setLookupQuery(e.target.value)}
                    placeholder="e.g. CS2023045 or GP-2026-1001"
                    className={`w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-orange-700 focus:ring-2 focus:ring-orange-700 ${focusRing}`}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!lookupQuery.trim() || lookupLoading}
                  className={`${buttonPrimary} shrink-0 px-4 py-2 text-xs`}
                >
                  {lookupLoading ? 'Searching...' : 'Find Pass'}
                </button>
              </form>

              <div className="mt-4 space-y-2.5">
                {lookupResults.length > 0 ? (
                  lookupResults.slice(0, 5).map((pass) => (
                    <div
                      key={pass.id}
                      className="flex flex-col justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-slate-900">{pass.id}</span>
                          <StatusBadge status={pass.status} size="sm" />
                        </div>
                        <p className="truncate text-xs font-medium text-slate-800">
                          {pass.studentName} ({pass.rollNumber})
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {pass.status === PASS_STATUS.USED && !pass.returnedAt ? (
                          <button
                            type="button"
                            disabled={checkingInId === pass.id}
                            onClick={() => handleReturnCheckIn(pass)}
                            className={`${buttonSecondary} px-3 py-1.5 text-xs`}
                          >
                            <LogIn className="h-3.5 w-3.5 text-orange-700" />
                            {checkingInId === pass.id ? 'Logging...' : 'Log Return'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleQuickVerify(pass)}
                            className={`${buttonPrimary} px-3 py-1.5 text-xs`}
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Verify
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : lookupSearched && !lookupLoading ? (
                  <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                    No matching passes found for "{lookupQuery}".
                  </p>
                ) : (
                  <p className="rounded-md border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                    Use manual lookup as an instant fallback if a student QR code cannot be scanned.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Gate Scans */}
          <div className={`${card} p-6`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-slate-900">Recent Gate Scans</h3>
                <p className="text-xs text-slate-500">Latest exit and return check-in logs across gates</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/guard/scan-history')}
                className={`${buttonPrimary} px-3 py-1.5 text-xs`}
              >
                View Full Log
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {scanLogs.length > 0 ? (
              <div className="divide-y divide-slate-200 text-xs">
                {scanLogs.slice(0, 6).map((log) => (
                  <div key={log.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">{log.studentName}</span>
                        <span className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-700">
                          {log.scanType === 'entry' ? 'Return' : 'Exit'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Roll: {log.rollNumber} | Pass: {log.passId} | {log.gate} | {formatDateTime(log.scanTime)}
                      </span>
                    </div>
                    <div className="shrink-0 text-right">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-[10px] font-semibold ${
                          log.result === 'VALID'
                            ? 'border-slate-200 bg-slate-100 text-slate-700'
                            : 'border-orange-200 bg-orange-50 text-orange-800'
                        }`}
                      >
                        {log.result === 'VALID' ? (
                          <CheckCircle2 className="h-3 w-3 text-slate-600" />
                        ) : (
                          <XCircle className="h-3 w-3 text-orange-700" />
                        )}
                        {log.result === 'VALID'
                          ? log.scanType === 'entry'
                            ? 'RETURNED'
                            : 'VALID EXIT'
                          : 'DENIED'}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-slate-400">{log.notes}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                No gate scans recorded yet.
              </p>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default GuardDashboard;
