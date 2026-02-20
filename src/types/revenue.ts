// Revenue type matching Supabase Revenue table (all columns are text except id)
export interface Revenue {
  id: number;
  Fund_Group: string | null;
  FP_Category: string | null;
  Detail_Receipt: string | null;
  "1991_92_Actuals": string | null;
  "1992_93_Actuals": string | null;
  "1993_94_Actuals": string | null;
  "1994_95_Actuals": string | null;
  "1995_96_Actuals": string | null;
  "1996_97_Actuals": string | null;
  "1997_98_Actuals": string | null;
  "1998_99_Actuals": string | null;
  "1999_00_Actuals": string | null;
  "2000_01_Actuals": string | null;
  "2001_02_Actuals": string | null;
  "2002_03_Actuals": string | null;
  "2003_04_Actuals": string | null;
  "2004_05_Actuals": string | null;
  "2005_06_Actuals": string | null;
  "2006_07_Actuals": string | null;
  "2007_08_Actuals": string | null;
  "2008_09_Actuals": string | null;
  "2009_10_Actuals": string | null;
  "2010_11_Actuals": string | null;
  "2011_12_Actuals": string | null;
  "2012_13_Actuals": string | null;
  "2013_14_Actuals": string | null;
  "2014_15_Actuals": string | null;
  "2015_16_Actuals": string | null;
  "2016_17_Actuals": string | null;
  "2017_18_Actuals": string | null;
  "2018_19_Actuals": string | null;
  "2019_20_Actuals": string | null;
  "2020_21_Actuals": string | null;
  "2021_22_Actuals": string | null;
  "2022_23_Actuals": string | null;
}

// All fiscal year column names in chronological order
export const FISCAL_YEARS = [
  "1991_92_Actuals", "1992_93_Actuals", "1993_94_Actuals", "1994_95_Actuals", "1995_96_Actuals",
  "1996_97_Actuals", "1997_98_Actuals", "1998_99_Actuals", "1999_00_Actuals", "2000_01_Actuals",
  "2001_02_Actuals", "2002_03_Actuals", "2003_04_Actuals", "2004_05_Actuals", "2005_06_Actuals",
  "2006_07_Actuals", "2007_08_Actuals", "2008_09_Actuals", "2009_10_Actuals", "2010_11_Actuals",
  "2011_12_Actuals", "2012_13_Actuals", "2013_14_Actuals", "2014_15_Actuals", "2015_16_Actuals",
  "2016_17_Actuals", "2017_18_Actuals", "2018_19_Actuals", "2019_20_Actuals", "2020_21_Actuals",
  "2021_22_Actuals", "2022_23_Actuals",
] as const;

// Display label for a fiscal year column (e.g. "2022_23_Actuals" → "FY 2022-23")
export function fiscalYearLabel(col: string): string {
  return "FY " + col.replace("_Actuals", "").replace("_", "-");
}
