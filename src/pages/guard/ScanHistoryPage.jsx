import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import { guardApi } from '../../api/guard.api';
import { formatDateTime } from '../../utils/dateUtils';
import { ShieldCheck, ShieldAlert, LogIn, Download } from 'lucide-react';
import { buttonSecondary, focusRing } from '../../utils/uiStyles';

const escapeCsvValue = (val) => {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const ScanHistoryPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resultFilter, setResultFilter] = useState('ALL');
  const [scanTypeFilter, setScanTypeFilter] = useState('ALL');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await guardApi.getScanHistory();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch scan history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await guardApi.getScanHistory();
        if (!cancelled) {
          setLogs(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || 'Failed to fetch scan history.');
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

  const filteredLogs = logs.filter((l) => {
    if (resultFilter !== 'ALL' && l.result !== resultFilter) {
      return false;
    }
    const type = l.scanType || 'exit';
    if (scanTypeFilter !== 'ALL' && type !== scanTypeFilter) {
      return false;
    }
    return true;
  });

  const handleExportCsv = () => {
    const headers = ['Log ID', 'Pass ID', 'Student Name', 'Roll Number', 'Scan Type', 'Result', 'Gate', 'Guard', 'Scan Time', 'Notes'];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.passId,
      l.studentName,
      l.rollNumber,
      (l.scanType || 'exit') === 'entry' ? 'Return Check-In' : 'Exit Verification',
      l.result,
      l.gate,
      l.guardName,
      l.scanTime,
      l.notes,
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gate-scan-history-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    {
      header: 'Pass ID',
      accessor: 'passId',
      render: (row) => (
        <span className="rounded border border-slate-200 bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-900">
          {row.passId}
        </span>
      ),
    },
    {
      header: 'Student',
      render: (row) => (
        <div>
          <span className="block text-xs font-semibold text-slate-900">{row.studentName}</span>
          <span className="text-[10px] text-slate-500">Roll: {row.rollNumber}</span>
        </div>
      ),
    },
    {
      header: 'Direction',
      accessor: 'scanType',
      render: (row) => {
        const isEntry = row.scanType === 'entry';
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
              isEntry
                ? 'border-orange-200 bg-orange-50 text-orange-800'
                : 'border-slate-200 bg-slate-100 text-slate-700'
            }`}
          >
            {isEntry && <LogIn className="h-3 w-3" />}
            {isEntry ? 'Return' : 'Exit'}
          </span>
        );
      },
    },
    {
      header: 'Scan Timestamp',
      accessor: 'scanTime',
      render: (row) => <span className="text-xs text-slate-600">{formatDateTime(row.scanTime)}</span>,
    },
    {
      header: 'Security Guard & Gate',
      render: (row) => (
        <div className="text-xs text-slate-700">
          <span className="block font-semibold">{row.guardName}</span>
          <span className="text-[10px] text-slate-500">{row.gate}</span>
        </div>
      ),
    },
    {
      header: 'Verification Result',
      accessor: 'result',
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-semibold ${
            row.result === 'VALID'
              ? 'border-slate-200 bg-slate-100 text-slate-700'
              : 'border-orange-200 bg-orange-50 text-orange-800'
          }`}
        >
          {row.result === 'VALID' ? (
            <>
              <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
              {row.scanType === 'entry' ? 'VALID RETURN' : 'VALID EXIT'}
            </>
          ) : (
            <>
              <ShieldAlert className="h-3.5 w-3.5 text-orange-700" />
              DENIED
            </>
          )}
        </span>
      ),
    },
    {
      header: 'System Notes',
      accessor: 'notes',
      render: (row) => <span className="text-xs text-slate-500">{row.notes}</span>,
    },
  ];

  return (
    <DashboardLayout
      title="Security Gate Scan History"
      subtitle="Complete audit log of student gate pass exits and return check-ins across campus gates."
      action={
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={filteredLogs.length === 0}
          className={`${buttonSecondary} px-3.5 py-2 text-xs`}
        >
          <Download className="h-4 w-4 text-slate-600" />
          Export CSV
        </button>
      }
    >
      <div className="mb-4 flex flex-col justify-between gap-3 rounded-md border border-slate-200 bg-white p-2.5 shadow-sm sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'VALID', 'INVALID'].map((res) => (
            <button
              key={res}
              type="button"
              onClick={() => setResultFilter(res)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize ${focusRing} ${
                resultFilter === res
                  ? 'bg-orange-700 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {res === 'ALL' ? 'All Results' : `${res.toLowerCase()} scans`}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-2 sm:border-t-0 sm:pt-0">
          {[
            { id: 'ALL', label: 'All Directions' },
            { id: 'exit', label: 'Exit Only' },
            { id: 'entry', label: 'Return Only' },
          ].map((dir) => (
            <button
              key={dir.id}
              type="button"
              onClick={() => setScanTypeFilter(dir.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${focusRing} ${
                scanTypeFilter === dir.id
                  ? 'bg-orange-700 text-white'
                  : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {dir.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading scan logs..." />
      ) : error ? (
        <ErrorState
          title="Could not load scan history"
          description={error}
          onRetry={fetchHistory}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredLogs}
          searchPlaceholder="Search by student name, roll number, pass ID, gate, or guard..."
          emptyTitle="No scan records found"
          emptyDescription="Scan logs will appear here as gate pass QR codes and returns are verified."
        />
      )}
    </DashboardLayout>
  );
};

export default ScanHistoryPage;
