
import React, { useState, useEffect, useRef } from 'react';
import Calculator from './Calculator';
import Calendar from './Calendar';

export type Tab = 'dashboard' | 'transactions' | 'credit-card' | 'search' | 'bank-accounts' | 'categories' | 'payment-methods' | 'reports' | 'due-dates' | 'copyright';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, selectedYear, setSelectedYear }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Floating Buttons Drag State
  const [btnPos, setBtnPos] = useState(() => {
    const saved = localStorage.getItem('finance_2026_fab_pos');
    return saved ? JSON.parse(saved) : { x: 0, y: 0 };
  });
  const [isDraggingBtns, setIsDraggingBtns] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'transactions', label: 'Lançamentos', icon: '💸' },
    { id: 'credit-card', label: 'Cartão', icon: '💳' },
    { id: 'search', label: 'Pesquisar', icon: '🔍' },
    { id: 'bank-accounts', label: 'Contas', icon: '🏦' },
    { id: 'categories', label: 'Categorias', icon: '🏷️' },
    { id: 'payment-methods', label: 'Pgto', icon: '💳' },
    { id: 'reports', label: 'Relatórios', icon: '📈' },
    { id: 'due-dates', label: 'Vencimentos', icon: '📅' },
    { id: 'copyright', label: 'Copyright', icon: '©️' },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  // Drag Handlers for Floating Buttons
  const onMouseDownBtns = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDraggingBtns(true);
    hasMoved.current = false;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartPos.current = { x: clientX, y: clientY };
    initialPos.current = { ...btnPos };
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingBtns) return;
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      const dx = clientX - dragStartPos.current.x;
      const dy = clientY - dragStartPos.current.y;
      
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        hasMoved.current = true;
      }

      const newPos = {
        x: initialPos.current.x + dx,
        y: initialPos.current.y + dy
      };
      setBtnPos(newPos);
    };

    const onMouseUp = () => {
      if (isDraggingBtns) {
        setIsDraggingBtns(false);
        localStorage.setItem('finance_2026_fab_pos', JSON.stringify(btnPos));
      }
    };

    if (isDraggingBtns) {
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
  }, [isDraggingBtns, btnPos]);

  const handleFabClick = (action: () => void) => {
    if (!hasMoved.current) {
      action();
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row transition-colors duration-300 dark:bg-slate-950">
      
      {/* Sidebar - Desktop Only */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-slate-300 flex-shrink-0 shadow-xl z-20 flex-col">
        <div className="p-6">
          <h2 className="text-white text-xl font-black flex items-center gap-2 tracking-tight">
            <span className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-600/20">💰</span>
            FINANCEIRO
          </h2>
        </div>
        <nav className="mt-4 px-3 space-y-1">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === item.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto p-6 text-[10px] font-bold uppercase tracking-widest text-slate-600">
          v2.0.0 - Premium Edition
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50/50 dark:bg-slate-950">
        
        {/* Navigation - Mobile Top Bar Only */}
        <nav className="md:hidden sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-2 py-1.5 overflow-x-auto custom-scrollbar shadow-sm">
          <div className="flex items-center gap-1 min-w-max">
            {menuItems.map(item => {
              const isTransactions = item.id === 'transactions';
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as Tab)}
                  className={`relative group flex flex-col items-center justify-center h-12 transition-all duration-200 rounded-xl px-2.5 ${
                    isTransactions && !isActive ? 'bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30' : ''
                  } ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-md z-10' 
                      : 'text-slate-500 dark:text-slate-400'
                  } ${isTransactions ? 'min-w-[64px]' : 'min-w-[44px]'}`}
                >
                  <span className={`${isTransactions && isActive ? 'text-lg' : 'text-xl'}`}>{item.icon}</span>
                  
                  {isTransactions && (
                    <span className={`text-[8px] font-black uppercase tracking-tight mt-0.5 ${isActive ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`}>
                      Lançar
                    </span>
                  )}
                  
                  {!isTransactions && (
                    <span className={`absolute -bottom-1 opacity-0 group-active:opacity-100 text-[7px] font-black uppercase tracking-widest bg-slate-800 text-white px-1.5 py-0.5 rounded transition-opacity`}>
                      {item.label}
                    </span>
                  )}

                  {isActive && !isTransactions && (
                    <div className="w-1 h-1 bg-white rounded-full absolute bottom-1.5"></div>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Global Top Bar (Shared, but adaptive) */}
        <header className="h-14 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between px-4 md:px-8 sticky top-[60px] md:top-0 z-10 transition-colors shadow-sm md:shadow-none">
          <div className="flex items-center gap-3">
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="appearance-none bg-gray-100 dark:bg-slate-800 border-none rounded-lg py-1 px-3 pr-8 text-xs font-black text-indigo-700 dark:text-indigo-400 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleDarkMode}
              className="p-1.5 rounded-lg bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-amber-400 hover:bg-gray-100 transition-all border border-gray-200 dark:border-slate-700"
            >
              {isDarkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 9h-1m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707-.707M12 5a7 7 0 100 14 7 7 0 000-14z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <div className="hidden sm:block text-right">
              <p className="text-[10px] font-black text-gray-400 dark:text-slate-600 uppercase tracking-tighter">Exercício {selectedYear}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8 relative">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>

          {/* Floating Actions Panel - NOW DRAGGABLE */}
          <div 
            className={`fixed z-50 flex flex-col items-end gap-3 pointer-events-auto cursor-move select-none ${isDraggingBtns ? 'opacity-70 scale-105' : ''}`}
            style={{ 
              bottom: '1.5rem', 
              right: '1.5rem',
              transform: `translate(${btnPos.x}px, ${btnPos.y}px)`,
              transition: isDraggingBtns ? 'none' : 'transform 0.1s ease-out'
            }}
            onMouseDown={onMouseDownBtns}
            onTouchStart={onMouseDownBtns}
          >
            <button
              onClick={() => handleFabClick(() => setIsCalendarOpen(true))}
              className="w-12 h-12 md:w-14 md:h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center text-xl md:text-2xl hover:bg-indigo-700 transition-all active:scale-90 border border-white/20"
              title="Abrir Calendário"
            >
              📅
            </button>
            <button
              onClick={() => handleFabClick(() => setIsCalcOpen(true))}
              className="w-12 h-12 md:w-14 md:h-14 bg-slate-900 dark:bg-slate-700 text-white rounded-full shadow-2xl flex items-center justify-center text-xl md:text-2xl hover:bg-slate-800 dark:hover:bg-slate-600 transition-all active:scale-90 border border-white/10"
              title="Abrir Calculadora"
            >
              🧮
            </button>
          </div>
        </main>
      </div>

      <Calculator isOpen={isCalcOpen} onClose={() => setIsCalcOpen(false)} />
      <Calendar isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} />
    </div>
  );
};

export default Layout;
