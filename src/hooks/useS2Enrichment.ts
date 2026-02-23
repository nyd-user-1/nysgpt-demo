import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface S2Author {
  name: string;
  hIndex: number | null;
  affiliations: string[];
}

export interface S2Enrichment {
  id: number;
  nsr_id: number;
  doi: string;
  s2_paper_id: string | null;
  citation_count: number | null;
  influential_citation_count: number | null;
  reference_count: number | null;
  abstract: string | null;
  tldr: string | null;
  venue: string | null;
  publication_date: string | null;
  is_open_access: boolean;
  open_access_pdf_url: string | null;
  fields_of_study: string[] | null;
  authors: S2Author[] | null;
  bibtex: string | null;
  lookup_status: "pending" | "found" | "not_found" | "error";
  looked_up_at: string | null;
  created_at: string;
}

export function useS2Enrichment(nsrId: number | null) {
  return useQuery({
    queryKey: ["s2-enrichment", nsrId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nsr_s2")
        .select("*")
        .eq("nsr_id", nsrId!)
        .single();

      if (error) throw error;
      return data as unknown as S2Enrichment;
    },
    enabled: nsrId != null,
    staleTime: 1000 * 60 * 30, // cache 30 min
  });
}
