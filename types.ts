
export type TransactionType = 'Receita' | 'Despesa';
export type TransactionStatus = 'Pago' | 'Previsão';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: TransactionType;
  iconUrl?: string; // Imagem do cartão ou ícone
  linkedBankAccountId?: string; // ID da conta bancária vinculada para pagamento automático da fatura
}

export interface BankAccount {
  id: string;
  name: string;
  iconUrl?: string; // Base64 or URL
  initialBalance: number;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  categoryId: string;
  bankAccountId: string; 
  type: TransactionType;
  value: number;
  paymentMethodId: string;
  status: TransactionStatus;
  notes?: string;
  installments?: number;      // Número total de parcelas
  installmentIndex?: number;  // Índice da parcela atual (ex: 1 de 12)
  groupId?: string;           // ID para agrupar parcelas de uma mesma compra
}

export interface RecurringBill {
  id: string;
  name: string;
  dueDay: number;
  value?: number; // Valor previsto da conta
  group?: string;
  groupColor?: string;
  // Mapa de pagamentos: "year-month" -> boolean
  payments: Record<string, boolean>;
}

export interface MonthlySummary {
  month: number;
  year: number;
  totalIncome: number;
  confirmedIncome: number;
  totalExpense: number;
  confirmedExpense: number;
  balance: number;
  confirmedBalance: number;
}

export interface CategorySummary {
  categoryName: string;
  total: number;
  confirmedTotal: number;
  percentage: number;
}

export interface BankAccountSummary extends BankAccount {
  currentBalance: number;
  confirmedBalance: number;
}
