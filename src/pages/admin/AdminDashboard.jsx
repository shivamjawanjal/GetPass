import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import { adminApi } from '../../api/admin.api';
import { PASS_STATUS } from '../../utils/constants';
import { formatDate } from '../../utils/dateUtils';
import {
  Users,
  UserCheck,
  ShieldAlert,
  FileText,
  TrendingUp,
  ArrowRight,
  Scan,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { card, focusRing } from '../../utils/uiStyles';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [passes, setPasses] = useState([]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, allPasses] = await Promise.all([
        adminApi.getDashboardStats(),
        adminApi.getAllPasses(),
      ]);
      setNowMs(Date.now());
      setStats(statsData || {});
      setPasses(Array.isArray(allPasses) ? allPasses : []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load administration metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [statsData, allPasses] = await Promise.all([
          adminApi.getDashboardStats(),
          adminApi.getAllPasses(),
        ]);
        if (cancelled) return;
        setNowMs(Date.now());
        setStats(statsData || {});
        setPasses(Array.isArray(allPasses) ? allPasses : []);
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || 'Failed to load administration metrics.');
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

  const totalPasses = stats?.totalPasses ?? passes.length;
  const pendingPasses = stats?.pendingPasses ?? passes.filter((p) => p.status === PASS_STATUS.PENDING).length;
  const approvedPasses = stats?.approvedPasses ?? passes.filter((p) => p.status === PASS_STATUS.APPROVED).length;
  const usedPasses = stats?.usedPasses ?? passes.filter((p) => p.status === PASS_STATUS.USED).length;
  const rejectedPasses = stats?.rejectedPasses ?? passes.filter((p) => p.status === PASS_STATUS.REJECTED).length;

  const grantedPasses = approvedPasses + usedPasses;
  const approvalRate = totalPasses ? Math.round((grantedPasses / totalPasses) * 100) : 0;

  const activeExits = passes.filter((p) => p.status === PASS_STATUS.USED && !p.returnedAt);
  const overdueReturns = activeExits.filter(
    (p) => p.validUntil && new Date(p.validUntil).getTime() < nowMs
  );

  const quickLinks = [
    { label: 'Manage Students', path: '/admin/students', icon: Users },
    { label: 'Manage Hostel Clerks', path: '/admin/clerks', icon: UserCheck },
    { label: 'Manage Security Guards', path: '/admin/guards', icon: ShieldAlert },
    { label: 'Master Pass Register', path: '/admin/gate-passes', icon: FileText },
    { label: 'View Activity Reports', path: '/admin/reports', icon: TrendingUp },
  ];

  return (
    <DashboardLayout
      title="System Administration"
      subtitle="Campus-wide gate pass activity monitoring, overdue alerts, and user administration."
    >
      {loading ? (
        <LoadingSpinner label="Compiling system metrics..." />
      ) : error ? (
        <ErrorState
          title="Unable to load Admin Dashboard"
          description={error}
          onRetry={loadDashboard}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              title="Registered Students"
              value={stats?.totalStudents || 0}
              icon={Users}
              color="orange"
              description="Active student profiles"
              onClick={() => navigate('/admin/students')}
            />
            <StatCard
              title="Authorized Clerks"
              value={stats?.totalClerks || 0}
              icon={UserCheck}
              color="slate"
              description="Approval staff"
              onClick={() => navigate('/admin/clerks')}
            />
            <StatCard
              title="Security Guards"
              value={stats?.totalGuards || 0}
              icon={ShieldAlert}
              color="slate"
              description="Gate verification officers"
              onClick={() => navigate('/admin/guards')}
            />
            <StatCard
              title="Total Gate Passes"
              value={totalPasses}
              icon={FileText}
              color="orange"
              description="Out-passes in register"
              onClick={() => navigate('/admin/gate-passes')}
            />
            <StatCard
              title="Total Gate Scans"
              value={stats?.totalScans || 0}
              icon={Scan}
              color="slate"
              description={`${activeExits.length} active exits out`}
              onClick={() => navigate('/admin/reports')}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className={`${card} p-6 lg:col-span-2`}>
              <div className="mb-6 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-slate-900">Pass Activity Breakdown</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Distribution of approval decisions and gate exits across all passes
                  </p>
                </div>
                <span className="rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-800">
                  {activeExits.length} Active Exits
                </span>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-center">
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Pending</span>
                  <span className="block text-2xl font-semibold leading-none text-slate-900">{pendingPasses}</span>
                  <span className="mt-1 block text-[10px] text-slate-500">Awaiting review</span>
                </div>
                <div className="rounded-md border border-orange-200 bg-orange-50 p-4 text-center">
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-orange-700">Approved</span>
                  <span className="block text-2xl font-semibold leading-none text-orange-800">{approvedPasses}</span>
                  <span className="mt-1 block text-[10px] text-orange-700">Ready for exit</span>
                </div>
                <div className="rounded-md border border-orange-200 bg-white p-4 text-center">
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-orange-700">Used / Exited</span>
                  <span className="block text-2xl font-semibold leading-none text-slate-900">{usedPasses}</span>
                  <span className="mt-1 block text-[10px] text-slate-500">Scanned at gate</span>
                </div>
                <div className="rounded-md border border-slate-300 bg-slate-100 p-4 text-center">
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-600">Rejected</span>
                  <span className="block text-2xl font-semibold leading-none text-slate-900">{rejectedPasses}</span>
                  <span className="mt-1 block text-[10px] text-slate-600">Passes denied</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="mb-1 flex justify-between text-xs font-semibold text-slate-600">
                  <span>Overall Approval Rate (Approved + Used)</span>
                  <span className="text-orange-700">
                    {approvalRate}% ({grantedPasses} of {totalPasses})
                  </span>
                </div>
                <div className="flex h-4 w-full gap-0.5 overflow-hidden rounded-md bg-slate-100">
                  <div
                    className="h-full bg-orange-700"
                    style={{ width: `${totalPasses ? (grantedPasses / totalPasses) * 100 : 0}%` }}
                  />
                  <div
                    className="h-full bg-slate-400"
                    style={{ width: `${totalPasses ? (pendingPasses / totalPasses) * 100 : 0}%` }}
                  />
                  <div
                    className="h-full bg-slate-700"
                    style={{ width: `${totalPasses ? (rejectedPasses / totalPasses) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-4 text-[10px] font-medium text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-700" />
                    Granted (Approved + Used)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-400" />
                    Pending
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-700" />
                    Rejected
                  </span>
                </div>
              </div>
            </div>

            <div className={`${card} space-y-4 p-6`}>
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-slate-900">Management Shortcuts</h3>
                <p className="mt-0.5 text-xs text-slate-500">Quickly navigate to system modules.</p>
              </div>

              <div className="space-y-2 pt-1">
                {quickLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <button
                      key={link.path}
                      type="button"
                      onClick={() => navigate(link.path)}
                      className={`flex w-full items-center justify-between rounded-md border border-slate-200 bg-white p-3 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 ${focusRing}`}
                    >
                      <span className="flex items-center gap-2.5 text-slate-700">
                        <Icon className="h-4 w-4 text-orange-700" />
                        {link.label}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Active Exits & Overdue Return Alerts */}
          <div className={`${card} p-6`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-700" />
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-slate-900">
                    Overdue-Return & Active Exit Alerts
                  </h3>
                  <p className="text-xs text-slate-500">
                    Students currently outside campus past expected return time
                  </p>
                </div>
              </div>
              <span className="rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-800">
                {overdueReturns.length} Overdue / {activeExits.length} Out
              </span>
            </div>

            {overdueReturns.length > 0 ? (
              <div className="divide-y divide-slate-200">
                {overdueReturns.map((pass) => (
                  <div
                    key={pass.id}
                    className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900">{pass.studentName}</span>
                        <span className="font-mono text-[11px] font-semibold text-slate-600">
                          {pass.rollNumber}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-800">
                          <Clock className="h-3 w-3" />
                          Overdue
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Pass {pass.id} - {pass.destination} | Due {formatDate(pass.returnDate)} at {pass.returnTime}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/admin/gate-passes')}
                      className={`inline-flex items-center gap-1 self-start rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:self-auto ${focusRing}`}
                    >
                      Inspect in Register
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-5 text-center text-xs text-slate-600">
                No overdue returns flagged. {activeExits.length > 0
                  ? `${activeExits.length} student(s) currently out within scheduled return window.`
                  : 'All exited students have returned.'}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminDashboard;
