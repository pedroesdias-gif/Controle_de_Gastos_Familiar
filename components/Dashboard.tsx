
import React, { useMemo, useState, useEffect } from 'react';
import { 
  getMonthlySummary, 
  getYearlyHistory, 
  getBankAccountSummaries, 
  getTransactions, 
  getPaymentMethods, 
  getEffectiveDate,
  getRecurringBills,
  getCategories,
} from '../services/storageService';
import { formatCurrencyBR } from '../services/formatters';
import { RecurringBill, Transaction, Category, BankAccountSummary } from '../types';
import { Card } from './UI';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface DashboardProps {
  selectedYear: number;
}

const COLORS = ['#10b981', '#4f46e5', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'];

// Componente Interno para os Mini Gráficos de Origem
const OriginPieChart: React.FC<{ 
  title: string; 
  originType: 'CONTA' | 'CARTÃO';
  icon: string;
  data: { categoryName: string; total: number }[];
  totalValue: number;
}> = ({ title, originType, icon, data, totalValue }) => {
  return (
    <Card className="p-4 flex flex-col h-full border-gray-100 dark:border-slate-800 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <div>
            <h3 className="text-xs font-black text-gray-800 dark:text-slate-100 uppercase tracking-tight truncate max-w-[150px]">{title}</h3>
            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${originType === 'CARTÃO' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
              {originType}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-gray-900 dark:text-white">{formatCurrencyBR(totalValue)}</p>
        </div>
      </div>

      <div className="h-[180px] w-full mt-auto">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie 
                data={data} 
                cx="50%" 
                cy="50%" 
                innerRadius={35} 
                outerRadius={55} 
                paddingAngle={4} 
                dataKey="total" 
                nameKey="categoryName" 
                stroke="none"
              >
                {data.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string) => [formatCurrencyBR(value), name]} 
                contentStyle={{ 
                  borderRadius: '8px', 
                  border: 'none', 
                  backgroundColor: '#000000', 
                  color: '#ffffff', 
                  fontSize: '10px',
                  padding: '8px'
                }} 
                itemStyle={{ color: '#ffffff', fontWeight: 'bold' }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-[10px] text-gray-400 dark:text-slate-600 italic">
            Sem despesas
          </div>
        )}
      </div>
    </Card>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ selectedYear }) => {
  const [bills, setBills] = useState<RecurringBill[]>([]);
  const currentMonth = new Date().getMonth();
  const today = new Date();
  
  const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const targetMonthIdx = nextMonthDate.getMonth();
  const targetYear = nextMonthDate.getFullYear();
  const isTargetYearVisible = selectedYear === targetYear;
  
  const summary = useMemo(() => getMonthlySummary(currentMonth, selectedYear), [currentMonth, selectedYear]);
  const history = useMemo(() => getYearlyHistory(selectedYear), [selectedYear]);
  const bankSummaries = useMemo(() => getBankAccountSummaries(), []);
  const transactions = useMemo(() => getTransactions(), []);
  const paymentMethods = useMemo(() => getPaymentMethods(), []);
  const categories = useMemo(() => getCategories(), []);

  const loadBills = () => {
    setBills(getRecurringBills());
  };

  useEffect(() => {
    loadBills();
  }, [selectedYear]);

  // Lógica de Agrupamento por Origem (Conta vs Cartão)
  const originChartsData = useMemo(() => {
    const currentMonthTransactions = transactions.filter(t => {
      const effDate = getEffectiveDate(t);
      return effDate.getMonth() === currentMonth && effDate.getFullYear() === selectedYear && t.type === 'Despesa';
    });

    const isCC = (pmId: string) => {
      const pm = paymentMethods.find(p => p.id === pmId);
      return pm?.name.toLowerCase().includes('cartão de crédito') || pm?.name.toLowerCase().includes('crédito');
    };

    // 1. Agrupar por Contas (apenas despesas que NÃO são cartão)
    const bankData = bankSummaries.map(acc => {
      const accTxs = currentMonthTransactions.filter(t => t.bankAccountId === acc.id && !isCC(t.paymentMethodId));
      const catMap: Record<string, number> = {};
      accTxs.forEach(t => {
        const catName = categories.find(c => c.id === t.categoryId)?.name || 'Outros';
        catMap[catName] = (catMap[catName] || 0) + t.value;
      });

      return {
        id: acc.id,
        name: acc.name,
        icon: acc.iconUrl ? '🏦' : '💰',
        total: accTxs.reduce((sum, t) => sum + t.value, 0),
        categories: Object.entries(catMap).map(([categoryName, total]) => ({ categoryName, total }))
          .sort((a,b) => b.total - a.total)
      };
    });

    // 2. Agrupar todos os Cartões
    const ccTxs = currentMonthTransactions.filter(t => isCC(t.paymentMethodId));
    const ccCatMap: Record<string, number> = {};
    ccTxs.forEach(t => {
      const catName = categories.find(c => c.id === t.categoryId)?.name || 'Outros';
      ccCatMap[catName] = (ccCatMap[catName] || 0) + t.value;
    });

    const ccData = {
      name: 'Cartões de Crédito',
      icon: '💳',
      total: ccTxs.reduce((sum, t) => sum + t.value, 0),
      categories: Object.entries(ccCatMap).map(([categoryName, total]) => ({ categoryName, total }))
        .sort((a,b) => b.total - a.total)
    };

    return { bankData, ccData };
  }, [transactions, bankSummaries, paymentMethods, categories, currentMonth, selectedYear]);

  const getBillStatus = (bill: RecurringBill) => {
    const isPaid = bill.payments[`${selectedYear}-${currentMonth}`];
    if (isPaid) return 'PAGO';
    if (selectedYear < today.getFullYear()) return 'ATRASADO';
    if (selectedYear > today.getFullYear()) return 'A VENCER';
    if (today.getDate() > bill.dueDay) return 'ATRASADO';
    if (today.getDate() === bill.dueDay) return 'VENCENDO HOJE';
    return 'A VENCER';
  };

  const billStats = useMemo(() => {
    const stats = { 'PAGO': 0, 'ATRASADO': 0, 'A VENCER': 0, 'VENCENDO HOJE': 0, 'TOTAL': bills.length };
    bills.forEach(b => {
      const s = getBillStatus(b);
      stats[s as keyof typeof stats]++;
    });
    return stats;
  }, [bills, selectedYear, currentMonth]);

  const totalBankBalance = useMemo(() => {
    return bankSummaries.reduce((acc, b) => ({
      confirmed: acc.confirmed + b.confirmedBalance,
      total: acc.total + b.currentBalance
    }), { confirmed: 0, total: 0 });
  }, [bankSummaries]);

  const creditCardData = useMemo(() => {
    const ccMethods = paymentMethods.filter(pm => pm.name.toLowerCase().includes('cartão de crédito') || pm.name.toLowerCase().includes('crédito'));
    const ccTransactions = transactions.filter(t => 
      ccMethods.some(cc => cc.id === t.paymentMethodId) &&
      getEffectiveDate(t).getMonth() === targetMonthIdx &&
      getEffectiveDate(t).getFullYear() === targetYear
    );
    return {
      total: ccTransactions.reduce((acc, t) => acc + t.value, 0),
      count: ccTransactions.length,
      image: ccMethods.find(m => m.iconUrl)?.iconUrl || null
    };
  }, [transactions, paymentMethods, targetMonthIdx, targetYear]);

  const getMonthName = (m: number) => new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(selectedYear, m, 1));

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tighter">Dashboard {selectedYear}</h1>
          <p className="text-gray-500 dark:text-slate-400">Visão consolidada da saúde financeira da família.</p>
        </div>
      </header>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 bg-gradient-to-br from-indigo-600 to-indigo-900 dark:from-indigo-800 dark:to-indigo-950 text-white border-none shadow-indigo-200 dark:shadow-indigo-900/20 shadow-lg">
          <p className="text-xs font-bold uppercase tracking-widest opacity-70">Saldo Consolidado</p>
          <div className="mt-2">
            <p className="text-2xl font-black">{formatCurrencyBR(totalBankBalance.confirmed)}</p>
            <p className="text-[10px] opacity-60 font-bold uppercase mt-1 tracking-tight">C/ Previsão: {formatCurrencyBR(totalBankBalance.total)}</p>
          </div>
        </Card>
        <Card className="p-5 bg-white dark:bg-slate-900 border-l-4 border-l-emerald-500">
          <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Receitas (Mês)</p>
          <div className="mt-2">
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-500">{formatCurrencyBR(summary.confirmedIncome)}</p>
            <p className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase">Previsto: {formatCurrencyBR(summary.totalIncome)}</p>
          </div>
        </Card>
        <Card className="p-5 bg-white dark:bg-slate-900 border-l-4 border-l-red-500">
          <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Despesas (Mês)</p>
          <div className="mt-2">
            <p className="text-xl font-black text-red-600 dark:text-red-500">{formatCurrencyBR(summary.confirmedExpense)}</p>
            <p className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase">Previsto: {formatCurrencyBR(summary.totalExpense)}</p>
          </div>
        </Card>
        <Card className={`p-5 bg-white dark:bg-slate-900 border-l-4 ${summary.confirmedBalance >= 0 ? 'border-l-indigo-500' : 'border-l-red-700'}`}>
          <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Resultado Líquido</p>
          <div className="mt-2">
            <p className={`text-xl font-black ${summary.confirmedBalance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-700 dark:text-red-500'}`}>{formatCurrencyBR(summary.confirmedBalance)}</p>
            <p className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase">Planejado: {formatCurrencyBR(summary.balance)}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna de Vencimentos e Cartão */}
        <div className="space-y-4">
          <h2 className="text-sm font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Controle de Vencimentos</h2>
          
          <Card className="p-4 bg-white dark:bg-slate-900 shadow-sm border border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex-1 space-y-2">
              <div className="flex justify-between items-center border-b border-gray-50 dark:border-slate-800 pb-1">
                <span className="text-[10px] font-black uppercase tracking-tight text-slate-500">A Vencer</span>
                <span className="text-xs font-black text-slate-900 dark:text-slate-100">{billStats['A VENCER']}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-50 dark:border-slate-800 pb-1">
                <span className="text-[10px] font-black uppercase tracking-tight text-red-500">Atrasado</span>
                <span className="text-xs font-black text-red-600 dark:text-red-500">{billStats['ATRASADO']}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-50 dark:border-slate-800 pb-1">
                <span className="text-[10px] font-black uppercase tracking-tight text-amber-500">Vencendo Hoje</span>
                <span className="text-xs font-black text-amber-600 dark:text-amber-500">{billStats['VENCENDO HOJE']}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-tight text-emerald-600">Pago</span>
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-500">{billStats['PAGO']}</span>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 flex flex-col items-center justify-center min-w-[120px] border border-slate-100 dark:border-slate-700 ml-4">
              <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Total Geral</span>
              <span className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">{billStats['TOTAL']}</span>
            </div>
          </Card>

          <Card className={`p-4 relative overflow-hidden transition-all border-2 ${isTargetYearVisible ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400 shadow-md ring-2 ring-yellow-200/50' : 'bg-white dark:bg-slate-900 border-l-4 border-l-orange-500 dark:border-slate-800'}`}>
            <div className="flex justify-between items-start relative z-10 mb-1">
              <div>
                <p className={`text-[7px] font-black uppercase tracking-[0.2em] mb-0.5 ${isTargetYearVisible ? 'text-yellow-700/60' : 'text-orange-500/60'}`}>Cartão de Crédito</p>
                <p className={`text-[10px] uppercase font-black tracking-widest ${isTargetYearVisible ? 'text-yellow-700 dark:text-yellow-500' : 'text-gray-500 dark:text-slate-400'}`}>{isTargetYearVisible ? getMonthName(targetMonthIdx) : 'Fatura'}</p>
              </div>
              {isTargetYearVisible && <span className="text-[8px] bg-yellow-500 text-white px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest animate-pulse shadow-sm">Aberta</span>}
            </div>
            <div className="flex justify-between items-center relative z-10">
              <p className={`text-lg font-black tracking-tight ${isTargetYearVisible ? 'text-yellow-900 dark:text-yellow-100' : 'text-orange-600'}`}>{formatCurrencyBR(creditCardData.total)}</p>
              {creditCardData.image ? <div className="w-10 h-6 rounded-md overflow-hidden border border-white/50 shadow-sm rotate-3 flex-shrink-0 ml-2"><img src={creditCardData.image} className="w-full h-full object-cover" /></div> : <span className="text-xl opacity-20 flex-shrink-0 ml-2">💳</span>}
            </div>
          </Card>
        </div>

        {/* Coluna de Contas Bancárias */}
        <div className="space-y-4">
          <h2 className="text-sm font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Saldos Bancários</h2>
          <div className="grid grid-cols-1 gap-4">
            {bankSummaries.slice(0, 4).map(acc => (
              <Card key={acc.id} className="p-3 flex items-center gap-4 hover:shadow-md transition-all border-gray-100 dark:border-slate-800">
                <div className="w-10 h-10 flex-shrink-0 bg-gray-50 dark:bg-slate-800 rounded-lg flex items-center justify-center border border-gray-100 dark:border-slate-700 overflow-hidden">
                  {acc.iconUrl ? <img src={acc.iconUrl} className="w-full h-full object-contain p-1" /> : <span className="text-xl">🏦</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-black text-gray-400 dark:text-slate-500 truncate uppercase tracking-widest">{acc.name}</p>
                  <p className={`text-sm font-black truncate tracking-tighter ${acc.confirmedBalance < 0 ? 'text-red-600 dark:text-red-500' : 'text-gray-900 dark:text-slate-100'}`}>{formatCurrencyBR(acc.confirmedBalance)}</p>
                </div>
                <div className="text-right">
                   <p className="text-[8px] font-bold text-gray-300 dark:text-slate-600 uppercase">Previsão</p>
                   <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500">{formatCurrencyBR(acc.currentBalance)}</p>
                </div>
              </Card>
            ))}
            {bankSummaries.length === 0 && (
              <div className="p-8 text-center text-gray-300 dark:text-slate-600 italic text-xs">Nenhuma conta cadastrada.</div>
            )}
          </div>
        </div>
      </div>

      {/* Evolução Mensal - Gráfico de Barras */}
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-slate-100 border-b dark:border-slate-800 pb-2 text-indigo-900 dark:text-indigo-400 tracking-tight">Evolução Mensal ({selectedYear})</h2>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={history}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
              <YAxis hide />
              <Tooltip 
                formatter={(value: number) => formatCurrencyBR(value)} 
                contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#0f172a', color: '#fff', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }} 
              />
              <Legend iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '11px', fontWeight: 600}} />
              <Bar dataKey="receitasConfirmadas" fill="#10b981" name="Receitas Pagas" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesasConfirmadas" fill="#ef4444" name="Despesas Pagas" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* GALERIA DE DESPESAS POR ORIGEM - A Solicitação do Usuário */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-l-4 border-indigo-500 pl-4 py-1">
          <h2 className="text-sm font-black text-gray-600 dark:text-slate-300 uppercase tracking-[0.2em]">Despesas por Categoria e Origem</h2>
          <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase">({getMonthName(currentMonth)})</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Gráfico Especial de Cartão de Crédito */}
          <OriginPieChart 
            title={originChartsData.ccData.name}
            originType="CARTÃO"
            icon={originChartsData.ccData.icon}
            data={originChartsData.ccData.categories}
            totalValue={originChartsData.ccData.total}
          />

          {/* Gráficos Individuais por Conta Bancária */}
          {originChartsData.bankData.map(accData => (
            <OriginPieChart 
              key={accData.id}
              title={accData.name}
              originType="CONTA"
              icon={accData.icon}
              data={accData.categories}
              totalValue={accData.total}
            />
          ))}

          {originChartsData.bankData.length === 0 && originChartsData.ccData.total === 0 && (
             <div className="col-span-full py-20 text-center">
                <p className="text-gray-400 dark:text-slate-600 italic text-sm">Sem movimentações este mês.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
