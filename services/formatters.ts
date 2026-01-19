
export const formatCurrencyBR = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const parseCurrencyBR = (text: string): number => {
  if (!text) return 0;
  // Remove tudo que não é dígito
  const digits = text.replace(/\D/g, '');
  if (!digits) return 0;
  // Converte para centavos (número inteiro) e depois para decimal
  return parseFloat(digits) / 100;
};

/**
 * Normaliza valores colados ou digitados manualmente que podem conter R$, pontos ou vírgulas.
 */
export const normalizeCurrencyInput = (input: string): string => {
  const digits = input.replace(/\D/g, '');
  const value = parseFloat(digits) / 100;
  return formatCurrencyBR(value);
};
