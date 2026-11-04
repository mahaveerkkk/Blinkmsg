import React, { useState } from 'react';
import { ShieldAlert, RotateCcw, Calculator, Delete } from 'lucide-react';
import { sound } from '../services/sound';
import { StorageService } from '../services/storage';

interface PanicModalProps {
  isOpen: boolean;
  onExitPanic: () => void;
}

export const PanicModal: React.FC<PanicModalProps> = ({ isOpen, onExitPanic }) => {
  const [calcDisplay, setCalcDisplay] = useState('0');

  if (!isOpen) return null;

  const handleCalcClick = (val: string) => {
    sound.vibrate(8);
    if (val === 'C') {
      setCalcDisplay('0');
    } else if (val === '=') {
      try {
        // Safe evaluation
        const clean = calcDisplay.replace(/[^0-9+\-*/.]/g, '');
        // eslint-disable-next-line no-eval
        const result = Function(`'use strict'; return (${clean})`)();
        setCalcDisplay(String(result));
      } catch {
        setCalcDisplay('Error');
      }
    } else {
      setCalcDisplay((prev) => (prev === '0' || prev === 'Error' ? val : prev + val));
    }
  };

  const handleFullPurge = () => {
    sound.playPanic();
    StorageService.clearAll();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#05070d] flex flex-col justify-between p-4 select-none">
      {/* Top Bar with Discreet Exit */}
      <div className="flex items-center justify-between pt-2 px-2">
        <div className="flex items-center space-x-2 text-slate-500">
          <Calculator className="w-4 h-4 text-slate-600" />
          <span className="text-xs font-mono text-slate-600">Standard Calc</span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Purge Reset */}
          <button
            onClick={handleFullPurge}
            className="px-2.5 py-1 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-[10px] font-mono flex items-center space-x-1"
            title="Erase all local ghost memory"
          >
            <ShieldAlert className="w-3 h-3 text-red-400" />
            <span>Nuke Memory</span>
          </button>

          {/* Discreet Exit Button */}
          <button
            onClick={() => {
              sound.vibrate(15);
              onExitPanic();
            }}
            className="p-1.5 rounded-xl bg-[#131824] text-slate-400 hover:text-slate-200"
            title="Resume BlinkMsg"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Disguised Calculator Display */}
      <div className="my-auto max-w-xs mx-auto w-full">
        <div className="bg-[#090d16] border border-[#1f293d] rounded-3xl p-5 shadow-2xl mb-4">
          <div className="text-right text-4xl font-mono text-slate-100 py-4 px-2 overflow-x-auto truncate">
            {calcDisplay}
          </div>

          {/* Calculator Grid */}
          <div className="grid grid-cols-4 gap-2.5 pt-4 border-t border-[#1f293d]">
            {['C', '/', '*', '-'].map((op) => (
              <button
                key={op}
                onClick={() => handleCalcClick(op)}
                className="py-3.5 rounded-2xl bg-[#131824] text-amber-400 font-bold text-lg active:scale-95 transition-transform"
              >
                {op}
              </button>
            ))}
            {['7', '8', '9', '+'].map((btn) => (
              <button
                key={btn}
                onClick={() => handleCalcClick(btn)}
                className={`py-3.5 rounded-2xl ${
                  btn === '+' ? 'bg-[#131824] text-amber-400' : 'bg-[#0d111a] text-slate-100'
                } font-bold text-lg active:scale-95 transition-transform`}
              >
                {btn}
              </button>
            ))}
            {['4', '5', '6', '='].map((btn) => (
              <button
                key={btn}
                onClick={() => handleCalcClick(btn)}
                className={`py-3.5 rounded-2xl ${
                  btn === '=' ? 'bg-emerald-500 text-slate-950' : 'bg-[#0d111a] text-slate-100'
                } font-bold text-lg active:scale-95 transition-transform`}
              >
                {btn}
              </button>
            ))}
            {['1', '2', '3', '0'].map((btn) => (
              <button
                key={btn}
                onClick={() => handleCalcClick(btn)}
                className="py-3.5 rounded-2xl bg-[#0d111a] text-slate-100 font-bold text-lg active:scale-95 transition-transform"
              >
                {btn}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-center text-slate-600 font-mono">
          Decoy Mode Active • Memory Purged
        </p>
      </div>

      <div className="pb-4" />
    </div>
  );
};
