
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Transaction, PaymentMethod, BankAccount } from '../types';
import { getTransactions, getPaymentMethods, getCCClosingDays, saveCCClosingDay, getEffectiveDate, getBankAccounts, savePaymentMethod, syncAllLinkedInvoices } from '../services/storageService';
import { formatCurrencyBR } from '../services/formatters';
import { Card, Select, Input, Button } from './UI';

const CreditCardControl: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const [closingDays, setClosingDays] = useState<Record<string, number>>({});
  const [editingClosingMonth, setEditingClosingMonth] = useState<number | null>(null);
  const [tempClosingDay, setTempClosingDay] = useState<number>(25);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = () => {
    setTransactions(getTransactions());
    setPaymentMethods(getPaymentMethods());
    setBankAccounts(getBankAccounts());
    setClosingDays(getCCClosingDays());
  };

  useEffect(() => {
    loadData();
  }, []);

  const creditCards = useMemo(() => {
    return paymentMethods.filter(pm => pm.name.toLowerCase().includes('cartão de crédito') || pm.name.toLowerCase().includes('crédito'));
  }, [paymentMethods]);

  const creditTransactions = useMemo(() => {
    return transactions.filter(t => {
      const isCC = creditCards.some(cc => cc.id === t.paymentMethodId);
      const matchesAccount = selectedAccountId === 'all' || t.bankAccountId === selectedAccountId;
      return isCC && matchesAccount;
    });
  }, [transactions, creditCards, selectedAccountId]);

  const monthlyBills = useMemo(() => {
    const bills: Record<string, { total: number; count: number; items: Transaction[] }> = {};
    
    creditTransactions.forEach(t => {
      const effDate = getEffectiveDate(t);
      if (effDate.getFullYear().toString() !== selectedYear) return;
      
      const monthKey = effDate.getMonth().toString();
      if (!bills[monthKey]) bills[monthKey] = { total: 0, count: 0, items: [] };
      
      bills[monthKey].total += t.value;
      bills[monthKey].count += 1;
      bills[monthKey].items.push(t);
    });

    return bills;
  }, [creditTransactions, selectedYear]);

  const handleSaveClosingDay = (month: number) => {
    saveCCClosingDay(parseInt(selectedYear), month, tempClosingDay);
    setEditingClosingMonth(null);
    loadData();
  };

  const handleLinkAccount = (cardId: string, accountId: string) => {
    const card = paymentMethods.find(p => p.id === cardId);
    if (card) {
      savePaymentMethod({ ...card, linkedBankAccountId: accountId === 'none' ? undefined : accountId });
      loadData();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, methodId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const method = paymentMethods.find(m => m.id === methodId);
        if (method) {
          savePaymentMethod({ ...method, iconUrl: reader.result as string });
          loadData();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const getMonthName = (m: number) => new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(2026, m, 1));

  const accountOptions = useMemo(() => [
    { label: 'Filtrar por Conta...', value: 'all' },
    ...bankAccounts.map(acc => ({ label: acc.name, value: acc.id }))
  ], [bankAccounts]);

  const linkAccountOptions = useMemo(() => [
    { label: 'Não vincular conta', value: 'none' },
    ...bankAccounts.map(acc => ({ label: `Pagar via: ${acc.name}`, value: acc.id }))
  ], [bankAccounts]);

  const today = new Date();
  const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const highlightedMonth = nextMonthDate.getMonth();
  const highlightedYearStr = nextMonthDate.getFullYear().toString();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Gestão de Cartões</h1>
          <p className="text-gray-500 dark:text-slate-400">Vincule contas bancárias e automatize a provisão de faturas.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="w-full sm:w-64">
            <Select 
              label="Filtro de Visualização" 
              value={selectedAccountId} 
              onChange={e => setSelectedAccountId(e.target.value)}
              options={accountOptions}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select 
              label="Ano de Referência" 
              value={selectedYear} 
              onChange={e => setSelectedYear(e.target.value)}
              options={Array.from({ length: 5 }, (_, i) => ({ label: (new Date().getFullYear() + i).toString(), value: (new Date().getFullYear() + i).toString() }))}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {creditCards.map(cc => (
          <Card key={cc.id} className="p-4 bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 overflow-hidden group">
             <div className="flex flex-col gap-4">
               <div className="flex flex-row items-center justify-between gap-4 w-full">
                 <div className="flex items-center gap-4 flex-1">
                   <div className="relative w-[35%] aspect-[1.58/1] bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-800 dark:to-slate-950 rounded-lg overflow-hidden shadow-md border border-white/20 flex items-center justify-center transition-transform group-hover:scale-105">
                     {cc.iconUrl ? (
                       <img src={cc.iconUrl} className="w-full h-full object-cover" alt="Card Preview" />
                     ) : (
                       <div className="text-center">
                         <span className="text-2xl opacity-20 block">💳</span>
                       </div>
                     )}
                   </div>
                   
                   <div className="flex flex-col min-w-0">
                     <p className="text-sm font-black text-gray-800 dark:text-white truncate uppercase tracking-tight">{cc.name}</p>
                     <p className="text-[9px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-widest">Cartão Personalizado</p>
                   </div>
                 </div>
                 
                 <label className="cursor-pointer shrink-0">
                   <input 
                     type="file" 
                     className="hidden" 
                     accept="image/*"
                     onChange={(e) => handleImageUpload(e, cc.id)} 
                   />
                   <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors border border-indigo-100 dark:border-indigo-900/30 uppercase tracking-widest">
                     {cc.iconUrl ? 'Trocar' : 'Upload'}
                   </span>
                 </label>
               </div>

               <div className="pt-2 border-t border-gray-50 dark:border-slate-800">
                 <Select 
                   label="Vincular Conta para Pagamento Automático"
                   value={cc.linkedBankAccountId || 'none'}
                   onChange={e => handleLinkAccount(cc.id, e.target.value)}
                   options={linkAccountOptions}
                   className="text-xs font-bold"
                 />
                 <p className="text-[9px] text-gray-400 dark:text-slate-500 mt-1">O valor da fatura será inserido automaticamente como despesa nesta conta.</p>
               </div>
             </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 12 }, (_, i) => {
          const bill = monthlyBills[i.toString()];
          const isHighlighted = i === highlightedMonth && selectedYear === highlightedYearStr;
          const closingDay = closingDays[`${selectedYear}-${i}`] || 25;

          return (
            <Card 
              key={i} 
              className={`p-5 transition-all flex flex-col border-2 ${
                isHighlighted 
                  ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-400 dark:border-yellow-700 shadow-xl ring-2 ring-yellow-200/50 dark:ring-yellow-900/20 scale-[1.03] z-10' 
                  : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className={`font-black uppercase tracking-tighter ${isHighlighted ? 'text-yellow-800 dark:text-yellow-400 text-lg' : 'text-gray-800 dark:text-white'}`}>
                  {getMonthName(i)}
                </h3>
                {isHighlighted && (
                  <span className="text-[10px] bg-yellow-500 text-white px-3 py-1 rounded-full font-black uppercase tracking-widest shadow-md animate-pulse">
                    Aberta
                  </span>
                )}
              </div>
              
              <div className="mb-4 pb-3 border-b border-gray-100 dark:border-slate-800">
                {editingClosingMonth === i ? (
                  <div className="flex items-end gap-2">
                    <div className="w-20">
                      <Input 
                        type="number" 
                        min="1" 
                        max="31" 
                        label="Data Limite" 
                        value={tempClosingDay} 
                        onChange={e => setTempClosingDay(parseInt(e.target.value) || 1)} 
                      />
                    </div>
                    <Button size="sm" onClick={() => handleSaveClosingDay(i)}>Ok</Button>
                  </div>
                ) : (
                  <div className="flex justify-between items-center group cursor-pointer" onClick={() => { setEditingClosingMonth(i); setTempClosingDay(closingDay); }}>
                    <div>
                      <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-bold tracking-widest">Fechamento</p>
                      <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Dia {closingDay}</p>
                    </div>
                    <span className="text-[10px] opacity-0 group-hover:opacity-100 text-gray-400 dark:text-slate-500 transition-opacity font-bold uppercase tracking-widest">Alterar</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-bold tracking-widest">Acumulado</p>
                  <p className={`text-3xl font-black ${isHighlighted ? 'text-yellow-900 dark:text-yellow-100' : 'text-gray-900 dark:text-white'}`}>
                    {formatCurrencyBR(bill?.total || 0)}
                  </p>
                </div>
                
                <div className="pt-2">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] text-gray-500 dark:text-slate-500 font-semibold uppercase">{bill?.count || 0} Lançamentos</p>
                    <button 
                      onClick={() => { syncAllLinkedInvoices(); loadData(); }}
                      className="text-[9px] font-black text-indigo-600 uppercase tracking-tighter hover:underline"
                    >
                      Sincronizar
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {bill?.items.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(t => (
                      <div key={t.id} className={`flex justify-between items-start text-xs p-2 rounded-lg border ${isHighlighted ? 'bg-yellow-100/30 dark:bg-yellow-900/20 border-yellow-200/50 dark:border-yellow-700/30' : 'bg-gray-50/50 dark:bg-slate-800/50 border-gray-100 dark:border-slate-800'}`}>
                        <div className="flex flex-col min-w-0 mr-2">
                          <span className="text-gray-800 dark:text-slate-200 font-bold truncate" title={t.description}>{t.description}</span>
                          <span className="text-[9px] text-gray-400 dark:text-slate-500">{new Intl.DateTimeFormat('pt-BR').format(new Date(t.date + 'T00:00:00'))}</span>
                        </div>
                        <span className={`font-bold shrink-0 ${isHighlighted ? 'text-yellow-900 dark:text-yellow-400' : 'text-gray-900 dark:text-slate-100'}`}>{formatCurrencyBR(t.value)}</span>
                      </div>
                    ))}
                    {!bill && <p className="text-xs italic text-gray-300 dark:text-slate-700 mt-2">Nenhum gasto previsto.</p>}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CreditCardControl;
