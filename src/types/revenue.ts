// Revenue type matching Supabase Revenue table (all columns are text except id)
export interface Revenue {
  id: number;
  Fund_Group: string | null;
  FP_Category: string | null;
  Detail_Receipt: string | null;
  "1991-92": string | null;
  "1992-93": string | null;
  "1993-94": string | null;
  "1994-95": string | null;
  "1995-96": string | null;
  "1996-97": string | null;
  "1997-98": string | null;
  "1998-99": string | null;
  "1999-00": string | null;
  "2000-01": string | null;
  "2001-02": string | null;
  "2002-03": string | null;
  "2003-04": string | null;
  "2004-05": string | null;
  "2005-06": string | null;
  "2006-07": string | null;
  "2007-08": string | null;
  "2008-09": string | null;
  "2009-10": string | null;
  "2010-11": string | null;
  "2011-12": string | null;
  "2012-13": string | null;
  "2013-14": string | null;
  "2014-15": string | null;
  "2015-16": string | null;
  "2016-17": string | null;
  "2017-18": string | null;
  "2018-19": string | null;
  "2019-20": string | null;
  "2020-21": string | null;
  "2021-22": string | null;
  "2022-23": string | null;
}

// All fiscal year column names in chronological order
export const FISCAL_YEARS = [
  "1991-92", "1992-93", "1993-94", "1994-95", "1995-96",
  "1996-97", "1997-98", "1998-99", "1999-00", "2000-01",
  "2001-02", "2002-03", "2003-04", "2004-05", "2005-06",
  "2006-07", "2007-08", "2008-09", "2009-10", "2010-11",
  "2011-12", "2012-13", "2013-14", "2014-15", "2015-16",
  "2016-17", "2017-18", "2018-19", "2019-20", "2020-21",
  "2021-22", "2022-23",
] as const;
