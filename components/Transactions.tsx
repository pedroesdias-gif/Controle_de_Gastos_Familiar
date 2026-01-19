
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, Category, TransactionType, PaymentMethod, BankAccount, TransactionStatus } from '../types';
import { getTransactions, getCategories, getPaymentMethods, getBankAccounts, saveTransaction, deleteTransaction } from '../services/storageService';
import { formatCurrencyBR } from '../services/formatters';
import { Button, Input, CurrencyInput, Select, Card } from './UI';

interface TransactionsProps {
  globalYear: number;
}

const Transactions: React.FC<TransactionsProps> = ({ globalYear }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
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

  useEffect(() => {
    setYearFilter(globalYear.toString());
  }, [globalYear]);

  const loadData = () => {
    setTransactions(getTransactions());
    setCategories(getCategories());
    setPaymentMethods(getPaymentMethods());
    setBankAccounts(getBankAccounts());
  };

  useEffect(() => {
    loadData();
  }, []);

  const isCreditCard = useMemo(() => {
    const pm = paymentMethods.find(p => p.id === formData.paymentMethodId);
    return pm?.name.toLowerCase().includes('cartão de crédito') || pm?.name.toLowerCase().includes('crédito');
  }, [formData.paymentMethodId, paymentMethods]);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        const d = new Date(t.date + 'T00:00:00');
        const matchesMonth = monthFilter === 'all' || d.getMonth().toString() === monthFilter;
        const matchesYear = d.getFullYear().toString() === yearFilter;
        const matchesType = typeFilter === 'all' || t.type === typeFilter;
        const matchesAcc = accFilter === 'all' || t.bankAccountId === accFilter;
        const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
        return matchesMonth && matchesYear && matchesType && matchesAcc && matchesStatus;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, monthFilter, yearFilter, typeFilter, accFilter, statusFilter]);

  const handlePaymentMethodChange = (pmId: string) => {
    const pm = paymentMethods.find(p => p.id === pmId);
    const newFormData = { ...formData, paymentMethodId: pmId };
    
    // Se a forma de pagamento tiver uma conta vinculada (configurada na guia Cartão de Crédito)
    // Preenchemos automaticamente o campo de conta bancária.
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

    const groupId = Date.now().toString();
    const baseDate = new Date(formData.date + 'T00:00:00');

    if (isCreditCard && numInstallments > 1 && !editingTransaction) {
      // Logic for installments
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
    loadData();
  };

  const handleEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setFormType(t.type);
    setFormData(t);
    setNumInstallments(t.installments || 1);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Deseja realmente excluir este lançamento?")) {
      deleteTransaction(id);
      loadData();
    }
  };

  const toggleStatus = (t: Transaction) => {
    const newStatus: TransactionStatus = t.status === 'Pago' ? 'Previsão' : 'Pago';
    saveTransaction({ ...t, status: newStatus });
    loadData();
  };

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lançamentos</h1>
        <Button onClick={() => { setIsFormOpen(true); setEditingTransaction(null); setFormType('Despesa'); setNumInstallments(1); setFormData({ ...formData, value: 0, status: 'Pago' }); }}>
          Novo Lançamento
        </Button>
      </div>

      <Card className="p-4 bg-white dark:bg-slate-900 flex flex-wrap gap-4 items-center shadow-sm">
        <div className="w-full md:w-auto min-w-[80px]">
          <Select label="Ano" value={yearFilter} onChange={e => setYearFilter(e.target.value)} options={Array.from({ length: 11 }, (_, i) => ({ label: (new Date().getFullYear() - 5 + i).toString(), value: (new Date().getFullYear() - 5 + i).toString() }))} />
        </div>
        <div className="w-full md:w-auto min-w-[140px]">
          <Select 
            label="Mês" 
            value={monthFilter} 
            onChange={e => setMonthFilter(e.target.value)} 
            options={monthOptions} 
          />
        </div>
        <div className="w-full md:w-auto min-w-[140px]">
          <Select 
            label="Conta" 
            value={accFilter} 
            onChange={e => setAccFilter(e.target.value)} 
            options={bankAccountOptions} 
          />
        </div>
        <div className="w-full md:w-auto min-w-[120px]">
          <Select label="Tipo" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} options={[{ label: 'Todos', value: 'all' }, { label: 'Receitas', value: 'Receita' }, { label: 'Despesas', value: 'Despesa' }]} />
        </div>
        <div className="w-full md:w-auto min-w-[120px]">
          <Select 
            label="Status" 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)} 
            options={[
              { label: 'Todos', value: 'all' }, 
              { label: 'Pago', value: 'Pago' }, 
              { label: 'Previsão', value: 'Previsão' }
            ]} 
          />
        </div>
      </Card>

      {isFormOpen && (
        <Card className="p-6 border-indigo-100 dark:border-indigo-900 bg-indigo-50/10 dark:bg-indigo-900/10 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-lg font-bold mb-6 text-gray-800 dark:text-slate-100">{editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}</h2>
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
              <Input label="Descrição" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              <CurrencyInput 
                label="Valor Total" 
                value={formData.value || 0} 
                onChange={val => setFormData({ ...formData, value: val })} 
              />
              
              <Select label="Forma de Pgto" value={formData.paymentMethodId} onChange={e => handlePaymentMethodChange(e.target.value)} options={[{ label: 'Selecione a forma', value: '' }, ...paymentMethods.filter(pm => pm.type === formType).map(pm => ({ label: pm.name, value: pm.id }))]} />
              <Select label="Conta" value={formData.bankAccountId} onChange={e => setFormData({ ...formData, bankAccountId: e.target.value })} options={[{ label: 'Selecione a conta', value: '' }, ...bankAccounts.map(ba => ({ label: ba.name, value: ba.id }))]} />
              <Select label="Categoria" value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value })} options={[{ label: 'Selecione a categoria', value: '' }, ...categories.filter(c => c.type === formType).map(c => ({ label: c.name, value: c.id }))]} />

              {isCreditCard && !editingTransaction && (
                <div className="animate-in zoom-in duration-200">
                  <Input type="number" min="1" max="48" label="Número de Parcelas" value={numInstallments} onChange={e => setNumInstallments(parseInt(e.target.value) || 1)} />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-800">
              <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button type="submit" className={formType === 'Despesa' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}>Salvar Lançamento</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-slate-800/50 border-b dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase">Data</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase">Descrição</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase">Forma de Pgto</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase text-right">Valor</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {filteredTransactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 text-sm whitespace-nowrap dark:text-slate-300">{formatDate(t.date)}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="font-bold text-gray-900 dark:text-slate-100">{t.description}</div>
                    <div className="text-[10px] text-gray-400 dark:text-slate-500 uppercase font-semibold tracking-wider">
                      {categories.find(c => c.id === t.categoryId)?.name} | {bankAccounts.find(a => a.id === t.bankAccountId)?.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => toggleStatus(t)}
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
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400 whitespace-nowrap">
                    {paymentMethods.find(pm => pm.id === t.paymentMethodId)?.name || '-'}
                  </td>
                  <td className={`px-6 py-4 text-sm font-black text-right whitespace-nowrap ${t.type === 'Receita' ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
                    {t.type === 'Receita' ? '+' : '-'} {formatCurrencyBR(t.value)}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(t)}>Editar</Button>
                    <Button variant="ghost" size="sm" className="text-red-600 dark:text-red-400" onClick={() => handleDelete(t.id)}>Excluir</Button>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-slate-500 italic">Nenhum lançamento encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Transactions;
