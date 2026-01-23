
import { Category, Transaction, MonthlySummary, CategorySummary, PaymentMethod, BankAccount, BankAccountSummary, RecurringBill } from '../types';

const CATEGORIES_KEY = 'finances_2026_categories';
const TRANSACTIONS_KEY = 'finances_2026_transactions';
const PAYMENT_METHODS_KEY = 'finances_2026_payment_methods';
const BANK_ACCOUNTS_KEY = 'finances_2026_bank_accounts';
const CC_CLOSING_DAYS_KEY = 'finances_2026_cc_closing_days';
const RECURRING_BILLS_KEY = 'finances_2026_recurring_bills';
const COPYRIGHT_IMAGE_KEY = 'finances_2026_copyright_image';

const ALL_KEYS = [
  CATEGORIES_KEY,
  TRANSACTIONS_KEY,
  PAYMENT_METHODS_KEY,
  BANK_ACCOUNTS_KEY,
  CC_CLOSING_DAYS_KEY,
  RECURRING_BILLS_KEY,
  COPYRIGHT_IMAGE_KEY
];

const defaultCategories: Category[] = [
  { id: '1', name: 'Salário', type: 'Receita' },
  { id: '2', name: 'Alimentação', type: 'Despesa' },
  { id: '3', name: 'Moradia', type: 'Despesa' },
  { id: '4', name: 'Transporte', type: 'Despesa' },
  { id: '5', name: 'Lazer', type: 'Despesa' },
  { id: '6', name: 'Saúde', type: 'Despesa' },
  { id: '7', name: 'Educação', type: 'Despesa' },
];

const defaultPaymentMethods: PaymentMethod[] = [
  { id: 'pm1', name: 'Pix', type: 'Receita' },
  { id: 'pm2', name: 'Dinheiro', type: 'Receita' },
  { id: 'pm3', name: 'Pix', type: 'Despesa' },
  { id: 'pm4', name: 'Cartão de Crédito', type: 'Despesa' },
  { id: 'pm5', name: 'Dinheiro', type: 'Despesa' },
  { id: 'pm6', name: 'Boleto', type: 'Despesa' },
];

const defaultBankAccounts: BankAccount[] = [
  { id: 'ba1', name: 'Carteira Principal', initialBalance: 0 },
];

const defaultRecurringBills: RecurringBill[] = [];

// Funções de Exportação e Importação CSV
export const exportSystemDataToCSV = (): void => {
  try {
    const dataRows = ['Key;Value'];
    
    ALL_KEYS.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        // Envolvemos o JSON em aspas e dobramos aspas internas para CSV seguro
        const safeValue = `"${value.replace(/"/g, '""')}"`;
        dataRows.push(`${key};${safeValue}`);
      }
    });

    const csvContent = "\ufeff" + dataRows.join('\n'); // BOM para Excel
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 16).replace('T', '_');
    const fileName = `Controle_de_Gastos_Familiar_${timestamp}.csv`;
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Erro na exportação:', error);
    alert('Erro ao exportar dados.');
  }
};

export const importSystemDataFromCSV = (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        
        // Validação básica de cabeçalho
        if (!lines[0].includes('Key;Value')) {
          alert('Arquivo CSV inválido ou corrompido.');
          return resolve(false);
        }

        // Limpa chaves atuais para evitar conflitos se desejar uma restauração limpa
        // Ou apenas sobrescreve as que encontrar no arquivo
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const separatorIndex = line.indexOf(';');
          if (separatorIndex === -1) continue;

          const key = line.slice(0, separatorIndex);
          let value = line.slice(separatorIndex + 1);

          // Remove aspas de escape do CSV
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1).replace(/""/g, '"');
          }

          if (ALL_KEYS.includes(key)) {
            localStorage.setItem(key, value);
          }
        }
        
        resolve(true);
      } catch (error) {
        console.error('Erro na importação:', error);
        alert('Erro ao processar o arquivo CSV.');
        resolve(false);
      }
    };
    reader.readAsText(file);
  });
};

