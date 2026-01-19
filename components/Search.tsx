
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, Category, PaymentMethod, BankAccount, TransactionStatus } from '../types';
import { getTransactions, getCategories, getPaymentMethods, getBankAccounts } from '../services/storageService';
import { Input, Select, Card, Button } from './UI';

const Search: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setAllPaymentMethods] = useState<PaymentMethod[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [accFilter, setAccFilter] = useState('all');
  const [pmFilter, setPmFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    setTransactions(getTransactions());
    setCategories(getCategories());
    setAllPaymentMethods(getPaymentMethods());
    setBankAccounts(getBankAccounts());
  }, []);

  const handleClearFilters = () => {
    setSearchTerm('');
    setCatFilter('all');
    setAccFilter('all');
    setPmFilter('all');
    setTypeFilter('all');
    setStatusFilter('all');
    setStartDate('');
    setEndDate('');
  };

  const filteredResults = useMemo(() => {
    return transactions.filter(t => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch = term === '' || 
        t.description.toLowerCase().includes(term) || 
        (t.notes?.toLowerCase() || '').includes(term);
      
      const matchesCat = catFilter === 'all' || t.categoryId === catFilter;
      const matchesAcc = accFilter === 'all' || t.bankAccountId === accFilter;
      const matchesPm = pmFilter === 'all' || t.paymentMethodId === pmFilter;
      const matchesType = typeFilter === 'all' || t.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      
      const tDateObj = new Date(t.date + 'T00:00:00');
      const tTime = tDateObj.getTime();
      const matchesStartDate = startDate === '' || tTime >= new Date(startDate + 'T00:00:00').getTime();
      const matchesEndDate = endDate === '' || tTime <= new Date(endDate + 'T00:00:00').getTime();

      return matchesSearch && matchesCat && matchesAcc && matchesPm && matchesType && matchesStatus && matchesStartDate && matchesEndDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, catFilter, accFilter, pmFilter, typeFilter, statusFilter, startDate, endDate]);

  const totals = useMemo(() => {
    return filteredResults.reduce((acc, t) => {
      if (t.type === 'Receita') acc.income += t.value;
      else acc.expense += t.value;
      return acc;
    }, { income: 0, expense: 0 });
  }, [filteredResults]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);

  const formatDate = (dateStr: string) => new Intl.DateTimeFormat('pt-BR').format(new Date(dateStr + 'T00:00:00'));

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pesquisa Avançada</h1>
          <p className="text-gray-500 dark:text-slate-400">Localize lançamentos filtrando por qualquer critério.</p>
        </div>
        <Button variant="secondary" onClick={handleClearFilters} className="flex items-center gap-2">
          <span>🧹</span> Limpar Filtros
        </Button>
      </header>

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="md:col-span-2 lg:col-span-1">
            <Input label="Descrição ou Notas" placeholder="Ex: Aluguel, mercado..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <Select label="Categoria" value={catFilter} onChange={e => setCatFilter(e.target.value)} options={[{ label: 'Todas as Categorias', value: 'all' }, ...categories.map(c => ({ label: c.name, value: c.id }))]} />
          <Select label="Conta Bancária" value={accFilter} onChange={e => setAccFilter(e.target.value)} options={[{ label: 'Todas as Contas', value: 'all' }, ...bankAccounts.map(a => ({ label: a.name, value: a.id }))]} />
          <Select label="Forma de Pagamento" value={pmFilter} onChange={e => setPmFilter(e.target.value)} options={[{ label: 'Todas as Formas', value: 'all' }, ...paymentMethods.map(pm => ({ label: pm.name, value: pm.id }))]} />
          <Select label="Tipo" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} options={[{ label: 'Todos', value: 'all' }, { label: 'Receitas', value: 'Receita' }, { label: 'Despesas', value: 'Despesa' }]} />
          <Select label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} options={[{ label: 'Todos', value: 'all' }, { label: 'Pagos', value: 'Pago' }, { label: 'Previsão', value: 'Previsão' }]} />
          <Input type="date" label="Início" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <Input type="date" label="Fim" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30">
          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Total Receitas</p>
          <p className="text-xl font-black text-emerald-800 dark:text-emerald-100 mt-1">{formatCurrency(totals.income)}</p>
        </Card>
        <Card className="p-4 bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30">
          <p className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">Total Despesas</p>
          <p className="text-xl font-black text-red-800 dark:text-red-100 mt-1">{formatCurrency(totals.expense)}</p>
        </Card>
        <Card className={`p-4 ${totals.income - totals.expense >= 0 ? 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30' : 'bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/30'}`}>
          <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Saldo do Período</p>
          <p className="text-xl font-black text-indigo-800 dark:text-indigo-100 mt-1">{formatCurrency(totals.income - totals.expense)}</p>
        </Card>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-slate-800/50 border-b dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase">Data</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase">Descrição / Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase">Categoria</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {filteredResults.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 text-sm dark:text-slate-300">{formatDate(t.date)}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="font-bold text-gray-900 dark:text-slate-100">{t.description}</div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest ${t.status === 'Pago' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>{t.status}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-slate-400">{categories.find(c => c.id === t.categoryId)?.name}</td>
                  <td className={`px-6 py-4 text-sm font-black text-right ${t.type === 'Receita' ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>{formatCurrency(t.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Search;
