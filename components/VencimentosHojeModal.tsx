
import React, { useEffect } from 'react';
import { RecurringBill } from '../types';
import { formatCurrencyBR } from '../services/formatters';
import { Card, Button } from './UI';

interface VencimentosHojeModalProps {
  bills: RecurringBill[];
  onClose: () => void;
}

const VencimentosHojeModal: React.FC<VencimentosHojeModalProps> = ({ bills, onClose }) => {
  const todayDay = new Date().getDate();
  const hasOverdue = bills.some(b => b.dueDay < todayDay);

  useEffect(() => {
    if (bills.length > 0) {
      playNotificationSound();
    }
  }, [bills]);

  const playNotificationSound = () => {
    try {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      if (!AudioContextClass) return;

      const audioCtx = new AudioContextClass();
      
      const playTone = (freq: number, startTime: number, duration: number) => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(freq, startTime);
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.08, startTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      const now = audioCtx.currentTime;
      const totalDuration = 2.0;

      playTone(523.25, now, totalDuration);
      playTone(659.25, now + 0.2, totalDuration - 0.2);
      playTone(783.99, now + 0.4, totalDuration - 0.4);
      
    } catch (e) {
      console.warn('O navegador bloqueou a reprodução automática de áudio.', e);
    }
  };

  if (bills.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className={`max-w-md w-full p-8 bg-white dark:bg-slate-900 border-2 shadow-2xl animate-in zoom-in slide-in-from-bottom-4 duration-500 ${hasOverdue ? 'border-red-500 dark:border-red-700' : 'border-amber-400 dark:border-amber-600'}`}>
        <div className="text-center mb-6">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 animate-bounce ${hasOverdue ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30'}`}>
            {hasOverdue ? '🚨' : '📅'}
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter uppercase leading-tight">
            {hasOverdue ? 'Contas Pendentes e em Atraso!' : 'Contas Vencendo Hoje!'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {hasOverdue ? 'Você possui pagamentos atrasados que precisam de atenção.' : 'Identificamos pendências para o dia de hoje.'}
          </p>
        </div>

        <div className="space-y-3 mb-8 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {bills.sort((a,b) => a.dueDay - b.dueDay).map(bill => {
            const isOverdue = bill.dueDay < todayDay;
            return (
              <div key={bill.id} className={`flex items-center justify-between p-4 rounded-2xl border group transition-colors ${isOverdue ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20 hover:border-red-300' : 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20 hover:border-amber-300'}`}>
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-gray-800 dark:text-slate-200 truncate uppercase text-sm tracking-tight">{bill.name}</p>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${isOverdue ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-500 text-white'}`}>
                      {isOverdue ? 'Atrasada' : 'Hoje'}
                    </span>
                  </div>
                  {bill.group && (
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${isOverdue ? 'text-red-600 dark:text-red-500' : 'text-amber-600 dark:text-amber-500'}`}>{bill.group}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-gray-900 dark:text-white">{formatCurrencyBR(bill.value || 0)}</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Vencimento: {bill.dueDay}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={onClose} className={`w-full text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-lg ${hasOverdue ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'}`}>
            Ciente, vou verificar!
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default VencimentosHojeModal;
