// Shared formatting utilities: currency, numbers, phone mask, CB rates
  export const maskPhoneValue = (raw) => {
    if (typeof raw !== 'string') return '';
    let d = raw.replace(/\D+/g, '');
    if (!d) return '';
    // Normalize 8/9 to the Russian +7 format
    if (d[0] === '9') d = '7' + d; // without the country code, starting with the carrier
    else if (d[0] === '8') d = '7' + d.slice(1);
    // If not 7 — allow other countries' input without formatting
    if (d[0] !== '7') return `+${d.slice(0, 15)}`;
    const len = d.length;
    let res = '+7';
    if (len > 1) res += ' (' + d.slice(1, Math.min(4, len));
    if (len >= 4) res += ')';
    if (len > 4) res += ' ' + d.slice(4, Math.min(7, len));
    if (len >= 7) res += '-' + d.slice(7, Math.min(9, len));
    if (len >= 9) res += '-' + d.slice(9, Math.min(11, len));
    return res;
  };

  export const fmtCurrency = (amount, currency = 'RUB') => {
    if (typeof amount !== 'number' || !isFinite(amount)) return '';
    try {
      return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch (_) {
      return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(amount) + ' ₽';
    }
  };
  export const fmtNumber = (n) => {
    if (typeof n !== 'number' || !isFinite(n)) return '';
    try { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n); } catch (_) { return String(n); }
  };
  // --- New logic for filling the 4x3 price grid (₽ / $* / €*) ---
  // CB rate: stored as RUB_PER[VAL] = how many rubles per 1 unit of currency.
  // The integrator can update these values when the page loads.
  export const CB_RATES_RUB_PER = {
    USD: 95.00, // Example: 1 USD = 95.00 RUB
    EUR: 102.00 // Example: 1 EUR = 102.00 RUB
  };
  // Convert from rubles to currency using the table above
  export const convertFromRub = (rubAmount, code) => {
    if (typeof rubAmount !== 'number' || !isFinite(rubAmount)) return null;
    const rate = CB_RATES_RUB_PER[code];
    if (!rate || rate <= 0) return null;
    return rubAmount / rate;
  };
  export const fmtPlainNumber = (amount) => {
    if (typeof amount !== 'number' || !isFinite(amount)) return '';
    try { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Math.round(amount)); }
    catch (_) { return String(Math.round(amount)); }
  };
