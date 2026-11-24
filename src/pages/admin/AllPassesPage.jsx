import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import Modal from '../../components/common/Modal';
import QRCodeDisplay from '../../components/qr/QRCodeDisplay';
import { adminApi } from '../../api/admin.api';
import { DEPARTMENT_OPTIONS, PASS_STATUS } from '../../utils/constants';
import { formatDate, formatDateTime } from '../../utils/dateUtils';
import { Eye, Download, AlertTriangle, UserCheck } from 'lucide-react';
import { buttonSecondary, focusRing } from '../../utils/uiStyles';

const escapeCsvValue = (val) => {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
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

const AllPassesPage = () => {
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [inspectedPass, setInspectedPass] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getAllPasses();
      setPasses(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Error fetching all passes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminApi.getAllPasses();
        if (!cancelled) {
          setPasses(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || 'Error fetching all passes.');
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

  const departmentChoices = Array.from(
    new Set([
      ...DEPARTMENT_OPTIONS,
      ...passes.map((p) => p.department).filter(Boolean),
    ])
  );

  const filteredPasses = passes.filter((p) => {
    if (statusFilter !== 'ALL' && p.status?.toUpperCase() !== statusFilter) {
      return false;
    }
    if (departmentFilter !== 'ALL' && p.department !== departmentFilter) {
      return false;
    }
    return true;
  });

  const handleExportCsv = () => {
    const headers = [
      'Pass ID',
      'Student Name',
      'Roll Number',
      'Department',
      'Reason',
      'Destination',
      'Emergency',
      'Exit Date',
      'Exit Time',
      'Return Date',
      'Return Time',
      'Status',
      'Reviewed By',
      'Returned At',
    ];
    const rows = filteredPasses.map((p) => [
      p.id,
      p.studentName,
      p.rollNumber,
      p.department,
      p.reason,
      p.destination,
      p.isEmergency ? 'Yes' : 'No',
      p.exitDate,
      p.exitTime,
      p.returnDate,
      p.returnTime,
      p.status,
      p.reviewedBy || 'Pending Review',
      p.returnedAt || '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map(escapeCsvValue).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gate-passes-register-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const columns = [
    {
      header: 'Pass ID',
      accessor: 'id',
      render: (row) => (
        <span className="rounded border border-slate-200 bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-900">
          {row.id}
        </span>
      ),
    },
    {
      header: 'Student Info',
      render: (row) => (
        <div>
          <span className="block text-xs font-semibold text-slate-900">{row.studentName}</span>
          <span className="text-[10px] text-slate-500">
            Roll: {row.rollNumber} | {row.department}
          </span>
        </div>
      ),
    },
    {
      header: 'Reason & Destination',
      render: (row) => (
        <div>
          <span className="block text-xs font-semibold text-slate-800">{row.reason}</span>
          <span className="text-[11px] text-slate-500">{row.destination}</span>
        </div>
      ),
    },
    {
      header: 'Schedule',
      render: (row) => (
        <div className="text-xs text-slate-600">
          <p className="font-medium text-slate-800">Exit: {formatDate(row.exitDate)}</p>
          <p className="text-slate-500">Return: {formatDate(row.returnDate)}</p>
        </div>
      ),
    },
    {
      header: 'Reviewer Staff',
      accessor: 'reviewedBy',
      render: (row) => (
        <span className="text-xs text-slate-600">
          {row.reviewedBy || 'Pending Review'}
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
        <button
          type="button"
          onClick={() => setInspectedPass(row)}
          className={`inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 ${focusRing}`}
        >
          <Eye className="h-3.5 w-3.5" />
          Inspect Pass
        </button>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Master Campus Gate Pass Register"
      subtitle="Central audit log of all out-pass applications across every college department."
      action={
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={filteredPasses.length === 0}
          className={`${buttonSecondary} px-3.5 py-2 text-xs`}
        >
          <Download className="h-4 w-4 text-slate-600" />
          Export CSV
        </button>
      }
    >
      <div className="mb-4 flex flex-col justify-between gap-3 rounded-md border border-slate-200 bg-white p-2.5 shadow-sm lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'USED', 'EXPIRED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize ${focusRing} ${
                statusFilter === st
                  ? 'bg-orange-700 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {st === 'ALL' ? 'All Register Entries' : st.toLowerCase()}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 border-t border-slate-200 pt-2 lg:border-t-0 lg:pt-0">
          <label htmlFor="admin-dept-filter" className="text-xs font-semibold text-slate-600">
            Department:
          </label>
          <select
            id="admin-dept-filter"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className={`rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-orange-700 focus:ring-2 focus:ring-orange-700 ${focusRing}`}
          >
            <option value="ALL">All Departments</option>
            {departmentChoices.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading master pass register..." />
      ) : error ? (
        <ErrorState
          title="Could not load pass register"
          description={error}
          onRetry={fetchAll}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredPasses}
          searchPlaceholder="Search master register by student, pass ID, or destination..."
          emptyTitle="No pass records match filter"
        />
      )}

      {/* Admin Pass Inspector Modal */}
      <Modal
        isOpen={Boolean(inspectedPass)}
        onClose={() => setInspectedPass(null)}
        title={inspectedPass ? `Pass Inspector - ${inspectedPass.id}` : 'Pass Inspector'}
        maxWidth="max-w-2xl"
      >
        {inspectedPass && (
          <div className="space-y-5">
            <div className="flex flex-col items-start justify-between gap-4 rounded-md border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                {inspectedPass.photo ? (
                  <img
                    src={inspectedPass.photo}
                    alt={inspectedPass.studentName}
                    className="h-12 w-12 shrink-0 rounded-md border border-slate-300 object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-slate-900 text-sm font-semibold text-white">
                    {getInitials(inspectedPass.studentName)}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">{inspectedPass.studentName}</h4>
                  <p className="font-mono text-xs font-semibold text-orange-700">
                    {inspectedPass.rollNumber}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {inspectedPass.department} {inspectedPass.semester ? `(${inspectedPass.semester})` : ''}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {inspectedPass.isEmergency && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-orange-800">
                    <AlertTriangle className="h-3 w-3" />
                    Emergency
                  </span>
                )}
                <StatusBadge status={inspectedPass.status} size="sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
              <div className="rounded-md border border-slate-200 p-3">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Reason</span>
                <span className="mt-0.5 block font-semibold text-slate-900">{inspectedPass.reason}</span>
              </div>
              <div className="rounded-md border border-slate-200 p-3">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Destination</span>
                <span className="mt-0.5 block font-semibold text-slate-900">{inspectedPass.destination}</span>
              </div>
              <div className="rounded-md border border-slate-200 p-3">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Scheduled Exit</span>
                <span className="mt-0.5 block font-semibold text-slate-900">
                  {formatDate(inspectedPass.exitDate)} at {inspectedPass.exitTime}
                </span>
              </div>
              <div className="rounded-md border border-slate-200 p-3">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Expected Return</span>
                <span className="mt-0.5 block font-semibold text-slate-900">
                  {formatDate(inspectedPass.returnDate)} at {inspectedPass.returnTime}
                </span>
              </div>
            </div>

            {inspectedPass.remarks && (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Student Remarks
                </span>
                <p className="mt-1 text-slate-700">{inspectedPass.remarks}</p>
              </div>
            )}

            {(inspectedPass.reviewedBy || inspectedPass.rejectionReason) && (
              <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-xs text-orange-900">
                <div className="flex items-center gap-1.5 font-semibold">
                  <UserCheck className="h-4 w-4 text-orange-700" />
                  <span>Reviewed by {inspectedPass.reviewedBy || 'Staff'}</span>
                  {inspectedPass.reviewedAt && (
                    <span className="font-normal text-slate-600">
                      ({formatDateTime(inspectedPass.reviewedAt)})
                    </span>
                  )}
                </div>
                {inspectedPass.clerkRemarks && (
                  <p className="mt-1 text-slate-700">Remarks: {inspectedPass.clerkRemarks}</p>
                )}
                {inspectedPass.rejectionReason && (
                  <p className="mt-1 font-medium text-orange-900">
                    Rejection Reason: {inspectedPass.rejectionReason}
                  </p>
                )}
              </div>
            )}

            {inspectedPass.returnedAt && (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                <strong>Return Check-In Recorded:</strong> {formatDateTime(inspectedPass.returnedAt)}
              </div>
            )}

            {(inspectedPass.status === PASS_STATUS.APPROVED || inspectedPass.status === PASS_STATUS.USED) &&
              inspectedPass.token && (
                <QRCodeDisplay
                  value={inspectedPass.token}
                  passId={inspectedPass.id}
                  studentName={inspectedPass.studentName}
                  size={150}
                  showActions={false}
                />
              )}

            <div className="flex justify-end border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={() => setInspectedPass(null)}
                className={buttonSecondary}
              >
                Close Inspector
              </button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
};

export default AllPassesPage;
