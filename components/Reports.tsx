
import React, { useState, useMemo, useEffect } from 'react';
import { getMonthlySummary, getCategorySummary, getTransactions, getPaymentMethods, getCategories, getEffectiveDate, getBankAccounts } from '../services/storageService';
import { formatCurrencyBR } from '../services/formatters';
import { Transaction, Category, PaymentMethod, BankAccount } from '../types';
import { Card, Select, Input, Button } from './UI';
import { Treemap, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsProps {
  selectedYear: number;
}

const COLORS = ['#10b981', '#4f46e5', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

const CustomTreemapContent = (props: any) => {
  const { x, y, width, height, index, categoryName, percentage } = props;
  
  // Condição para não renderizar nada se o bloco for minúsculo
  if (width < 30 || height < 20 || percentage === undefined) return null;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: COLORS[index % COLORS.length],
          stroke: '#fff',
          strokeWidth: 1,
          strokeOpacity: 0.5,
        }}
      />
      {/* Rótulo da Categoria - Com sombra/contorno para máxima nitidez */}
      {width > 45 && height > 25 && categoryName && (
        <text
          x={x + width / 2}
          y={y + height / 2 - (height > 45 ? 5 : 0)}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#fff"
          fontSize={width > 80 ? 13 : 11}
          fontWeight="800"
          className="pointer-events-none uppercase tracking-tighter"
          style={{ 
            textShadow: '0px 1px 2px rgba(0,0,0,0.4)',
            paintOrder: 'stroke',
            stroke: 'rgba(0,0,0,0.15)',
            strokeWidth: '1px'
          }}
        >
          {width > 60 ? categoryName : categoryName.substring(0, 3)}
        </text>
      )}
      {/* Porcentagem - Aplicando a mesma nitidez dos rótulos */}
      {width > 50 && height > 45 && percentage !== undefined && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 12}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#fff"
          fontSize={width > 80 ? 11 : 10}
          fontWeight="800"
          className="pointer-events-none opacity-100"
          style={{ 
            textShadow: '0px 1px 2px rgba(0,0,0,0.4)',
            paintOrder: 'stroke',
            stroke: 'rgba(0,0,0,0.15)',
            strokeWidth: '1px'
          }}
        >
          {percentage.toFixed(1)}%
        </text>
      )}
    </g>
  );
};

