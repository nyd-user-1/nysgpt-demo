// Discretionary grants type matching Supabase Discretionary table
export interface Discretionary {
  id: number;
  "Approval Date": string | null;
  "Description of Grant": string | null;
  "From Line": number | null;
  "Grant Amount": string | null;
  "Grantee": string | null;
  "Sponsor": string | null;
  "To Line": number | null;
  agency_name: string | null;
  appropriation_amount: string | null;
  chapter: number | null;
  from_page: number | null;
  fund_type: string | null;
  to_page: number | null;
  year: number | null;
}

// Format a dollar amount string (e.g. "1,500,000" → "$1,500,000")
export function formatGrantAmount(amount: string | null): string {
  if (!amount || amount.trim() === '') return 'N/A';
  const cleaned = amount.replace(/[,$]/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num)) return amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}
