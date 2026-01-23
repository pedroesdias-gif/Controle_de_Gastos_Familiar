
import React, { useState, useEffect, useMemo } from 'react';
import { PaymentMethod, TransactionType } from '../types';
import { getPaymentMethods, savePaymentMethod, deletePaymentMethod } from '../services/storageService';
import { Button, Input, Select, Card } from './UI';

const PaymentMethods: React.FC = () => {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [formData, setFormData] = useState({ name: '', type: 'Despesa' as TransactionType });
  const [error, setError] = useState('');

  const loadMethods = () => {
    setMethods(getPaymentMethods());
  };

  useEffect(() => {
    loadMethods();
  }, []);

  const incomeMethods = useMemo(() => methods.filter(m => m.type === 'Receita'), [methods]);
  const expenseMethods = useMemo(() => methods.filter(m => m.type === 'Despesa'), [methods]);

  const handleEdit = (pm: PaymentMethod) => {
    setEditingMethod(pm);
    setFormData({ name: pm.name, type: pm.type });
    setIsFormOpen(true);
    setError('');
  };

  const handleDelete = (id: string) => {
    const success = deletePaymentMethod(id);
    if (!success) {
      alert("Não é possível excluir uma forma de pagamento que possui lançamentos vinculados.");
    } else {
      loadMethods();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Nome é obrigatório');
      return;
    }

    const newPm: PaymentMethod = {
      id: editingMethod ? editingMethod.id : Date.now().toString(),
      name: formData.name,
      type: formData.type
    };

    savePaymentMethod(newPm);
    setIsFormOpen(false);
    setEditingMethod(null);
    setFormData({ name: '', type: 'Despesa' });
    loadMethods();
  };

  const renderTable = (data: PaymentMethod[], title: string, colorClass: string) => (
    <Card className="flex-1">
      <div className={`px-6 py-4 border-b dark:border-slate-800 flex items-center justify-between ${colorClass}`}>
        <h2 className="text-sm font-black uppercase tracking-widest">{title}</h2>
        <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">{data.length} cadastradas</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800">
            <tr>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wider">Nome</th>
              <th className="px-6 py-3 text-xs font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
            {data.map(pm => (
              <tr key={pm.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-slate-100">{pm.name}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(pm)}>Editar</Button>
                  <Button variant="ghost" size="sm" className="text-red-600 dark:text-red-400" onClick={() => handleDelete(pm.id)}>Excluir</Button>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={2} className="px-6 py-12 text-center text-gray-500 dark:text-slate-600 italic">Nenhuma forma cadastrada nesta categoria.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Formas de Pagamento</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Gerencie como você recebe suas receitas e paga suas despesas.</p>
        </div>
        <Button onClick={() => { setIsFormOpen(true); setEditingMethod(null); setFormData({ name: '', type: 'Despesa' }); setError(''); }}>
          Nova Forma
        </Button>
      </div>

      {isFormOpen && (
        <Card className="p-6 border-indigo-100 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-900/10 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">{editingMethod ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <Input 
              label="Nome da Forma de Pagamento" 
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              error={error}
              placeholder="Ex: Cartão de Crédito Visa"
            />
            <Select 
              label="Uso em" 
              value={formData.type} 
              onChange={e => setFormData({ ...formData, type: e.target.value as TransactionType })}
              options={[
                { label: 'Despesa', value: 'Despesa' },
                { label: 'Receita', value: 'Receita' }
              ]}
            />
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                {editingMethod ? 'Atualizar' : 'Salvar'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {renderTable(incomeMethods, "Receitas", "bg-emerald-600 text-white")}
        {renderTable(expenseMethods, "Despesas", "bg-red-600 text-white")}
      </div>
    </div>
  );
};

export default PaymentMethods;
