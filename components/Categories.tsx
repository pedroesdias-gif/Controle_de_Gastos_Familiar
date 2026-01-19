
import React, { useState, useEffect } from 'react';
import { Category, TransactionType } from '../types';
import { getCategories, saveCategory, deleteCategory } from '../services/storageService';
import { Button, Input, Select, Card } from './UI';

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', type: 'Despesa' as TransactionType });
  const [error, setError] = useState('');

  const loadCategories = () => {
    setCategories(getCategories());
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({ name: cat.name, type: cat.type });
    setIsFormOpen(true);
    setError('');
  };

  const handleDelete = (id: string) => {
    const success = deleteCategory(id);
    if (!success) {
      alert("Não é possível excluir uma categoria que possui lançamentos vinculados.");
    } else {
      loadCategories();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Nome é obrigatório');
      return;
    }

    const isDuplicate = categories.some(c => 
      c.name.toLowerCase() === formData.name.toLowerCase() && 
      c.id !== editingCategory?.id
    );

    if (isDuplicate) {
      setError('Já existe uma categoria com este nome');
      return;
    }

    const newCat: Category = {
      id: editingCategory ? editingCategory.id : Date.now().toString(),
      name: formData.name,
      type: formData.type
    };

    saveCategory(newCat);
    setIsFormOpen(false);
    setEditingCategory(null);
    setFormData({ name: '', type: 'Despesa' });
    loadCategories();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Categorias</h1>
        <Button onClick={() => { setIsFormOpen(true); setEditingCategory(null); setFormData({ name: '', type: 'Despesa' }); setError(''); }}>
          Nova Categoria
        </Button>
      </div>

      {isFormOpen && (
        <Card className="p-6 border-emerald-100 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-900/10">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <Input 
              label="Nome da Categoria" 
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              error={error}
              placeholder="Ex: Supermercado"
            />
            <Select 
              label="Tipo" 
              value={formData.type} 
              onChange={e => setFormData({ ...formData, type: e.target.value as TransactionType })}
              options={[
                { label: 'Despesa', value: 'Despesa' },
                { label: 'Receita', value: 'Receita' }
              ]}
            />
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                {editingCategory ? 'Atualizar' : 'Salvar'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
              {categories.map(cat => (
                <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-slate-100">{cat.name}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      cat.type === 'Receita' 
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400' 
                        : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                    }`}>
                      {cat.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(cat)}>Editar</Button>
                    <Button variant="ghost" size="sm" className="text-red-600 dark:text-red-400" onClick={() => handleDelete(cat.id)}>Excluir</Button>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-500 dark:text-slate-600 italic">Nenhuma categoria cadastrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Categories;
