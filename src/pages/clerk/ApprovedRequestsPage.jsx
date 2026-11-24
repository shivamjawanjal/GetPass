import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import StatusBadge from '../../components/common/StatusBadge';
import { clerkApi } from '../../api/clerk.api';
import { useToast } from '../../hooks/useToast';
import { formatDate, formatDateTime } from '../../utils/dateUtils';
import { badge, buttonSecondary, focusRing } from '../../utils/uiStyles';
import { Eye, Download } from 'lucide-react';

function getInitials(name) {
  if (!name) return 'ST';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

function exportCsv(passes) {
  const headers = [
    'Pass ID',
    'Student Name',
    'Roll Number',
    'Department',
    'Reason',
    'Destination',
    'Exit Date',
    'Exit Time',
    'Return Date',
    'Return Time',
    'Reviewed By',
    'Reviewed At',
    'Status',
  ];
  const escapeCell = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const rows = passes.map((p) =>
    [
      p.id,
      p.studentName,
      p.rollNumber,
      p.department,
      p.reason,
      p.destination,
      p.exitDate,
      p.exitTime,
      p.returnDate,
      p.returnTime,
      p.reviewedBy || '',
      p.reviewedAt || '',
      p.status,
    ]
      .map(escapeCell)
      .join(',')
  );
  const csv = [headers.map(escapeCell).join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `approved-gate-passes-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

const ApprovedRequestsPage = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [approvedPasses, setApprovedPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await clerkApi.getRequestsByStatus('approved');
        if (!cancelled) {
          setApprovedPasses(Array.isArray(data) ? data : []);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || 'Failed to load approved passes.');
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

  const handleRetry = () => {
    setLoading(true);
    setError('');
    setRefreshKey((k) => k + 1);
  };

  const handleExportCsv = () => {
    if (approvedPasses.length === 0) {
      addToast('No approved passes available to export.', 'warning');
      return;
    }
    exportCsv(approvedPasses);
    addToast(`Exported ${approvedPasses.length} approved pass(es) to CSV.`, 'success');
  };

  const columns = [
    {
      header: 'Pass ID',
      accessor: 'id',
      render: (row) => (
        <span className={`${badge} font-mono font-semibold`}>
          {row.id}
        </span>
      ),
    },
    {
      header: 'Student Name',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.photo ? (
            <img
              src={row.photo}
              alt={row.studentName}
              className="h-7 w-7 rounded-md border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-900 text-[10px] font-bold text-white">
              {getInitials(row.studentName)}
            </div>
          )}
          <div>
            <span className="block text-xs font-semibold text-slate-900">{row.studentName}</span>
            <span className="text-[10px] text-slate-500">Roll: {row.rollNumber}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Reason',
      accessor: 'reason',
      render: (row) => <span className="text-xs font-semibold text-slate-800">{row.reason}</span>,
    },
    {
      header: 'Destination',
      accessor: 'destination',
      render: (row) => <span className="text-xs text-slate-600">{row.destination}</span>,
    },
    {
      header: 'Approved Date',
      render: (row) => (
        <span className="text-xs text-slate-500">
          {row.reviewedAt ? formatDateTime(row.reviewedAt) : formatDate(row.exitDate)}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate(`/clerk/request-details?id=${row.id}`)}
            className={`inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 ${focusRing}`}
          >
            <Eye className="h-3.5 w-3.5" />
            View Log
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Approved Gate Passes"
      subtitle="Registry of all authorized digital campus out-passes issued by clerks."
      action={
        <button type="button" onClick={handleExportCsv} className={buttonSecondary}>
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      }
    >
      {loading ? (
        <LoadingSpinner label="Loading approved passes log..." />
      ) : error ? (
        <ErrorState
          title="Unable to Load Approved Passes"
          description={error}
          onRetry={handleRetry}
        />
      ) : (
        <DataTable
          columns={columns}
          data={approvedPasses}
          searchPlaceholder="Search approved passes..."
          emptyTitle="No approved gate passes"
          emptyDescription="Passes approved by clerks will appear here."
        />
      )}
    </DashboardLayout>
  );
};

export default ApprovedRequestsPage;
