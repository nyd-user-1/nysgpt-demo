// SchoolFunding category shape from JSONB categories array
export interface SchoolFunding {
  aid_category: string | null;
  base_year: string | null;
  school_year: string | null;
  change: string | null;
  percent_change: string | null;
}

// SchoolFundingTotals type matching school_funding_totals table (aggregated)
export interface SchoolFundingTotals {
  id: number;
  enacted_budget: string;
  district: string;
  county: string | null;
  total_base_year: number;
  total_school_year: number;
  total_change: number;
  percent_change: number;
  category_count: number;
}
