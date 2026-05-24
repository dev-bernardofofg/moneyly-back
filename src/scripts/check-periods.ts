import { createSaoPauloDate, normalizeDayForMonthSaoPaulo } from '../helpers/dates';

async function main() {
  console.log('TZ offset:', new Date().getTimezoneOffset());
  console.log('createSaoPauloDate(2026,4,5):', createSaoPauloDate(2026, 4, 5).toISOString());
  console.log('createSaoPauloDate(2026,3,5):', createSaoPauloDate(2026, 3, 5).toISOString());
  console.log(
    'createSaoPauloDate(2026,-1,5) [overflow]:',
    createSaoPauloDate(2026, -1, 5).toISOString()
  );
  console.log(
    'createSaoPauloDate(2026,12,5) [overflow]:',
    createSaoPauloDate(2026, 12, 5).toISOString()
  );
  console.log(
    'normalizeDayForMonthSaoPaulo(2026,1,31):',
    normalizeDayForMonthSaoPaulo(2026, 1, 31)
  ); // Feb → should clamp to 28
  console.log(
    'normalizeDayForMonthSaoPaulo(2026,4,31):',
    normalizeDayForMonthSaoPaulo(2026, 4, 31)
  ); // May → 31
}

main().catch(console.error);
