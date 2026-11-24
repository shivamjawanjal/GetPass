import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import FormInput from '../../components/forms/FormInput';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import { useToast } from '../../hooks/useToast';
import { adminApi } from '../../api/admin.api';
import { ROLES } from '../../utils/constants';
import { UserPlus, UserCheck, UserX, Pencil, KeyRound, Trash2, AlertCircle } from 'lucide-react';
import { buttonPrimary, buttonSecondary, focusRing } from '../../utils/uiStyles';

const extractErrorMessage = (err, fallback) => {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
};

const getInitials = (name) => {
  if (!name) return 'CL';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
};

const EMPTY_CLERK = {
  name: '',
  email: '',
  rollNumber: '',
  department: 'Hostel Administration',
  mobile: '',
  password: '',
};

const ManageClerksPage = () => {
  const { addToast } = useToast();
  const [clerks, setClerks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newClerk, setNewClerk] = useState(EMPTY_CLERK);
  const [addError, setAddError] = useState(null);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const [editingClerk, setEditingClerk] = useState(null);
  const [editError, setEditError] = useState(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState(null);
  const [submittingReset, setSubmittingReset] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const fetchClerks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getUsersByRole(ROLES.CLERK);
      setClerks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(extractErrorMessage(err, 'Error fetching clerk accounts.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminApi.getUsersByRole(ROLES.CLERK);
        if (!cancelled) {
          setClerks(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(extractErrorMessage(err, 'Error fetching clerk accounts.'));
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

  const handleToggleStatus = async (id, name, currentActive) => {
    try {
      await adminApi.toggleStatus(id);
      addToast(`Clerk (${name}) set to ${!currentActive ? 'ACTIVE' : 'DISABLED'}`, 'info');
      await fetchClerks();
    } catch (err) {
      addToast(extractErrorMessage(err, 'Failed to change status'), 'error');
    }
  };

  const handleCreateClerk = async (e) => {
    e.preventDefault();
    setAddError(null);
    if (!newClerk.name.trim() || !newClerk.email.trim() || !newClerk.rollNumber.trim()) {
      setAddError('Officer name, staff ID code, and email address are required.');
      return;
    }

    setSubmittingAdd(true);
    try {
      await adminApi.createUser({
        ...newClerk,
        name: newClerk.name.trim(),
        email: newClerk.email.trim(),
        rollNumber: newClerk.rollNumber.trim(),
        role: ROLES.CLERK,
      });
      addToast(`Clerk (${newClerk.name}) created successfully!`, 'success');
      setShowAddModal(false);
      setNewClerk(EMPTY_CLERK);
      await fetchClerks();
    } catch (err) {
      const msg = extractErrorMessage(err, 'Failed to create clerk. Email or staff code may already exist.');
      setAddError(msg);
      addToast(msg, 'error');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingClerk) return;
    setEditError(null);

    if (!editingClerk.name.trim() || !editingClerk.email.trim() || !editingClerk.rollNumber.trim()) {
      setEditError('Name, staff ID code, and email are required.');
      return;
    }

    setSubmittingEdit(true);
    try {
      await adminApi.updateUser(editingClerk.id, {
        name: editingClerk.name.trim(),
        email: editingClerk.email.trim(),
        rollNumber: editingClerk.rollNumber.trim(),
        department: editingClerk.department,
        mobile: editingClerk.mobile,
      });
      addToast(`Updated clerk account for ${editingClerk.name}.`, 'success');
      setEditingClerk(null);
      await fetchClerks();
    } catch (err) {
      const msg = extractErrorMessage(err, 'Failed to update clerk. Email or staff code may already be in use.');
      setEditError(msg);
      addToast(msg, 'error');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetTarget) return;
    setResetError(null);

    if (!newPassword.trim() || newPassword.trim().length < 6) {
      setResetError('Password must be at least 6 characters long.');
      return;
    }

    setSubmittingReset(true);
    try {
      await adminApi.updateUser(resetTarget.id, { password: newPassword.trim() });
      addToast(`Password reset for ${resetTarget.name}.`, 'success');
      setResetTarget(null);
      setNewPassword('');
    } catch (err) {
      const msg = extractErrorMessage(err, 'Failed to reset password.');
      setResetError(msg);
      addToast(msg, 'error');
    } finally {
      setSubmittingReset(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setSubmittingDelete(true);
    try {
      await adminApi.deleteUser(deleteTarget.id);
      addToast(`Clerk (${deleteTarget.name}) removed from directory.`, 'info');
      setDeleteTarget(null);
      await fetchClerks();
    } catch (err) {
      addToast(extractErrorMessage(err, 'Failed to delete clerk account.'), 'error');
    } finally {
      setSubmittingDelete(false);
    }
  };

  const columns = [
    {
      header: 'Clerk Officer Name',
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.avatar ? (
            <img
              src={row.avatar}
              alt={row.name}
              className="h-9 w-9 shrink-0 rounded-md border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-900 text-xs font-semibold text-white">
              {getInitials(row.name)}
            </div>
          )}
          <div>
            <span className="block text-xs font-semibold text-slate-900">{row.name}</span>
            <span className="text-[10px] text-slate-500">{row.email}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Staff Code',
      accessor: 'rollNumber',
      render: (row) => (
        <span className="rounded border border-slate-200 bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-800">
          {row.rollNumber || 'CLK'}
        </span>
      ),
    },
    {
      header: 'Section / Department',
      accessor: 'department',
      render: (row) => <span className="text-xs font-semibold text-slate-800">{row.department || '-'}</span>,
    },
    {
      header: 'Account Status',
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
          {row.active ? <UserCheck className="h-3.5 w-3.5 text-orange-700" /> : <UserX className="h-3.5 w-3.5 text-slate-500" />}
          {row.active ? 'Active' : 'Disabled'}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (row) => (
        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => {
              setEditError(null);
              setEditingClerk({ ...row });
            }}
            className={`inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 ${focusRing}`}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              setResetError(null);
              setNewPassword('');
              setResetTarget(row);
            }}
            className={`inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 ${focusRing}`}
          >
            <KeyRound className="h-3.5 w-3.5" />
            Password
          </button>
          <button
            type="button"
            onClick={() => handleToggleStatus(row.id, row.name, row.active)}
            className={`inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 ${focusRing}`}
          >
            {row.active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
            {row.active ? 'Disable' : 'Enable'}
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            className={`inline-flex items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-semibold text-orange-800 hover:bg-orange-100 ${focusRing}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Clerk Staff Directory"
      subtitle="Manage hostel wardens and clerk staff authorized to review student gate passes."
      action={
        <button
          type="button"
          onClick={() => {
            setAddError(null);
            setShowAddModal(true);
          }}
          className={buttonPrimary}
        >
          <UserPlus className="h-4 w-4" />
          Add New Clerk
        </button>
      }
    >
      {loading ? (
        <LoadingSpinner label="Loading clerk accounts..." />
      ) : error ? (
        <ErrorState
          title="Could not load clerk accounts"
          description={error}
          onRetry={fetchClerks}
        />
      ) : (
        <DataTable
          columns={columns}
          data={clerks}
          searchPlaceholder="Search clerk staff by name or section..."
          emptyTitle="No clerks registered"
        />
      )}

      {/* Add Clerk Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Authorized Clerk Staff"
      >
        <form onSubmit={handleCreateClerk} className="space-y-4">
          {addError && (
            <div className="flex items-start gap-2 rounded-md border border-orange-200 bg-orange-50 p-3 text-xs font-medium text-orange-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-700" />
              <span>{addError}</span>
            </div>
          )}

          <FormInput
            id="add-clerk-name"
            label="Officer Name"
            value={newClerk.name}
            onChange={(e) => setNewClerk({ ...newClerk, name: e.target.value })}
            placeholder="e.g. Sunita Kulkarni"
            required
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              id="add-clerk-code"
              label="Staff ID Code"
              value={newClerk.rollNumber}
              onChange={(e) => setNewClerk({ ...newClerk, rollNumber: e.target.value })}
              placeholder="e.g. CLK003"
              required
            />

            <FormInput
              id="add-clerk-email"
              label="Email Address"
              type="email"
              value={newClerk.email}
              onChange={(e) => setNewClerk({ ...newClerk, email: e.target.value })}
              placeholder="clerk@sxiet.edu.in"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              id="add-clerk-dept"
              label="Administrative Section"
              value={newClerk.department}
              onChange={(e) => setNewClerk({ ...newClerk, department: e.target.value })}
              placeholder="e.g. Hostel Administration"
            />

            <FormInput
              id="add-clerk-mobile"
              label="Contact Mobile"
              value={newClerk.mobile}
              onChange={(e) => setNewClerk({ ...newClerk, mobile: e.target.value })}
              placeholder="+91 98220 11223"
            />
          </div>

          <FormInput
            id="add-clerk-password"
            label="Initial Password (Optional)"
            type="password"
            value={newClerk.password}
            onChange={(e) => setNewClerk({ ...newClerk, password: e.target.value })}
            placeholder="Default: password123"
          />

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setShowAddModal(false)} className={buttonSecondary}>
              Cancel
            </button>
            <button type="submit" disabled={submittingAdd} className={buttonPrimary}>
              {submittingAdd ? 'Adding...' : 'Add Clerk Staff'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Clerk Modal */}
      <Modal
        isOpen={Boolean(editingClerk)}
        onClose={() => setEditingClerk(null)}
        title="Edit Clerk Profile"
      >
        {editingClerk && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {editError && (
              <div className="flex items-start gap-2 rounded-md border border-orange-200 bg-orange-50 p-3 text-xs font-medium text-orange-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-700" />
                <span>{editError}</span>
              </div>
            )}

            <FormInput
              id="edit-clerk-name"
              label="Officer Name"
              value={editingClerk.name || ''}
              onChange={(e) => setEditingClerk({ ...editingClerk, name: e.target.value })}
              required
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormInput
                id="edit-clerk-code"
                label="Staff ID Code"
                value={editingClerk.rollNumber || ''}
                onChange={(e) => setEditingClerk({ ...editingClerk, rollNumber: e.target.value })}
                required
              />

              <FormInput
                id="edit-clerk-email"
                label="Email Address"
                type="email"
                value={editingClerk.email || ''}
                onChange={(e) => setEditingClerk({ ...editingClerk, email: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormInput
                id="edit-clerk-dept"
                label="Administrative Section"
                value={editingClerk.department || ''}
                onChange={(e) => setEditingClerk({ ...editingClerk, department: e.target.value })}
              />

              <FormInput
                id="edit-clerk-mobile"
                label="Contact Mobile"
                value={editingClerk.mobile || ''}
                onChange={(e) => setEditingClerk({ ...editingClerk, mobile: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => setEditingClerk(null)} className={buttonSecondary}>
                Cancel
              </button>
              <button type="submit" disabled={submittingEdit} className={buttonPrimary}>
                {submittingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={Boolean(resetTarget)}
        onClose={() => setResetTarget(null)}
        title={resetTarget ? `Reset Password - ${resetTarget.name}` : 'Reset Password'}
      >
        {resetTarget && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
            {resetError && (
              <div className="flex items-start gap-2 rounded-md border border-orange-200 bg-orange-50 p-3 text-xs font-medium text-orange-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-700" />
                <span>{resetError}</span>
              </div>
            )}

            <p className="text-xs text-slate-600">
              Set a new login password for <strong>{resetTarget.email}</strong> ({resetTarget.rollNumber}).
            </p>

            <FormInput
              id="reset-clerk-password"
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              required
            />

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setResetTarget(null)} className={buttonSecondary}>
                Cancel
              </button>
              <button type="submit" disabled={submittingReset} className={buttonPrimary}>
                {submittingReset ? 'Updating...' : 'Reset Password'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Clerk Account"
        message={
          deleteTarget
            ? `Permanently delete clerk ${deleteTarget.name} (${deleteTarget.rollNumber})? This action cannot be undone.`
            : ''
        }
        confirmText="Delete Clerk"
        type="danger"
        loading={submittingDelete}
      />
    </DashboardLayout>
  );
};

export default ManageClerksPage;
