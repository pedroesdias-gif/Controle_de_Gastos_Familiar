
import React, { useState, useEffect, useRef } from 'react';
import { BankAccount, BankAccountSummary } from '../types';
import { getBankAccountSummaries, saveBankAccount, deleteBankAccount, exportSystemDataToCSV } from '../services/storageService';
import { formatCurrencyBR } from '../services/formatters';
import { Button, Input, CurrencyInput, Card } from './UI';

const BankAccounts: React.FC = () => {
  const [accounts, setAccounts] = useState<BankAccountSummary[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    initialBalance: 0,
    iconUrl: ''
  });

  const loadData = () => {
    setAccounts(getBankAccountSummaries());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, iconUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = (acc: BankAccount) => {
    setEditingAccount(acc);
    setFormData({
      name: acc.name,
      initialBalance: acc.initialBalance,
      iconUrl: acc.iconUrl || ''
    });
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Deseja realmente excluir esta conta? Só será possível se não houver lançamentos nela.")) {
      const success = deleteBankAccount(id);
      if (!success) alert("Esta conta possui lançamentos e não pode ser excluída.");
      else loadData();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Nome do banco é obrigatório.");
      return;
    }

    const accountToSave: BankAccount = {
      id: editingAccount ? editingAccount.id : Date.now().toString(),
      name: formData.name,
      initialBalance: Number(formData.initialBalance),
      iconUrl: formData.iconUrl
    };

    saveBankAccount(accountToSave);
    setIsFormOpen(false);
    setEditingAccount(null);
    setFormData({ name: '', initialBalance: 0, iconUrl: '' });
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contas Bancárias</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm">Acompanhe seus saldos efetivos e projeções futuras.</p>
        </div>
        <Button onClick={() => { setIsFormOpen(true); setEditingAccount(null); setFormData({ name: '', initialBalance: 0, iconUrl: '' }); }}>
          Nova Conta
        </Button>
      </div>

      {isFormOpen && (
        <Card className="p-6 border-indigo-100 dark:border-indigo-900 bg-indigo-50/20 dark:bg-indigo-900/10 shadow-md">
          <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">{editingAccount ? 'Editar Conta' : 'Cadastrar Nova Conta'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <Input 
                  label="Nome do Banco / Descrição da Conta" 
                  placeholder="Ex: Nubank, Itaú, Dinheiro em Espécie"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
                <CurrencyInput 
                  label="Saldo Inicial de Abertura" 
                  value={formData.initialBalance}
                  onChange={val => setFormData({ ...formData, initialBalance: val })}
                />
              </div>
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-2xl p-6 bg-white dark:bg-slate-800 transition-colors hover:border-indigo-300 group">
                <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-4">Logotipo / Ícone</p>
                {formData.iconUrl ? (
                  <div className="relative group">
                    <img src={formData.iconUrl} alt="Preview" className="w-20 h-20 object-contain rounded-xl border dark:border-slate-700 p-1 shadow-sm bg-white" />
                    <button 
                      type="button" 
                      onClick={() => setFormData({ ...formData, iconUrl: '' })}
                      className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md hover:bg-red-600 transition-colors"
                    >✕</button>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 flex items-center justify-center bg-gray-50 dark:bg-slate-900 rounded-2xl cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all border border-gray-100 dark:border-slate-700 shadow-inner group-hover:scale-105"
                  >
                    <span className="text-3xl grayscale group-hover:grayscale-0 transition-all">🏦</span>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t border-gray-100 dark:border-slate-800">
              <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">Salvar Alterações</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map(acc => (
          <Card key={acc.id} className="p-6 flex flex-col justify-between hover:shadow-lg transition-all duration-300 border-gray-100 dark:border-slate-800 group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 flex items-center justify-center bg-gray-50 dark:bg-slate-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-700 shadow-sm group-hover:border-indigo-100 dark:group-hover:border-indigo-900 transition-colors">
                  {acc.iconUrl ? <img src={acc.iconUrl} alt={acc.name} className="w-full h-full object-contain p-1 bg-white" /> : <span className="text-3xl">🏦</span>}
                </div>
                <div>
                  <h3 className="font-black text-gray-900 dark:text-white tracking-tight">{acc.name}</h3>
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Conta Ativa</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/20">
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest">Saldo Efetivo (Pago)</p>
                <p className={`text-xl font-black tracking-tighter ${acc.confirmedBalance < 0 ? 'text-red-600 dark:text-red-500' : 'text-emerald-700 dark:text-emerald-400'}`}>
                  {formatCurrencyBR(acc.confirmedBalance)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50/50 dark:bg-slate-800/50 p-3 rounded-xl border border-gray-100 dark:border-slate-700">
                  <p className="text-[9px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-widest">Saldo Inicial</p>
                  <p className="text-xs font-bold text-gray-600 dark:text-slate-300">{formatCurrencyBR(acc.initialBalance)}</p>
                </div>
                <div className="bg-indigo-50/30 dark:bg-indigo-900/10 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/20">
                  <p className="text-[9px] text-indigo-400 dark:text-indigo-500 font-bold uppercase tracking-widest">Saldo c/ Previsão</p>
                  <p className={`text-xs font-bold ${acc.currentBalance < 0 ? 'text-red-500' : 'text-indigo-700 dark:text-indigo-400'}`}>
                    {formatCurrencyBR(acc.currentBalance)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-gray-50 dark:border-slate-800">
              <Button variant="ghost" size="sm" className="text-gray-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400" onClick={() => handleEdit(acc)}>Editar</Button>
              <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600 dark:hover:text-red-400" onClick={() => handleDelete(acc.id)}>Excluir</Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Seção de Backup do Sistema */}
      <div className="pt-10">
        <div className="border-l-4 border-indigo-600 pl-4 mb-4">
          <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Exportação de Dados</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Exporte todas as informações do seu controle financeiro para um arquivo seguro.</p>
        </div>
        
        <Card className="p-8 bg-white dark:bg-slate-900 border-indigo-50 dark:border-slate-800 flex flex-col md:flex-row items-center gap-8">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-3xl shrink-0">
            📦
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="font-bold text-gray-800 dark:text-slate-100">Cópia de Segurança</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Gere um arquivo CSV contendo todas as suas transações, contas, categorias e configurações. Recomenda-se realizar este procedimento periodicamente para garantir a segurança dos seus dados.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Button 
              onClick={exportSystemDataToCSV}
              className="bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2 justify-center py-3 px-8"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exportar Tudo (.csv)
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BankAccounts;
