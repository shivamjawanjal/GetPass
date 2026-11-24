import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  CameraOff,
  Search,
  Upload,
  Volume2,
  VolumeX,
  MapPin,
  KeyRound,
  LogIn,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { guardApi } from '../../api/guard.api';
import StatusBadge from '../common/StatusBadge';
import { formatDate } from '../../utils/dateUtils';
import { PASS_STATUS } from '../../utils/constants';
import { buttonPrimary, buttonSecondary, focusRing } from '../../utils/uiStyles';

const GATE_OPTIONS = ['Main Gate', 'Hostel Gate', 'Back Gate'];

const playBeepSound = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    osc.onended = () => {
      ctx.close().catch(() => {});
    };
  } catch {
    // Ignore audio context errors in restricted browsers
  }
};

const decodeFromCanvas = async (canvas, ctx, detector) => {
  if (detector) {
    try {
      const results = await detector.detect(canvas);
      const match = results.find((item) => item?.rawValue);
      if (match?.rawValue) {
        return match.rawValue;
      }
    } catch {
      // Fallback to jsQR below
    }
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  });
  return code?.data || null;
};

const QRScanner = ({
  onScanSuccess,
  onScanError,
  onCheckInPass,
  defaultGate = 'Main Gate',
  onGateChange,
}) => {
  const [activeTab, setActiveTab] = useState('camera');
  const [selectedGate, setSelectedGate] = useState(
    GATE_OPTIONS.includes(defaultGate) ? defaultGate : GATE_OPTIONS[0]
  );
  const [beepEnabled, setBeepEnabled] = useState(true);

  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [decodingImage, setDecodingImage] = useState(false);

  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupResults, setLookupResults] = useState([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupSearched, setLookupSearched] = useState(false);
  const [lookupError, setLookupError] = useState(null);
  const [manualToken, setManualToken] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const scanTimerRef = useRef(null);
  const detectorRef = useRef(null);
  const handledScanRef = useRef(false);

  const stopCameraStream = useCallback(() => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });
      } catch {
        detectorRef.current = null;
      }
    }
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  const handleGateSelect = (gate) => {
    setSelectedGate(gate);
    if (onGateChange) {
      onGateChange(gate);
    }
  };

  const emitDecodedToken = useCallback(
    (token, extra = {}) => {
      if (!token) return;
      if (beepEnabled) {
        playBeepSound();
      }
      stopCameraStream();
      onScanSuccess(token, { gate: selectedGate, ...extra });
    },
    [beepEnabled, onScanSuccess, selectedGate, stopCameraStream]
  );

  const handleStartScanner = async () => {
    setCameraError(null);
    setUploadError(null);
    handledScanRef.current = false;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API is unavailable in this browser. Use QR Image Upload or Manual Lookup.');
      return;
    }

    setIsScanning(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }

      scanTimerRef.current = setInterval(async () => {
        if (handledScanRef.current) return;
        const video = videoRef.current;
        if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
          return;
        }

        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const decoded = await decodeFromCanvas(canvas, ctx, detectorRef.current);

        if (decoded && !handledScanRef.current) {
          handledScanRef.current = true;
          emitDecodedToken(decoded.trim());
        }
      }, 220);
    } catch (err) {
      stopCameraStream();
      setCameraError(
        err?.message
          ? `Camera unavailable (${err.message}). Use QR Image Upload or Manual Pass Lookup.`
          : 'Camera permission denied or unavailable. Use QR Image Upload or Manual Pass Lookup.'
      );
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadError(null);
    setDecodingImage(true);

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = async () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx || !canvas.width || !canvas.height) {
          throw new Error('Unable to read uploaded image dimensions.');
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const decoded = await decodeFromCanvas(canvas, ctx, detectorRef.current);

        if (decoded) {
          emitDecodedToken(decoded.trim());
        } else {
          const msg = 'No valid QR code found in this image. Please upload a clear QR screenshot.';
          setUploadError(msg);
          if (onScanError) onScanError(msg);
        }
      } catch (err) {
        const msg = err?.message || 'Failed to decode uploaded QR image.';
        setUploadError(msg);
        if (onScanError) onScanError(msg);
      } finally {
        URL.revokeObjectURL(objectUrl);
        setDecodingImage(false);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setDecodingImage(false);
      const msg = 'Could not open image file. Please select a valid PNG/JPG QR screenshot.';
      setUploadError(msg);
      if (onScanError) onScanError(msg);
    };

    img.src = objectUrl;
  };

  const handleManualLookup = async (e) => {
    e.preventDefault();
    const q = lookupQuery.trim();
    if (!q) return;

    setLookupLoading(true);
    setLookupError(null);
    setLookupSearched(true);

    try {
      const results = await guardApi.lookupPass(q);
      setLookupResults(Array.isArray(results) ? results : []);
    } catch (err) {
      setLookupResults([]);
      setLookupError(err?.response?.data?.message || err?.message || 'Failed to search passes.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleManualTokenSubmit = (e) => {
    e.preventDefault();
    const token = manualToken.trim();
    if (!token) return;
    emitDecodedToken(token);
  };

  return (
    <div className="mx-auto w-full max-w-xl rounded-md border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      {/* Duty Controls Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-orange-700" />
          <label htmlFor="scanner-gate-select" className="text-xs font-semibold text-slate-700">
            Active Gate:
          </label>
          <select
            id="scanner-gate-select"
            value={selectedGate}
            onChange={(e) => handleGateSelect(e.target.value)}
            className={`rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-orange-700 focus:ring-2 focus:ring-orange-700 ${focusRing}`}
          >
            {GATE_OPTIONS.map((gate) => (
              <option key={gate} value={gate}>
                {gate}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setBeepEnabled((prev) => !prev)}
          aria-pressed={beepEnabled}
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold ${focusRing} ${
            beepEnabled
              ? 'border-orange-200 bg-orange-50 text-orange-800'
              : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          {beepEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          {beepEnabled ? 'Audio Beep On' : 'Audio Muted'}
        </button>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-md border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => setActiveTab('camera')}
          className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold ${focusRing} ${
            activeTab === 'camera'
              ? 'bg-orange-700 text-white'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Camera className="h-3.5 w-3.5" />
          Camera & QR Image
        </button>
        <button
          type="button"
          onClick={() => {
            stopCameraStream();
            setActiveTab('lookup');
          }}
          className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold ${focusRing} ${
            activeTab === 'lookup'
              ? 'bg-orange-700 text-white'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Search className="h-3.5 w-3.5" />
          Manual Pass / Roll Lookup
        </button>
      </div>

      {activeTab === 'camera' ? (
        <div className="space-y-4">
          <div className="relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-md border-4 border-slate-800 bg-slate-950">
            {isScanning ? (
              <div className="relative flex h-full w-full flex-col items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 h-full w-full object-cover"
                />

                <div className="relative z-10 flex h-56 w-56 items-center justify-center rounded-md border-2 border-orange-700">
                  <div className="absolute left-0 top-0 h-6 w-6 rounded-tl-md border-l-4 border-t-4 border-orange-700" />
                  <div className="absolute right-0 top-0 h-6 w-6 rounded-tr-md border-r-4 border-t-4 border-orange-700" />
                  <div className="absolute bottom-0 left-0 h-6 w-6 rounded-bl-md border-b-4 border-l-4 border-orange-700" />
                  <div className="absolute bottom-0 right-0 h-6 w-6 rounded-br-md border-b-4 border-r-4 border-orange-700" />
                  <div className="absolute h-0.5 w-full bg-orange-700" />
                </div>

                <div className="absolute bottom-4 z-10 flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-xs text-white">
                  <span className="h-2 w-2 rounded-full bg-orange-700" />
                  Scanning {selectedGate} - Align QR Code
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center p-6 text-center">
                <div className="mb-3 rounded-md bg-slate-800 p-4">
                  <CameraOff className="h-10 w-10 text-orange-700" />
                </div>
                <h4 className="text-base font-semibold text-white">QR Scanner Standby</h4>
                <p className="mt-1 max-w-xs text-xs text-slate-400">
                  Start the live camera to decode student QR passes, upload a QR screenshot, or switch to Manual Lookup.
                </p>
              </div>
            )}
          </div>

          {cameraError && (
            <div className="flex items-start gap-2 rounded-md border border-orange-200 bg-orange-50 p-3 text-xs text-orange-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-700" />
              <span>{cameraError}</span>
            </div>
          )}

          <div>
            {!isScanning ? (
              <button type="button" onClick={handleStartScanner} className={`${buttonPrimary} w-full py-3`}>
                <Camera className="h-4 w-4" />
                Start Scanner Camera
              </button>
            ) : (
              <button
                type="button"
                onClick={stopCameraStream}
                className={`flex w-full items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 ${focusRing}`}
              >
                <CameraOff className="h-4 w-4" />
                Stop Camera
              </button>
            )}
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-medium text-slate-700">
                <Upload className="h-4 w-4 shrink-0 text-orange-700" />
                <span>Decode QR Image / Screenshot</span>
              </div>
              <label
                className={`cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-1.5 font-semibold text-orange-700 hover:bg-slate-50 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-orange-700 ${focusRing}`}
              >
                {decodingImage ? 'Decoding...' : 'Browse Image'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={decodingImage}
                  className="sr-only"
                />
              </label>
            </div>
            {uploadError && (
              <p className="mt-2 font-medium text-orange-800">{uploadError}</p>
            )}
          </div>

          <form onSubmit={handleManualTokenSubmit} className="pt-1">
            <div className="relative flex items-center">
              <KeyRound className="absolute left-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Paste or type QR token string directly..."
                className={`w-full rounded-md border border-slate-300 bg-white py-2.5 pl-9 pr-24 text-xs text-slate-900 focus:border-orange-700 focus:ring-2 focus:ring-orange-700 ${focusRing}`}
              />
              <button
                type="submit"
                disabled={!manualToken.trim()}
                className={`absolute right-1 rounded-md bg-orange-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
              >
                Verify
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          <form onSubmit={handleManualLookup} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                placeholder="Search Pass ID, Roll Number, Student Name, or Reference..."
                className={`w-full rounded-md border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-xs text-slate-900 focus:border-orange-700 focus:ring-2 focus:ring-orange-700 ${focusRing}`}
              />
            </div>
            <button
              type="submit"
              disabled={!lookupQuery.trim() || lookupLoading}
              className={`${buttonPrimary} shrink-0 px-4 py-2 text-xs`}
            >
              {lookupLoading ? 'Searching...' : 'Lookup'}
            </button>
          </form>

          {lookupError && (
            <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-xs text-orange-800">
              {lookupError}
            </div>
          )}

          {lookupResults.length > 0 ? (
            <div className="max-h-96 space-y-2.5 overflow-y-auto pr-1">
              {lookupResults.map((pass) => (
                <div
                  key={pass.id}
                  className="flex flex-col justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-3.5 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-900">{pass.id}</span>
                      <StatusBadge status={pass.status} size="sm" />
                    </div>
                    <p className="truncate text-xs font-semibold text-slate-900">
                      {pass.studentName} ({pass.rollNumber})
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      {pass.destination} - Exit {formatDate(pass.exitDate)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {pass.status === PASS_STATUS.USED && onCheckInPass ? (
                      <button
                        type="button"
                        onClick={() => onCheckInPass(pass, selectedGate)}
                        className={`${buttonSecondary} px-3 py-1.5 text-xs`}
                      >
                        <LogIn className="h-3.5 w-3.5 text-orange-700" />
                        Log Return Check-In
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => emitDecodedToken(pass.token || pass.id, { pass })}
                        className={`${buttonPrimary} px-3 py-1.5 text-xs`}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Verify Pass
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : lookupSearched && !lookupLoading && !lookupError ? (
            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-xs text-slate-500">
              No gate passes matched "{lookupQuery}". Check the Pass ID, roll number, or student name.
            </div>
          ) : (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
              Enter a Pass ID (e.g. GP-2026-1001), roll number (e.g. CS2023045), or student name to verify passes when a student phone screen is damaged or offline.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QRScanner;
