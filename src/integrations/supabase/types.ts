export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      Bills: {
        Row: {
          bill_id: number
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
          bill_id: number
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
          bill_id?: number
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
      chat_sessions: {
        Row: {
          bill_id: number | null
          committee_id: number | null
          created_at: string
          id: string
          member_id: number | null
          messages: Json
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
            referencedRelation: "People"
            referencedColumns: ["people_id"]
          },
        ]
      }
      chat_excerpts: {
        Row: {
          id: string
          user_id: string
          parent_session_id: string | null
          title: string
          user_message: string
          assistant_message: string
          bill_id: number | null
          member_id: number | null
          committee_id: number | null
          is_published: boolean
          messages: unknown | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          parent_session_id?: string | null
          title: string
          user_message: string
          assistant_message: string
          bill_id?: number | null
          member_id?: number | null
          committee_id?: number | null
          is_published?: boolean
          messages?: unknown | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          parent_session_id?: string | null
          title?: string
          user_message?: string
          assistant_message?: string
          bill_id?: number | null
          member_id?: number | null
          committee_id?: number | null
          is_published?: boolean
          messages?: unknown | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_excerpts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
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
      co_authors: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_at: string
          invited_by: string
          legislative_draft_id: string
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          invited_by: string
          legislative_draft_id: string
          role?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string
          legislative_draft_id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      legislative_drafts: {
        Row: {
          analysis: Json | null
          co_author_count: number | null
          created_at: string
          draft_content: string
          id: string
          is_public: boolean | null
          legislative_idea_id: string | null
          status: string | null
          title: string
          type: string | null
          updated_at: string
          user_id: string
          votes: Json | null
        }
        Insert: {
          analysis?: Json | null
          co_author_count?: number | null
          created_at?: string
          draft_content: string
          id?: string
          is_public?: boolean | null
          legislative_idea_id?: string | null
          status?: string | null
          title: string
          type?: string | null
          updated_at?: string
          user_id: string
          votes?: Json | null
        }
        Update: {
          analysis?: Json | null
          co_author_count?: number | null
          created_at?: string
          draft_content?: string
          id?: string
          is_public?: boolean | null
          legislative_idea_id?: string | null
          status?: string | null
          title?: string
          type?: string | null
          updated_at?: string
          user_id?: string
          votes?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "legislative_drafts_legislative_idea_id_fkey"
            columns: ["legislative_idea_id"]
            isOneToOne: false
            referencedRelation: "legislative_ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legislative_drafts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      legislative_ideas: {
        Row: {
          category: string | null
          created_at: string
          id: string
          improved_idea: string | null
          original_idea: string
          problem_statement_id: string | null
          status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          improved_idea?: string | null
          original_idea: string
          problem_statement_id?: string | null
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          improved_idea?: string | null
          original_idea?: string
          problem_statement_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legislative_ideas_problem_statement_id_fkey"
            columns: ["problem_statement_id"]
            isOneToOne: false
            referencedRelation: "problem_statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legislative_ideas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      media_outputs: {
        Row: {
          content: string
          content_type: string
          created_at: string
          id: string
          legislative_draft_id: string | null
          metadata: Json | null
          status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          content_type: string
          created_at?: string
          id?: string
          legislative_draft_id?: string | null
          metadata?: Json | null
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          content_type?: string
          created_at?: string
          id?: string
          legislative_draft_id?: string | null
          metadata?: Json | null
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_outputs_legislative_draft_id_fkey"
            columns: ["legislative_draft_id"]
            isOneToOne: false
            referencedRelation: "legislative_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_outputs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      People: {
        Row: {
          address: string | null
          archived: boolean | null
          ballotpedia: string | null
          bio_long: string | null
          bio_short: string | null
          chamber: string | null
          committee_id: string | null
          district: string | null
          draft: boolean | null
          email: string | null
          first_name: string | null
          followthemoney_eid: number | null
          knowwho_pid: number | null
          last_name: string | null
          leadership_title: string | null
          legiscan_legislation_url: string | null
          legiscan_rss_url: string | null
          middle_name: string | null
          name: string | null
          nickname: string | null
          nys_bio_url: string | null
          opensecrets_id: string | null
          party: string | null
          party_id: number | null
          people_id: number
          phone_capitol: string | null
          phone_district: string | null
          photo_url: string | null
          role: string | null
          role_id: number | null
          suffix: string | null
          votesmart_id: number | null
          webflow_collection_id: string | null
          webflow_created_on: string | null
          webflow_item_id: string | null
          webflow_published_on: string | null
          webflow_slug: string | null
          webflow_updated_on: string | null
        }
        Insert: {
          address?: string | null
          archived?: boolean | null
          ballotpedia?: string | null
          bio_long?: string | null
          bio_short?: string | null
          chamber?: string | null
          committee_id?: string | null
          district?: string | null
          draft?: boolean | null
          email?: string | null
          first_name?: string | null
          followthemoney_eid?: number | null
          knowwho_pid?: number | null
          last_name?: string | null
          leadership_title?: string | null
          legiscan_legislation_url?: string | null
          legiscan_rss_url?: string | null
          middle_name?: string | null
          name?: string | null
          nickname?: string | null
          nys_bio_url?: string | null
          opensecrets_id?: string | null
          party?: string | null
          party_id?: number | null
          people_id: number
          phone_capitol?: string | null
          phone_district?: string | null
          photo_url?: string | null
          role?: string | null
          role_id?: number | null
          suffix?: string | null
          votesmart_id?: number | null
          webflow_collection_id?: string | null
          webflow_created_on?: string | null
          webflow_item_id?: string | null
          webflow_published_on?: string | null
          webflow_slug?: string | null
          webflow_updated_on?: string | null
        }
        Update: {
          address?: string | null
          archived?: boolean | null
          ballotpedia?: string | null
          bio_long?: string | null
          bio_short?: string | null
          chamber?: string | null
          committee_id?: string | null
          district?: string | null
          draft?: boolean | null
          email?: string | null
          first_name?: string | null
          followthemoney_eid?: number | null
          knowwho_pid?: number | null
          last_name?: string | null
          leadership_title?: string | null
          legiscan_legislation_url?: string | null
          legiscan_rss_url?: string | null
          middle_name?: string | null
          name?: string | null
          nickname?: string | null
          nys_bio_url?: string | null
          opensecrets_id?: string | null
          party?: string | null
          party_id?: number | null
          people_id?: number
          phone_capitol?: string | null
          phone_district?: string | null
          photo_url?: string | null
          role?: string | null
          role_id?: number | null
          suffix?: string | null
          votesmart_id?: number | null
          webflow_collection_id?: string | null
          webflow_created_on?: string | null
          webflow_item_id?: string | null
          webflow_published_on?: string | null
          webflow_slug?: string | null
          webflow_updated_on?: string | null
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
      problem_chats: {
        Row: {
          chat_session_id: string | null
          created_at: string
          current_state: string
          id: string
          problem_number: string
          problem_statement: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chat_session_id?: string | null
          created_at?: string
          current_state?: string
          id?: string
          problem_number: string
          problem_statement: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chat_session_id?: string | null
          created_at?: string
          current_state?: string
          id?: string
          problem_number?: string
          problem_statement?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_problem_chats_chat_session"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      problem_statements: {
        Row: {
          category: string | null
          created_at: string
          description: string
          id: string
          priority: string | null
          status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description: string
          id?: string
          priority?: string | null
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          priority?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "problem_statements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      problem_votes: {
        Row: {
          created_at: string
          id: string
          problem_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          problem_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          problem_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          role: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      "Roll Call": {
        Row: {
          absent: string | null
          bill_id: number | null
          chamber: string | null
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
      problem_vote_stats: {
        Row: {
          average_rating: number | null
          problem_id: string | null
          total_votes: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_problem_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      increment_visitor_count: {
        Args: Record<PropertyKey, never>
        Returns: number
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
      [_ in never]: never
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
