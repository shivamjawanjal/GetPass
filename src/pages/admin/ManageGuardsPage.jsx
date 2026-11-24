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
  if (!name) return 'GR';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
};

const EMPTY_GUARD = {
  name: '',
  email: '',
  rollNumber: '',
  gate: 'Main Gate',
  mobile: '',
  password: '',
};

const ManageGuardsPage = () => {
  const { addToast } = useToast();
  const [guards, setGuards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newGuard, setNewGuard] = useState(EMPTY_GUARD);
  const [addError, setAddError] = useState(null);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const [editingGuard, setEditingGuard] = useState(null);
  const [editError, setEditError] = useState(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState(null);
  const [submittingReset, setSubmittingReset] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const fetchGuards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getUsersByRole(ROLES.GUARD);
      setGuards(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(extractErrorMessage(err, 'Error fetching security guards.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminApi.getUsersByRole(ROLES.GUARD);
        if (!cancelled) {
          setGuards(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(extractErrorMessage(err, 'Error fetching security guards.'));
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
      addToast(`Guard (${name}) status updated to ${!currentActive ? 'ACTIVE' : 'DISABLED'}`, 'info');
      await fetchGuards();
    } catch (err) {
      addToast(extractErrorMessage(err, 'Failed to toggle status'), 'error');
    }
  };

  const handleCreateGuard = async (e) => {
    e.preventDefault();
    setAddError(null);
    if (!newGuard.name.trim() || !newGuard.email.trim() || !newGuard.rollNumber.trim()) {
      setAddError('Guard name, guard ID code, and email address are required.');
      return;
    }

    setSubmittingAdd(true);
    try {
      await adminApi.createUser({
        ...newGuard,
        name: newGuard.name.trim(),
        email: newGuard.email.trim(),
        rollNumber: newGuard.rollNumber.trim(),
        role: ROLES.GUARD,
      });
      addToast(`Security Guard (${newGuard.name}) registered!`, 'success');
      setShowAddModal(false);
      setNewGuard(EMPTY_GUARD);
      await fetchGuards();
    } catch (err) {
      const msg = extractErrorMessage(err, 'Failed to create guard. Email or guard ID may already exist.');
      setAddError(msg);
      addToast(msg, 'error');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingGuard) return;
    setEditError(null);

    if (!editingGuard.name.trim() || !editingGuard.email.trim() || !editingGuard.rollNumber.trim()) {
      setEditError('Name, guard ID code, and email are required.');
      return;
    }

    setSubmittingEdit(true);
    try {
      await adminApi.updateUser(editingGuard.id, {
        name: editingGuard.name.trim(),
        email: editingGuard.email.trim(),
        rollNumber: editingGuard.rollNumber.trim(),
        gate: editingGuard.gate,
        mobile: editingGuard.mobile,
      });
      addToast(`Updated guard profile for ${editingGuard.name}.`, 'success');
      setEditingGuard(null);
      await fetchGuards();
    } catch (err) {
      const msg = extractErrorMessage(err, 'Failed to update guard. Email or guard ID may already be in use.');
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
      addToast(`Guard (${deleteTarget.name}) removed from directory.`, 'info');
      setDeleteTarget(null);
      await fetchGuards();
    } catch (err) {
      addToast(extractErrorMessage(err, 'Failed to delete guard account.'), 'error');
    } finally {
      setSubmittingDelete(false);
    }
  };

  const columns = [
    {
      header: 'Guard Officer Name',
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
      header: 'Guard ID',
      accessor: 'rollNumber',
      render: (row) => (
        <span className="rounded border border-slate-200 bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-800">
          {row.rollNumber || 'GRD'}
        </span>
      ),
    },
    {
      header: 'Assigned Gate',
      accessor: 'gate',
      render: (row) => (
        <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {row.gate || 'Main Gate'}
        </span>
      ),
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
              setEditingGuard({ ...row });
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
      title="Security Guard Directory"
      subtitle="Manage campus gate security officers, assign gate posts, and toggle QR scanner authorizations."
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
          Add Security Guard
        </button>
      }
    >
      {loading ? (
        <LoadingSpinner label="Loading security personnel..." />
      ) : error ? (
        <ErrorState
          title="Could not load security guards"
          description={error}
          onRetry={fetchGuards}
        />
      ) : (
        <DataTable
          columns={columns}
          data={guards}
          searchPlaceholder="Search guard by name or assigned gate..."
          emptyTitle="No security personnel registered"
        />
      )}

      {/* Add Guard Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Security Guard Account"
      >
        <form onSubmit={handleCreateGuard} className="space-y-4">
          {addError && (
            <div className="flex items-start gap-2 rounded-md border border-orange-200 bg-orange-50 p-3 text-xs font-medium text-orange-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-700" />
              <span>{addError}</span>
            </div>
          )}

          <FormInput
            id="add-guard-name"
            label="Guard Full Name"
            value={newGuard.name}
            onChange={(e) => setNewGuard({ ...newGuard, name: e.target.value })}
            placeholder="e.g. Ramesh Powar"
            required
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              id="add-guard-code"
              label="Guard ID Code"
              value={newGuard.rollNumber}
              onChange={(e) => setNewGuard({ ...newGuard, rollNumber: e.target.value })}
              placeholder="e.g. GRD003"
              required
            />

            <FormInput
              id="add-guard-email"
              label="Email Address"
              type="email"
              value={newGuard.email}
              onChange={(e) => setNewGuard({ ...newGuard, email: e.target.value })}
              placeholder="guard@sxiet.edu.in"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              id="add-guard-gate"
              label="Assigned Campus Gate Post"
              value={newGuard.gate}
              onChange={(e) => setNewGuard({ ...newGuard, gate: e.target.value })}
              placeholder="e.g. Main Gate / Hostel Gate"
            />

            <FormInput
              id="add-guard-mobile"
              label="Contact Mobile"
              value={newGuard.mobile}
              onChange={(e) => setNewGuard({ ...newGuard, mobile: e.target.value })}
              placeholder="+91 94220 99887"
            />
          </div>

          <FormInput
            id="add-guard-password"
            label="Initial Password (Optional)"
            type="password"
            value={newGuard.password}
            onChange={(e) => setNewGuard({ ...newGuard, password: e.target.value })}
            placeholder="Default: password123"
          />

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setShowAddModal(false)} className={buttonSecondary}>
              Cancel
            </button>
            <button type="submit" disabled={submittingAdd} className={buttonPrimary}>
              {submittingAdd ? 'Adding...' : 'Add Guard Officer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Guard Modal */}
      <Modal
        isOpen={Boolean(editingGuard)}
        onClose={() => setEditingGuard(null)}
        title="Edit Security Guard Profile"
      >
        {editingGuard && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {editError && (
              <div className="flex items-start gap-2 rounded-md border border-orange-200 bg-orange-50 p-3 text-xs font-medium text-orange-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-700" />
                <span>{editError}</span>
              </div>
            )}

            <FormInput
              id="edit-guard-name"
              label="Guard Full Name"
              value={editingGuard.name || ''}
              onChange={(e) => setEditingGuard({ ...editingGuard, name: e.target.value })}
              required
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormInput
                id="edit-guard-code"
                label="Guard ID Code"
                value={editingGuard.rollNumber || ''}
                onChange={(e) => setEditingGuard({ ...editingGuard, rollNumber: e.target.value })}
                required
              />

              <FormInput
                id="edit-guard-email"
                label="Email Address"
                type="email"
                value={editingGuard.email || ''}
                onChange={(e) => setEditingGuard({ ...editingGuard, email: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormInput
                id="edit-guard-gate"
                label="Assigned Campus Gate Post"
                value={editingGuard.gate || ''}
                onChange={(e) => setEditingGuard({ ...editingGuard, gate: e.target.value })}
              />

              <FormInput
                id="edit-guard-mobile"
                label="Contact Mobile"
                value={editingGuard.mobile || ''}
                onChange={(e) => setEditingGuard({ ...editingGuard, mobile: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => setEditingGuard(null)} className={buttonSecondary}>
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
              id="reset-guard-password"
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
        title="Delete Security Guard Account"
        message={
          deleteTarget
            ? `Permanently delete security guard ${deleteTarget.name} (${deleteTarget.rollNumber})? This action cannot be undone.`
            : ''
        }
        confirmText="Delete Guard"
        type="danger"
        loading={submittingDelete}
      />
    </DashboardLayout>
  );
};

export default ManageGuardsPage;
