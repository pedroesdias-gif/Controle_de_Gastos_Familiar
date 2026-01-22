
import React, { useState, useEffect, useMemo } from 'react';
import { RecurringBill, Category } from '../types';
import { getRecurringBills, toggleBillPayment, saveRecurringBill, deleteRecurringBill, getCategories } from '../services/storageService';
import { formatCurrencyBR } from '../services/formatters';
import { Card, Button, Input, Select } from './UI';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface DueDatesProps {
  selectedYear: number;
}

const MONTHS_SHORT = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

const COLOR_PRESETS = [
  { name: 'Ardósia', value: '#64748b' },
  { name: 'Índigo', value: '#6366f1' },
  { name: 'Esmeralda', value: '#10b981' },
  { name: 'Âmbar', value: '#f59e0b' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Ciano', value: '#06b6d4' },
  { name: 'Violeta', value: '#8b5cf6' },
  { name: 'Vermelho', value: '#ef4444' },
];

const DueDates: React.FC<DueDatesProps> = ({ selectedYear }) => {
  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null);
  
  const [formData, setFormData] = useState<Partial<RecurringBill>>({
    name: '',
    dueDay: 1,
    value: 0,
    group: '',
    groupColor: '#64748b'
  });

  const loadData = () => {
    setBills(getRecurringBills());
    setCategories(getCategories());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = (id: string, month: number) => {
    toggleBillPayment(id, selectedYear, month);
    loadData();
  };

  const handleEdit = (bill: RecurringBill) => {
    setEditingBill(bill);
    setFormData({
      name: bill.name,
      dueDay: bill.dueDay,
      value: bill.value || 0,
      group: bill.group || '',
      groupColor: bill.groupColor || '#64748b'
    });
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id: string) => {
    if (confirm("Deseja realmente remover esta conta fixa? Todos os registros de pagamento serão perdidos.")) {
      deleteRecurringBill(id);
      loadData();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    saveRecurringBill({
      id: editingBill ? editingBill.id : Date.now().toString(),
      name: formData.name || '',
      dueDay: formData.dueDay || 1,
      value: formData.value || 0,
      group: formData.group || '',
      groupColor: formData.groupColor || '#64748b',
      payments: editingBill ? editingBill.payments : {}
    });

    setIsFormOpen(false);
    setEditingBill(null);
    setFormData({ name: '', dueDay: 1, value: 0, group: '', groupColor: '#64748b' });
    loadData();
  };

  const getStatus = (bill: RecurringBill) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const isPaid = bill.payments[`${selectedYear}-${currentMonth}`];
    
    if (isPaid) return 'PAGO';
    
    // Se o ano for anterior, tudo não pago está atrasado
    if (selectedYear < currentYear) return 'ATRASADO';
    // Se o ano for futuro, tudo não pago está "a vencer"
    if (selectedYear > currentYear) return 'A VENCER';

    // Ano atual: lógica baseada no dia e mês
    const day = today.getDate();
    if (bill.dueDay < day) return 'ATRASADO';
    if (bill.dueDay === day) return 'VENCENDO HOJE';
    return 'A VENCER';
  };

  const summary = useMemo(() => {
    const stats = { 'PAGO': 0, 'ATRASADO': 0, 'VENCENDO HOJE': 0, 'A VENCER': 0, 'TOTAL': bills.length };
    bills.forEach(b => stats[getStatus(b) as keyof typeof stats]++);
    return stats;
  }, [bills, selectedYear]);

  const chartData = useMemo(() => {
    return [
      { name: 'Pago', value: summary['PAGO'], color: '#10b981' },
      { name: 'Atrasado', value: summary['ATRASADO'], color: '#ef4444' },
      { name: 'Vencendo Hoje', value: summary['VENCENDO HOJE'], color: '#f59e0b' },
      { name: 'A Vencer', value: summary['A VENCER'], color: '#3b82f6' },
    ].filter(item => item.value > 0);
  }, [summary]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vencimentos {selectedYear}</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm">Controle anual de contas fixas e recorrentes.</p>
        </div>
        <Button onClick={() => { setIsFormOpen(!isFormOpen); if(!isFormOpen) setEditingBill(null); }}>
          {isFormOpen ? 'Fechar' : 'Nova Conta Fixa'}
        </Button>
      </div>

      {isFormOpen && (
        <Card className="p-6 border-indigo-200 dark:border-indigo-900 animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-lg font-bold mb-6 text-gray-800 dark:text-white">
            {editingBill ? `Editar Conta: ${editingBill.name}` : 'Cadastrar Conta Fixa'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <Select 
                label="Nome da Conta" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                options={[{ label: 'Selecione...', value: '' }, ...categories.map(c => ({ label: c.name, value: c.name }))]} 
              />
              <Input 
                type="number" 
                label="Dia Venc." 
                min="1" max="31"
                value={formData.dueDay} 
                onChange={e => setFormData({...formData, dueDay: parseInt(e.target.value) || 1})} 
              />
              <Input 
                label="Grupo / Marcador" 
                placeholder="Ex: Aluguel..."
                value={formData.group} 
                onChange={e => setFormData({...formData, group: e.target.value})} 
              />
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Cor do Grupo</label>
                <div className="flex flex-wrap gap-2 p-2 bg-white dark:bg-slate-800 border rounded-lg dark:border-slate-700">
                  {COLOR_PRESETS.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({...formData, groupColor: color.value})}
                      className={`w-6 h-6 rounded-full transition-transform hover:scale-110 border-2 ${formData.groupColor === color.value ? 'border-indigo-500 scale-125' : 'border-transparent'}`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-800">
              <Button type="button" variant="secondary" onClick={() => { setIsFormOpen(false); setEditingBill(null); }}>Cancelar</Button>
              <Button type="submit">{editingBill ? 'Atualizar Alterações' : 'Salvar Conta Fixa'}</Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-800">
                <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-500 dark:text-slate-500">Descrição / Grupo</th>
                <th className="px-2 py-3 text-[10px] font-black uppercase text-gray-500 dark:text-slate-500 text-center w-12">Dia</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-500 dark:text-slate-500 text-center w-32">Status Atual</th>
                {MONTHS_SHORT.map(m => (
                  <th key={m} className="px-1 py-3 text-[10px] font-black uppercase text-gray-500 dark:text-slate-500 text-center">{m}</th>
                ))}
                <th className="px-4 py-3 text-[10px] font-black uppercase text-gray-500 dark:text-slate-500 text-right w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {bills.map(bill => {
                const status = getStatus(bill);
                return (
                  <tr key={bill.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-4 py-4">
                      <div className="font-bold text-gray-800 dark:text-slate-200">{bill.name}</div>
                      {bill.group && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: bill.groupColor }}></span>
                          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: bill.groupColor }}>{bill.group}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-4 text-center font-black text-gray-400 dark:text-slate-600">{bill.dueDay}</td>
                    <td className="px-4 py-4">
                      <div className={`text-[10px] font-black text-center py-1.5 rounded-lg border uppercase tracking-widest ${
                        status === 'PAGO' 
                          ? 'bg-emerald-500 text-white border-emerald-600' 
                          : status === 'ATRASADO'
                          ? 'bg-red-500 text-white border-red-600 animate-pulse'
                          : status === 'A VENCER'
                          ? 'bg-blue-500 text-white border-blue-600 shadow-sm'
                          : 'bg-amber-500 text-white border-amber-600 shadow-sm'
                      }`}>
                        {status}
                      </div>
                    </td>
                    {MONTHS_SHORT.map((_, i) => (
                      <td key={i} className="px-1 py-4 text-center">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700 transition-all cursor-pointer"
                          checked={!!bill.payments[`${selectedYear}-${i}`]} 
                          onChange={() => handleToggle(bill.id, i)} 
                        />
                      </td>
                    ))}
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(bill)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                          title="Editar Conta"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleDelete(bill.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Remover Conta"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {bills.length === 0 && (
                <tr>
                  <td colSpan={16} className="px-4 py-16 text-center text-gray-400 dark:text-slate-600 italic">Nenhuma conta recorrente cadastrada para este exercício.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="max-w-4xl">
        <Card className="p-6 bg-white dark:bg-slate-900">
          <h3 className="text-sm font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-6">Resumo do Mês Atual</h3>
          <div className="flex flex-col md:flex-row gap-8 items-center">
            {/* Estatísticas Numéricas */}
            <div className="flex-1 space-y-4 w-full">
              <div className="flex justify-between items-center border-b dark:border-slate-800 pb-3">
                <span className="text-[11px] font-black uppercase text-blue-600 dark:text-blue-500 tracking-wider">A Vencer</span>
                <span className="text-base font-black text-blue-700 dark:text-blue-400">{summary['A VENCER']}</span>
              </div>
              <div className="flex justify-between items-center border-b dark:border-slate-800 pb-3">
                <span className="text-[11px] font-black uppercase text-amber-600 dark:text-amber-500 tracking-wider">Vencendo Hoje</span>
                <span className="text-base font-black text-amber-700 dark:text-amber-400">{summary['VENCENDO HOJE']}</span>
              </div>
              <div className="flex justify-between items-center border-b dark:border-slate-800 pb-3">
                <span className="text-[11px] font-black uppercase text-red-500 tracking-wider">Atrasado</span>
                <span className="text-base font-black text-red-600 dark:text-red-400">{summary['ATRASADO']}</span>
              </div>
              <div className="flex justify-between items-center pb-1">
                <span className="text-[11px] font-black uppercase text-emerald-600 tracking-wider">Pago</span>
                <span className="text-base font-black text-emerald-700 dark:text-emerald-500">{summary['PAGO']}</span>
              </div>
            </div>

            {/* Gráfico Visual */}
            <div className="w-full md:w-48 h-48 flex-shrink-0">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#0f172a', color: '#fff', fontSize: '10px' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(v: number) => [v, 'Quantidade']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-full">
                  <span className="text-[10px] font-black text-gray-300 dark:text-slate-700 uppercase">Vazio</span>
                </div>
              )}
            </div>

            {/* Destaque do Total */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl p-8 flex flex-col items-center min-w-[180px] border border-indigo-100 dark:border-indigo-900/30">
              <span className="text-[10px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-widest mb-1">Total Contas</span>
              <span className="text-6xl font-black text-indigo-900 dark:text-indigo-200 tracking-tighter">{summary['TOTAL']}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DueDates;
