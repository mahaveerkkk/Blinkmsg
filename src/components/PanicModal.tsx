import React, { useState } from 'react';
import { ShieldAlert, RotateCcw, Calculator } from 'lucide-react';
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
    if (val === 'AC') {
      setCalcDisplay('0');
    } else if (val === '=') {
      try {
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
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-4 select-none">
      {/* Top Discreet Bar */}
      <div className="flex items-center justify-between pt-2 px-2">
        <div className="flex items-center space-x-1.5 text-zinc-600">
          <Calculator className="w-3.5 h-3.5" />
          <span className="text-[11px] font-mono text-zinc-600">Calculator</span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Purge Reset */}
          <button
            onClick={handleFullPurge}
            className="px-2 py-1 rounded-xl bg-red-950/40 border border-red-500/20 text-red-400 text-[10px] font-mono flex items-center space-x-1"
            title="Erase all local memory"
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
            className="p-1.5 rounded-full bg-zinc-900 text-zinc-400 hover:text-zinc-200"
            title="Resume App"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Disguised Native-Style Calculator Display */}
      <div className="my-auto max-w-xs mx-auto w-full px-2">
        <div className="text-right text-5xl font-light text-white font-sans py-6 px-2 truncate">
          {calcDisplay}
        </div>

        {/* Round Calculator Grid (iOS Style Decoy) */}
        <div className="grid grid-cols-4 gap-3 pt-2">
          {['AC', '+/-', '%', '/'].map((op) => (
            <button
              key={op}
              onClick={() => handleCalcClick(op === '+/-' || op === '%' ? '' : op)}
              className={`w-16 h-16 rounded-full font-medium text-xl flex items-center justify-center active:scale-95 transition-transform ${
                op === '/'
                  ? 'bg-[#ff9f0a] text-white'
                  : 'bg-[#a5a5a5] text-black font-semibold'
              }`}
            >
              {op}
            </button>
          ))}

          {['7', '8', '9', '*'].map((btn) => (
            <button
              key={btn}
              onClick={() => handleCalcClick(btn)}
              className={`w-16 h-16 rounded-full font-medium text-2xl flex items-center justify-center active:scale-95 transition-transform ${
                btn === '*' ? 'bg-[#ff9f0a] text-white' : 'bg-[#333333] text-white'
              }`}
            >
              {btn === '*' ? '×' : btn}
            </button>
          ))}

          {['4', '5', '6', '-'].map((btn) => (
            <button
              key={btn}
              onClick={() => handleCalcClick(btn)}
              className={`w-16 h-16 rounded-full font-medium text-2xl flex items-center justify-center active:scale-95 transition-transform ${
                btn === '-' ? 'bg-[#ff9f0a] text-white' : 'bg-[#333333] text-white'
              }`}
            >
              {btn === '-' ? '−' : btn}
            </button>
          ))}

          {['1', '2', '3', '+'].map((btn) => (
            <button
              key={btn}
              onClick={() => handleCalcClick(btn)}
              className={`w-16 h-16 rounded-full font-medium text-2xl flex items-center justify-center active:scale-95 transition-transform ${
                btn === '+' ? 'bg-[#ff9f0a] text-white' : 'bg-[#333333] text-white'
              }`}
            >
              {btn}
            </button>
          ))}

          <button
            onClick={() => handleCalcClick('0')}
            className="col-span-2 h-16 rounded-full bg-[#333333] text-white font-medium text-2xl flex items-center justify-start pl-7 active:scale-95 transition-transform"
          >
            0
          </button>
          <button
            onClick={() => handleCalcClick('.')}
            className="w-16 h-16 rounded-full bg-[#333333] text-white font-medium text-2xl flex items-center justify-center active:scale-95 transition-transform"
          >
            .
          </button>
          <button
            onClick={() => handleCalcClick('=')}
            className="w-16 h-16 rounded-full bg-[#ff9f0a] text-white font-medium text-2xl flex items-center justify-center active:scale-95 transition-transform"
          >
            =
          </button>
        </div>
      </div>

      <div className="pb-4 text-center">
        <span className="text-[10px] font-mono text-zinc-800">Standard Calculator</span>
      </div>
    </div>
  );
};
