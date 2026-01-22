
import React, { useState, useEffect } from 'react';
import Layout, { Tab } from './components/Layout';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Categories from './components/Categories';
import Reports from './components/Reports';
import PaymentMethods from './components/PaymentMethods';
import BankAccounts from './components/BankAccounts';
import Search from './components/Search';
import CreditCardControl from './components/CreditCardControl';
import DueDates from './components/DueDates';
import Copyright from './components/Copyright';
import VencimentosHojeModal from './components/VencimentosHojeModal';
import { getRecurringBills } from './services/storageService';
import { RecurringBill } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [billsForAlert, setBillsForAlert] = useState<RecurringBill[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const checkDueBills = () => {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      const day = today.getDate();

      const allBills = getRecurringBills();
      // Filtra contas que vencem hoje OU que já venceram no mês atual e não foram pagas
      const pendingBills = allBills.filter(bill => {
        const isPaid = bill.payments[`${year}-${month}`];
        if (isPaid) return false;

        const isToday = bill.dueDay === day;
        const isOverdue = bill.dueDay < day;
        
        return isToday || isOverdue;
      });

      if (pendingBills.length > 0) {
        setBillsForAlert(pendingBills);
        setShowModal(true);
      }
    };

    // Pequeno delay para garantir que o app carregou visualmente
    const timer = setTimeout(checkDueBills, 1500);
    return () => clearTimeout(timer);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard selectedYear={selectedYear} />;
      case 'due-dates':
        return <DueDates selectedYear={selectedYear} />;
      case 'transactions':
        return <Transactions globalYear={selectedYear} />;
      case 'credit-card':
        return <CreditCardControl />;
      case 'search':
        return <Search />;
      case 'categories':
        return <Categories />;
      case 'payment-methods':
        return <PaymentMethods />;
      case 'bank-accounts':
        return <BankAccounts />;
      case 'reports':
        return <Reports selectedYear={selectedYear} />;
      case 'copyright':
        return <Copyright />;
      default:
        return <Dashboard selectedYear={selectedYear} />;
    }
  };

  return (
    <>
      <Layout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        selectedYear={selectedYear} 
        setSelectedYear={setSelectedYear}
      >
        {renderContent()}
      </Layout>

      {showModal && (
        <VencimentosHojeModal 
          bills={billsForAlert} 
          onClose={() => setShowModal(false)} 
        />
      )}
    </>
  );
};

export default App;