export const getCopyrightImage = (): string | null => {
  return localStorage.getItem(COPYRIGHT_IMAGE_KEY);
};

export const saveCopyrightImage = (base64: string): void => {
  localStorage.setItem(COPYRIGHT_IMAGE_KEY, base64);
};

export const getRecurringBills = (): RecurringBill[] => {
  const data = localStorage.getItem(RECURRING_BILLS_KEY);
  if (!data) {
    localStorage.setItem(RECURRING_BILLS_KEY, JSON.stringify(defaultRecurringBills));
    return defaultRecurringBills;
  }
  return JSON.parse(data);
};

export const saveRecurringBill = (bill: RecurringBill): void => {
  const bills = getRecurringBills();
  const index = bills.findIndex(b => b.id === bill.id);
  if (index >= 0) bills[index] = bill;
  else bills.push(bill);
  localStorage.setItem(RECURRING_BILLS_KEY, JSON.stringify(bills));
};

export const deleteRecurringBill = (id: string): void => {
  const bills = getRecurringBills().filter(b => b.id !== id);
  localStorage.setItem(RECURRING_BILLS_KEY, JSON.stringify(bills));
};

export const toggleBillPayment = (billId: string, year: number, month: number): void => {
  const bills = getRecurringBills();
  const index = bills.findIndex(b => b.id === billId);
  if (index >= 0) {
    const key = `${year}-${month}`;
    bills[index].payments[key] = !bills[index].payments[key];
    localStorage.setItem(RECURRING_BILLS_KEY, JSON.stringify(bills));
  }
};

const isCreditCardPM = (pmId: string): boolean => {
  const pms = getPaymentMethods();
  const pm = pms.find(p => p.id === pmId);
  if (!pm) return false;
  const name = pm.name.toLowerCase();
  return name.includes('cartão de crédito') || name.includes('crédito');
};

const isAutoInvoice = (t: Transaction): boolean => {
  return t.notes?.startsWith('AUTO_INVOICE_') || false;
};

export const getCCClosingDays = (): Record<string, number> => {
  const data = localStorage.getItem(CC_CLOSING_DAYS_KEY);
  if (!data) return {};
  return JSON.parse(data);
};

export const saveCCClosingDay = (year: number, month: number, day: number): void => {
  const days = getCCClosingDays();
  days[`${year}-${month}`] = day;
  localStorage.setItem(CC_CLOSING_DAYS_KEY, JSON.stringify(days));
  syncAllLinkedInvoices();
};

export const getEffectiveDate = (t: Transaction): Date => {
  const purchaseDate = new Date(t.date + 'T00:00:00');
  if (!isCreditCardPM(t.paymentMethodId)) return purchaseDate;

  const closingDays = getCCClosingDays();
  const closingDay = closingDays[`${purchaseDate.getFullYear()}-${purchaseDate.getMonth()}`] || 25;

  const effectiveDate = new Date(purchaseDate);
  if (purchaseDate.getDate() <= closingDay) {
    effectiveDate.setMonth(purchaseDate.getMonth() + 1);
  } else {
    effectiveDate.setMonth(purchaseDate.getMonth() + 2);
  }
  return effectiveDate;
};

