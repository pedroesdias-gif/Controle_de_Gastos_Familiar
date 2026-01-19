
import React, { useState, useEffect } from 'react';
import Calculator from './Calculator';

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

  // Reordenação conforme solicitado pelo usuário
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'transactions', label: 'Lançamentos', icon: '💸' },
    { id: 'credit-card', label: 'Cartão de Crédito', icon: '💳' },
    { id: 'search', label: 'Pesquisar', icon: '🔍' },
    { id: 'bank-accounts', label: 'Contas Bancárias', icon: '🏦' },
    { id: 'categories', label: 'Categorias', icon: '🏷️' },
    { id: 'payment-methods', label: 'Formas de Pgto', icon: '💳' },
    { id: 'reports', label: 'Relatórios', icon: '📈' },
    { id: 'due-dates', label: 'Vencimentos', icon: '📅' },
    { id: 'copyright', label: 'Copyright', icon: '©️' },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  return (
    <div className="min-h-screen flex flex-col md:flex-row transition-colors duration-300 dark:bg-slate-950">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 dark:bg-slate-900 text-slate-300 flex-shrink-0 shadow-xl z-20">
        <div className="p-6">
          <h2 className="text-white text-xl font-black flex items-center gap-2 tracking-tight">
            <span className="bg-emerald-500 p-2 rounded-xl text-white shadow-lg shadow-emerald-500/20">💰</span>
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
                  : 'hover:bg-slate-800 hover:text-white dark:hover:bg-slate-800'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto p-6 text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-500">
          v1.8.1 - Dark Mode Enable
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50/50 dark:bg-slate-950">
        {/* Global Top Bar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10 shadow-sm transition-colors">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-sm font-medium text-gray-400 dark:text-slate-500 uppercase tracking-widest">Exercício:</span>
              <div className="relative">
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="appearance-none bg-gray-100 dark:bg-slate-800 border-none rounded-lg py-1.5 pl-3 pr-8 text-sm font-bold text-indigo-700 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-indigo-700 dark:text-indigo-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={toggleDarkMode}
              className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-amber-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all shadow-inner"
              aria-label="Alternar Modo Escuro"
            >
              {isDarkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 9h-1m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707-.707M12 5a7 7 0 100 14 7 7 0 000-14z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <div className="hidden md:block text-right">
              <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-tighter">Hoje</p>
              <p className="text-sm font-bold text-gray-700 dark:text-slate-200">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date())}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8 relative">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>

          {/* Floating Calculator Trigger */}
          <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-3 pointer-events-none">
            <button
              onClick={() => setIsCalcOpen(true)}
              className="w-14 h-14 bg-slate-800 dark:bg-slate-700 text-white rounded-full shadow-2xl flex items-center justify-center text-2xl hover:bg-slate-700 dark:hover:bg-slate-600 transition-all active:scale-90 pointer-events-auto border border-slate-600/30"
              title="Abrir Calculadora"
            >
              🧮
            </button>
          </div>
        </main>
      </div>

      <Calculator isOpen={isCalcOpen} onClose={() => setIsCalcOpen(false)} />
    </div>
  );
};

export default Layout;
