import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import FormInput from '../../components/forms/FormInput';
import Select from '../../components/forms/Select';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorState from '../../components/common/ErrorState';
import { useToast } from '../../hooks/useToast';
import { adminApi } from '../../api/admin.api';
import { DEPARTMENT_OPTIONS, ROLES } from '../../utils/constants';
import {
  UserPlus,
  UserCheck,
  UserX,
  Pencil,
  KeyRound,
  Trash2,
  Upload,
  Download,
  AlertCircle,
} from 'lucide-react';
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
  if (!name) return 'ST';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
};

const splitCsvLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
};

const parseStudentCsv = (text) => {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { validRows: [], invalidRows: [] };
  }

  const firstCells = splitCsvLine(lines[0]).map((c) => c.toLowerCase().replace(/\s+/g, ''));
  const hasHeader =
    firstCells.includes('name') ||
    firstCells.includes('email') ||
    firstCells.includes('rollnumber');

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const headerMap = hasHeader
    ? {
        name: firstCells.indexOf('name'),
        email: firstCells.indexOf('email'),
        rollNumber:
          firstCells.indexOf('rollnumber') !== -1
            ? firstCells.indexOf('rollnumber')
            : firstCells.indexOf('roll'),
        department: firstCells.indexOf('department'),
        semester: firstCells.indexOf('semester'),
        mobile: firstCells.indexOf('mobile'),
        password: firstCells.indexOf('password'),
      }
    : {
        name: 0,
        email: 1,
        rollNumber: 2,
        department: 3,
        semester: 4,
        mobile: 5,
        password: 6,
      };

  const validRows = [];
  const invalidRows = [];

  dataLines.forEach((line, idx) => {
    const cells = splitCsvLine(line);
    const name = headerMap.name >= 0 ? cells[headerMap.name] || '' : '';
    const email = headerMap.email >= 0 ? cells[headerMap.email] || '' : '';
    const rollNumber = headerMap.rollNumber >= 0 ? cells[headerMap.rollNumber] || '' : '';
    const department =
      (headerMap.department >= 0 ? cells[headerMap.department] : '') || DEPARTMENT_OPTIONS[0];
    const semester =
      (headerMap.semester >= 0 ? cells[headerMap.semester] : '') || '6th Semester';
    const mobile = headerMap.mobile >= 0 ? cells[headerMap.mobile] || '' : '';
    const password = headerMap.password >= 0 ? cells[headerMap.password] || '' : '';

    if (!name || !email || !rollNumber) {
      invalidRows.push({
        lineNumber: (hasHeader ? 2 : 1) + idx,
        raw: line,
        reason: 'Missing required name, email, or rollNumber',
      });
      return;
    }

    validRows.push({
      name,
      email,
      rollNumber,
      department,
      semester,
      mobile,
      role: ROLES.STUDENT,
      ...(password ? { password } : {}),
    });
  });

  return { validRows, invalidRows };
};

const EMPTY_STUDENT = {
  name: '',
  email: '',
  rollNumber: '',
  department: DEPARTMENT_OPTIONS[0],
  semester: '6th Semester',
  mobile: '',
  password: '',
};