export const syncInvoiceTransaction = (cardId: string, month: number, year: number) => {
  const pms = getPaymentMethods();
  const card = pms.find(p => p.id === cardId);
  
  if (!card || !card.linkedBankAccountId) return;

  const transactions = getTransactions();
  
  const invoiceTotal = transactions.reduce((acc, t) => {
    if (t.paymentMethodId !== cardId || isAutoInvoice(t)) return acc;
    const effDate = getEffectiveDate(t);
    if (effDate.getMonth() === month && effDate.getFullYear() === year) {
      return acc + t.value;
    }
    return acc;
  }, 0);

  const notesKey = `AUTO_INVOICE_${cardId}_${month}_${year}`;
  const existingIndex = transactions.findIndex(t => t.notes === notesKey);

  if (invoiceTotal <= 0) {
    if (existingIndex >= 0) {
      transactions.splice(existingIndex, 1);
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
    }
    return;
  }

  const categories = getCategories();
  const defaultCat = categories.find(c => c.name.toLowerCase().includes('cartão') && c.type === 'Despesa') || 
                     categories.find(c => c.type === 'Despesa') || 
                     { id: '1' };

  const invoiceDate = `${year}-${String(month + 1).padStart(2, '0')}-05`;

  const invoiceTx: Transaction = {
    id: existingIndex >= 0 ? transactions[existingIndex].id : `invoice-${Date.now()}-${cardId}-${month}`,
    date: invoiceDate,
    description: `Fatura: ${card.name} (${new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(year, month, 1))})`,
    categoryId: defaultCat.id,
    bankAccountId: card.linkedBankAccountId,
    type: 'Despesa',
    value: invoiceTotal,
    paymentMethodId: 'pm6',
    status: 'Previsão',
    notes: notesKey
  };

  if (existingIndex >= 0) {
    transactions[existingIndex] = invoiceTx;
  } else {
    transactions.push(invoiceTx);
  }

  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
};

export const syncAllLinkedInvoices = () => {
  const pms = getPaymentMethods();
  const linkedCards = pms.filter(p => p.linkedBankAccountId);
  
  if (linkedCards.length === 0) return;

  const now = new Date();
  // Sincroniza um range de meses para cobrir parcelamentos futuros
  for (const card of linkedCards) {
    for (let i = -1; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      syncInvoiceTransaction(card.id, d.getMonth(), d.getFullYear());
    }
  }
};

export const getCategories = (): Category[] => {
  const data = localStorage.getItem(CATEGORIES_KEY);
  if (!data) {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(defaultCategories));
    return defaultCategories;
  }
  return JSON.parse(data);
};

export const saveCategory = (category: Category): void => {
  const categories = getCategories();
  const index = categories.findIndex(c => c.id === category.id);
  if (index >= 0) categories[index] = category;
  else categories.push(category);
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
};

export const deleteCategory = (id: string): boolean => {
  const transactions = getTransactions();
  if (transactions.some(t => t.categoryId === id)) return false;
  const categories = getCategories().filter(c => c.id !== id);
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  return true;
};

export const getPaymentMethods = (): PaymentMethod[] => {
  const data = localStorage.getItem(PAYMENT_METHODS_KEY);
  if (!data) {
    localStorage.setItem(PAYMENT_METHODS_KEY, JSON.stringify(defaultPaymentMethods));
    return defaultPaymentMethods;
  }
  return JSON.parse(data);
};

export const savePaymentMethod = (pm: PaymentMethod): void => {
  const pms = getPaymentMethods();
  const index = pms.findIndex(p => p.id === pm.id);
  if (index >= 0) pms[index] = pm;
  else pms.push(pm);
  localStorage.setItem(PAYMENT_METHODS_KEY, JSON.stringify(pms));
  syncAllLinkedInvoices();
};

export const deletePaymentMethod = (id: string): boolean => {
  const transactions = getTransactions();
  if (transactions.some(t => t.paymentMethodId === id)) return false;
  const pms = getPaymentMethods().filter(p => p.id !== id);
  localStorage.setItem(PAYMENT_METHODS_KEY, JSON.stringify(pms));
  return true;
};

export const getBankAccounts = (): BankAccount[] => {
  const data = localStorage.getItem(BANK_ACCOUNTS_KEY);
  if (!data) {
    localStorage.setItem(BANK_ACCOUNTS_KEY, JSON.stringify(defaultBankAccounts));
    return defaultBankAccounts;
  }
  return JSON.parse(data);
};

