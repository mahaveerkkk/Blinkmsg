import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Zap, AlertCircle } from 'lucide-react';
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
  const [torchOn, setTorchOn] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'blinkmsg-qr-reader';

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setErrorMsg(null);

    const startScanner = async () => {
      try {
        const html5Qr = new Html5Qrcode(readerElementId);
        scannerRef.current = html5Qr;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        await html5Qr.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            sound.playReceive();
            sound.vibrate([30, 50, 40]);
            if (isMounted) {
              onScanSuccess(decodedText);
              html5Qr.stop().then(() => {
                html5Qr.clear();
              }).catch(() => {});
              onClose();
            }
          },
          () => {
            // Frame scanned without QR, ignore
          }
        );
      } catch (err: any) {
        console.warn('QR camera error:', err);
        if (isMounted) {
          setErrorMsg(
            err?.message?.includes('Permission')
              ? 'Camera permission was denied. Please allow camera access in browser settings.'
              : 'Unable to start camera. Please ensure another app is not using it.'
          );
        }
      }
    };

    // Small delay to allow modal element to mount
    const timer = setTimeout(startScanner, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().then(() => {
          scannerRef.current?.clear();
        }).catch(() => {});
      }
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex flex-col justify-between p-4 select-none animate-fade-in font-sans">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2 px-2 z-20">
        <div className="flex items-center space-x-2">
          <Camera className="w-5 h-5 text-[#D4FF00]" />
          <span className="font-extrabold text-base tracking-tight text-white">
            Scan Room QR Code
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={toggleTorch}
            className={`p-2.5 rounded-full border transition-all ${
              torchOn
                ? 'bg-[#D4FF00] text-black border-[#D4FF00] shadow-[0_0_12px_rgba(212,255,0,0.5)]'
                : 'bg-white/[0.08] text-zinc-300 border-white/10 hover:text-white'
            }`}
            title="Toggle Flashlight"
          >
            <Zap className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/10 text-zinc-300 hover:text-white active:scale-90 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Central Viewport */}
      <div className="relative my-auto flex flex-col items-center justify-center w-full max-w-sm mx-auto">
        <div className="relative w-72 h-72 rounded-[32px] overflow-hidden border-2 border-[#D4FF00]/50 shadow-[0_0_30px_rgba(212,255,0,0.2)] bg-black/60">
          <div id={readerElementId} className="w-full h-full object-cover" />

          {/* Futuristic Corner Reticles */}
          <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-[#D4FF00]" />
          <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-[#D4FF00]" />
          <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-[#D4FF00]" />
          <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-[#D4FF00]" />

          {/* Scanning Beam */}
          <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#D4FF00] to-transparent shadow-[0_0_8px_#D4FF00] animate-bounce pointer-events-none" />
        </div>

        {errorMsg ? (
          <div className="mt-4 p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center space-x-2.5 max-w-xs text-center animate-fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        ) : (
          <p className="text-xs text-zinc-400 mt-4 text-center max-w-xs font-medium">
            Point camera at friend's BlinkMsg QR Code to join instantly.
          </p>
        )}
      </div>

      {/* Discreet bottom advice */}
      <div className="pb-4 text-center">
        <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">
          Hardware Camera Stream • Zero Cloud Processing
        </span>
      </div>
    </div>
  );
};
