import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import { adminApi } from '../../api/admin.api';
import { COLLEGE_INFO } from '../../utils/constants';
import { formatDateTime } from '../../utils/dateUtils';
import { Printer, Download } from 'lucide-react';
import { buttonPrimary, buttonSecondary, card, focusRing } from '../../utils/uiStyles';

const DAY_RANGES = [
  { label: '7d', value: 7 },
  { label: '14d', value: 14 },
  { label: '30d', value: 30 },
];

const escapeCsvValue = (val) => {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const ReportsPage = () => {
  const [days, setDays] = useState(7);
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReports = useCallback(async (selectedDays) => {
    setLoading(true);
    setError(null);
    try {
      const data = adminApi.getReports
        ? await adminApi.getReports(selectedDays)
        : await adminApi.getSystemReports(selectedDays);
      setReports(data || {});
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Error loading reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = adminApi.getReports
          ? await adminApi.getReports(days)
          : await adminApi.getSystemReports(days);
        if (!cancelled) {
          setReports(data || {});
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || 'Error loading reports.');
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
  }, [days]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    if (!reports) return;
    const dist = reports.passDistribution || {};
    const lines = [
      ['Section', 'Metric / Item', 'Value', 'Extra'],
      ['Distribution', 'Approved', dist.approved || 0, ''],
      ['Distribution', 'Used', dist.used || 0, ''],
      ['Distribution', 'Pending', dist.pending || 0, ''],
      ['Distribution', 'Rejected', dist.rejected || 0, ''],
      ['Distribution', 'Cancelled', dist.cancelled || 0, ''],
      ['Distribution', 'Expired', dist.expired || 0, ''],
      ...(reports.dailyTrend || []).map((d) => ['Daily Trend', d.day || d.date, d.count || 0, '']),
      ...(reports.departmentBreakdown || []).map((d) => [
        'Department Breakdown',
        d.department || d.name || 'Unknown',
        d.count || 0,
        '',
      ]),
      ...(reports.topDestinations || []).map((d) => [
        'Top Destinations',
        d.destination || d.name || 'Unknown',
        d.count || 0,
        '',
      ]),
      ...(reports.scans || []).map((s) => [
        'Recent Scan',
        s.passId,
        s.result,
        `${s.studentName} | ${s.gate} | ${s.scanType || 'exit'} | ${s.scanTime}`,
      ]),
    ];

    const csv = lines.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gate-pass-report-${days}d-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const distribution = reports?.passDistribution || {};
  const distributionCards = [
    { label: 'Approved', value: distribution.approved || 0, accent: true },
    { label: 'Used (Exited)', value: distribution.used || 0, accent: true },
    { label: 'Pending', value: distribution.pending || 0, accent: false },
    { label: 'Rejected', value: distribution.rejected || 0, accent: false },
    { label: 'Cancelled', value: distribution.cancelled || 0, accent: false },
    { label: 'Expired', value: distribution.expired || 0, accent: false },
  ];

  const dailyTrend = Array.isArray(reports?.dailyTrend) ? reports.dailyTrend : [];
  const dailyCounts = dailyTrend.map((item) => item.count || 0);
  const maxDailyCount = Math.max(0, ...dailyCounts);

  const departmentBreakdown = Array.isArray(reports?.departmentBreakdown)
    ? reports.departmentBreakdown
    : [];
  const maxDeptCount = Math.max(0, ...departmentBreakdown.map((d) => d.count || 0));

  const topDestinations = Array.isArray(reports?.topDestinations) ? reports.topDestinations : [];
  const scans = Array.isArray(reports?.scans) ? reports.scans : [];

  return (
    <DashboardLayout
      title="Analytics & System Reports"
      subtitle="Live SQL aggregates, department trends, and gate verification logs across campus."
      action={
        <div className="flex flex-wrap items-center gap-2 no-print">
          <div className="flex items-center rounded-md border border-slate-200 bg-white p-1">
            {DAY_RANGES.map((range) => (
              <button
                key={range.value}
                type="button"
                onClick={() => setDays(range.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold ${focusRing} ${
                  days === range.value
                    ? 'bg-orange-700 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={loading || !reports}
            className={`${buttonSecondary} px-3.5 py-2 text-xs`}
          >
            <Download className="h-4 w-4 text-slate-600" />
            Export CSV
          </button>
          <button type="button" onClick={handlePrint} className={`${buttonPrimary} px-3.5 py-2 text-xs`}>
            <Printer className="h-4 w-4" />
            Print Report
          </button>
        </div>
      }
    >
      {loading ? (
        <LoadingSpinner label="Compiling report metrics..." />
      ) : error ? (
        <ErrorState
          title="Could not load analytics report"
          description={error}
          onRetry={() => fetchReports(days)}
        />
      ) : (
        <div className="space-y-6" id="printable-gate-pass">
          <div className={`${card} p-6`}>
            <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {COLLEGE_INFO.name} - Gate Pass Analytics Report ({days}-Day Window)
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Generated on {formatDateTime(new Date().toISOString())}
                </p>
              </div>
              <span className="self-start rounded-md border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 sm:self-auto">
                Official System Report
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {distributionCards.map((item) => (
                <div key={item.label} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                  <span className="block text-xs font-medium text-slate-500">{item.label}</span>
                  <span
                    className={`mt-1 block text-2xl font-semibold ${
                      item.accent ? 'text-orange-700' : 'text-slate-900'
                    }`}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={`${card} p-6`}>
            <h4 className="mb-1 text-base font-semibold text-slate-900">
              Daily Out-Pass Volume (Last {days} Days)
            </h4>
            <p className="mb-6 text-xs text-slate-500">Real pass creation volume per day</p>

            {dailyTrend.length > 0 ? (
              <div className="flex h-48 items-end justify-between gap-1.5 overflow-x-auto rounded-md border border-slate-200 bg-slate-50 px-4 pt-6 pb-3">
                {dailyTrend.map((item, idx) => {
                  const count = item.count || 0;
                  const heightPct = maxDailyCount > 0 ? Math.max((count / maxDailyCount) * 100, count > 0 ? 6 : 0) : 0;
                  return (
                    <div key={idx} className="flex h-full min-w-[28px] flex-1 flex-col items-center justify-end gap-1.5">
                      <span className="text-[10px] font-semibold text-orange-700">{count}</span>
                      <div
                        className="w-full max-w-[32px] rounded-t-md bg-orange-700"
                        style={{ height: `${heightPct}%` }}
                      />
                      <span className="truncate text-[10px] font-medium text-slate-600">
                        {item.day || item.date}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                No pass activity recorded in the selected {days}-day window.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className={`${card} p-6`}>
              <h4 className="mb-1 text-base font-semibold text-slate-900">Department Breakdown</h4>
              <p className="mb-4 text-xs text-slate-500">Pass volume grouped by academic department</p>

              {departmentBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {departmentBreakdown.map((dept, idx) => {
                    const label = dept.department || dept.name || 'Unspecified';
                    const count = dept.count || 0;
                    const widthPct = maxDeptCount > 0 ? Math.round((count / maxDeptCount) * 100) : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-800">{label}</span>
                          <span className="font-semibold text-orange-700">{count}</span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-md bg-slate-100">
                          <div className="h-full bg-orange-700" style={{ width: `${widthPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                  No department breakdown data available.
                </p>
              )}
            </div>

            <div className={`${card} p-6`}>
              <h4 className="mb-1 text-base font-semibold text-slate-900">Top Destinations</h4>
              <p className="mb-4 text-xs text-slate-500">Most frequent off-campus destinations</p>

              {topDestinations.length > 0 ? (
                <div className="divide-y divide-slate-200">
                  {topDestinations.map((dest, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                      <span className="truncate font-medium text-slate-800">
                        {idx + 1}. {dest.destination || dest.name || 'Unknown'}
                      </span>
                      <span className="shrink-0 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-800">
                        {dest.count || 0} passes
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                  No destination statistics available.
                </p>
              )}
            </div>
          </div>

          <div className={`${card} p-6`}>
            <h4 className="mb-1 text-base font-semibold text-slate-900">Gate Verification Logs</h4>
            <p className="mb-4 text-xs text-slate-500">Latest QR exit and return checks at campus gates</p>

            {scans.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-500">
                      <th className="px-3 py-2">Timestamp</th>
                      <th className="px-3 py-2">Pass ID</th>
                      <th className="px-3 py-2">Student Name</th>
                      <th className="px-3 py-2">Direction</th>
                      <th className="px-3 py-2">Guard Officer</th>
                      <th className="px-3 py-2">Gate Post</th>
                      <th className="px-3 py-2">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {scans.slice(0, 15).map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-600">{formatDateTime(s.scanTime)}</td>
                        <td className="px-3 py-2 font-mono font-semibold text-slate-900">{s.passId}</td>
                        <td className="px-3 py-2 font-semibold text-slate-800">{s.studentName}</td>
                        <td className="px-3 py-2 text-slate-700">
                          {s.scanType === 'entry' ? 'Return' : 'Exit'}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{s.guardName}</td>
                        <td className="px-3 py-2 text-slate-600">{s.gate}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-md border px-2 py-0.5 font-semibold ${
                              s.result === 'VALID'
                                ? 'border-slate-200 bg-slate-100 text-slate-700'
                                : 'border-orange-200 bg-orange-50 text-orange-800'
                            }`}
                          >
                            {s.result}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
                No gate verification logs found.
              </p>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ReportsPage;