export const saveBankAccount = (account: BankAccount): void => {
  const accounts = getBankAccounts();
  const index = accounts.findIndex(a => a.id === account.id);
  if (index >= 0) accounts[index] = account;
  else accounts.push(account);
  localStorage.setItem(BANK_ACCOUNTS_KEY, JSON.stringify(accounts));
};

export const deleteBankAccount = (id: string): boolean => {
  const transactions = getTransactions();
  if (transactions.some(t => t.bankAccountId === id)) return false;
  const accounts = getBankAccounts().filter(a => a.id !== id);
  localStorage.setItem(BANK_ACCOUNTS_KEY, JSON.stringify(accounts));
  return true;
};

export const getTransactions = (): Transaction[] => {
  const data = localStorage.getItem(TRANSACTIONS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveTransaction = (transaction: Transaction): void => {
  const transactions = getTransactions();
  const index = transactions.findIndex(t => t.id === transaction.id);
  if (index >= 0) transactions[index] = transaction;
  else transactions.push(transaction);
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
  
  if (transaction.type === 'Despesa') {
    const categories = getCategories();
    const cat = categories.find(c => c.id === transaction.categoryId);
    if (cat) {
      const bills = getRecurringBills();
      const date = new Date(transaction.date + 'T00:00:00');
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      let billsChanged = false;

      bills.forEach(bill => {
        if (bill.name.toLowerCase() === cat.name.toLowerCase()) {
          bill.payments[monthKey] = true;
          billsChanged = true;
        }
      });

      if (billsChanged) {
        localStorage.setItem(RECURRING_BILLS_KEY, JSON.stringify(bills));
      }
    }
  }

  if (isCreditCardPM(transaction.paymentMethodId)) {
    const effDate = getEffectiveDate(transaction);
    syncInvoiceTransaction(transaction.paymentMethodId, effDate.getMonth(), effDate.getFullYear());
  }
};

export const deleteTransaction = (id: string, deleteAllNext: boolean = false): void => {
  const transactions = getTransactions();
  const tToDelete = transactions.find(t => t.id === id);
  if (!tToDelete) return;

  let newTransactions: Transaction[];
  
  if (deleteAllNext && tToDelete.groupId && tToDelete.installmentIndex !== undefined) {
    // Remove esta e todas as parcelas superiores do mesmo grupo
    newTransactions = transactions.filter(t => 
      !(t.groupId === tToDelete.groupId && (t.installmentIndex || 0) >= (tToDelete.installmentIndex || 0))
    );
  } else {
    // Remove apenas a específica
    newTransactions = transactions.filter(t => t.id !== id);
  }
  
  // Salva imediatamente para garantir persistência
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(newTransactions));
  
  // Atualizar status de contas fixas (recorrentes)
  if (tToDelete.type === 'Despesa') {
    const categories = getCategories();
    const cat = categories.find(c => c.id === tToDelete.categoryId);
    if (cat) {
      const date = new Date(tToDelete.date + 'T00:00:00');
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      
      // Verifica se ainda existe outra despesa desta categoria neste mês nos dados ATUALIZADOS
      const remains = newTransactions.some(t => {
        const d = new Date(t.date + 'T00:00:00');
        return t.categoryId === tToDelete.categoryId && 
               d.getFullYear() === date.getFullYear() && 
               d.getMonth() === date.getMonth() &&
               !isAutoInvoice(t);
      });

      if (!remains) {
        const bills = getRecurringBills();
        const billIndex = bills.findIndex(b => b.name.toLowerCase() === cat.name.toLowerCase());
        if (billIndex >= 0) {
          bills[billIndex].payments[monthKey] = false;
          localStorage.setItem(RECURRING_BILLS_KEY, JSON.stringify(bills));
        }
      }
    }
  }

  // Sincronizar faturas de cartão se necessário
  if (isCreditCardPM(tToDelete.paymentMethodId)) {
    syncAllLinkedInvoices();
  }
};

export const getBankAccountSummaries = (): BankAccountSummary[] => {
  const accounts = getBankAccounts();
  const transactions = getTransactions();

  return accounts.map(account => {
    const accountTransactions = transactions.filter(t => t.bankAccountId === account.id);
    const confirmedIncome = accountTransactions
      .filter(t => t.type === 'Receita' && t.status === 'Pago')
      .reduce((acc, t) => acc + t.value, 0);
    const confirmedExpense = accountTransactions
      .filter(t => t.type === 'Despesa' && t.status === 'Pago')
      .reduce((acc, t) => acc + t.value, 0);

    const totalIncome = accountTransactions
      .filter(t => t.type === 'Receita' && !(isAutoInvoice(t) && t.status === 'Previsão'))
      .reduce((acc, t) => acc + t.value, 0);
    const totalExpense = accountTransactions
      .filter(t => t.type === 'Despesa' && !(isAutoInvoice(t) && t.status === 'Previsão'))
      .reduce((acc, t) => acc + t.value, 0);
    
    return {
      ...account,
      confirmedBalance: account.initialBalance + confirmedIncome - confirmedExpense,
      currentBalance: account.initialBalance + totalIncome - totalExpense
    };
  });
};

export const getMonthlySummary = (month: number, year: number): MonthlySummary => {
  const transactions = getTransactions().filter(t => {
    const effDate = getEffectiveDate(t);
    return effDate.getMonth() === month && effDate.getFullYear() === year && !isAutoInvoice(t);
  });

  const confirmedIncome = transactions
    .filter(t => t.type === 'Receita' && t.status === 'Pago')
    .reduce((acc, t) => acc + t.value, 0);
  const totalIncome = transactions
    .filter(t => t.type === 'Receita')
    .reduce((acc, t) => acc + t.value, 0);
  
  const confirmedExpense = transactions
    .filter(t => t.type === 'Despesa' && t.status === 'Pago')
    .reduce((acc, t) => acc + t.value, 0);
  const totalExpense = transactions
    .filter(t => t.type === 'Despesa')
    .reduce((acc, t) => acc + t.value, 0);

  return {
    month,
    year,
    totalIncome,
    confirmedIncome,
    totalExpense,
    confirmedExpense,
    balance: totalIncome - totalExpense,
    confirmedBalance: confirmedIncome - confirmedExpense
  };
};

export const getCategorySummary = (month: number, year: number): CategorySummary[] => {
  const transactions = getTransactions().filter(t => {
    const effDate = getEffectiveDate(t);
    return effDate.getMonth() === month && effDate.getFullYear() === year && t.type === 'Despesa' && !isAutoInvoice(t);
  });

  const categories = getCategories();
  const totalExpense = transactions.reduce((acc, t) => acc + t.value, 0);

  const summaryMap: Record<string, { name: string; total: number; confirmed: number }> = {};
  
  transactions.forEach(t => {
    const bucketId = t.categoryId;
    const bucketName = categories.find(c => c.id === t.categoryId)?.name || 'Outros';

    if (!summaryMap[bucketId]) {
      summaryMap[bucketId] = { name: bucketName, total: 0, confirmed: 0 };
    }
    
    summaryMap[bucketId].total += t.value;
    if (t.status === 'Pago') {
      summaryMap[bucketId].confirmed += t.value;
    }
  });

  return Object.values(summaryMap).map(data => {
    return {
      categoryName: data.name,
      total: data.total,
      confirmedTotal: data.confirmed,
      percentage: totalExpense > 0 ? (data.total / totalExpense) * 100 : 0
    };
  }).sort((a, b) => b.total - a.total);
};

export const getYearlyHistory = (year: number) => {
  const history = [];
  for (let m = 0; m < 12; m++) {
    const summary = getMonthlySummary(m, year);
    history.push({
      name: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(year, m, 1)),
      receitas: summary.totalIncome,
      despesas: summary.totalExpense,
      receitasConfirmadas: summary.confirmedIncome,
      despesasConfirmadas: summary.confirmedExpense,
      saldo: summary.balance
    });
  }
  return history;
};
