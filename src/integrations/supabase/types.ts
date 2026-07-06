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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      apartments: {
        Row: {
          active_from: string | null
          address: string | null
          color: string
          created_at: string
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          active_from?: string | null
          address?: string | null
          color?: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          active_from?: string | null
          address?: string | null
          color?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ical_sources: {
        Row: {
          apartment_id: string
          created_at: string
          enabled: boolean
          id: string
          label: string | null
          last_sync_message: string | null
          last_sync_status: string | null
          last_synced_at: string | null
          platform: string
          updated_at: string
          url: string
        }
        Insert: {
          apartment_id: string
          created_at?: string
          enabled?: boolean
          id?: string
          label?: string | null
          last_sync_message?: string | null
          last_sync_status?: string | null
          last_synced_at?: string | null
          platform?: string
          updated_at?: string
          url: string
        }
        Update: {
          apartment_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          label?: string | null
          last_sync_message?: string | null
          last_sync_status?: string | null
          last_synced_at?: string | null
          platform?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "ical_sources_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          read_by: string[]
          related_apartment_id: string | null
          related_reservation_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          read_by?: string[]
          related_apartment_id?: string | null
          related_reservation_id?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          read_by?: string[]
          related_apartment_id?: string | null
          related_reservation_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_apartment_id_fkey"
            columns: ["related_apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_reservation_id_fkey"
            columns: ["related_reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          admin_percentage: number
          amount_ars: number | null
          amount_usd: number | null
          apartment_id: string
          booking_commission_ars: number | null
          booking_commission_usd: number | null
          check_in: string
          check_out: string
          cleaning_fee_ars: number | null
          created_at: string
          created_by: string | null
          currency: string
          exchange_rate: number | null
          guest_name: string | null
          ical_source_id: string | null
          ical_uid: string | null
          id: string
          nights: number | null
          notes: string | null
          platform: string
          separated: boolean
          source: string
          status: string
          supplies_cost_ars: number | null
          supplies_description: string | null
          updated_at: string
        }
        Insert: {
          admin_percentage?: number
          amount_ars?: number | null
          amount_usd?: number | null
          apartment_id: string
          booking_commission_ars?: number | null
          booking_commission_usd?: number | null
          check_in: string
          check_out: string
          cleaning_fee_ars?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          exchange_rate?: number | null
          guest_name?: string | null
          ical_source_id?: string | null
          ical_uid?: string | null
          id?: string
          nights?: number | null
          notes?: string | null
          platform?: string
          separated?: boolean
          source?: string
          status?: string
          supplies_cost_ars?: number | null
          supplies_description?: string | null
          updated_at?: string
        }
        Update: {
          admin_percentage?: number
          amount_ars?: number | null
          amount_usd?: number | null
          apartment_id?: string
          booking_commission_ars?: number | null
          booking_commission_usd?: number | null
          check_in?: string
          check_out?: string
          cleaning_fee_ars?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          exchange_rate?: number | null
          guest_name?: string | null
          ical_source_id?: string | null
          ical_uid?: string | null
          id?: string
          nights?: number | null
          notes?: string | null
          platform?: string
          separated?: boolean
          source?: string
          status?: string
          supplies_cost_ars?: number | null
          supplies_description?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_ical_source_fk"
            columns: ["ical_source_id"]
            isOneToOne: false
            referencedRelation: "ical_sources"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