// Subcomponente para o relatório de cada conta
const AccountReportItem: React.FC<{
  account: BankAccount;
  allTransactions: Transaction[];
  categories: Category[];
  isDarkMode: boolean;
}> = ({ account, allTransactions, categories, isDarkMode }) => {
  const now = new Date();
  const [startDate, setStartDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredData = useMemo(() => {
    return allTransactions.filter(t => {
      if (t.bankAccountId !== account.id) return false;
      
      const tDate = new Date(t.date + 'T00:00:00');
      const start = startDate ? new Date(startDate + 'T00:00:00') : null;
      const end = endDate ? new Date(endDate + 'T00:00:00') : null;
      
      const matchesDate = (!start || tDate >= start) && (!end || tDate <= end);
      const matchesCategory = categoryFilter === 'all' || t.categoryId === categoryFilter;
      
      return matchesDate && matchesCategory;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allTransactions, account.id, startDate, endDate, categoryFilter]);

  const stats = useMemo(() => {
    return filteredData.reduce((acc, t) => {
      if (t.type === 'Receita') acc.income += t.value;
      else acc.expense += t.value;
      return acc;
    }, { income: 0, expense: 0 });
  }, [filteredData]);

  const chartData = useMemo(() => {
    const dataMap: Record<string, number> = {};
    filteredData.forEach(t => {
      const catName = categories.find(c => c.id === t.categoryId)?.name || 'Outros';
      dataMap[catName] = (dataMap[catName] || 0) + t.value;
    });
    return Object.entries(dataMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData, categories]);

  const formatDate = (dateStr: string) => new Intl.DateTimeFormat('pt-BR').format(new Date(dateStr + 'T00:00:00'));

  const exportExcel = () => {
    const data = filteredData.map(t => ({
      'Data': formatDate(t.date),
      'Descrição': t.description,
      'Categoria': categories.find(c => c.id === t.categoryId)?.name || 'Outros',
      'Tipo': t.type,
      'Valor': formatCurrencyBR(t.value)
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Extrato");
    XLSX.writeFile(wb, `Relatorio_${account.name}_${startDate}_a_${endDate}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(16, 185, 129);
    doc.text(`Relatório de Conta: ${account.name}`, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Período: ${formatDate(startDate)} a ${formatDate(endDate)}`, 14, 28);
    
    doc.setDrawColor(200);
    doc.line(14, 32, 196, 32);

    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`Total Entradas: ${formatCurrencyBR(stats.income)}`, 14, 42);
    doc.text(`Total Saídas: ${formatCurrencyBR(stats.expense)}`, 14, 48);
    doc.text(`Saldo do Período: ${formatCurrencyBR(stats.income - stats.expense)}`, 14, 54);

    const tableData = filteredData.map(t => [
      formatDate(t.date),
      t.description,
      categories.find(c => c.id === t.categoryId)?.name || 'Outros',
      t.type,
      formatCurrencyBR(t.value)
    ]);

    autoTable(doc, {
      startY: 65,
      head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor']],
      body: tableData,
      headStyles: { fillColor: [16, 185, 129] }
    });
    doc.save(`Extrato_${account.name}.pdf`);
  };

  return (
    <Card className="p-6 border-emerald-50 dark:border-slate-800">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center border border-emerald-100 dark:border-emerald-800">
            {account.iconUrl ? <img src={account.iconUrl} className="w-6 h-6 object-contain" /> : <span className="text-xl">🏦</span>}
          </div>
          <div>
            <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tight">{account.name}</h3>
            <p className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-widest">Extrato Detalhado</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={exportExcel} className="text-xs">📊 Excel</Button>
          <Button variant="secondary" size="sm" onClick={exportPDF} className="text-xs">📄 PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Input type="date" label="De" value={startDate} onChange={setStartDate} />
        <Input type="date" label="Até" value={endDate} onChange={setEndDate} />
        <Select 
          label="Categoria" 
          value={categoryFilter} 
          onChange={e => setCategoryFilter(e.target.value)} 
          options={[{label: 'Todas', value: 'all'}, ...categories.map(c => ({label: c.name, value: c.id}))]} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
           <div className="h-[250px]">
             {chartData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData} layout="vertical">
                   <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={isDarkMode ? '#334155' : '#f1f5f9'} />
                   <XAxis type="number" hide />
                   <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: isDarkMode ? '#94a3b8' : '#64748b'}} width={80} />
                   <Tooltip 
                     formatter={(v: number) => formatCurrencyBR(v)}
                     contentStyle={{borderRadius: '12px', border: 'none', backgroundColor: isDarkMode ? '#1e293b' : '#fff', color: isDarkMode ? '#fff' : '#000'}}
                   />
                   <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={15} />
                 </BarChart>
               </ResponsiveContainer>
             ) : (
               <div className="h-full flex items-center justify-center text-gray-300 dark:text-slate-700 italic text-xs">Sem movimentações no período.</div>
             )}
           </div>
        </div>
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
            <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Saldo no Período</p>
            <p className={`text-2xl font-black ${stats.income - stats.expense >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-500'}`}>
              {formatCurrencyBR(stats.income - stats.expense)}
            </p>
            <div className="flex justify-between mt-2 pt-2 border-t border-emerald-100 dark:border-emerald-900/20">
              <span className="text-[9px] font-bold text-gray-400 uppercase">Entradas: {formatCurrencyBR(stats.income)}</span>
              <span className="text-[9px] font-bold text-gray-400 uppercase">Saídas: {formatCurrencyBR(stats.expense)}</span>
            </div>
          </div>
          
          <div className="max-h-[120px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
             {filteredData.slice(0, 10).map(t => (
               <div key={t.id} className="flex justify-between items-center text-[10px] p-2 bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700">
                 <span className="font-bold dark:text-slate-300 truncate max-w-[120px]">{t.description}</span>
                 <span className={`font-black ${t.type === 'Receita' ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrencyBR(t.value)}</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

const Reports: React.FC<ReportsProps> = ({ selectedYear }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));
  
  // States for CC and Bank Accounts
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [allPaymentMethods, setAllPaymentMethods] = useState<PaymentMethod[]>([]);
  const [allBankAccounts, setAllBankAccounts] = useState<BankAccount[]>([]);

  // CC Report Filters
  const [ccCardFilter, setCcCardFilter] = useState('all');
  const [ccCategoryFilter, setCcCategoryFilter] = useState('all');
  const [ccStartDate, setCcStartDate] = useState('');
  const [ccEndDate, setCcEndDate] = useState('');

  useEffect(() => {
    setAllTransactions(getTransactions());
    setAllCategories(getCategories());
    setAllPaymentMethods(getPaymentMethods());
    setAllBankAccounts(getBankAccounts());
    
    // Default CC filter dates to current month
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    setCcStartDate(start);
    setCcEndDate(end);

    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    label: new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(selectedYear, i, 1)),
    value: i.toString()
  }));

  const monthIdx = parseInt(selectedMonth);
  const summary = useMemo(() => getMonthlySummary(monthIdx, selectedYear), [monthIdx, selectedYear]);
  const catSummary = useMemo(() => getCategorySummary(monthIdx, selectedYear), [monthIdx, selectedYear]);

  const creditCards = useMemo(() => {
    return allPaymentMethods.filter(pm => pm.name.toLowerCase().includes('cartão de crédito') || pm.name.toLowerCase().includes('crédito'));
  }, [allPaymentMethods]);

  const filteredCcTransactions = useMemo(() => {
    return allTransactions.filter(t => {
      const isCC = creditCards.some(cc => cc.id === t.paymentMethodId);
      if (!isCC) return false;

      const matchesCard = ccCardFilter === 'all' || t.paymentMethodId === ccCardFilter;
      const matchesCategory = ccCategoryFilter === 'all' || t.categoryId === ccCategoryFilter;
      
      const tDate = new Date(t.date + 'T00:00:00');
      const start = ccStartDate ? new Date(ccStartDate + 'T00:00:00') : null;
      const end = ccEndDate ? new Date(ccEndDate + 'T00:00:00') : null;
      
      const matchesStart = !start || tDate >= start;
      const matchesEnd = !end || tDate <= end;

      return matchesCard && matchesCategory && matchesStart && matchesEnd;
    });
  }, [allTransactions, creditCards, ccCardFilter, ccCategoryFilter, ccStartDate, ccEndDate]);

  const ccChartData = useMemo(() => {
    const dataMap: Record<string, number> = {};
    filteredCcTransactions.forEach(t => {
      const catName = allCategories.find(c => c.id === t.categoryId)?.name || 'Outros';
      dataMap[catName] = (dataMap[catName] || 0) + t.value;
    });

    return Object.entries(dataMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredCcTransactions, allCategories]);

  const totalCcSpent = useMemo(() => {
    return filteredCcTransactions.reduce((acc, t) => acc + t.value, 0);
  }, [filteredCcTransactions]);

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(dateStr + 'T00:00:00'));
  };

  // EXPORT FUNCTIONS
  const handleExportExcel = () => {
    const dataToExport = filteredCcTransactions.map(t => ({
      'Data': formatDate(t.date),
      'Descrição': t.description,
      'Categoria': allCategories.find(c => c.id === t.categoryId)?.name || 'Outros',
      'Cartão': allPaymentMethods.find(pm => pm.id === t.paymentMethodId)?.name || 'N/A',
      'Valor': formatCurrencyBR(t.value)
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fatura Cartão");
    XLSX.writeFile(wb, `Relatorio_Cartao_${ccStartDate}_ate_${ccEndDate}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(18);
    doc.setTextColor(79, 70, 229);
    doc.text('Relatório de Cartão de Crédito', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Período: ${formatDate(ccStartDate)} até ${formatDate(ccEndDate)}`, 14, 28);
    doc.setDrawColor(249, 115, 22);
    doc.setFillColor(255, 247, 237);
    doc.roundedRect(14, 40, pageWidth - 28, 20, 3, 3, 'FD');
    doc.setFontSize(11);
    doc.setTextColor(154, 52, 18);
    doc.text('Total Acumulado no Período:', 20, 52);
    doc.text(formatCurrencyBR(totalCcSpent), pageWidth - 60, 52);

    const tableData = filteredCcTransactions.map(t => [
      formatDate(t.date),
      t.description,
      allCategories.find(c => c.id === t.categoryId)?.name || 'Outros',
      allPaymentMethods.find(pm => pm.id === t.paymentMethodId)?.name || 'N/A',
      formatCurrencyBR(t.value)
    ]);

    autoTable(doc, {
      startY: 70,
      head: [['Data', 'Descrição', 'Categoria', 'Cartão', 'Valor']],
      body: tableData,
      headStyles: { fillColor: [79, 70, 229], textColor: 255 },
      styles: { fontSize: 9 }
    });
    doc.save(`Relatorio_Cartao_${ccStartDate}.pdf`);
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relatórios de {selectedYear}</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Visão geral do fluxo financeiro mensal.</p>
        </div>
        <div className="w-full md:w-64">
          <Select 
            label="Mês de Referência"
            value={selectedMonth} 
            onChange={e => setSelectedMonth(e.target.value)} 
            options={monthOptions} 
          />
        </div>
      </div>

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-bold mb-6 border-b border-gray-100 dark:border-slate-800 pb-2 text-indigo-900 dark:text-indigo-400">Resumo Financeiro ({monthOptions[monthIdx].label})</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
              <div className="flex flex-col">
                <span className="text-emerald-800 dark:text-emerald-400 font-medium text-xs uppercase tracking-wider">Receitas:</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-500 font-bold">Confirmado: {formatCurrencyBR(summary.confirmedIncome)}</span>
              </div>
              <span className="text-emerald-600 dark:text-emerald-500 font-black text-lg">{formatCurrencyBR(summary.totalIncome)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
              <div className="flex flex-col">
                <span className="text-red-800 dark:text-red-400 font-medium text-xs uppercase tracking-wider">Despesas:</span>
                <span className="text-[10px] text-red-600 dark:text-red-500 font-bold">Confirmado: {formatCurrencyBR(summary.confirmedExpense)}</span>
              </div>
              <span className="text-red-600 dark:text-red-500 font-black text-lg">{formatCurrencyBR(summary.totalExpense)}</span>
            </div>
            <div className="pt-4 mt-4 border-t border-dashed border-gray-200 dark:border-slate-800 flex justify-between items-center px-2">
              <div className="flex flex-col">
                <span className="text-gray-800 dark:text-slate-300 font-bold uppercase text-xs tracking-tight">Saldo do Mês:</span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">Confirmado: {formatCurrencyBR(summary.confirmedBalance)}</span>
              </div>
              <span className={`text-2xl font-black ${summary.balance >= 0 ? 'text-indigo-700 dark:text-indigo-400' : 'text-orange-700 dark:text-orange-500'}`}>
                {formatCurrencyBR(summary.balance)}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-bold mb-6 border-b border-gray-100 dark:border-slate-800 pb-2 text-indigo-900 dark:text-indigo-400">Distribuição de Gastos</h2>
          <div className="h-[280px] w-full">
            {catSummary.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <Treemap data={catSummary as any[]} dataKey="total" stroke="#fff" content={<CustomTreemapContent />}>
                  <Tooltip 
                    formatter={(value: number, name: string, props: any) => [formatCurrencyBR(value), props.payload.categoryName]}
                    contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: isDarkMode ? '#1e293b' : '#fff', color: isDarkMode ? '#fff' : '#000' }}
                  />
                </Treemap>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-slate-600 italic space-y-2">
                <span className="text-4xl opacity-20">📊</span>
                <p>Sem despesas registradas.</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Credit Card Report Section */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-l-4 border-orange-500 pl-4">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Relatório de Cartão de Crédito</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Análise detalhada de faturas e gastos parcelados.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleExportExcel} className="flex items-center gap-2 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400">
              <span className="text-lg">📊</span> .XLS
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExportPDF} className="flex items-center gap-2 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
              <span className="text-lg">📄</span> .PDF
            </Button>
          </div>
        </div>

        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Select label="Filtrar Cartão" value={ccCardFilter} onChange={e => setCcCardFilter(e.target.value)} options={[{label: 'Todos os Cartões', value: 'all'}, ...creditCards.map(cc => ({label: cc.name, value: cc.id}))]} />
            <Select label="Categoria" value={ccCategoryFilter} onChange={e => setCcCategoryFilter(e.target.value)} options={[{label: 'Todas as Categorias', value: 'all'}, ...allCategories.map(c => ({label: c.name, value: c.id}))]} />
            <Input label="Data Inicial" type="date" value={ccStartDate} onChange={setCcStartDate} />
            <Input label="Data Final" type="date" value={ccEndDate} onChange={setCcEndDate} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 h-[350px]">
              <h3 className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">Gasto por Categoria no Período</h3>
              {ccChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ccChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={isDarkMode ? '#334155' : '#f1f5f9'} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: isDarkMode ? '#94a3b8' : '#64748b'}} width={100} />
                    <Tooltip 
                      formatter={(v: number) => formatCurrencyBR(v)}
                      contentStyle={{borderRadius: '12px', border: 'none', backgroundColor: isDarkMode ? '#1e293b' : '#fff', color: isDarkMode ? '#fff' : '#000'}}
                    />
                    <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-300 dark:text-slate-700 italic text-sm">Nenhum dado para o filtro selecionado.</div>
              )}
            </div>

            <div className="space-y-6">
              <div className="p-6 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-900/30 flex flex-col items-center justify-center text-center">
                <p className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-1">Total Filtrado</p>
                <p className="text-3xl font-black text-orange-900 dark:text-orange-100 tracking-tighter">{formatCurrencyBR(totalCcSpent)}</p>
                <p className="text-[10px] text-orange-400 dark:text-orange-500 font-bold mt-1 uppercase">{filteredCcTransactions.length} Lançamentos</p>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                <h4 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest sticky top-0 bg-white dark:bg-slate-900 py-1">Maiores Gastos</h4>
                {filteredCcTransactions.sort((a,b) => b.value - a.value).slice(0, 5).map(t => (
                  <div key={t.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-orange-200 dark:hover:border-orange-900/50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-800 dark:text-slate-200 truncate">{t.description}</p>
                      <p className="text-[9px] text-gray-400 dark:text-slate-500 font-bold uppercase">{formatDate(t.date)}</p>
                    </div>
                    <span className="text-xs font-black text-gray-900 dark:text-slate-100 shrink-0 ml-2">{formatCurrencyBR(t.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* New Section: Reports for each Bank Account */}
      <div className="space-y-8">
        <div className="border-l-4 border-emerald-500 pl-4">
          <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Análise Detalhada por Conta Bancária</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Extratos e filtragem individual por instituição financeira.</p>
        </div>

        <div className="grid grid-cols-1 gap-10">
          {allBankAccounts.map(account => (
            <AccountReportItem 
              key={account.id} 
              account={account} 
              allTransactions={allTransactions} 
              categories={allCategories} 
              isDarkMode={isDarkMode} 
            />
          ))}
          {allBankAccounts.length === 0 && (
            <Card className="p-12 text-center text-gray-400 dark:text-slate-600 italic">
              Nenhuma conta bancária cadastrada para exibir relatórios.
            </Card>
          )}
        </div>
      </div>

      {/* Table Summary */}
      {catSummary.length > 0 && (
        <Card className="overflow-hidden border-indigo-50 dark:border-slate-800">
          <div className="bg-indigo-900/5 dark:bg-slate-800/50 border-b border-indigo-100 dark:border-slate-800 px-6 py-4">
            <h3 className="font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 bg-indigo-600 dark:bg-indigo-400 rounded-full"></span>
              Detalhamento de Categorias Geral (Mês)
            </h3>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
                <th className="px-6 py-3 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase">Categoria</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase text-right">Confirmado</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase text-right">Total Previsto</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase text-right">% do Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
              {catSummary.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                      <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">{item.categoryName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-medium text-emerald-600 dark:text-emerald-500">{formatCurrencyBR(item.confirmedTotal)}</td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-gray-900 dark:text-slate-100">{formatCurrencyBR(item.total)}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-500 dark:text-slate-400 font-medium">{item.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

export default Reports;
