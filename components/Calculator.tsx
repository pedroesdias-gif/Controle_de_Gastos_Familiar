
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { formatCurrencyBR } from '../services/formatters';
import { Card } from './UI';

interface CalculatorProps {
  isOpen: boolean;
  onClose: () => void;
}

const Calculator: React.FC<CalculatorProps> = ({ isOpen, onClose }) => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [copied, setCopied] = useState(false);

  // Dragging State
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });

  const clearAll = useCallback(() => {
    setDisplay('0');
    setEquation('');
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  }, []);

  const handleNumber = useCallback((num: string) => {
    setDisplay(prev => {
      if (waitingForOperand) {
        setWaitingForOperand(false);
        return num;
      }
      return prev === '0' ? num : prev + num;
    });
  }, [waitingForOperand]);

  const handleDecimal = useCallback(() => {
    setDisplay(prev => {
      if (waitingForOperand) {
        setWaitingForOperand(false);
        return '0.';
      }
      if (!prev.includes('.')) {
        return prev + '.';
      }
      return prev;
    });
  }, [waitingForOperand]);

  const calculate = (first: number, second: number, op: string): number => {
    switch (op) {
      case '+': return first + second;
      case '-': return first - second;
      case '*': return first * second;
      case '/': return second !== 0 ? first / second : 0;
      default: return second;
    }
  };

  const handleOperator = useCallback((nextOperator: string) => {
    const inputValue = parseFloat(display);

    if (prevValue === null) {
      setPrevValue(inputValue);
    } else if (operator) {
      const result = calculate(prevValue, inputValue, operator);
      const formattedResult = String(Number(result.toFixed(8)));
      setDisplay(formattedResult);
      setPrevValue(result);
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
    setEquation(`${prevValue === null ? inputValue : display} ${nextOperator}`);
  }, [display, prevValue, operator]);

  const handleEqual = useCallback(() => {
    const inputValue = parseFloat(display);
    if (operator && prevValue !== null) {
      const result = calculate(prevValue, inputValue, operator);
      const formattedResult = String(Number(result.toFixed(8)));
      setDisplay(formattedResult);
      setEquation(`${prevValue} ${operator} ${inputValue} =`);
      setPrevValue(null);
      setOperator(null);
      setWaitingForOperand(true);
    }
  }, [display, prevValue, operator]);

  const copyResult = () => {
    const formatted = formatCurrencyBR(parseFloat(display));
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

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
      window.addEventListener('touchmove', onMouseMove);
      window.addEventListener('touchend', onMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onMouseMove);
      window.removeEventListener('touchend', onMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key >= '0' && e.key <= '9') handleNumber(e.key);
      if (e.key === '.') handleDecimal();
      if (e.key === '+') handleOperator('+');
      if (e.key === '-') handleOperator('-');
      if (e.key === '*') handleOperator('*');
      if (e.key === '/') handleOperator('/');
      if (e.key === 'Enter' || e.key === '=') handleEqual();
      if (e.key === 'Escape') onClose();
      if (e.key.toLowerCase() === 'c') clearAll();
      if (e.key === 'Backspace') {
        setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNumber, handleDecimal, handleOperator, handleEqual, clearAll, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" 
      onClick={handleBackdropClick}
    >
      <Card 
        className={`w-full max-w-[320px] bg-slate-900 border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-10 duration-300 touch-none pointer-events-auto ${isDragging ? 'opacity-90 ring-2 ring-indigo-500/50 scale-[1.02]' : ''}`}
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header/Display - Drag Area */}
        <div 
          className="p-6 bg-slate-950/50 cursor-move" 
          onMouseDown={onMouseDown}
          onTouchStart={onMouseDown}
        >
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Calculadora</span>
              <div className="flex gap-0.5">
                {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 bg-slate-700 rounded-full"></div>)}
              </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1 pointer-events-auto">✕</button>
          </div>
          <div className="h-4 text-right text-xs font-bold text-slate-500 overflow-hidden truncate">
            {equation}
          </div>
          <div className="text-right text-3xl font-mono font-light text-white truncate py-2 tracking-tighter">
            {formatCurrencyBR(parseFloat(display))}
          </div>
          <div className="flex justify-end mt-2">
            <button 
              onClick={copyResult}
              className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full transition-all flex items-center gap-2 pointer-events-auto ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              {copied ? '✓ Copiado!' : '📋 Copiar R$'}
            </button>
          </div>
        </div>

        {/* Keypad */}
        <div className="p-4 grid grid-cols-4 gap-2 bg-slate-900 pointer-events-auto">
          <CalcButton label="C" onClick={clearAll} variant="danger" />
          <CalcButton label="÷" onClick={() => handleOperator('/')} variant="operator" />
          <CalcButton label="×" onClick={() => handleOperator('*')} variant="operator" />
          <CalcButton label="⌫" onClick={() => setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0')} variant="secondary" />

          <CalcButton label="7" onClick={() => handleNumber('7')} />
          <CalcButton label="8" onClick={() => handleNumber('8')} />
          <CalcButton label="9" onClick={() => handleNumber('9')} />
          <CalcButton label="-" onClick={() => handleOperator('-')} variant="operator" />

          <CalcButton label="4" onClick={() => handleNumber('4')} />
          <CalcButton label="5" onClick={() => handleNumber('5')} />
          <CalcButton label="6" onClick={() => handleNumber('6')} />
          <CalcButton label="+" onClick={() => handleOperator('+')} variant="operator" />

          <CalcButton label="1" onClick={() => handleNumber('1')} />
          <CalcButton label="2" onClick={() => handleNumber('2')} />
          <CalcButton label="3" onClick={() => handleNumber('3')} />
          <CalcButton label="=" onClick={handleEqual} variant="primary" className="row-span-2" />

          <CalcButton label="0" onClick={() => handleNumber('0')} className="col-span-2" />
          <CalcButton label="." onClick={handleDecimal} />
        </div>
      </Card>
    </div>
  );
};

interface CalcButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'number' | 'operator' | 'primary' | 'secondary' | 'danger';
  className?: string;
}

const CalcButton: React.FC<CalcButtonProps> = ({ label, onClick, variant = 'number', className = '' }) => {
  const baseStyles = "h-14 flex items-center justify-center text-lg font-bold rounded-2xl transition-all active:scale-95";
  
  const variants = {
    number: "bg-slate-800 text-white hover:bg-slate-700",
    operator: "bg-indigo-900/40 text-indigo-400 hover:bg-indigo-900/60",
    primary: "bg-indigo-600 text-white hover:bg-indigo-500 h-full",
    secondary: "bg-slate-700/50 text-slate-400 hover:bg-slate-700",
    danger: "bg-red-900/40 text-red-400 hover:bg-red-900/60"
  };

  return (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }} 
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {label}
    </button>
  );
};

export default Calculator;
