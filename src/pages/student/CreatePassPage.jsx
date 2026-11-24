import React, { useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { REASON_OPTIONS } from '../../utils/constants';
import { studentApi } from '../../api/student.api';
import { buttonPrimary, buttonSecondary, card, focusRing, input } from '../../utils/uiStyles';
import { AlertTriangle, Send, XCircle, Clock, RotateCcw } from 'lucide-react';

function parseSchedule(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const d = new Date(`${dateStr}T${timeStr}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeInput(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${mins}`;
}

const DURATION_PRESETS = [
  { id: '2h', label: '2 Hours', hours: 2 },
  { id: 'half', label: 'Half Day', hours: 5 },
  { id: 'weekend', label: 'Weekend', days: 2 },
];

const FieldLabel = ({ htmlFor, children, required = false }) => (
  <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-700">
    {children}
    {required && <span className="text-orange-700"> *</span>}
  </label>
);

const FieldError = ({ message, id }) =>
  message ? (
    <p id={id} className="text-xs font-medium text-orange-800">
      {message}
    </p>
  ) : null;

const TextField = ({ label, id, type = 'text', value, onChange, placeholder, required, error }) => (
  <div className="flex w-full flex-col gap-1.5">
    <FieldLabel htmlFor={id} required={required}>{label}</FieldLabel>
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      className={input}
    />
    <FieldError id={`${id}-error`} message={error} />
  </div>
);

const SelectField = ({ label, id, value, onChange, options, required, error }) => (
  <div className="flex w-full flex-col gap-1.5">
    <FieldLabel htmlFor={id} required={required}>{label}</FieldLabel>
    <select
      id={id}
      value={value}
      onChange={onChange}
      required={required}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      className={input}
    >
      <option value="" disabled>
        Select an option
      </option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
    <FieldError id={`${id}-error`} message={error} />
  </div>
);

const DateField = ({ label, id, value, onChange, min, required, error }) => (
  <div className="flex w-full flex-col gap-1.5">
    <FieldLabel htmlFor={id} required={required}>{label}</FieldLabel>
    <input
      id={id}
      type="date"
      value={value}
      onChange={onChange}
      min={min}
      required={required}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      className={input}
    />
    <FieldError id={`${id}-error`} message={error} />
  </div>
);

const TimeField = ({ label, id, value, onChange, required, error }) => (
  <div className="flex w-full flex-col gap-1.5">
    <FieldLabel htmlFor={id} required={required}>{label}</FieldLabel>
    <input
      id={id}
      type="time"
      value={value}
      onChange={onChange}
      required={required}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      className={input}
    />
    <FieldError id={`${id}-error`} message={error} />
  </div>
);

const CreatePassPage = () => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const today = formatDateInput(new Date());
  const prefill = location.state?.prefill || null;
  const reasonFromUrl = searchParams.get('reason');
  const destinationFromUrl = searchParams.get('destination');

  const [formData, setFormData] = useState(() => ({
    reason: prefill?.reason || reasonFromUrl || REASON_OPTIONS[0],
    destination: prefill?.destination || destinationFromUrl || '',
    exitDate: today,
    exitTime: '10:00',
    returnDate: today,
    returnTime: '18:00',
    guardianContact: prefill?.guardianContact || currentUser?.guardianContact || currentUser?.mobile || '',
    remarks: prefill?.remarks || '',
    isEmergency: Boolean(prefill?.isEmergency),
  }));

  const [activePreset, setActivePreset] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const applyDurationPreset = (preset) => {
    const base = parseSchedule(formData.exitDate || today, formData.exitTime || '10:00') || new Date();
    const nextReturn = new Date(base.getTime());

    if (preset.hours) {
      nextReturn.setHours(nextReturn.getHours() + preset.hours);
    } else if (preset.days) {
      nextReturn.setDate(nextReturn.getDate() + preset.days);
      nextReturn.setHours(20, 0, 0, 0);
    }

    setActivePreset(preset.id);
    setFormData((prev) => ({
      ...prev,
      exitDate: prev.exitDate || today,
      exitTime: prev.exitTime || '10:00',
      returnDate: formatDateInput(nextReturn),
      returnTime: formatTimeInput(nextReturn),
    }));
    setErrors((prev) => ({ ...prev, returnDate: undefined, returnTime: undefined }));
  };

  const calculateDuration = () => {
    const start = parseSchedule(formData.exitDate, formData.exitTime);
    const end = parseSchedule(formData.returnDate, formData.returnTime);
    if (!start || !end) return null;

    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return 'Invalid time range';

    const totalMinutes = Math.round(diffMs / 60000);
    const diffHours = Math.floor(totalMinutes / 60);
    const remMinutes = totalMinutes % 60;
    if (diffHours < 24) {
      if (diffHours === 0) return `${remMinutes} Minute${remMinutes === 1 ? '' : 's'} Out-Pass`;
      if (remMinutes === 0) return `${diffHours} Hour${diffHours === 1 ? '' : 's'} Out-Pass`;
      return `${diffHours}h ${remMinutes}m Out-Pass`;
    }
    const days = Math.floor(diffHours / 24);
    const remainingHours = diffHours % 24;
    return `${days} Day${days === 1 ? '' : 's'}${remainingHours > 0 ? ` ${remainingHours} Hour${remainingHours === 1 ? '' : 's'}` : ''} Overnight Leave`;
  };

  const durationText = calculateDuration();
  const isInvalidRange = durationText === 'Invalid time range';

  const validate = () => {
    const errs = {};
    if (!formData.reason) errs.reason = 'Reason is required';
    if (!formData.destination.trim()) errs.destination = 'Destination is required';
    if (!formData.exitDate) errs.exitDate = 'Exit date is required';
    if (!formData.exitTime) errs.exitTime = 'Exit time is required';
    if (!formData.returnDate) errs.returnDate = 'Return date is required';
    if (!formData.returnTime) errs.returnTime = 'Return time is required';

    const start = parseSchedule(formData.exitDate, formData.exitTime);
    const end = parseSchedule(formData.returnDate, formData.returnTime);
    if (start && end && end.getTime() <= start.getTime()) {
      errs.returnTime = 'Return date & time must be strictly after exit date & time';
    }

    if (formData.isEmergency && !formData.guardianContact.trim()) {
      errs.guardianContact = 'Guardian contact number required for emergency leave';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      addToast('Please fix the highlighted form errors before submitting.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const created = await studentApi.createRequest(formData, currentUser);
      addToast(`Gate Pass request (${created.id}) submitted successfully!`, 'success');
      navigate('/student/my-requests');
    } catch (err) {
      addToast(err?.response?.data?.message || err?.message || 'Failed to submit request', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="Create Digital Gate Pass Request"
      subtitle="Fill out the campus leave application form below. All fields marked with * are required."
    >
      <div className={`${card} mx-auto max-w-3xl space-y-6 p-6 sm:p-8`}>
        {prefill && (
          <div className="flex items-start gap-3 rounded-md border border-orange-200 bg-orange-50 p-4 text-xs text-orange-900">
            <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-orange-700" />
            <div>
              <p className="font-semibold">Quick Re-apply Loaded</p>
              <p className="mt-0.5 text-slate-700">
                Reason, destination, and remarks have been pre-filled from your previous pass. Verify your new exit and return schedule below.
              </p>
            </div>
          </div>
        )}

        <div>
          <p className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Quick Reason Presets
          </p>
          <div className="flex flex-wrap gap-2">
            {REASON_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, reason: opt }))}
                className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                  formData.reason === opt
                    ? 'border-orange-700 bg-orange-700 text-white hover:bg-orange-800'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                } ${focusRing}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2" noValidate>
          <div className="flex items-start gap-3 rounded-md border border-orange-200 bg-orange-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-700" />
            <div className="text-xs text-orange-900">
              <p className="font-semibold">Security Notice & Instructions:</p>
              <p className="mt-0.5">
                For emergency out-passes, check the Emergency flag below to notify the clerk for immediate priority review.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <SelectField
              label="Reason for Leaving"
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
              options={REASON_OPTIONS}
              required
              error={errors.reason}
            />
            <TextField
              label="Destination Address / City"
              id="destination"
              value={formData.destination}
              onChange={(e) => setFormData((prev) => ({ ...prev, destination: e.target.value }))}
              placeholder="e.g. City Hospital / Home Town / Bank Branch"
              required
              error={errors.destination}
            />
          </div>

          <div>
            <p className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Quick Duration Presets
            </p>
            <div className="flex flex-wrap gap-2">
              {DURATION_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyDurationPreset(preset)}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold ${
                    activePreset === preset.id
                      ? 'border-orange-700 bg-orange-700 text-white hover:bg-orange-800'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  } ${focusRing}`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <DateField
              label="Date of Departure"
              id="exitDate"
              value={formData.exitDate}
              onChange={(e) => {
                setActivePreset('');
                setFormData((prev) => ({ ...prev, exitDate: e.target.value }));
              }}
              min={today}
              required
              error={errors.exitDate}
            />
            <TimeField
              label="Expected Exit Time"
              id="exitTime"
              value={formData.exitTime}
              onChange={(e) => {
                setActivePreset('');
                setFormData((prev) => ({ ...prev, exitTime: e.target.value }));
              }}
              required
              error={errors.exitTime}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <DateField
              label="Expected Return Date"
              id="returnDate"
              value={formData.returnDate}
              onChange={(e) => {
                setActivePreset('');
                setFormData((prev) => ({ ...prev, returnDate: e.target.value }));
              }}
              min={formData.exitDate || today}
              required
              error={errors.returnDate}
            />
            <TimeField
              label="Expected Return Time"
              id="returnTime"
              value={formData.returnTime}
              onChange={(e) => {
                setActivePreset('');
                setFormData((prev) => ({ ...prev, returnTime: e.target.value }));
              }}
              required
              error={errors.returnTime}
            />
          </div>

          {durationText && (
            <div
              className={`flex items-center justify-between gap-4 rounded-md border p-4 ${
                isInvalidRange
                  ? 'border-orange-700 bg-orange-50'
                  : 'border-orange-200 bg-orange-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-orange-700 text-white">
                  <Clock className="h-5 w-5" />
                </span>
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Calculated Away Duration
                  </span>
                  <span className="mt-0.5 block text-sm font-semibold text-slate-900">
                    {isInvalidRange ? 'Return date & time must be after exit date & time' : durationText}
                  </span>
                </div>
              </div>
              <span className="rounded-md border border-orange-200 bg-white px-2.5 py-1 text-xs font-medium text-orange-800">
                {isInvalidRange ? 'Invalid range' : 'Auto-calculated'}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <TextField
              label="Guardian Contact Number"
              id="guardianContact"
              type="tel"
              value={formData.guardianContact}
              onChange={(e) => setFormData((prev) => ({ ...prev, guardianContact: e.target.value }))}
              placeholder="e.g. +91 9876543210"
              required={formData.isEmergency}
              error={errors.guardianContact}
            />
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="remarks">Additional Remarks (Optional)</FieldLabel>
              <textarea
                id="remarks"
                rows={2}
                value={formData.remarks}
                onChange={(e) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
                placeholder="Provide any additional leave details or specific instructions..."
                className={input}
              />
            </div>
          </div>

          <div className="rounded-md border border-orange-200 bg-orange-50 p-5">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isEmergency"
                checked={formData.isEmergency}
                onChange={(e) => setFormData((prev) => ({ ...prev, isEmergency: e.target.checked }))}
                className={`h-5 w-5 cursor-pointer rounded-md border border-slate-300 text-orange-700 ${focusRing}`}
              />
              <label htmlFor="isEmergency" className="cursor-pointer text-xs font-semibold text-slate-900">
                Mark as Emergency Out-Pass (Triggers Clerk Urgent Priority & Requires Guardian Contact)
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button type="button" onClick={() => navigate('/student/dashboard')} className={buttonSecondary}>
              <XCircle className="h-4 w-4" />
              Cancel
            </button>
            <button type="submit" disabled={loading} className={buttonPrimary}>
              <Send className="h-4 w-4" />
              {loading ? 'Submitting...' : 'Submit Gate Pass Application'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default CreatePassPage;
