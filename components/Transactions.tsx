
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Transaction, Category, TransactionType, PaymentMethod, BankAccount, TransactionStatus } from '../types';
import { 
  getTransactions, 
  getCategories, 
  getPaymentMethods, 
  getBankAccounts, 
  saveTransaction, 
  deleteTransaction,
  syncAllLinkedInvoices 
} from '../services/storageService';
import { formatCurrencyBR } from '../services/formatters';
import { Button, Input, CurrencyInput, Card, Select } from './UI';
import DeleteConfirmationModal from './DeleteConfirmationModal';

interface TransactionsProps {
  globalYear: number;
}

type SortKey = 'date' | 'description' | 'status' | 'value';
type SortOrder = 'asc' | 'desc';

const Transactions: React.FC<TransactionsProps> = ({ globalYear }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{ open: boolean, transaction: Transaction | null }>({
    open: false,
    transaction: null
  });

  // Sort State
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, order: SortOrder }>({ key: 'date', order: 'desc' });

  // Filters
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth().toString());
  const [yearFilter, setYearFilter] = useState(globalYear.toString());
  const [typeFilter, setTypeFilter] = useState('all');
  const [accFilter, setAccFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Form State
  const [formType, setFormType] = useState<TransactionType>('Despesa');
  const [numInstallments, setNumInstallments] = useState(1);
  const [formData, setFormData] = useState<Partial<Transaction>>({
    date: new Date().toISOString().split('T')[0],
    description: '',
    categoryId: '',
    bankAccountId: '',
    value: 0,
    paymentMethodId: '',
    status: 'Pago',
    notes: ''
  });

  const loadData = useCallback(() => {
    setTransactions(getTransactions());
    setCategories(getCategories());
    setPaymentMethods(getPaymentMethods());
    setBankAccounts(getBankAccounts());
  }, []);

  useEffect(() => {
    setYearFilter(globalYear.toString());
  }, [globalYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isCreditCard = useMemo(() => {
    const pm = paymentMethods.find(p => p.id === formData.paymentMethodId);
    return pm?.name.toLowerCase().includes('cartão de crédito') || pm?.name.toLowerCase().includes('crédito');
  }, [formData.paymentMethodId, paymentMethods]);

  const handleSort = useCallback((key: SortKey) => {
    setSortConfig(prev => ({
      key,
      order: prev.key === key && prev.order === 'desc' ? 'asc' : 'desc'
    }));
  }, []);

  const filteredTransactions = useMemo(() => {
    const filtered = transactions.filter(t => {
      const d = new Date(t.date + 'T00:00:00');
      const matchesMonth = monthFilter === 'all' || d.getMonth().toString() === monthFilter;
      const matchesYear = d.getFullYear().toString() === yearFilter;
      const matchesType = typeFilter === 'all' || t.type === typeFilter;
      const matchesAcc = accFilter === 'all' || t.bankAccountId === accFilter;
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      
      const isAuto = t.notes?.startsWith('AUTO_INVOICE_') || false;
      
      return matchesMonth && matchesYear && matchesType && matchesAcc && matchesStatus && !isAuto;
    });

    return filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortConfig.key) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'description':
          comparison = a.description.localeCompare(b.description);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'value':
          comparison = a.value - b.value;
          break;
      }
      return sortConfig.order === 'desc' ? comparison * -1 : comparison;
    });
  }, [transactions, monthFilter, yearFilter, typeFilter, accFilter, statusFilter, sortConfig]);

  const viewTotals = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      if (t.type === 'Receita') acc.income += t.value;
      else acc.expense += t.value;
      return acc;
    }, { income: 0, expense: 0 });
  }, [filteredTransactions]);

  const handlePaymentMethodChange = (pmId: string) => {
    const pm = paymentMethods.find(p => p.id === pmId);
    const newFormData = { ...formData, paymentMethodId: pmId };
    if (pm && pm.linkedBankAccountId) {
      newFormData.bankAccountId = pm.linkedBankAccountId;
    }
    setFormData(newFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId || !formData.bankAccountId || !formData.paymentMethodId || !formData.value || formData.value <= 0) {
      alert("Preencha Categoria, Conta, Forma de Pgto e Valor.");
      return;
    }

    const groupId = editingTransaction?.groupId || Date.now().toString();
    const baseDate = new Date(formData.date + 'T00:00:00');

    if (isCreditCard && numInstallments > 1 && !editingTransaction) {
      for (let i = 0; i < numInstallments; i++) {
        const installmentDate = new Date(baseDate);
        installmentDate.setMonth(baseDate.getMonth() + i);
        
        const installmentTransaction: Transaction = {
          id: `${groupId}-${i}`,
          date: installmentDate.toISOString().split('T')[0],
          description: `${formData.description} (${i + 1}/${numInstallments})`,
          categoryId: formData.categoryId!,
          bankAccountId: formData.bankAccountId!,
          type: formType,
          value: Number(formData.value) / numInstallments,
          paymentMethodId: formData.paymentMethodId!,
          status: (formData.status as TransactionStatus) || 'Pago',
          notes: formData.notes,
          installments: numInstallments,
          installmentIndex: i + 1,
          groupId: groupId
        };
        saveTransaction(installmentTransaction);
      }
    } else {
      const transactionToSave: Transaction = {
        id: editingTransaction ? editingTransaction.id : groupId,
        date: formData.date || new Date().toISOString().split('T')[0],
        description: formData.description || '',
        categoryId: formData.categoryId!,
        bankAccountId: formData.bankAccountId!,
        type: formType,
        value: Number(formData.value),
        paymentMethodId: formData.paymentMethodId!,
        status: (formData.status as TransactionStatus) || 'Pago',
        notes: formData.notes,
        installments: editingTransaction?.installments,
        installmentIndex: editingTransaction?.installmentIndex,
        groupId: editingTransaction?.groupId
      };
      saveTransaction(transactionToSave);
    }

    setIsFormOpen(false);
    setEditingTransaction(null);
    setNumInstallments(1);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      description: '',
      categoryId: '',
      bankAccountId: '',
      value: 0,
      paymentMethodId: '',
      status: 'Pago',
      notes: ''
    });
    
    syncAllLinkedInvoices();
    loadData();
  };

  const handleEditAction = useCallback((e: React.MouseEvent, t: Transaction) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingTransaction(t);
    setFormType(t.type);
    setFormData({ ...t });
    setNumInstallments(t.installments || 1);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleDuplicateAction = useCallback((e: React.MouseEvent, t: Transaction) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingTransaction(null);
    setFormType(t.type);
    setFormData({
      date: t.date,
      description: `${t.description} (Cópia)`,
      categoryId: t.categoryId,
      bankAccountId: t.bankAccountId,
      value: t.value,
      paymentMethodId: t.paymentMethodId,
      status: t.status,
      notes: t.notes
    });
    setNumInstallments(1);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleOpenDeleteModal = useCallback((e: React.MouseEvent, t: Transaction) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteModal({ open: true, transaction: t });
  }, []);

  const handleConfirmDelete = (deleteAllNext: boolean) => {
    if (deleteModal.transaction) {
      try {
        deleteTransaction(deleteModal.transaction.id, deleteAllNext);
        setDeleteModal({ open: false, transaction: null });
        loadData();
      } catch (err) {
        console.error("Erro ao excluir:", err);
        alert("Erro ao tentar excluir.");
      }
    }
  };

  const toggleStatusAction = useCallback((e: React.MouseEvent, t: Transaction) => {
    e.preventDefault();
    e.stopPropagation();
    const newStatus: TransactionStatus = t.status === 'Pago' ? 'Previsão' : 'Pago';
    const updatedTransaction = { ...t, status: newStatus };
    saveTransaction(updatedTransaction);
    
    syncAllLinkedInvoices();
    loadData();
  }, [loadData]);

  const formatDate = (dateStr: string) => new Intl.DateTimeFormat('pt-BR').format(new Date(dateStr + 'T00:00:00'));

  const monthOptions = [
    { label: 'Todos os meses', value: 'all' },
    ...Array.from({ length: 12 }, (_, i) => ({ 
      label: new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(2026, i, 1)), 
      value: i.toString() 
    }))
  ];

  const bankAccountOptions = useMemo(() => [
    { label: 'Todas as Contas', value: 'all' },
    ...bankAccounts.map(ba => ({ label: ba.name, value: ba.id }))
  ], [bankAccounts]);

  const SortIndicator = ({ column }: { column: SortKey }) => {
    if (sortConfig.key !== column) return <span className="ml-1 opacity-20">⇅</span>;
    return <span className="ml-1 text-indigo-500 font-bold">{sortConfig.order === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lançamentos</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Controle total de suas entradas e saídas.</p>
        </div>
        <Button onClick={() => { 
          setIsFormOpen(true); 
          setEditingTransaction(null); 
          setFormType('Despesa'); 
          setNumInstallments(1); 
          setFormData({ 
            date: new Date().toISOString().split('T')[0],
            description: '',
            categoryId: '',
            bankAccountId: '',
            value: 0,
            paymentMethodId: '',
            status: 'Pago',
            notes: ''
          }); 
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}>
          Novo Lançamento
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800">
           <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Receitas (Filtro)</p>
           <p className="text-xl font-black text-emerald-700 dark:text-emerald-400">{formatCurrencyBR(viewTotals.income)}</p>
        </Card>
        <Card className="p-4 bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800">
           <p className="text-[10px] font-black uppercase text-red-600 tracking-widest">Despesas (Filtro)</p>
           <p className="text-xl font-black text-red-700 dark:text-red-400">{formatCurrencyBR(viewTotals.expense)}</p>
        </Card>
        <Card className="p-4 bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800">
           <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Saldo do Filtro</p>
           <p className={`text-xl font-black ${viewTotals.income - viewTotals.expense >= 0 ? 'text-indigo-700 dark:text-indigo-400' : 'text-orange-600'}`}>
              {formatCurrencyBR(viewTotals.income - viewTotals.expense)}
           </p>
        </Card>
      </div>

      <Card className="p-4 bg-white dark:bg-slate-900 flex flex-wrap gap-4 items-center shadow-sm">
        <div className="w-full md:w-auto min-w-[80px]">
          <Select label="Ano" value={yearFilter} onChange={e => setYearFilter(e.target.value)} options={Array.from({ length: 11 }, (_, i) => ({ label: (new Date().getFullYear() - 5 + i).toString(), value: (new Date().getFullYear() - 5 + i).toString() }))} />
        </div>
        <div className="w-full md:w-auto min-w-[140px]">
          <Select label="Mês" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} options={monthOptions} />
        </div>
        <div className="w-full md:w-auto min-w-[140px]">
          <Select label="Conta" value={accFilter} onChange={e => setAccFilter(e.target.value)} options={bankAccountOptions} />
        </div>
        <div className="w-full md:w-auto min-w-[120px]">
          <Select label="Tipo" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} options={[{ label: 'Todos', value: 'all' }, { label: 'Receitas', value: 'Receita' }, { label: 'Despesas', value: 'Despesa' }]} />
        </div>
        <div className="w-full md:w-auto min-w-[120px]">
          <Select label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} options={[{ label: 'Todos', value: 'all' }, { label: 'Pago', value: 'Pago' }, { label: 'Previsão', value: 'Previsão' }]} />
        </div>
      </Card>

      {isFormOpen && (
        <Card className="p-6 border-indigo-100 dark:border-indigo-900 bg-indigo-50/10 dark:bg-indigo-900/10 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-800 dark:text-slate-100">
              {editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}
            </h2>
            <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-2">✕</button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex p-1 bg-gray-100 dark:bg-slate-800 rounded-xl w-fit">
                <button type="button" onClick={() => setFormType('Despesa')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${formType === 'Despesa' ? 'bg-red-600 text-white shadow-md' : 'text-gray-500 dark:text-slate-400'}`}>Despesa</button>
                <button type="button" onClick={() => setFormType('Receita')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${formType === 'Receita' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 dark:text-slate-400'}`}>Receita</button>
              </div>

              <div className="flex p-1 bg-gray-100 dark:bg-slate-800 rounded-xl w-fit">
                <button type="button" onClick={() => setFormData({ ...formData, status: 'Pago' })} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${formData.status === 'Pago' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-500 dark:text-slate-400'}`}>Pago</button>
                <button type="button" onClick={() => setFormData({ ...formData, status: 'Previsão' })} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${formData.status === 'Previsão' ? 'bg-amber-500 text-white shadow-md' : 'text-gray-500 dark:text-slate-400'}`}>Previsão</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input type="date" label="Data" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
              <Input label="Descrição" value={formData.description} placeholder="Ex: Mercado mensal" onChange={e => setFormData({ ...formData, description: e.target.value })} />
              <CurrencyInput label="Valor" value={formData.value || 0} onChange={val => setFormData({ ...formData, value: val })} />
              
              <Select label="Forma de Pgto" value={formData.paymentMethodId} onChange={e => handlePaymentMethodChange(e.target.value)} options={[{ label: 'Selecione...', value: '' }, ...paymentMethods.filter(pm => pm.type === formType).map(pm => ({ label: pm.name, value: pm.id }))]} />
              <Select label="Conta" value={formData.bankAccountId} onChange={e => setFormData({ ...formData, bankAccountId: e.target.value })} options={[{ label: 'Selecione...', value: '' }, ...bankAccounts.map(ba => ({ label: ba.name, value: ba.id }))]} />
              <Select label="Categoria" value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value })} options={[{ label: 'Selecione...', value: '' }, ...categories.filter(c => c.type === formType).map(c => ({ label: c.name, value: c.id }))]} />

              {isCreditCard && !editingTransaction && (
                <div className="animate-in zoom-in duration-200">
                  <Input type="number" min="1" max="48" label="Parcelas" value={numInstallments} onChange={e => setNumInstallments(parseInt(e.target.value) || 1)} />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-800">
              <Button type="button" variant="secondary" onClick={() => { setIsFormOpen(false); setEditingTransaction(null); }}>Cancelar</Button>
              <Button type="submit" className={formType === 'Despesa' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}>
                {editingTransaction ? 'Atualizar Lançamento' : 'Salvar Lançamento'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-slate-800/50 border-b dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 whitespace-nowrap" onClick={() => handleSort('date')}>
                  Data <SortIndicator column="date" />
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800" onClick={() => handleSort('description')}>
                  Descrição <SortIndicator column="description" />
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800" onClick={() => handleSort('status')}>
                  Status <SortIndicator column="status" />
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase hidden md:table-cell">Pagamento</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800" onClick={() => handleSort('value')}>
                  Valor <SortIndicator column="value" />
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {filteredTransactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group animate-in fade-in duration-300">
                  <td className="px-6 py-4 text-sm whitespace-nowrap dark:text-slate-300 font-medium">{formatDate(t.date)}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="font-bold text-gray-900 dark:text-slate-100">{t.description}</div>
                    <div className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-black tracking-widest">
                      {categories.find(c => c.id === t.categoryId)?.name} | {bankAccounts.find(a => a.id === t.bankAccountId)?.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={(e) => toggleStatusAction(e, t)}
                      title="Clique para alternar status"
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border ${
                        t.status === 'Pago' 
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' 
                          : 'bg-amber-100 text-amber-700 border-amber-200 shadow-sm dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full mr-2 ${t.status === 'Pago' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                      {t.status}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400 whitespace-nowrap hidden md:table-cell">
                    {paymentMethods.find(pm => pm.id === t.paymentMethodId)?.name || '-'}
                  </td>
                  <td className={`px-6 py-4 text-sm font-black text-right whitespace-nowrap ${t.type === 'Receita' ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
                    {t.type === 'Receita' ? '+' : '-'} {formatCurrencyBR(t.value)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end items-center gap-1">
                      <button 
                        onClick={(e) => handleEditAction(e, t)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                        title="Editar Lançamento"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button 
                        onClick={(e) => handleDuplicateAction(e, t)}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                        title="Duplicar Lançamento"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                        </svg>
                      </button>
                      <button 
                        onClick={(e) => handleOpenDeleteModal(e, t)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                        title="Excluir Lançamento"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-gray-500 dark:text-slate-600 italic">Nenhum lançamento encontrado.</td>
                </tr>
              )}
            </tbody>
            {filteredTransactions.length > 0 && (
              <tfoot className="bg-gray-50 dark:bg-slate-800/80 border-t-2 dark:border-slate-800">
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-xs font-black text-gray-500 dark:text-slate-400 uppercase text-right tracking-widest">Saldo Visível:</td>
                  <td className={`px-6 py-4 text-sm font-black text-right whitespace-nowrap ${viewTotals.income - viewTotals.expense >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-600 dark:text-red-500'}`}>
                    {formatCurrencyBR(viewTotals.income - viewTotals.expense)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      <DeleteConfirmationModal 
        isOpen={deleteModal.open}
        transaction={deleteModal.transaction}
        onClose={() => setDeleteModal({ open: false, transaction: null })}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default Transactions;
