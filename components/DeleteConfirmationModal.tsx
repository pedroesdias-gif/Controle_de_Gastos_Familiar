
import React from 'react';
import { Transaction } from '../types';
import { Card, Button } from './UI';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deleteAllNext: boolean) => void;
  transaction: Transaction | null;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ isOpen, onClose, onConfirm, transaction }) => {
  if (!isOpen || !transaction) return null;

  const isInstallment = transaction.groupId && transaction.installmentIndex !== undefined;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="w-full max-w-sm p-6 bg-white dark:bg-slate-900 border-2 border-red-100 dark:border-red-900/30 shadow-2xl animate-in zoom-in slide-in-from-bottom-4 duration-400">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">
            🗑️
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Excluir Lançamento?</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
            Esta ação removerá os dados permanentemente. Como deseja proceder?
          </p>
          
          <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border dark:border-slate-700">
            <p className="text-xs font-bold text-gray-700 dark:text-slate-300 truncate">{transaction.description}</p>
            {isInstallment && (
              <p className="text-[10px] font-black text-indigo-500 uppercase mt-1 tracking-widest">
                Parcela {transaction.installmentIndex} de {transaction.installments}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {isInstallment ? (
            <>
              <Button 
                variant="danger" 
                onClick={() => onConfirm(true)}
                className="w-full py-3 text-xs font-black uppercase tracking-widest"
              >
                Esta e Próximas Parcelas
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => onConfirm(false)}
                className="w-full py-3 text-xs font-black uppercase tracking-widest border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400"
              >
                Apenas esta Parcela
              </Button>
            </>
          ) : (
            <Button 
              variant="danger" 
              onClick={() => onConfirm(false)}
              className="w-full py-3 text-xs font-black uppercase tracking-widest"
            >
              Confirmar Exclusão
            </Button>
          )}
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="w-full py-2 text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest"
          >
            Cancelar
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default DeleteConfirmationModal;
