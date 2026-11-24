import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ErrorState from '../../components/common/ErrorState';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { studentApi } from '../../api/student.api';
import { COLLEGE_INFO, PASS_STATUS } from '../../utils/constants';
import { buttonPrimary, card, input } from '../../utils/uiStyles';
import { ShieldCheck, Award, Save, AlertTriangle } from 'lucide-react';

function getInitials(name) {
  if (!name) return 'ST';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

const TextField = ({
  label,
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
}) => (
  <div className="flex w-full flex-col gap-1.5">
    <label htmlFor={id} className="text-sm font-semibold text-slate-700">
      {label}
      {required && <span className="text-orange-700"> *</span>}
    </label>
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      className={input}
    />
  </div>
);

const ProfileStat = ({ label, value, icon: Icon, accent = false }) => (
  <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
    <div className="flex items-center gap-3">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
          accent ? 'bg-orange-700 text-white' : 'bg-slate-200 text-slate-600'
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        <span className="mt-0.5 block text-sm font-semibold text-slate-900">{value}</span>
      </div>
    </div>
  </div>
);

const StudentProfilePage = () => {
  const { currentUser, updateUser } = useAuth();
  const { addToast } = useToast();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metricsError, setMetricsError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);

  const [mobile, setMobile] = useState(() => currentUser?.mobile || '');
  const [hostelRoom, setHostelRoom] = useState(() => currentUser?.hostelRoom || '');
  const [guardianContact, setGuardianContact] = useState(() => currentUser?.guardianContact || '');

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
          setMetricsError('');
        }
      } catch (err) {
        if (!cancelled) {
          setMetricsError(err?.response?.data?.message || err?.message || 'Unable to fetch pass metrics.');
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

  const totalRequests = requests.length;
  const approvedRequests = requests.filter(
    (r) => r.status === PASS_STATUS.APPROVED || r.status === PASS_STATUS.USED
  ).length;
  const rejectedRequests = requests.filter((r) => r.status === PASS_STATUS.REJECTED).length;
  const decidedRequests = approvedRequests + rejectedRequests;
  const emergencyPasses = requests.filter((r) => r.isEmergency).length;
  const approvalRate = decidedRequests > 0 ? Math.round((approvedRequests / decidedRequests) * 100) : null;

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!currentUser?.id) return;
    setSaving(true);
    try {
      const updated = await studentApi.updateProfile(currentUser.id, {
        mobile: mobile.trim(),
        hostelRoom: hostelRoom.trim(),
        guardianContact: guardianContact.trim(),
      });
      if (typeof updateUser === 'function') {
        updateUser(updated || { ...currentUser, mobile, hostelRoom, guardianContact });
      }
      addToast('Profile contact information updated successfully!', 'success');
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const totalSummaryText = loading
    ? 'Loading...'
    : totalRequests === 0
    ? '0 requests'
    : `${totalRequests} total (${approvedRequests} approved)`;

  const rateSummaryText = loading
    ? 'Loading...'
    : approvalRate === null
    ? 'No reviewed passes yet'
    : `${approvalRate}% (${approvedRequests}/${decidedRequests} decided)`;

  return (
    <DashboardLayout
      title="Student Profile & Settings"
      subtitle="Your registered academic details, gate pass usage stats, and emergency contact details."
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <div className={`${card} p-6 sm:p-8`}>
          <div className="flex flex-col items-center gap-6 border-b border-slate-200 pb-6 sm:flex-row">
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser?.name || 'Student'}
                className="h-24 w-24 shrink-0 rounded-md border border-slate-200 object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-slate-900 text-2xl font-bold text-white">
                {getInitials(currentUser?.name)}
              </div>
            )}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h3 className="text-2xl font-semibold text-slate-900">{currentUser?.name || 'Student'}</h3>
                <span className="rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-800">
                  Roll No: {currentUser?.rollNumber || 'N/A'}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{COLLEGE_INFO.name}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs sm:justify-start">
                <span className="rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                  Dept: {currentUser?.department || 'Not specified'}
                </span>
                <span className="rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                  Semester: {currentUser?.semester || 'Not specified'}
                </span>
                {hostelRoom && (
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                    Room: {hostelRoom}
                  </span>
                )}
              </div>
            </div>
          </div>

          {metricsError ? (
            <div className="pt-6">
              <ErrorState
                title="Unable to Load Pass Statistics"
                description={metricsError}
                onRetry={() => {
                  setLoading(true);
                  setMetricsError('');
                  setRefreshKey((k) => k + 1);
                }}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 pt-6 text-xs sm:grid-cols-3" aria-busy={loading}>
              <ProfileStat
                label="Total Gate Passes"
                value={totalSummaryText}
                icon={Award}
                accent
              />
              <ProfileStat
                label="Approval Rate"
                value={rateSummaryText}
                icon={ShieldCheck}
              />
              <ProfileStat
                label="Emergency Passes Recorded"
                value={loading ? 'Loading...' : `${emergencyPasses} recorded`}
                icon={AlertTriangle}
              />
            </div>
          )}
        </div>

        <div className={`${card} space-y-6 p-6 sm:p-8`}>
          <div className="border-b border-slate-200 pb-4">
            <h4 className="text-base font-semibold text-slate-900">Personal & Emergency Contact Details</h4>
            <p className="mt-0.5 text-xs text-slate-500">
              Update your phone number, hostel room allocation, and guardian emergency contact
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <TextField
                label="Official Student Email"
                id="email"
                value={currentUser?.email || ''}
                disabled
              />
              <TextField
                label="Student Contact Mobile"
                id="mobile"
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="e.g. +91 9876543210"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <TextField
                label="Hostel Room / Campus Residence"
                id="hostelRoom"
                value={hostelRoom}
                onChange={(e) => setHostelRoom(e.target.value)}
                placeholder="e.g. Block B - Room 304"
                required
              />
              <TextField
                label="Guardian Emergency Contact Number"
                id="guardianContact"
                type="tel"
                value={guardianContact}
                onChange={(e) => setGuardianContact(e.target.value)}
                placeholder="e.g. +91 9812345678"
                required
              />
            </div>

            <div className="flex items-start gap-3 rounded-md border border-orange-200 bg-orange-50 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-orange-700" />
              <div className="text-xs text-orange-900">
                <p className="font-semibold">Security & Verification Details</p>
                <p className="mt-0.5">
                  Contact details in this record are saved to your account and used as defaults on new gate pass requests.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button type="submit" disabled={saving} className={buttonPrimary}>
                <Save className="h-4 w-4" />
                {saving ? 'Saving Changes...' : 'Save Profile Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentProfilePage;
