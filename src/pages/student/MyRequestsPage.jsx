import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import StatusBadge from '../../components/common/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { studentApi } from '../../api/student.api';
import { PASS_STATUS } from '../../utils/constants';
import { formatDate, formatDateTime } from '../../utils/dateUtils';
import { badge, buttonPrimary, buttonSecondary, focusRing } from '../../utils/uiStyles';
import {
  PlusCircle,
  QrCode,
  Eye,
  Ban,
  Download,
  RotateCcw,
} from 'lucide-react';

function exportPassesToCsv(passes) {
  const headers = [
    'Pass ID',
    'Reason',
    'Destination',
    'Exit Date',
    'Exit Time',
    'Return Date',
    'Return Time',
    'Status',
    'Emergency',
    'Created At',
  ];
  const escapeCell = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const rows = passes.map((p) =>
    [
      p.id,
      p.reason,
      p.destination,
      p.exitDate,
      p.exitTime,
      p.returnDate,
      p.returnTime,
      p.status,
      p.isEmergency ? 'Yes' : 'No',
      p.createdAt || '',
    ]
      .map(escapeCell)
      .join(',')
  );
  const csvContent = [headers.map(escapeCell).join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `my-gate-passes-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

const MyRequestsPage = () => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [passToCancel, setPassToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!currentUser?.id) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const data = await studentApi.getMyRequests(currentUser.id);
        if (!cancelled) {
          setRequests(Array.isArray(data) ? data : []);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || 'Failed to load your gate pass applications.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, refreshKey]);

  const handleRetry = () => {
    setLoading(true);
    setError('');
    setRefreshKey((k) => k + 1);
  };

  const handleConfirmCancel = async () => {
    if (!passToCancel) return;
    setCancelling(true);
    try {
      await studentApi.cancelRequest(passToCancel.id);
      addToast(`Gate Pass request (${passToCancel.id}) has been cancelled.`, 'info');
      setPassToCancel(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Failed to cancel pass request', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const handleQuickReapply = (pass) => {
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

  const filteredRequests = requests.filter((r) => {
    if (statusFilter === 'ALL') return true;
    return r.status?.toUpperCase() === statusFilter;
  });

  const handleExportCsv = () => {
    if (filteredRequests.length === 0) {
      addToast('No requests to export for the current filter.', 'warning');
      return;
    }
    exportPassesToCsv(filteredRequests);
    addToast(`Exported ${filteredRequests.length} pass record(s) to CSV.`, 'success');
  };

  const statusTabs = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'USED', 'EXPIRED'];

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
      header: 'Reason',
      accessor: 'reason',
      render: (row) => (
        <div>
          <span className="block text-xs font-semibold text-slate-900">{row.reason}</span>
          {row.isEmergency && (
            <span className="mt-0.5 inline-block rounded-md border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-800">
              EMERGENCY
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Destination',
      accessor: 'destination',
      render: (row) => <span className="text-xs text-slate-600">{row.destination}</span>,
    },
    {
      header: 'Departure / Return',
      render: (row) => (
        <div className="space-y-0.5 text-xs text-slate-600">
          <p className="font-medium text-slate-800">
            Exit: {formatDate(row.exitDate)} ({row.exitTime})
          </p>
          <p className="text-slate-500">
            Return: {formatDate(row.returnDate)} ({row.returnTime})
          </p>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      header: 'Created On',
      accessor: 'createdAt',
      render: (row) => <span className="text-xs text-slate-500">{formatDateTime(row.createdAt)}</span>,
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (row) => {
        const canReapply =
          row.status !== PASS_STATUS.PENDING && row.status !== PASS_STATUS.APPROVED;
        return (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {row.status === PASS_STATUS.PENDING && (
              <button
                type="button"
                onClick={() => setPassToCancel(row)}
                className={`inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 ${focusRing}`}
                title="Cancel pending application"
              >
                <Ban className="h-3.5 w-3.5" />
                Cancel
              </button>
            )}

            {row.status === PASS_STATUS.APPROVED && (
              <button
                type="button"
                onClick={() => navigate(`/student/approved-pass?id=${row.id}`)}
                className={`inline-flex items-center gap-1 rounded-md bg-orange-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-orange-800 ${focusRing}`}
              >
                <QrCode className="h-3.5 w-3.5" />
                View QR
              </button>
            )}

            {canReapply && (
              <button
                type="button"
                onClick={() => handleQuickReapply(row)}
                className={`inline-flex items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-800 hover:bg-orange-100 ${focusRing}`}
                title="Re-apply with same details"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Re-apply
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate(`/student/approved-pass?id=${row.id}`)}
              className={`inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 ${focusRing}`}
            >
              <Eye className="h-3.5 w-3.5" />
              Details
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <DashboardLayout
      title="My Gate Pass Applications"
      subtitle="Track approval progress, cancel pending applications, and access digital QR passes."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleExportCsv} className={buttonSecondary}>
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <Link to="/student/create-request" className={buttonPrimary}>
            <PlusCircle className="h-4 w-4" />
            Create New Pass
          </Link>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white p-2">
        {statusTabs.map((st) => {
          const count =
            st === 'ALL'
              ? requests.length
              : requests.filter((r) => r.status?.toUpperCase() === st).length;
          return (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold capitalize ${
                statusFilter === st
                  ? 'bg-orange-700 text-white hover:bg-orange-800'
                  : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-orange-800'
              } ${focusRing}`}
            >
              {st === 'ALL' ? 'All Requests' : st.toLowerCase()} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <LoadingSpinner label="Loading pass requests..." />
      ) : error ? (
        <ErrorState
          title="Unable to Load Requests"
          description={error}
          onRetry={handleRetry}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredRequests}
          searchPlaceholder="Search by Pass ID, destination, or reason..."
          emptyTitle="No gate pass applications found"
          emptyDescription="Try selecting another status filter or apply for a new campus out-pass."
        />
      )}

      <ConfirmDialog
        isOpen={!!passToCancel}
        onClose={() => setPassToCancel(null)}
        onConfirm={handleConfirmCancel}
        title="Cancel Gate Pass Request"
        message={`Are you sure you want to cancel pass request (${passToCancel?.id}) for "${passToCancel?.reason}"? This action cannot be undone.`}
        confirmText="Yes, Cancel Application"
        cancelText="Keep Request"
        type="danger"
        loading={cancelling}
      />
    </DashboardLayout>
  );
};

export default MyRequestsPage;
