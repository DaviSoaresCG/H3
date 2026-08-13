/**
 * Utilitários robustos para formatação e manipulação de datas no EventPoint.
 * Previne erros de 'Invalid Date' e problemas de timezone (fuso horário Brasil UTC-3).
 */

/**
 * Normaliza qualquer formato de data (YYYY-MM-DD, ISO string, Date) para uma string pura 'YYYY-MM-DD'.
 */
export function normalizeDateStr(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    // Se começar com YYYY-MM-DD (e.g. '2026-08-13' ou '2026-08-13T00:00:00.000Z')
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return '';
  }

  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    const year = dateInput.getFullYear();
    const month = String(dateInput.getMonth() + 1).padStart(2, '0');
    const day = String(dateInput.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return '';
}

/**
 * Retorna a data atual no formato 'YYYY-MM-DD' de acordo com o fuso local do dispositivo.
 */
export function getTodayDateStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formata uma data para o padrão brasileiro 'DD/MM/YYYY'.
 * Trata com segurança strings 'YYYY-MM-DD', ISOs, objetos Date e valores nulos.
 * Nunca retorna 'Invalid Date'.
 */
export function formatDateBR(dateInput: string | Date | null | undefined, fallback: string = '-'): string {
  if (!dateInput) return fallback;

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      return `${day}/${month}/${year}`;
    }

    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('pt-BR');
    }
    return fallback;
  }

  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return fallback;
    return dateInput.toLocaleDateString('pt-BR');
  }

  return fallback;
}

/**
 * Formata um timestamp completo para o padrão brasileiro 'DD/MM/YYYY HH:mm'.
 */
export function formatDateTimeBR(dateInput: string | Date | null | undefined, fallback: string = '-'): string {
  if (!dateInput) return fallback;

  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return fallback;
    return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  } catch {
    return fallback;
  }
}

/**
 * Formata apenas a hora 'HH:mm' de um timestamp.
 */
export function formatTimeBR(dateInput: string | Date | null | undefined, fallback: string = '--:--'): string {
  if (!dateInput) return fallback;

  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return fallback;
  }
}