const ManageStudentsPage = () => {
  const { addToast } = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudent, setNewStudent] = useState(EMPTY_STUDENT);
  const [addError, setAddError] = useState(null);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const [editingStudent, setEditingStudent] = useState(null);
  const [editError, setEditError] = useState(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState(null);
  const [submittingReset, setSubmittingReset] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [bulkError, setBulkError] = useState(null);
  const [bulkSummary, setBulkSummary] = useState(null);
  const [submittingBulk, setSubmittingBulk] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getUsersByRole(ROLES.STUDENT);
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load student directory.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminApi.getUsersByRole(ROLES.STUDENT);
        if (!cancelled) {
          setStudents(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(extractErrorMessage(err, 'Failed to load student directory.'));
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
      addToast(`Student (${name}) status set to ${!currentActive ? 'ACTIVE' : 'DISABLED'}`, 'info');
      await fetchStudents();
    } catch (err) {
      addToast(extractErrorMessage(err, 'Failed to change student status'), 'error');
    }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setAddError(null);
    if (!newStudent.name.trim() || !newStudent.email.trim() || !newStudent.rollNumber.trim()) {
      setAddError('Full name, official email, and roll number are required.');
      return;
    }

    setSubmittingAdd(true);
    try {
      await adminApi.createUser({
        ...newStudent,
        name: newStudent.name.trim(),
        email: newStudent.email.trim(),
        rollNumber: newStudent.rollNumber.trim(),
        role: ROLES.STUDENT,
      });
      addToast(`Student (${newStudent.name}) added successfully!`, 'success');
      setShowAddModal(false);
      setNewStudent(EMPTY_STUDENT);
      await fetchStudents();
    } catch (err) {
      const msg = extractErrorMessage(err, 'Failed to add student. Email or roll number may already exist.');
      setAddError(msg);
      addToast(msg, 'error');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    setEditError(null);

    if (!editingStudent.name.trim() || !editingStudent.email.trim() || !editingStudent.rollNumber.trim()) {
      setEditError('Name, email, and roll number are required.');
      return;
    }

    setSubmittingEdit(true);
    try {
      await adminApi.updateUser(editingStudent.id, {
        name: editingStudent.name.trim(),
        email: editingStudent.email.trim(),
        rollNumber: editingStudent.rollNumber.trim(),
        department: editingStudent.department,
        semester: editingStudent.semester,
        mobile: editingStudent.mobile,
      });
      addToast(`Updated profile for ${editingStudent.name}.`, 'success');
      setEditingStudent(null);
      await fetchStudents();
    } catch (err) {
      const msg = extractErrorMessage(err, 'Failed to update student. Email or roll number may already be in use.');
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
      addToast(`Student (${deleteTarget.name}) removed from directory.`, 'info');
      setDeleteTarget(null);
      await fetchStudents();
    } catch (err) {
      addToast(extractErrorMessage(err, 'Failed to delete student account.'), 'error');
    } finally {
      setSubmittingDelete(false);
    }
  };

  const parsedCsv = parseStudentCsv(csvText);

  const handleCsvFileSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result || ''));
      setBulkError(null);
      setBulkSummary(null);
    };
    reader.onerror = () => {
      setBulkError('Unable to read the selected CSV file.');
    };
    reader.readAsText(file);
  };

  const handleDownloadSampleCsv = () => {
    const sample = [
      'name,email,rollNumber,department,semester,mobile,password',
      'Aarav Mehta,aarav.mehta@sxiet.edu.in,CS2024011,Computer Science & Engg.,4th Semester,+91 98765 00011,password123',
      'Kavya Nair,kavya.nair@sxiet.edu.in,IT2024022,Information Technology,4th Semester,+91 98765 00022,password123',
    ].join('\n');
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'students-import-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkImportSubmit = async (e) => {
    e.preventDefault();
    setBulkError(null);
    setBulkSummary(null);

    if (parsedCsv.validRows.length === 0) {
      setBulkError('Provide at least one valid CSV row with name, email, and rollNumber.');
      return;
    }

    setSubmittingBulk(true);
    try {
      const result = await adminApi.bulkCreateUsers(parsedCsv.validRows);
      const createdCount =
        result?.createdCount ?? result?.created?.length ?? result?.inserted ?? parsedCsv.validRows.length;
      const skipped = result?.skipped || result?.errors || [];
      setBulkSummary({
        createdCount,
        skippedCount: Array.isArray(skipped) ? skipped.length : result?.skippedCount || 0,
        details: Array.isArray(skipped) ? skipped : [],
      });
      addToast(`Bulk import processed: ${createdCount} student(s) imported.`, 'success');
      await fetchStudents();
    } catch (err) {
      const msg = extractErrorMessage(err, 'Bulk student import failed.');
      setBulkError(msg);
      addToast(msg, 'error');
    } finally {
      setSubmittingBulk(false);
    }
  };

  const columns = [
    {
      header: 'Student Name',
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
      header: 'Roll Number',
      accessor: 'rollNumber',
      render: (row) => (
        <span className="rounded border border-slate-200 bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-800">
          {row.rollNumber}
        </span>
      ),
    },
    {
      header: 'Department & Sem',
      render: (row) => (
        <div className="text-xs text-slate-700">
          <span className="block font-semibold">{row.department}</span>
          <span className="text-[10px] text-slate-500">{row.semester || 'N/A'}</span>
        </div>
      ),
    },
    {
      header: 'Mobile',
      accessor: 'mobile',
      render: (row) => <span className="text-xs text-slate-600">{row.mobile || '-'}</span>,
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
              setEditingStudent({ ...row });
            }}
            title="Edit student"
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
            title="Reset password"
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
            title="Delete student"
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
      title="Student User Directory"
      subtitle="Manage student portal registration, bulk CSV onboarding, password resets, and account access."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setBulkError(null);
              setBulkSummary(null);
              setShowBulkModal(true);
            }}
            className={buttonSecondary}
          >
            <Upload className="h-4 w-4 text-slate-600" />
            Bulk CSV Import
          </button>
          <button
            type="button"
            onClick={() => {
              setAddError(null);
              setShowAddModal(true);
            }}
            className={buttonPrimary}
          >
            <UserPlus className="h-4 w-4" />
            Add New Student
          </button>
        </div>
      }
    >
      {loading ? (
        <LoadingSpinner label="Loading student directory..." />
      ) : error ? (
        <ErrorState
          title="Could not load student directory"
          description={error}
          onRetry={fetchStudents}
        />
      ) : (
        <DataTable
          columns={columns}
          data={students}
          searchPlaceholder="Search student by name, roll number, or department..."
          emptyTitle="No students found"
          emptyDescription="Click Add New Student or Bulk CSV Import to register student profiles."
        />
      )}

      {/* Add Student Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register New Student Profile"
      >
        <form onSubmit={handleCreateStudent} className="space-y-4">
          {addError && (
            <div className="flex items-start gap-2 rounded-md border border-orange-200 bg-orange-50 p-3 text-xs font-medium text-orange-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-700" />
              <span>{addError}</span>
            </div>
          )}

          <FormInput
            id="add-student-name"
            label="Full Name"
            value={newStudent.name}
            onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
            placeholder="e.g. Rahul Sharma"
            required
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              id="add-student-roll"
              label="Roll Number"
              value={newStudent.rollNumber}
              onChange={(e) => setNewStudent({ ...newStudent, rollNumber: e.target.value })}
              placeholder="e.g. CS2023045"
              required
            />

            <FormInput
              id="add-student-email"
              label="Official Email"
              type="email"
              value={newStudent.email}
              onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
              placeholder="rahul@sxiet.edu.in"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              id="add-student-dept"
              label="Department"
              value={newStudent.department}
              onChange={(e) => setNewStudent({ ...newStudent, department: e.target.value })}
              options={DEPARTMENT_OPTIONS}
              required
            />

            <FormInput
              id="add-student-semester"
              label="Semester"
              value={newStudent.semester}
              onChange={(e) => setNewStudent({ ...newStudent, semester: e.target.value })}
              placeholder="e.g. 6th Semester"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              id="add-student-mobile"
              label="Contact Mobile"
              value={newStudent.mobile}
              onChange={(e) => setNewStudent({ ...newStudent, mobile: e.target.value })}
              placeholder="+91 98765 43210"
            />

            <FormInput
              id="add-student-password"
              label="Initial Password (Optional)"
              type="password"
              value={newStudent.password}
              onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
              placeholder="Default: password123"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setShowAddModal(false)} className={buttonSecondary}>
              Cancel
            </button>
            <button type="submit" disabled={submittingAdd} className={buttonPrimary}>
              {submittingAdd ? 'Registering...' : 'Register Student'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Student Modal */}
      <Modal
        isOpen={Boolean(editingStudent)}
        onClose={() => setEditingStudent(null)}
        title="Edit Student Profile"
      >
        {editingStudent && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {editError && (
              <div className="flex items-start gap-2 rounded-md border border-orange-200 bg-orange-50 p-3 text-xs font-medium text-orange-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-700" />
                <span>{editError}</span>
              </div>
            )}

            <FormInput
              id="edit-student-name"
              label="Full Name"
              value={editingStudent.name || ''}
              onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
              required
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormInput
                id="edit-student-roll"
                label="Roll Number"
                value={editingStudent.rollNumber || ''}
                onChange={(e) => setEditingStudent({ ...editingStudent, rollNumber: e.target.value })}
                required
              />

              <FormInput
                id="edit-student-email"
                label="Official Email"
                type="email"
                value={editingStudent.email || ''}
                onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                id="edit-student-dept"
                label="Department"
                value={editingStudent.department || DEPARTMENT_OPTIONS[0]}
                onChange={(e) => setEditingStudent({ ...editingStudent, department: e.target.value })}
                options={DEPARTMENT_OPTIONS}
                required
              />

              <FormInput
                id="edit-student-semester"
                label="Semester"
                value={editingStudent.semester || ''}
                onChange={(e) => setEditingStudent({ ...editingStudent, semester: e.target.value })}
              />
            </div>

            <FormInput
              id="edit-student-mobile"
              label="Contact Mobile"
              value={editingStudent.mobile || ''}
              onChange={(e) => setEditingStudent({ ...editingStudent, mobile: e.target.value })}
            />

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => setEditingStudent(null)} className={buttonSecondary}>
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
              id="reset-student-password"
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

      {/* Bulk CSV Import Modal */}
      <Modal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        title="Bulk CSV Student Import"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleBulkImportSubmit} className="space-y-4">
          {bulkError && (
            <div className="flex items-start gap-2 rounded-md border border-orange-200 bg-orange-50 p-3 text-xs font-medium text-orange-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-700" />
              <span>{bulkError}</span>
            </div>
          )}

          {bulkSummary && (
            <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-xs text-orange-900">
              <p className="font-semibold">
                Import Complete: {bulkSummary.createdCount} student(s) created, {bulkSummary.skippedCount} skipped.
              </p>
              {bulkSummary.details.length > 0 && (
                <ul className="mt-1 list-disc pl-4 text-[11px]">
                  {bulkSummary.details.slice(0, 5).map((item, idx) => (
                    <li key={idx}>
                      {typeof item === 'string' ? item : `${item.email || item.rollNumber || 'Row'}: ${item.reason || item.message || 'Skipped'}`}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
            <span className="font-medium text-slate-700">
              Columns: <code className="font-mono text-slate-900">name,email,rollNumber,department,semester,mobile,password</code>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadSampleCsv}
                className={`${buttonSecondary} px-2.5 py-1.5 text-xs`}
              >
                <Download className="h-3.5 w-3.5" />
                Template
              </button>
              <label
                className={`cursor-pointer rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-orange-700 hover:bg-slate-50 ${focusRing}`}
              >
                Upload .CSV
                <input type="file" accept=".csv,text/csv" onChange={handleCsvFileSelect} className="sr-only" />
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="bulk-student-csv" className="mb-1.5 block text-xs font-semibold text-slate-700">
              Paste CSV Rows
            </label>
            <textarea
              id="bulk-student-csv"
              rows={6}
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                setBulkError(null);
              }}
              placeholder="name,email,rollNumber,department,semester,mobile,password"
              className={`w-full rounded-md border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900 focus:border-orange-700 focus:ring-2 focus:ring-orange-700 ${focusRing}`}
            />
          </div>

          {csvText.trim() && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <p className="font-semibold">
                Preview: {parsedCsv.validRows.length} valid row(s), {parsedCsv.invalidRows.length} invalid row(s)
              </p>
              {parsedCsv.invalidRows.length > 0 && (
                <p className="mt-1 text-orange-800">
                  Row {parsedCsv.invalidRows[0].lineNumber}: {parsedCsv.invalidRows[0].reason}
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowBulkModal(false)} className={buttonSecondary}>
              Close
            </button>
            <button
              type="submit"
              disabled={submittingBulk || parsedCsv.validRows.length === 0}
              className={buttonPrimary}
            >
              {submittingBulk ? 'Importing...' : `Import ${parsedCsv.validRows.length} Student(s)`}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Student Account"
        message={
          deleteTarget
            ? `Permanently delete ${deleteTarget.name} (${deleteTarget.rollNumber})? This action cannot be undone.`
            : ''
        }
        confirmText="Delete Student"
        type="danger"
        loading={submittingDelete}
      />
    </DashboardLayout>
  );
};

export default ManageStudentsPage;
