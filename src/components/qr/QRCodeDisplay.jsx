import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Download, Printer, ShieldCheck } from 'lucide-react';
import { buttonPrimary, buttonSecondary, card } from '../../utils/uiStyles';

const QRCodeDisplay = ({ value, passId, studentName, size = 200, showActions = true }) => {
  const qrRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const referenceCode = value || passId || '';

  const handlePrint = () => {
    window.print();
  };

  const handleCopyReference = async () => {
    if (!referenceCode) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(referenceCode);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = referenceCode;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      const padding = 28;
      const headerHeight = studentName || passId ? 54 : 0;
      canvas.width = Math.max(img.width + padding * 2, 280);
      canvas.height = img.height + padding * 2 + headerHeight;

      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

        const qrX = Math.round((canvas.width - img.width) / 2);
        const qrY = padding;
        ctx.drawImage(img, qrX, qrY);

        if (headerHeight > 0) {
          const textCenterX = Math.round(canvas.width / 2);
          let textY = qrY + img.height + 20;

          if (studentName) {
            ctx.fillStyle = '#0f172a';
            ctx.font = '600 14px system-ui, -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(studentName, textCenterX, textY);
            textY += 18;
          }

          if (passId) {
            ctx.fillStyle = '#c2410c';
            ctx.font = '600 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`Pass ID: ${passId}`, textCenterX, textY);
          }
        }

        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `GatePass-${passId || 'QR'}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };

    const encodedSvg = btoa(unescape(encodeURIComponent(svgData)));
    img.src = `data:image/svg+xml;base64,${encodedSvg}`;
  };

  return (
    <div className={`${card} flex flex-col items-center justify-center p-6`}>
      {(studentName || passId) && (
        <div className="mb-4 w-full border-b border-slate-200 pb-3 text-center">
          {studentName && (
            <p className="text-sm font-semibold text-slate-900">{studentName}</p>
          )}
          {passId && (
            <p className="mt-0.5 font-mono text-xs font-semibold text-orange-700">
              Pass ID: {passId}
            </p>
          )}
        </div>
      )}

      <div ref={qrRef} className="flex items-center justify-center rounded-md border border-slate-200 bg-white p-4">
        {value ? (
          <QRCodeSVG
            value={value}
            size={size}
            level="H"
            includeMargin={true}
            bgColor="#ffffff"
            fgColor="#0f172a"
          />
        ) : (
          <div className="flex h-48 w-48 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-500">
            QR Code Not Generated
          </div>
        )}
      </div>

      <div className="mt-4 w-full text-center">
        <div className="inline-flex items-center gap-1.5 rounded-md border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800">
          <ShieldCheck className="h-4 w-4" />
          VERIFIED GATE TOKEN
        </div>
        {referenceCode && (
          <p className="mt-2 break-all font-mono text-[11px] text-slate-600">
            Ref: {referenceCode}
          </p>
        )}
        <p className="mt-1.5 text-xs font-medium text-slate-500">
          Show this QR code at the security gate for instant scanner verification.
        </p>
      </div>

      {showActions && (
        <div className="no-print mt-5 flex w-full max-w-sm flex-wrap items-center justify-center gap-2">
          {referenceCode && (
            <button
              type="button"
              onClick={handleCopyReference}
              className={`${buttonSecondary} flex-1 px-3 py-2 text-xs`}
            >
              {copied ? <Check className="h-4 w-4 text-orange-700" /> : <Copy className="h-4 w-4 text-slate-600" />}
              {copied ? 'Copied' : 'Copy Reference'}
            </button>
          )}
          <button
            type="button"
            onClick={handleDownload}
            disabled={!value}
            className={`${buttonSecondary} flex-1 px-3 py-2 text-xs`}
          >
            <Download className="h-4 w-4 text-slate-600" />
            Save QR
          </button>
          <button type="button" onClick={handlePrint} className={`${buttonPrimary} flex-1 px-3 py-2 text-xs`}>
            <Printer className="h-4 w-4" />
            Print Pass
          </button>
        </div>
      )}
    </div>
  );
};

export default QRCodeDisplay;
