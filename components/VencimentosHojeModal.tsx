
import React, { useEffect } from 'react';
import { RecurringBill } from '../types';
import { formatCurrencyBR } from '../services/formatters';
import { Card, Button } from './UI';

interface VencimentosHojeModalProps {
  bills: RecurringBill[];
  onClose: () => void;
}

const VencimentosHojeModal: React.FC<VencimentosHojeModalProps> = ({ bills, onClose }) => {
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
        
        // Configuração do envelope de volume (ADSR simplificado)
        gainNode.gain.setValueAtTime(0, startTime);
        // Ataque rápido
        gainNode.gain.linearRampToValueAtTime(0.08, startTime + 0.1);
        // Decaimento suave até o fim da duração de 2 segundos
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      const now = audioCtx.currentTime;
      const totalDuration = 2.0; // Duração exata de 2 segundos solicitada

      // Triade harmônica para um som de alerta sofisticado e duradouro
      playTone(523.25, now, totalDuration);       // C5 (Dó) - Base
      playTone(659.25, now + 0.2, totalDuration - 0.2); // E5 (Mi) - Harmonização
      playTone(783.99, now + 0.4, totalDuration - 0.4); // G5 (Sol) - Brilho final
      
    } catch (e) {
      console.warn('O navegador bloqueou a reprodução automática de áudio.', e);
    }
  };

  if (bills.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="max-w-md w-full p-8 bg-white dark:bg-slate-900 border-amber-400 dark:border-amber-600 border-2 shadow-2xl animate-in zoom-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 animate-bounce">
            📅
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">Contas Vencendo Hoje!</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Identificamos pendências para o dia de hoje.</p>
        </div>

        <div className="space-y-3 mb-8 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {bills.map(bill => (
            <div key={bill.id} className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20 group hover:border-amber-300 transition-colors">
              <div className="flex-1 min-w-0 mr-4">
                <p className="font-black text-gray-800 dark:text-slate-200 truncate uppercase text-sm tracking-tight">{bill.name}</p>
                {bill.group && (
                  <p className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest">{bill.group}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-gray-900 dark:text-white">{formatCurrencyBR(bill.value || 0)}</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Vencimento: {bill.dueDay}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={onClose} className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-lg shadow-amber-600/20">
            Ciente, entendi!
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default VencimentosHojeModal;
