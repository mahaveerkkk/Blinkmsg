import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Zap, AlertCircle, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { sound } from '../services/sound';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [torchOn, setTorchOn] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef<boolean>(true);
  const readerElementId = 'blinkmsg-qr-reader';

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {
        // Ignored during cleanup
      }
      scannerRef.current = null;
    }
  };

  const validateAndDeliver = (rawText: string) => {
    if (!rawText) return;
    const trimmed = rawText.trim();

    // Check if it's a valid BlinkMsg format:
    // 1. Clean 6-digit PIN
    const isDigits = /^\d{6}$/.test(trimmed);
    // 2. Official BlinkMsg URL: https://blinkmsg.app/join/XXXXXX or blinkmsg://...
    const isBlinkUrl =
      trimmed.includes('blinkmsg.app/join/') ||
      trimmed.includes('blinkmsg://connect') ||
      trimmed.includes('code=');
    // 3. BlinkMsg @handle
    const isHandle = /^@[a-zA-Z0-9_]{3,}$/.test(trimmed);

    // If someone scanned a foreign URL (like telegram t.me, whatsapp, random website):
    if (!isDigits && !isBlinkUrl && !isHandle) {
      sound.playPanic();
      setErrorMsg('Invalid QR Code. This is not a BlinkMsg friend code.');
      return;
    }

    sound.playReceive();
    sound.vibrate([30, 50, 40]);
    if (isMountedRef.current) {
      onScanSuccess(trimmed);
      stopScanner().catch(() => {});
      onClose();
    }
  };

  const startScanner = async () => {
    setIsInitializing(true);
    setErrorMsg(null);
    setTorchOn(false);

    await stopScanner();
    if (!isMountedRef.current) return;

    try {
      const html5Qr = new Html5Qrcode(readerElementId);
      scannerRef.current = html5Qr;

      const config = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      const onSuccess = (decodedText: string) => {
        validateAndDeliver(decodedText);
      };

      const onError = () => {
        // Normal frame without QR
      };

      // 1. Try rear/environment camera directly (mobile back camera)
      try {
        await html5Qr.start(
          { facingMode: 'environment' },
          config,
          onSuccess,
          onError
        );
        if (isMountedRef.current) setIsInitializing(false);
        return;
      } catch (envErr) {
        console.warn('Environment camera failed, attempting user camera fallback:', envErr);
      }

      // 2. Fallback to user camera (front camera, laptop webcams)
      await html5Qr.start(
        { facingMode: 'user' },
        config,
        onSuccess,
        onError
      );
      if (isMountedRef.current) setIsInitializing(false);
    } catch (err: any) {
      console.warn('Camera initialization error:', err);
      if (isMountedRef.current) {
        setIsInitializing(false);
        const errStr = (err?.name || err?.message || String(err)).toLowerCase();
        if (errStr.includes('permission') || errStr.includes('denied') || errStr.includes('notallowed')) {
          setErrorMsg('Camera permission denied. Please allow camera in settings.');
        } else if (errStr.includes('notfound') || errStr.includes('devicesnotfound')) {
          setErrorMsg('No physical camera detected on this device.');
        } else {
          setErrorMsg('Camera could not be started. Try restarting or upload a QR image below.');
        }
      }
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    isMountedRef.current = true;

    // Small delay to ensure modal DOM is mounted and painted
    const timer = setTimeout(() => {
      startScanner();
    }, 220);

    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
      stopScanner().catch(() => {});
    };
  }, [isOpen]);

  const toggleTorch = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        const newTorch = !torchOn;
        await scannerRef.current.applyVideoConstraints({
          // @ts-ignore
          advanced: [{ torch: newTorch }],
        });
        setTorchOn(newTorch);
        sound.vibrate(10);
      } catch {
        // Torch unsupported
      }
    }
  };

  const handleImageFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setErrorMsg(null);

    try {
      await stopScanner();
      const qrEngine = new Html5Qrcode(readerElementId);
      scannerRef.current = qrEngine;

      const decodedText = await qrEngine.scanFile(file, true);
      validateAndDeliver(decodedText);
    } catch (err) {
      console.warn('Scan file error:', err);
      setErrorMsg('No valid BlinkMsg QR code found in this photo. Please try another image.');
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#07080B]/95 backdrop-blur-2xl flex flex-col justify-between p-4 select-none animate-in fade-in duration-200 font-sans">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileScan}
        className="hidden"
      />

      {/* Top Header */}
      <div className="flex items-center justify-between pt-2 px-2 z-20">
        <div className="flex items-center space-x-2">
          <Camera className="w-5 h-5 text-[#00F5A0]" />
          <span className="font-extrabold text-base tracking-tight text-white">
            Scan BlinkMsg QR Code
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={toggleTorch}
            className={`p-2.5 rounded-full border transition-all cursor-pointer ${
              torchOn
                ? 'bg-[#00F5A0] text-black border-[#00F5A0] shadow-[0_0_12px_rgba(0,245,160,0.5)]'
                : 'bg-white/[0.08] text-zinc-300 border-white/10 hover:text-white'
            }`}
            title="Toggle Flashlight"
          >
            <Zap className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-zinc-300 hover:text-white active:scale-90 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Central Viewport */}
      <div className="relative my-auto flex flex-col items-center justify-center w-full max-w-sm mx-auto">
        <div className="relative w-72 h-72 rounded-[32px] overflow-hidden border-2 border-[#00F5A0]/60 shadow-[0_0_35px_rgba(0,245,160,0.25)] bg-black/90 flex items-center justify-center">
          <div id={readerElementId} className="w-full h-full object-cover" />

          {/* Futuristic Neon Corner Reticles */}
          <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-[#00F5A0] pointer-events-none" />
          <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-[#00F5A0] pointer-events-none" />
          <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-[#00F5A0] pointer-events-none" />
          <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-[#00F5A0] pointer-events-none" />

          {/* Animated Scanning Beam */}
          {!errorMsg && (
            <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00F5A0] to-transparent shadow-[0_0_12px_#00F5A0] animate-bounce pointer-events-none" />
          )}

          {/* Loading Indicator */}
          {isInitializing && !errorMsg && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-xs space-y-2 pointer-events-none">
              <RefreshCw className="w-6 h-6 text-[#00F5A0] animate-spin" />
              <span className="text-xs text-zinc-300 font-medium">Starting Camera...</span>
            </div>
          )}
        </div>

        {/* Error Message with Retry */}
        {errorMsg && (
          <div className="mt-3.5 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex flex-col items-center space-y-2 max-w-xs text-center animate-in fade-in">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={startScanner}
              className="px-3 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-[11px] font-semibold text-rose-200 cursor-pointer active:scale-95 transition-all"
            >
              Retry Camera
            </button>
          </div>
        )}

        {!errorMsg && (
          <p className="text-xs text-zinc-400 mt-4 text-center max-w-xs font-medium">
            Align friend's BlinkMsg QR inside the neon frame to link instantly.
          </p>
        )}

        {/* Action Button: Pick QR Image / Screenshot from Gallery */}
        <div className="flex flex-col items-center gap-2 mt-4 w-full max-w-xs">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingFile}
            className="w-full py-2.5 rounded-2xl bg-[#14151B] hover:bg-[#1B1D26] border border-white/10 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all shadow-md"
          >
            <ImageIcon className="w-4 h-4 text-[#00F5A0]" />
            <span>{isProcessingFile ? 'Decoding Image...' : 'Upload QR Image / Screenshot'}</span>
          </button>
        </div>
      </div>

      {/* Discreet bottom advice */}
      <div className="pb-4 text-center">
        <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">
          Hardware Stream • Zero Cloud Processing
        </span>
      </div>
    </div>
  );
};
