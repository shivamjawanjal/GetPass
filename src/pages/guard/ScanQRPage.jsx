import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import QRScanner from '../../components/qr/QRScanner';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { guardApi } from '../../api/guard.api';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { buttonSecondary, card } from '../../utils/uiStyles';

const VERIFICATION_STORAGE_KEY = 'guard_last_verification';

const normalizeDefaultGate = (gate) => {
  if (!gate) return 'Main Gate';
  const lower = gate.toLowerCase();
  if (lower.includes('hostel')) return 'Hostel Gate';
  if (lower.includes('back') || lower.includes('north')) return 'Back Gate';
  return 'Main Gate';
};

const ScanQRPage = () => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [selectedGate, setSelectedGate] = useState(() => normalizeDefaultGate(currentUser?.gate));
  const [verifying, setVerifying] = useState(false);

  const persistAndNavigate = (result) => {
    try {
      sessionStorage.setItem(VERIFICATION_STORAGE_KEY, JSON.stringify(result));
    } catch {
      // Ignore storage quota issues
    }
    const passId = result?.pass?.id;
    const query = passId ? `?passId=${encodeURIComponent(passId)}` : '';
    navigate(`/guard/verification-result${query}`, { state: { result } });
  };

  const handleScanSuccess = async (token, meta = {}) => {
    const activeGate = meta.gate || selectedGate;
    setVerifying(true);
    try {
      const guardPayload = { ...currentUser, gate: activeGate };
      const result = await guardApi.verifyGatePassToken(token, guardPayload, activeGate);
      persistAndNavigate(result);
    } catch (err) {
      addToast(
        'Verification failed: ' + (err?.response?.data?.message || err?.message || 'Unknown error'),
        'error'
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleCheckInPass = async (pass, gate) => {
    const activeGate = gate || selectedGate;
    setVerifying(true);
    try {
      const response = await guardApi.checkIn({
        passId: pass.id,
        token: pass.token,
        gate: activeGate,
        guardId: currentUser?.id,
        guardUser: { ...currentUser, gate: activeGate },
      });

      const result = {
        isValid: true,
        scanType: 'entry',
        reason: null,
        pass: response?.pass || { ...pass, returnedAt: new Date().toISOString() },
        log: response?.log || {
          passId: pass.id,
          studentName: pass.studentName,
          rollNumber: pass.rollNumber,
          guardName: currentUser?.name || 'Gate Security',
          gate: activeGate,
          result: 'VALID',
          scanType: 'entry',
          scanTime: new Date().toISOString(),
          notes: 'Student Return Check-In Verified',
        },
      };

      addToast(`Return check-in logged for ${pass.studentName}.`, 'success');
      persistAndNavigate(result);
    } catch (err) {
      addToast(
        'Check-in failed: ' + (err?.response?.data?.message || err?.message || 'Unknown error'),
        'error'
      );
    } finally {
      setVerifying(false);
    }
  };

  return (
    <DashboardLayout
      title="QR Gate Pass Scanner"
      subtitle="Verify student passes at the gate via live camera, QR image upload, or manual lookup."
      action={
        <button
          type="button"
          onClick={() => navigate('/guard/dashboard')}
          className={`${buttonSecondary} px-3.5 py-2 text-xs`}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Gate Dashboard
        </button>
      }
    >
      <div className="mx-auto max-w-2xl space-y-5">
        <div className={`${card} flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-4 py-3 text-xs`}>
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <ShieldCheck className="h-4 w-4 text-orange-700" />
            <span>Officer on Duty: {currentUser?.name || 'Gate Security'}</span>
          </div>
          <span className="rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 font-semibold text-orange-800">
            Post: {selectedGate}
          </span>
        </div>

        {verifying ? (
          <div className={`${card} p-12 text-center`}>
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-orange-200 border-t-orange-700" />
            <p className="text-sm font-semibold text-slate-900">Verifying Pass with Security Server...</p>
            <p className="mt-1 text-xs text-slate-500">
              Checking pass validity, expiration, and recording scan log at {selectedGate}.
            </p>
          </div>
        ) : (
          <QRScanner
            defaultGate={selectedGate}
            onGateChange={setSelectedGate}
            onScanSuccess={handleScanSuccess}
            onCheckInPass={handleCheckInPass}
            onScanError={(msg) => addToast(msg, 'warning')}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default ScanQRPage;
