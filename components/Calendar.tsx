
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card, Button } from './UI';
import { getTransactions, getRecurringBills } from '../services/storageService';
import { formatCurrencyBR } from '../services/formatters';

interface CalendarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Calendar: React.FC<CalendarProps> = ({ isOpen, onClose }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Dragging State
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });

  const transactions = useMemo(() => getTransactions(), [isOpen]);
  const bills = useMemo(() => getRecurringBills(), [isOpen]);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(currentDate);
  const year = currentDate.getFullYear();

  const handlePrevMonth = () => setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1));

  const calendarDays = useMemo(() => {
    const totalDays = daysInMonth(year, currentDate.getMonth());
    const startDay = firstDayOfMonth(year, currentDate.getMonth());
    const days = [];

    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= totalDays; i++) {
      const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayTxs = transactions.filter(t => t.date === dateStr);
      const dayBills = bills.filter(b => b.dueDay === i);
      
      days.push({
        day: i,
        hasIncome: dayTxs.some(t => t.type === 'Receita'),
        hasExpense: dayTxs.some(t => t.type === 'Despesa'),
        hasBill: dayBills.length > 0,
        transactions: dayTxs,
        bills: dayBills
      });
    }

    return days;
  }, [currentDate, transactions, bills]);

  const selectedDayData = useMemo(() => {
    if (selectedDay === null) return null;
    return calendarDays.find(d => d && d.day === selectedDay);
  }, [selectedDay, calendarDays]);

  // Drag Handlers
  const onMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartPos.current = { x: clientX, y: clientY };
    initialPos.current = { ...position };
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const dx = clientX - dragStartPos.current.x;
      const dy = clientY - dragStartPos.current.y;
      setPosition({
        x: initialPos.current.x + dx,
        y: initialPos.current.y + dy
      });
    };

    const onMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onMouseMove, { passive: false });
      window.addEventListener('touchend', onMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onMouseMove);
      window.removeEventListener('touchend', onMouseUp);
    };
  }, [isDragging]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
      <Card 
        className={`w-full max-w-md bg-white dark:bg-slate-900 border-none shadow-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-500 touch-none pointer-events-auto ${isDragging ? 'opacity-90 scale-[1.01] ring-2 ring-indigo-500/50' : ''}`}
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header - Drag Area */}
        <div 
          className="p-6 bg-indigo-600 text-white cursor-move"
          onMouseDown={onMouseDown}
          onTouchStart={onMouseDown}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2 pointer-events-none">
              <span>📅</span> {monthName} <span className="opacity-50 font-light">{year}</span>
            </h2>
            <button onClick={onClose} className="text-white/60 hover:text-white transition-colors pointer-events-auto">✕</button>
          </div>
          <div className="flex justify-between gap-2 pointer-events-auto">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors">◀</button>
            <button onClick={() => setCurrentDate(new Date())} className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20">Hoje</button>
            <button onClick={handleNextMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors">▶</button>
          </div>
        </div>

        {/* Grade de Dias */}
        <div className="p-4 bg-gray-50 dark:bg-slate-950/30 pointer-events-auto">
          <div className="grid grid-cols-7 mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <div key={d} className="text-center text-[10px] font-black text-gray-400 dark:text-slate-600 uppercase py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((dayData, idx) => {
              if (!dayData) return <div key={`empty-${idx}`} className="aspect-square"></div>;
              
              const isToday = new Date().toDateString() === new Date(year, currentDate.getMonth(), dayData.day).toDateString();
              const isSelected = selectedDay === dayData.day;

              return (
                <button
                  key={dayData.day}
                  onClick={() => setSelectedDay(dayData.day)}
                  className={`aspect-square relative flex flex-col items-center justify-center rounded-xl transition-all ${
                    isSelected 
                      ? 'bg-indigo-600 text-white shadow-lg scale-110 z-10' 
                      : isToday 
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-black' 
                        : 'hover:bg-gray-200 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300'
                  }`}
                >
                  <span className="text-xs font-bold">{dayData.day}</span>
                  <div className="flex gap-0.5 mt-1">
                    {dayData.hasIncome && <div className="w-1 h-1 rounded-full bg-emerald-500"></div>}
                    {dayData.hasExpense && <div className="w-1 h-1 rounded-full bg-red-500"></div>}
                    {dayData.hasBill && <div className="w-1 h-1 rounded-full bg-blue-500"></div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Resumo do Dia Selecionado */}
        {selectedDayData && (
          <div className="p-6 border-t dark:border-slate-800 bg-white dark:bg-slate-900 animate-in slide-in-from-bottom-2 duration-300 pointer-events-auto">
            <h3 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4">
              Eventos de {selectedDay} de {monthName}
            </h3>
            
            <div className="space-y-3 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
              {selectedDayData.bills.map(bill => (
                <div key={bill.id} className="flex justify-between items-center p-2 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-500">📅</span>
                    <span className="text-[10px] font-bold dark:text-slate-300 uppercase">{bill.name}</span>
                  </div>
                  <span className="text-[10px] font-black text-blue-600">{formatCurrencyBR(bill.value)}</span>
                </div>
              ))}
              
              {selectedDayData.transactions.map(t => (
                <div key={t.id} className={`flex justify-between items-center p-2 rounded-lg border ${
                  t.type === 'Receita' 
                    ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20' 
                    : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={t.type === 'Receita' ? 'text-emerald-500' : 'text-red-500'}>
                      {t.type === 'Receita' ? '💰' : '💸'}
                    </span>
                    <span className="text-[10px] font-bold dark:text-slate-300 uppercase truncate max-w-[150px]">{t.description}</span>
                  </div>
                  <span className={`text-[10px] font-black ${t.type === 'Receita' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrencyBR(t.value)}
                  </span>
                </div>
              ))}

              {selectedDayData.bills.length === 0 && selectedDayData.transactions.length === 0 && (
                <p className="text-center text-xs text-gray-300 dark:text-slate-700 italic py-4">Nenhuma atividade para este dia.</p>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Calendar;
