
import React, { useState, useRef, useEffect } from 'react';
import { Card, Button } from './UI';
import { getCopyrightImage, saveCopyrightImage } from '../services/storageService';

const DEFAULT_FINANCE_IMAGE = 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=800&q=80';

const Copyright: React.FC = () => {
  const [image, setImage] = useState<string>(DEFAULT_FINANCE_IMAGE);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = getCopyrightImage();
    if (saved) setImage(saved);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImage(base64);
        saveCopyrightImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetImage = () => {
    setImage(DEFAULT_FINANCE_IMAGE);
    saveCopyrightImage(DEFAULT_FINANCE_IMAGE);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in duration-700 py-10">
      <Card className="max-w-3xl w-full p-6 md:p-12 bg-white dark:bg-slate-900 shadow-xl border-gray-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-12 relative overflow-hidden transition-colors">
        
        <div className="w-48 md:w-64 flex-shrink-0 flex flex-col items-center gap-4">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <img 
              src={image} 
              alt="Ilustração Financeira" 
              className="w-full h-48 md:h-64 object-cover drop-shadow-2xl rounded-2xl transition-all duration-500 group-hover:scale-105 group-hover:rotate-1 border dark:border-slate-700"
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-2xl">
              <span className="text-white text-xs font-black uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full">Alterar</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors border border-indigo-100 dark:border-indigo-900/40 uppercase tracking-widest"
            >
              Escolher Foto
            </button>
            <button 
              onClick={resetImage}
              className="text-[10px] font-black text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors border border-gray-100 dark:border-slate-700 uppercase tracking-widest"
            >
              Resetar
            </button>
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        <div className="flex-1 space-y-8 text-center md:text-left">
          <header>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter leading-tight flex items-center justify-center md:justify-start gap-2">
              <span className="text-indigo-600 dark:text-indigo-400">©</span> Controle de Gastos
            </h1>
          </header>

          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 dark:text-indigo-500 mb-1">Responsável</p>
              <p className="text-xl font-bold text-gray-800 dark:text-slate-200">Autor: Pedro Eduardo de Sousa Dias</p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-center md:justify-start gap-4 group cursor-pointer">
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                  📧
                </div>
                <a 
                  href="mailto:pedroesdias@gmail.com" 
                  className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline decoration-2 underline-offset-4"
                >
                  pedroesdias@gmail.com
                </a>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="flex items-center gap-4 group cursor-pointer">
                  <div className="w-10 h-10 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-xl group-hover:bg-slate-800 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-slate-900 transition-all shadow-sm">
                    📞
                  </div>
                  <span className="text-gray-700 dark:text-slate-300 font-bold">(61) 99683-3637</span>
                </div>

                <div className="flex items-center gap-4 group cursor-pointer">
                  <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-xl group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm">
                    🟢
                  </div>
                  <a 
                    href="https://wa.me/5561996833637" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline decoration-2 underline-offset-4"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <footer className="mt-12 text-center space-y-2 pb-10">
        <p className="text-gray-400 dark:text-slate-500 text-sm font-medium">
          Copyright © <span className="text-gray-600 dark:text-slate-300 font-bold">Pedro Eduardo de Sousa Dias</span>
        </p>
        <p className="text-gray-300 dark:text-slate-600 text-xs font-bold uppercase tracking-widest">
          Todos os direitos reservados.
        </p>
        <p className="text-indigo-400 dark:text-indigo-500 text-[10px] font-black uppercase tracking-[0.2em] pt-4">
          Primeira edição, 2026
        </p>
      </footer>
    </div>
  );
};

export default Copyright;
