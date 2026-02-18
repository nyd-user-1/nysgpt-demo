export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      "2025_lobbyist_dataset": {
        Row: {
          beneficial_client: string | null
          coaltion_contribution: string | null
          compensation: string | null
          contractual_client: string | null
          itemized_expenses: string | null
          less_than_75_expense: string | null
          non_lobbying_expenses: string | null
          principal_lobbyist: string | null
          reimbursed_expenses: string | null
          total_expenses: string | null
          type_of_lobbyist: string | null
        }
        Insert: {
          beneficial_client?: string | null
          coaltion_contribution?: string | null
          compensation?: string | null
          contractual_client?: string | null
          itemized_expenses?: string | null
          less_than_75_expense?: string | null
          non_lobbying_expenses?: string | null
          principal_lobbyist?: string | null
          reimbursed_expenses?: string | null
          total_expenses?: string | null
          type_of_lobbyist?: string | null
        }
        Update: {
          beneficial_client?: string | null
          coaltion_contribution?: string | null
          compensation?: string | null
          contractual_client?: string | null
          itemized_expenses?: string | null
          less_than_75_expense?: string | null
          non_lobbying_expenses?: string | null
          principal_lobbyist?: string | null
          reimbursed_expenses?: string | null
          total_expenses?: string | null
          type_of_lobbyist?: string | null
        }
        Relationships: []
      }
      assets: {
        Row: {
          height: number | null
          id: string
          metadata: Json | null
          mime_type: string | null
          name: string
          original_name: string
          size_bytes: number | null
          tags: string[] | null
          type: string | null
          unique_id: string
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string | null
          url: string
          width: number | null
        }
        Insert: {
          height?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          name: string
          original_name: string
          size_bytes?: number | null
          tags?: string[] | null
          type?: string | null
          unique_id: string
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          url: string
          width?: number | null
        }
        Update: {
          height?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          name?: string
          original_name?: string
          size_bytes?: number | null
          tags?: string[] | null
          type?: string | null
          unique_id?: string
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          url?: string
          width?: number | null
        }
        Relationships: []
      }
      bill_chunks: {
        Row: {
          bill_id: number
          bill_number: string
          chunk_index: number
          chunk_type: string
          content: string
          created_at: string | null
          embedding: string | null
          id: number
          metadata: Json | null
          session_id: number
          token_count: number | null
          updated_at: string | null
        }
        Insert: {
          bill_id: number
          bill_number: string
          chunk_index: number
          chunk_type: string
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: never
          metadata?: Json | null
          session_id: number
          token_count?: number | null
          updated_at?: string | null
        }
        Update: {
          bill_id?: number
          bill_number?: string
          chunk_index?: number
          chunk_type?: string
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: never
          metadata?: Json | null
          session_id?: number
          token_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      Bills: {
        Row: {
          bill_id: number
          bill_number: string | null
          committee: string | null
          committee_id: string | null
          created_at: string | null
          description: string | null
          last_action: string | null
          last_action_date: string | null
          session_id: number | null
          state_link: string | null
          status: number | null
          status_date: string | null
          status_desc: string | null
          title: string | null
          url: string | null
        }
        Insert: {
          bill_id: number
          bill_number?: string | null
          committee?: string | null
          committee_id?: string | null
          created_at?: string | null
          description?: string | null
          last_action?: string | null
          last_action_date?: string | null
          session_id?: number | null
          state_link?: string | null
          status?: number | null
          status_date?: string | null
          status_desc?: string | null
          title?: string | null
          url?: string | null
        }
        Update: {
          bill_id?: number
          bill_number?: string | null
          committee?: string | null
          committee_id?: string | null
          created_at?: string | null
          description?: string | null
          last_action?: string | null
          last_action_date?: string | null
          session_id?: number | null
          state_link?: string | null
          status?: number | null
          status_date?: string | null
          status_desc?: string | null
          title?: string | null
          url?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_avatar: string | null
          author_name: string
          content: string
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_avatar?: string | null
          author_name?: string
          content: string
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_avatar?: string | null
          author_name?: string
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      budget_2027_capital_aprops: {
        Row: {
          "Agency Name": string | null
          "Appropriations Recommended 2026-27": string | null
          "Chapter/Section/Year": string | null
          Description: string | null
          "Encumbrance as of 1/16/2026": string | null
          "Financing Source": string | null
          "Fund Name": string | null
          "Program Name": string | null
          "Reappropriations Recommended 2026-27": string | null
          "Reference Number": string | null
          "State Purpose": string | null
        }
        Insert: {
          "Agency Name"?: string | null
          "Appropriations Recommended 2026-27"?: string | null
          "Chapter/Section/Year"?: string | null
          Description?: string | null
          "Encumbrance as of 1/16/2026"?: string | null
          "Financing Source"?: string | null
          "Fund Name"?: string | null
          "Program Name"?: string | null
          "Reappropriations Recommended 2026-27"?: string | null
          "Reference Number"?: string | null
          "State Purpose"?: string | null
        }
        Update: {
          "Agency Name"?: string | null
          "Appropriations Recommended 2026-27"?: string | null
          "Chapter/Section/Year"?: string | null
          Description?: string | null
          "Encumbrance as of 1/16/2026"?: string | null
          "Financing Source"?: string | null
          "Fund Name"?: string | null
          "Program Name"?: string | null
          "Reappropriations Recommended 2026-27"?: string | null
          "Reference Number"?: string | null
          "State Purpose"?: string | null
        }
        Relationships: []
      }
      budget_2027_spending: {
        Row: {
          "1994-95 Actuals": string | null
          "1995-96 Actuals": string | null
          "1996-97 Actuals": string | null
          "1997-98 Actuals": string | null
          "1998-99 Actuals": string | null
          "1999-00 Actuals": string | null
          "2000-01 Actuals": string | null
          "2001-02 Actuals": string | null
          "2002-03 Actuals": string | null
          "2003-04 Actuals": string | null
          "2004-05 Actuals": string | null
          "2005-06 Actuals": string | null
          "2006-07 Actuals": string | null
          "2007-08 Actuals": string | null
          "2008-09 Actuals": string | null
          "2009-10 Actuals": string | null
          "2010-11 Actuals": string | null
          "2011-12 Actuals": string | null
          "2012-13 Actuals": string | null
          "2013-14 Actuals": string | null
          "2014-15 Actuals": string | null
          "2015-16 Actuals": string | null
          "2016-17 Actuals": string | null
          "2017-18 Actuals": string | null
          "2018-19 Actuals": string | null
          "2019-20 Actuals": string | null
          "2020-21 Actuals": string | null
          "2021-22 Actuals": string | null
          "2022-23 Actuals": string | null
          "2023-24 Actuals": string | null
          "2024-25 Actuals": string | null
          "2025-26 Estimates": string | null
          "2026-27 Estimates": string | null
          Agency: string | null
          created_at: string | null
          "FP Category": string | null
          Function: string | null
          Fund: string | null
          "Fund Type": string | null
          Subfund: string | null
          "Subfund Name": string | null
        }
        Insert: {
          "1994-95 Actuals"?: string | null
          "1995-96 Actuals"?: string | null
          "1996-97 Actuals"?: string | null
          "1997-98 Actuals"?: string | null
          "1998-99 Actuals"?: string | null
          "1999-00 Actuals"?: string | null
          "2000-01 Actuals"?: string | null
          "2001-02 Actuals"?: string | null
          "2002-03 Actuals"?: string | null
          "2003-04 Actuals"?: string | null
          "2004-05 Actuals"?: string | null
          "2005-06 Actuals"?: string | null
          "2006-07 Actuals"?: string | null
          "2007-08 Actuals"?: string | null
          "2008-09 Actuals"?: string | null
          "2009-10 Actuals"?: string | null
          "2010-11 Actuals"?: string | null
          "2011-12 Actuals"?: string | null
          "2012-13 Actuals"?: string | null
          "2013-14 Actuals"?: string | null
          "2014-15 Actuals"?: string | null
          "2015-16 Actuals"?: string | null
          "2016-17 Actuals"?: string | null
          "2017-18 Actuals"?: string | null
          "2018-19 Actuals"?: string | null
          "2019-20 Actuals"?: string | null
          "2020-21 Actuals"?: string | null
          "2021-22 Actuals"?: string | null
          "2022-23 Actuals"?: string | null
          "2023-24 Actuals"?: string | null
          "2024-25 Actuals"?: string | null
          "2025-26 Estimates"?: string | null
          "2026-27 Estimates"?: string | null
          Agency?: string | null
          created_at?: string | null
          "FP Category"?: string | null
          Function?: string | null
          Fund?: string | null
          "Fund Type"?: string | null
          Subfund?: string | null
          "Subfund Name"?: string | null
        }
        Update: {
          "1994-95 Actuals"?: string | null
          "1995-96 Actuals"?: string | null
          "1996-97 Actuals"?: string | null
          "1997-98 Actuals"?: string | null
          "1998-99 Actuals"?: string | null
          "1999-00 Actuals"?: string | null
          "2000-01 Actuals"?: string | null
          "2001-02 Actuals"?: string | null
          "2002-03 Actuals"?: string | null
          "2003-04 Actuals"?: string | null
          "2004-05 Actuals"?: string | null
          "2005-06 Actuals"?: string | null
          "2006-07 Actuals"?: string | null
          "2007-08 Actuals"?: string | null
          "2008-09 Actuals"?: string | null
          "2009-10 Actuals"?: string | null
          "2010-11 Actuals"?: string | null
          "2011-12 Actuals"?: string | null
          "2012-13 Actuals"?: string | null
          "2013-14 Actuals"?: string | null
          "2014-15 Actuals"?: string | null
          "2015-16 Actuals"?: string | null
          "2016-17 Actuals"?: string | null
          "2017-18 Actuals"?: string | null
          "2018-19 Actuals"?: string | null
          "2019-20 Actuals"?: string | null
          "2020-21 Actuals"?: string | null
          "2021-22 Actuals"?: string | null
          "2022-23 Actuals"?: string | null
          "2023-24 Actuals"?: string | null
          "2024-25 Actuals"?: string | null
          "2025-26 Estimates"?: string | null
          "2026-27 Estimates"?: string | null
          Agency?: string | null
          created_at?: string | null
          "FP Category"?: string | null
          Function?: string | null
          Fund?: string | null
          "Fund Type"?: string | null
          Subfund?: string | null
          "Subfund Name"?: string | null
        }
        Relationships: []
      }
      "budget_2027-aprops": {
        Row: {
          "Agency Name": string | null
          "Appropriation Category": string | null
          "Appropriations Available 2025-26": string | null
          "Appropriations Recommended 2026-27": string | null
          "Estimated FTEs 03/31/2026": string | null
          "Estimated FTEs 03/31/2027": string | null
          "Fund Name": string | null
          "Fund Type": string | null
          "Program Name": string | null
          "Reappropriations Recommended 2026-27": string | null
          Subfund: string | null
          "Subfund Name": string | null
        }
        Insert: {
          "Agency Name"?: string | null
          "Appropriation Category"?: string | null
          "Appropriations Available 2025-26"?: string | null
          "Appropriations Recommended 2026-27"?: string | null
          "Estimated FTEs 03/31/2026"?: string | null
          "Estimated FTEs 03/31/2027"?: string | null
          "Fund Name"?: string | null
          "Fund Type"?: string | null
          "Program Name"?: string | null
          "Reappropriations Recommended 2026-27"?: string | null
          Subfund?: string | null
          "Subfund Name"?: string | null
        }
        Update: {
          "Agency Name"?: string | null
          "Appropriation Category"?: string | null
          "Appropriations Available 2025-26"?: string | null
          "Appropriations Recommended 2026-27"?: string | null
          "Estimated FTEs 03/31/2026"?: string | null
          "Estimated FTEs 03/31/2027"?: string | null
          "Fund Name"?: string | null
          "Fund Type"?: string | null
          "Program Name"?: string | null
          "Reappropriations Recommended 2026-27"?: string | null
          Subfund?: string | null
          "Subfund Name"?: string | null
        }
        Relationships: []
      }
      chat_excerpts: {
        Row: {
          assistant_message: string
          bill_id: number | null
          committee_id: number | null
          created_at: string | null
          description: string | null
          id: string
          is_published: boolean | null
          member_id: number | null
          messages: Json | null
          parent_session_id: string | null
          title: string
          updated_at: string | null
          user_id: string
          user_message: string
        }
        Insert: {
          assistant_message: string
          bill_id?: number | null
          committee_id?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          member_id?: number | null
          messages?: Json | null
          parent_session_id?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          user_message: string
        }
        Update: {
          assistant_message?: string
          bill_id?: number | null
          committee_id?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          member_id?: number | null
          messages?: Json | null
          parent_session_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          user_message?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_excerpts_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["bill_id"]
          },
          {
            foreignKeyName: "chat_excerpts_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "Bills"
            referencedColumns: ["bill_id"]
          },
          {
            foreignKeyName: "chat_excerpts_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "Committees"
            referencedColumns: ["committee_id"]
          },
          {
            foreignKeyName: "chat_excerpts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["people_id"]
          },
          {
            foreignKeyName: "chat_excerpts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "People"
            referencedColumns: ["people_id"]
          },
          {
            foreignKeyName: "chat_excerpts_parent_session_id_fkey"
            columns: ["parent_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_notes: {
        Row: {
          bill_id: number | null
          committee_id: number | null
          content: string
          created_at: string | null
          id: string
          member_id: number | null
          parent_session_id: string | null
          search_vector: unknown
          snippet: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
          user_query: string | null
        }
        Insert: {
          bill_id?: number | null
          committee_id?: number | null
          content: string
          created_at?: string | null
          id?: string
          member_id?: number | null
          parent_session_id?: string | null
          search_vector?: unknown
          snippet?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
          user_query?: string | null
        }
        Update: {
          bill_id?: number | null
          committee_id?: number | null
          content?: string
          created_at?: string | null
          id?: string
          member_id?: number | null
          parent_session_id?: string | null
          search_vector?: unknown
          snippet?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
          user_query?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_notes_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["bill_id"]
          },
          {
            foreignKeyName: "chat_notes_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "Bills"
            referencedColumns: ["bill_id"]
          },
          {
            foreignKeyName: "chat_notes_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "Committees"
            referencedColumns: ["committee_id"]
          },
          {
            foreignKeyName: "chat_notes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["people_id"]
          },
          {
            foreignKeyName: "chat_notes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "People"
            referencedColumns: ["people_id"]
          },
          {
            foreignKeyName: "chat_notes_parent_session_id_fkey"
            columns: ["parent_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          bill_id: number | null
          committee_id: number | null
          created_at: string
          id: string
          member_id: number | null
          messages: Json
          search_vector: unknown
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bill_id?: number | null
          committee_id?: number | null
          created_at?: string
          id?: string
          member_id?: number | null
          messages?: Json
          search_vector?: unknown
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bill_id?: number | null
          committee_id?: number | null
          created_at?: string
          id?: string
          member_id?: number | null
          messages?: Json
          search_vector?: unknown
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "Committees"
            referencedColumns: ["committee_id"]
          },
          {
            foreignKeyName: "chat_sessions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["people_id"]
          },
          {
            foreignKeyName: "chat_sessions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "People"
            referencedColumns: ["people_id"]
          },
        ]
      }
      Committees: {
        Row: {
          active_bills_count: string | null
          address: string | null
          chair_email: string | null
          chair_name: string | null
          chamber: string | null
          committee_id: number
          committee_members: string | null
          committee_name: string | null
          committee_type: string | null
          committee_url: string | null
          description: string | null
          meeting_schedule: string | null
          member_count: string | null
          next_meeting: string | null
          slug: string | null
          upcoming_agenda: string | null
        }
        Insert: {
          active_bills_count?: string | null
          address?: string | null
          chair_email?: string | null
          chair_name?: string | null
          chamber?: string | null
          committee_id?: number
          committee_members?: string | null
          committee_name?: string | null
          committee_type?: string | null
          committee_url?: string | null
          description?: string | null
          meeting_schedule?: string | null
          member_count?: string | null
          next_meeting?: string | null
          slug?: string | null
          upcoming_agenda?: string | null
        }
        Update: {
          active_bills_count?: string | null
          address?: string | null
          chair_email?: string | null
          chair_name?: string | null
          chamber?: string | null
          committee_id?: number
          committee_members?: string | null
          committee_name?: string | null
          committee_type?: string | null
          committee_url?: string | null
          description?: string | null
          meeting_schedule?: string | null
          member_count?: string | null
          next_meeting?: string | null
          slug?: string | null
          upcoming_agenda?: string | null
        }
        Relationships: []
      }
      Contracts: {
        Row: {
          contract_description: string | null
          contract_end_date: string | null
          contract_number: string | null
          contract_start_date: string | null
          contract_type: string | null
          created_at: string | null
          current_contract_amount: number | null
          department_facility: string | null
          ID: number
          original_contract_approved_file_date: string | null
          spending_to_date: string | null
          vendor_name: string | null
        }
        Insert: {
          contract_description?: string | null
          contract_end_date?: string | null
          contract_number?: string | null
          contract_start_date?: string | null
          contract_type?: string | null
          created_at?: string | null
          current_contract_amount?: number | null
          department_facility?: string | null
          ID: number
          original_contract_approved_file_date?: string | null
          spending_to_date?: string | null
          vendor_name?: string | null
        }
        Update: {
          contract_description?: string | null
          contract_end_date?: string | null
          contract_number?: string | null
          contract_start_date?: string | null
          contract_type?: string | null
          created_at?: string | null
          current_contract_amount?: number | null
          department_facility?: string | null
          ID?: number
          original_contract_approved_file_date?: string | null
          spending_to_date?: string | null
          vendor_name?: string | null
        }
        Relationships: []
      }
      Documents: {
        Row: {
          bill_id: number | null
          document_desc: string | null
          document_id: number
          document_mime: string | null
          document_size: number | null
          document_type: string | null
          state_link: string | null
          url: string | null
        }
        Insert: {
          bill_id?: number | null
          document_desc?: string | null
          document_id: number
          document_mime?: string | null
          document_size?: number | null
          document_type?: string | null
          state_link?: string | null
          url?: string | null
        }
        Update: {
          bill_id?: number | null
          document_desc?: string | null
          document_id?: number
          document_mime?: string | null
          document_size?: number | null
          document_type?: string | null
          state_link?: string | null
          url?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          content: string
          created_at: string | null
          id: string
          notes: string | null
          page_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          notes?: string | null
          page_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          page_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      "History Table": {
        Row: {
          action: string | null
          bill_id: number
          chamber: string | null
          date: string
          sequence: number
        }
        Insert: {
          action?: string | null
          bill_id: number
          chamber?: string | null
          date: string
          sequence: number
        }
        Update: {
          action?: string | null
          bill_id?: number
          chamber?: string | null
          date?: string
          sequence?: number
        }
        Relationships: []
      }
      Individual_Lobbyists: {
        Row: {
          address: string | null
          address_2: string | null
          city: string | null
          individual_lobbyist: string | null
          phone_number: string | null
          principal_lobbyist_name: string | null
          state: string | null
        }
        Insert: {
          address?: string | null
          address_2?: string | null
          city?: string | null
          individual_lobbyist?: string | null
          phone_number?: string | null
          principal_lobbyist_name?: string | null
          state?: string | null
        }
        Update: {
          address?: string | null
          address_2?: string | null
          city?: string | null
          individual_lobbyist?: string | null
          phone_number?: string | null
          principal_lobbyist_name?: string | null
          state?: string | null
        }
        Relationships: []
      }
      lobbying_spend: {
        Row: {
          compensation: number | null
          compensation_and_expenses: number | null
          contractual_client: string | null
          created_at: string | null
          expenses_less_than_75: number | null
          id: number
          itemized_expenses: number | null
          salaries_no_lobbying_employees: number | null
          total_expenses: number | null
        }
        Insert: {
          compensation?: number | null
          compensation_and_expenses?: number | null
          contractual_client?: string | null
          created_at?: string | null
          expenses_less_than_75?: number | null
          id?: number
          itemized_expenses?: number | null
          salaries_no_lobbying_employees?: number | null
          total_expenses?: number | null
        }
        Update: {
          compensation?: number | null
          compensation_and_expenses?: number | null
          contractual_client?: string | null
          created_at?: string | null
          expenses_less_than_75?: number | null
          id?: number
          itemized_expenses?: number | null
          salaries_no_lobbying_employees?: number | null
          total_expenses?: number | null
        }
        Relationships: []
      }
      lobbyist_compensation: {
        Row: {
          compensation: number | null
          created_at: string | null
          grand_total_compensation_expenses: number | null
          id: number
          lobbyist_id: number | null
          normalized_lobbyist: string | null
          principal_lobbyist: string | null
          reimbursed_expenses: number | null
          year: number
        }
        Insert: {
          compensation?: number | null
          created_at?: string | null
          grand_total_compensation_expenses?: number | null
          id?: number
          lobbyist_id?: number | null
          normalized_lobbyist?: string | null
          principal_lobbyist?: string | null
          reimbursed_expenses?: number | null
          year: number
        }
        Update: {
          compensation?: number | null
          created_at?: string | null
          grand_total_compensation_expenses?: number | null
          id?: number
          lobbyist_id?: number | null
          normalized_lobbyist?: string | null
          principal_lobbyist?: string | null
          reimbursed_expenses?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "lobbyist_compensation_lobbyist_id_fkey"
            columns: ["lobbyist_id"]
            isOneToOne: false
            referencedRelation: "lobbyist_full_profile"
            referencedColumns: ["lobbyist_id"]
          },
          {
            foreignKeyName: "lobbyist_compensation_lobbyist_id_fkey"
            columns: ["lobbyist_id"]
            isOneToOne: false
            referencedRelation: "lobbyists"
            referencedColumns: ["id"]
          },
        ]
      }
      lobbyists: {
        Row: {
          created_at: string | null
          id: number
          name: string
          normalized_name: string
          type_of_lobbyist: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
          normalized_name: string
          type_of_lobbyist?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
          normalized_name?: string
          type_of_lobbyist?: string | null
        }
        Relationships: []
      }
      lobbyists_clients: {
        Row: {
          contractual_client: string | null
          id: number
          lobbyist_id: number | null
          normalized_lobbyist: string | null
          principal_lobbyist: string | null
          start_date: string | null
        }
        Insert: {
          contractual_client?: string | null
          id?: number
          lobbyist_id?: number | null
          normalized_lobbyist?: string | null
          principal_lobbyist?: string | null
          start_date?: string | null
        }
        Update: {
          contractual_client?: string | null
          id?: number
          lobbyist_id?: number | null
          normalized_lobbyist?: string | null
          principal_lobbyist?: string | null
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lobbyists_clients_lobbyist_id_fkey"
            columns: ["lobbyist_id"]
            isOneToOne: false
            referencedRelation: "lobbyist_full_profile"
            referencedColumns: ["lobbyist_id"]
          },
          {
            foreignKeyName: "lobbyists_clients_lobbyist_id_fkey"
            columns: ["lobbyist_id"]
            isOneToOne: false
            referencedRelation: "lobbyists"
            referencedColumns: ["id"]
          },
        ]
      }
      member_vote_tallies: {
        Row: {
          no_count: number | null
          people_id: number
          updated_at: string | null
          yea_count: number | null
        }
        Insert: {
          no_count?: number | null
          people_id: number
          updated_at?: string | null
          yea_count?: number | null
        }
        Update: {
          no_count?: number | null
          people_id?: number
          updated_at?: string | null
          yea_count?: number | null
        }
        Relationships: []
      }
      People: {
        Row: {
          address: string | null
          archived: boolean | null
          bio_long: string | null
          chamber: string | null
          committee_id: string | null
          committee_ids: string | null
          district: string | null
          email: string | null
          first_name: string | null
          last_name: string | null
          leadership_title: string | null
          legiscan_legislation_url: string | null
          legiscan_rss_url: string | null
          middle_name: string | null
          name: string | null
          nys_bio_url: string | null
          party: string | null
          party_id: number | null
          people_id: number
          phone_capitol: string | null
          phone_district: string | null
          photo_url: string | null
          role: string | null
          role_id: number | null
        }
        Insert: {
          address?: string | null
          archived?: boolean | null
          bio_long?: string | null
          chamber?: string | null
          committee_id?: string | null
          committee_ids?: string | null
          district?: string | null
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          leadership_title?: string | null
          legiscan_legislation_url?: string | null
          legiscan_rss_url?: string | null
          middle_name?: string | null
          name?: string | null
          nys_bio_url?: string | null
          party?: string | null
          party_id?: number | null
          people_id: number
          phone_capitol?: string | null
          phone_district?: string | null
          photo_url?: string | null
          role?: string | null
          role_id?: number | null
        }
        Update: {
          address?: string | null
          archived?: boolean | null
          bio_long?: string | null
          chamber?: string | null
          committee_id?: string | null
          committee_ids?: string | null
          district?: string | null
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          leadership_title?: string | null
          legiscan_legislation_url?: string | null
          legiscan_rss_url?: string | null
          middle_name?: string | null
          name?: string | null
          nys_bio_url?: string | null
          party?: string | null
          party_id?: number | null
          people_id?: number
          phone_capitol?: string | null
          phone_district?: string | null
          photo_url?: string | null
          role?: string | null
          role_id?: number | null
        }
        Relationships: []
      }
      people_photo_backup: {
        Row: {
          backup_date: string | null
          first_name: string | null
          last_name: string | null
          name: string | null
          people_id: number | null
          photo_url: string | null
        }
        Insert: {
          backup_date?: string | null
          first_name?: string | null
          last_name?: string | null
          name?: string | null
          people_id?: number | null
          photo_url?: string | null
        }
        Update: {
          backup_date?: string | null
          first_name?: string | null
          last_name?: string | null
          name?: string | null
          people_id?: number | null
          photo_url?: string | null
        }
        Relationships: []
      }
      Persona: {
        Row: {
          act: string
          id: string
          Label: string | null
          prompt: string | null
        }
        Insert: {
          act: string
          id?: string
          Label?: string | null
          prompt?: string | null
        }
        Update: {
          act?: string
          id?: string
          Label?: string | null
          prompt?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          area_code: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          county: string | null
          created_at: string
          display_name: string | null
          id: string
          pen_name: string | null
          policy_interests: string | null
          role: string | null
          state: string | null
          updated_at: string
          user_id: string
          user_type: string | null
          username: string | null
          zip_code: string | null
        }
        Insert: {
          area_code?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          county?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          pen_name?: string | null
          policy_interests?: string | null
          role?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
          user_type?: string | null
          username?: string | null
          zip_code?: string | null
        }
        Update: {
          area_code?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          county?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          pen_name?: string | null
          policy_interests?: string | null
          role?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
          user_type?: string | null
          username?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      prompt_chat_counts: {
        Row: {
          chat_count: number
          prompt_id: string
          updated_at: string | null
        }
        Insert: {
          chat_count?: number
          prompt_id: string
          updated_at?: string | null
        }
        Update: {
          chat_count?: number
          prompt_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      resource_documents: {
        Row: {
          created_at: string | null
          id: string
          logo_url: string | null
          slug: string
          source_url: string
          summary_markdown: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          slug: string
          source_url: string
          summary_markdown?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          slug?: string
          source_url?: string
          summary_markdown?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      "Roll Call": {
        Row: {
          absent: string | null
          bill_id: number | null
          chamber: string | null
          created_at: string | null
          date: string | null
          description: string | null
          nay: string | null
          nv: string | null
          roll_call_id: number
          total: number | null
          yea: number | null
        }
        Insert: {
          absent?: string | null
          bill_id?: number | null
          chamber?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          nay?: string | null
          nv?: string | null
          roll_call_id: number
          total?: number | null
          yea?: number | null
        }
        Update: {
          absent?: string | null
          bill_id?: number | null
          chamber?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          nay?: string | null
          nv?: string | null
          roll_call_id?: number
          total?: number | null
          yea?: number | null
        }
        Relationships: []
      }
      "Sample Problems": {
        Row: {
          id: number
          "Sample Problems": string
        }
        Insert: {
          id?: number
          "Sample Problems": string
        }
        Update: {
          id?: number
          "Sample Problems"?: string
        }
        Relationships: []
      }
      school_funding: {
        Row: {
          "BEDS Code": string | null
          categories: Json | null
          County: string | null
          District: string | null
          enacted_budget: string | null
          id: number
        }
        Insert: {
          "BEDS Code"?: string | null
          categories?: Json | null
          County?: string | null
          District?: string | null
          enacted_budget?: string | null
          id?: number
        }
        Update: {
          "BEDS Code"?: string | null
          categories?: Json | null
          County?: string | null
          District?: string | null
          enacted_budget?: string | null
          id?: number
        }
        Relationships: []
      }
      school_funding_totals: {
        Row: {
          category_count: number | null
          county: string | null
          created_at: string | null
          district: string
          enacted_budget: string
          id: number
          percent_change: number | null
          total_base_year: number | null
          total_change: number | null
          total_school_year: number | null
        }
        Insert: {
          category_count?: number | null
          county?: string | null
          created_at?: string | null
          district: string
          enacted_budget: string
          id?: number
          percent_change?: number | null
          total_base_year?: number | null
          total_change?: number | null
          total_school_year?: number | null
        }
        Update: {
          category_count?: number | null
          county?: string | null
          created_at?: string | null
          district?: string
          enacted_budget?: string
          id?: number
          percent_change?: number | null
          total_base_year?: number | null
          total_change?: number | null
          total_school_year?: number | null
        }
        Relationships: []
      }
      Sponsors: {
        Row: {
          bill_id: number | null
          id: number
          people_id: number | null
          position: number | null
        }
        Insert: {
          bill_id?: number | null
          id?: number
          people_id?: number | null
          position?: number | null
        }
        Update: {
          bill_id?: number | null
          id?: number
          people_id?: number | null
          position?: number | null
        }
        Relationships: []
      }
      submitted_prompts: {
        Row: {
          admin_notes: string | null
          avatar_url: string | null
          category: string | null
          created_at: string
          display_name: string | null
          featured: boolean
          id: string
          prompt: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          show_in_news: boolean
          show_in_trending: boolean
          status: string
          title: string
          url: string
          user_generated: boolean
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          avatar_url?: string | null
          category?: string | null
          created_at?: string
          display_name?: string | null
          featured?: boolean
          id?: string
          prompt?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          show_in_news?: boolean
          show_in_trending?: boolean
          status?: string
          title: string
          url?: string
          user_generated?: boolean
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          avatar_url?: string | null
          category?: string | null
          created_at?: string
          display_name?: string | null
          featured?: boolean
          id?: string
          prompt?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          show_in_news?: boolean
          show_in_trending?: boolean
          status?: string
          title?: string
          url?: string
          user_generated?: boolean
          user_id?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      "Top 50 Public Policy Problems": {
        Row: {
          "The Path Forward": string | null
          "The Real Challenge": string | null
          Title: string
          "What We're Seeing": string | null
          "Why This Matters Now": string | null
          "Your Role": string | null
        }
        Insert: {
          "The Path Forward"?: string | null
          "The Real Challenge"?: string | null
          Title: string
          "What We're Seeing"?: string | null
          "Why This Matters Now"?: string | null
          "Your Role"?: string | null
        }
        Update: {
          "The Path Forward"?: string | null
          "The Real Challenge"?: string | null
          Title?: string
          "What We're Seeing"?: string | null
          "Why This Matters Now"?: string | null
          "Your Role"?: string | null
        }
        Relationships: []
      }
      user_bill_reviews: {
        Row: {
          bill_id: number
          created_at: string
          id: string
          note: string | null
          review_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bill_id: number
          created_at?: string
          id?: string
          note?: string | null
          review_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bill_id?: number
          created_at?: string
          id?: string
          note?: string | null
          review_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_committee_favorites: {
        Row: {
          committee_id: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          committee_id: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          committee_id?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_committee_favorites_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "Committees"
            referencedColumns: ["committee_id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          bill_id: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bill_id: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bill_id?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_member_favorites: {
        Row: {
          created_at: string
          id: string
          member_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_member_favorites_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["people_id"]
          },
          {
            foreignKeyName: "user_member_favorites_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "People"
            referencedColumns: ["people_id"]
          },
        ]
      }
      visitor_counts: {
        Row: {
          count: number
          created_at: string
          date: string
          id: string
          updated_at: string
        }
        Insert: {
          count?: number
          created_at?: string
          date: string
          id?: string
          updated_at?: string
        }
        Update: {
          count?: number
          created_at?: string
          date?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      Votes: {
        Row: {
          people_id: number
          roll_call_id: number
          vote: number | null
          vote_desc: string | null
        }
        Insert: {
          people_id: number
          roll_call_id: number
          vote?: number | null
          vote_desc?: string | null
        }
        Update: {
          people_id?: number
          roll_call_id?: number
          vote?: number | null
          vote_desc?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      bills: {
        Row: {
          bill_id: number | null
          bill_number: string | null
          committee: string | null
          committee_id: string | null
          description: string | null
          last_action: string | null
          last_action_date: string | null
          session_id: number | null
          state_link: string | null
          status: number | null
          status_date: string | null
          status_desc: string | null
          title: string | null
          url: string | null
        }
        Insert: {
          bill_id?: number | null
          bill_number?: string | null
          committee?: string | null
          committee_id?: string | null
          description?: string | null
          last_action?: string | null
          last_action_date?: string | null
          session_id?: number | null
          state_link?: string | null
          status?: number | null
          status_date?: string | null
          status_desc?: string | null
          title?: string | null
          url?: string | null
        }
        Update: {
          bill_id?: number | null
          bill_number?: string | null
          committee?: string | null
          committee_id?: string | null
          description?: string | null
          last_action?: string | null
          last_action_date?: string | null
          session_id?: number | null
          state_link?: string | null
          status?: number | null
          status_date?: string | null
          status_desc?: string | null
          title?: string | null
          url?: string | null
        }
        Relationships: []
      }
      contracts: {
        Row: {
          contract_description: string | null
          contract_end_date: string | null
          contract_number: string | null
          contract_start_date: string | null
          contract_type: string | null
          created_at: string | null
          current_contract_amount: number | null
          department_facility: string | null
          ID: number | null
          original_contract_approved_file_date: string | null
          spending_to_date: string | null
          vendor_name: string | null
        }
        Insert: {
          contract_description?: string | null
          contract_end_date?: string | null
          contract_number?: string | null
          contract_start_date?: string | null
          contract_type?: string | null
          created_at?: string | null
          current_contract_amount?: number | null
          department_facility?: string | null
          ID?: number | null
          original_contract_approved_file_date?: string | null
          spending_to_date?: string | null
          vendor_name?: string | null
        }
        Update: {
          contract_description?: string | null
          contract_end_date?: string | null
          contract_number?: string | null
          contract_start_date?: string | null
          contract_type?: string | null
          created_at?: string | null
          current_contract_amount?: number | null
          department_facility?: string | null
          ID?: number | null
          original_contract_approved_file_date?: string | null
          spending_to_date?: string | null
          vendor_name?: string | null
        }
        Relationships: []
      }
      lobbyist_compensation_yoy: {
        Row: {
          diff: number | null
          normalized_lobbyist: string | null
          pct_change: number | null
          principal_lobbyist: string | null
          total_2024: number | null
          total_2025: number | null
        }
        Relationships: []
      }
      lobbyist_full_profile: {
        Row: {
          client_count: number | null
          compensation: number | null
          grand_total_compensation_expenses: number | null
          lobbyist_id: number | null
          lobbyist_name: string | null
          normalized_name: string | null
          reimbursed_expenses: number | null
          total_compensation: number | null
          total_expenses: number | null
          type_of_lobbyist: string | null
        }
        Relationships: []
      }
      member_votes: {
        Row: {
          people_id: number | null
          roll_call_id: number | null
          vote: number | null
          vote_desc: string | null
        }
        Insert: {
          people_id?: number | null
          roll_call_id?: number | null
          vote?: number | null
          vote_desc?: string | null
        }
        Update: {
          people_id?: number | null
          roll_call_id?: number | null
          vote?: number | null
          vote_desc?: string | null
        }
        Relationships: []
      }
      people: {
        Row: {
          address: string | null
          bio_long: string | null
          chamber: string | null
          committee_id: string | null
          committee_ids: string | null
          district: string | null
          email: string | null
          first_name: string | null
          last_name: string | null
          legiscan_legislation_url: string | null
          legiscan_rss_url: string | null
          middle_name: string | null
          name: string | null
          nys_bio_url: string | null
          party: string | null
          party_id: number | null
          people_id: number | null
          phone_capitol: string | null
          phone_district: string | null
          photo_url: string | null
          role: string | null
          role_id: number | null
        }
        Insert: {
          address?: string | null
          bio_long?: string | null
          chamber?: string | null
          committee_id?: string | null
          committee_ids?: string | null
          district?: string | null
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          legiscan_legislation_url?: string | null
          legiscan_rss_url?: string | null
          middle_name?: string | null
          name?: string | null
          nys_bio_url?: string | null
          party?: string | null
          party_id?: number | null
          people_id?: number | null
          phone_capitol?: string | null
          phone_district?: string | null
          photo_url?: string | null
          role?: string | null
          role_id?: number | null
        }
        Update: {
          address?: string | null
          bio_long?: string | null
          chamber?: string | null
          committee_id?: string | null
          committee_ids?: string | null
          district?: string | null
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          legiscan_legislation_url?: string | null
          legiscan_rss_url?: string | null
          middle_name?: string | null
          name?: string | null
          nys_bio_url?: string | null
          party?: string | null
          party_id?: number | null
          people_id?: number | null
          phone_capitol?: string | null
          phone_district?: string | null
          photo_url?: string | null
          role?: string | null
          role_id?: number | null
        }
        Relationships: []
      }
      roll_call: {
        Row: {
          absent: string | null
          bill_id: number | null
          chamber: string | null
          created_at: string | null
          date: string | null
          description: string | null
          nay: string | null
          nv: string | null
          roll_call_id: number | null
          total: number | null
          yea: number | null
        }
        Insert: {
          absent?: string | null
          bill_id?: number | null
          chamber?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          nay?: string | null
          nv?: string | null
          roll_call_id?: number | null
          total?: number | null
          yea?: number | null
        }
        Update: {
          absent?: string | null
          bill_id?: number | null
          chamber?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          nay?: string | null
          nv?: string | null
          roll_call_id?: number | null
          total?: number | null
          yea?: number | null
        }
        Relationships: []
      }
      sponsors: {
        Row: {
          bill_id: number | null
          id: number | null
          people_id: number | null
          position: number | null
        }
        Insert: {
          bill_id?: number | null
          id?: number | null
          people_id?: number | null
          position?: number | null
        }
        Update: {
          bill_id?: number | null
          id?: number | null
          people_id?: number | null
          position?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      count_embedded_bills: { Args: { p_session_id: number }; Returns: number }
      generate_asset_unique_id: { Args: never; Returns: string }
      generate_problem_number: { Args: never; Returns: string }
      get_budget_by_group: {
        Args: { p_group_by: string }
        Returns: {
          amount: number
          name: string
          pct_of_total: number
          prior_amount: number
          row_count: number
          yoy_change: number
        }[]
      }
      get_budget_drilldown: {
        Args: { p_group_by: string; p_group_value: string }
        Returns: {
          amount: number
          name: string
          pct_of_parent: number
          prior_amount: number
          yoy_change: number
        }[]
      }
      get_budget_totals: {
        Args: never
        Returns: {
          grand_total: number
          prior_grand_total: number
        }[]
      }
      get_contracts_by_group: {
        Args: { p_group_by: string }
        Returns: {
          amount: number
          contract_count: number
          name: string
          pct_of_total: number
        }[]
      }
      get_contracts_by_month: {
        Args: never
        Returns: {
          count: number
          month: string
          total_amount: number
        }[]
      }
      get_contracts_by_year: {
        Args: never
        Returns: {
          count: number
          total_amount: number
          year: string
        }[]
      }
      get_contracts_drilldown: {
        Args: { p_group_by: string; p_group_value: string }
        Returns: {
          amount: number
          contract_number: string
          name: string
          pct_of_parent: number
        }[]
      }
      get_contracts_duration_buckets: {
        Args: never
        Returns: {
          bucket: string
          count: number
          total_amount: number
        }[]
      }
      get_contracts_expiration_buckets: {
        Args: never
        Returns: {
          bucket: string
          count: number
          total_amount: number
        }[]
      }
      get_contracts_for_duration_bucket: {
        Args: { p_max_days: number; p_min_days: number }
        Returns: {
          amount: number
          contract_number: string
          duration_days: number
          vendor_name: string
        }[]
      }
      get_contracts_for_expiration_bucket: {
        Args: { p_max_days: number; p_min_days: number }
        Returns: {
          amount: number
          contract_number: string
          days_until_expiry: number
          department: string
          end_date: string
          vendor_name: string
        }[]
      }
      get_contracts_for_spend_bucket: {
        Args: { p_max_pct: number; p_min_pct: number }
        Returns: {
          amount: number
          contract_number: string
          spend_pct: number
          spending: number
          vendor_name: string
        }[]
      }
      get_contracts_for_vendor: {
        Args: { p_vendor_name: string }
        Returns: {
          amount: number
          contract_number: string
          end_date: string
          name: string
          start_date: string
        }[]
      }
      get_contracts_historical: {
        Args: never
        Returns: {
          annual: number
          total: number
          year: string
        }[]
      }
      get_contracts_historical_for_group: {
        Args: { p_group_by: string; p_group_value: string }
        Returns: {
          annual: number
          total: number
          year: string
        }[]
      }
      get_contracts_months_for_year: {
        Args: { p_year: number }
        Returns: {
          count: number
          month: string
          month_name: string
          total_amount: number
        }[]
      }
      get_contracts_spend_buckets: {
        Args: never
        Returns: {
          bucket: string
          count: number
          total_amount: number
        }[]
      }
      get_contracts_top_vendors: {
        Args: { p_limit?: number }
        Returns: {
          contract_count: number
          total_amount: number
          vendor_name: string
        }[]
      }
      get_contracts_totals: {
        Args: never
        Returns: {
          grand_total: number
          total_contracts: number
        }[]
      }
      get_law_details: {
        Args: { p_law_id: string }
        Returns: {
          chapter: string
          law_id: string
          law_type: string
          name: string
          sections: Json
          total_sections: number
        }[]
      }
      get_lobbying_by_client: {
        Args: never
        Returns: {
          amount: number
          name: string
          pct_of_total: number
        }[]
      }
      get_lobbying_by_lobbyist: {
        Args: never
        Returns: {
          amount: number
          client_count: number
          name: string
          pct_change: number
          pct_of_total: number
        }[]
      }
      get_lobbying_clients_for_lobbyist: {
        Args: { p_lobbyist: string }
        Returns: {
          amount: number
          name: string
          pct_of_parent: number
        }[]
      }
      get_lobbying_totals: {
        Args: never
        Returns: {
          client_grand_total: number
          lobbyist_grand_total: number
          total_clients: number
          total_lobbyists: number
        }[]
      }
      get_member_opposition_votes: {
        Args: { p_people_id: number }
        Returns: {
          bill_number: string
          bill_title: string
          date: string
          vote: string
        }[]
      }
      get_member_votes_all: {
        Args: { p_people_id: number }
        Returns: {
          bill_number: string
          bill_title: string
          date: string
          vote: string
        }[]
      }
      get_votes_avg_margin_per_day: {
        Args: never
        Returns: {
          avg_margin: number
          date: string
        }[]
      }
      get_votes_bill_member_votes: {
        Args: { p_roll_call_id: number }
        Returns: {
          name: string
          vote: string
        }[]
      }
      get_votes_bills_pass_fail: {
        Args: never
        Returns: {
          bill_number: string
          bill_title: string
          date: string
          no_count: number
          result: string
          roll_call_id: number
          yes_count: number
        }[]
      }
      get_votes_by_member: {
        Args: never
        Returns: {
          name: string
          no_count: number
          party: string
          people_id: number
          total_votes: number
          yes_count: number
        }[]
      }
      get_votes_by_party_per_day: {
        Args: never
        Returns: {
          date: string
          dem_yes: number
          rep_yes: number
        }[]
      }
      get_votes_chart_data: {
        Args: never
        Returns: {
          date: string
          no: number
          yes: number
        }[]
      }
      get_votes_drilldown: {
        Args: { p_people_id: number }
        Returns: {
          bill_number: string
          bill_title: string
          date: string
          vote: string
        }[]
      }
      get_votes_pass_fail_per_day: {
        Args: never
        Returns: {
          date: string
          failed: number
          passed: number
        }[]
      }
      get_votes_rollcalls_per_day: {
        Args: never
        Returns: {
          date: string
          roll_calls: number
        }[]
      }
      get_votes_totals: {
        Args: never
        Returns: {
          total_members: number
          total_votes: number
        }[]
      }
      increment_prompt_chat_count: {
        Args: { p_prompt_id: string; p_seed_count?: number }
        Returns: undefined
      }
      increment_visitor_count: { Args: never; Returns: number }
      match_bill_chunks: {
        Args: {
          filter_bill_number?: string
          filter_session_id?: number
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          bill_id: number
          bill_number: string
          chunk_index: number
          chunk_type: string
          content: string
          id: number
          metadata: Json
          session_id: number
          similarity: number
          token_count: number
        }[]
      }
      normalize_lobbyist_name: { Args: { name: string }; Returns: string }
      search_all: {
        Args: {
          p_cursor?: string
          p_limit?: number
          p_query?: string
          p_user_id: string
        }
        Returns: Database["public"]["CompositeTypes"]["search_result"][]
        SetofOptions: {
          from: "*"
          to: "search_result"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      search_chats: {
        Args: {
          p_cursor?: string
          p_limit?: number
          p_query?: string
          p_user_id: string
        }
        Returns: Database["public"]["CompositeTypes"]["search_result"][]
        SetofOptions: {
          from: "*"
          to: "search_result"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      search_notes: {
        Args: {
          p_cursor?: string
          p_limit?: number
          p_query?: string
          p_user_id: string
        }
        Returns: Database["public"]["CompositeTypes"]["search_result"][]
        SetofOptions: {
          from: "*"
          to: "search_result"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      search_ny_laws: {
        Args: { limit_results?: number; search_term: string }
        Returns: {
          chapter: string
          content_snippet: string
          law_id: string
          law_name: string
          relevance: number
          section_title: string
        }[]
      }
      update_committee_counts: { Args: never; Returns: undefined }
      validate_blog_proposal_assets: {
        Args: { assets_data: Json }
        Returns: boolean
      }
    }
    Enums: {
      subscription_tier_enum:
        | "free"
        | "student"
        | "staffer"
        | "researcher"
        | "professional"
        | "enterprise"
        | "government"
    }
    CompositeTypes: {
      search_result: {
        id: string | null
        type: string | null
        title: string | null
        preview_text: string | null
        created_at: string | null
        last_activity_at: string | null
        relevance: number | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      subscription_tier_enum: [
        "free",
        "student",
        "staffer",
        "researcher",
        "professional",
        "enterprise",
        "government",
      ],
    },
  },
} as const
