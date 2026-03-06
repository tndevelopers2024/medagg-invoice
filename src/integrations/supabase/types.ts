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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: string
          ip_address: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: string
          ip_address?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          ip_address?: string | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      hospitals: {
        Row: {
          address: string
          city: string
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          diagnostic_share: number
          id: string
          ip_share: number
          mou_end_date: string | null
          mou_file_url: string | null
          mou_start_date: string | null
          name: string
          op_share: number
          pin_code: string
          state: string
          status: string
          updated_at: string
        }
        Insert: {
          address: string
          city: string
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          diagnostic_share?: number
          id?: string
          ip_share?: number
          mou_end_date?: string | null
          mou_file_url?: string | null
          mou_start_date?: string | null
          name: string
          op_share?: number
          pin_code: string
          state: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          diagnostic_share?: number
          id?: string
          ip_share?: number
          mou_end_date?: string | null
          mou_file_url?: string | null
          mou_start_date?: string | null
          name?: string
          op_share?: number
          pin_code?: string
          state?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          bill_amount: number
          created_at: string
          id: string
          invoice_id: string
          patient_id: string
          patient_name: string
          service_type: string
          share_amount: number
          share_percent: number
        }
        Insert: {
          bill_amount?: number
          created_at?: string
          id?: string
          invoice_id: string
          patient_id: string
          patient_name: string
          service_type: string
          share_amount?: number
          share_percent?: number
        }
        Update: {
          bill_amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          patient_id?: string
          patient_name?: string
          service_type?: string
          share_amount?: number
          share_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          adjustment_amount: number
          balance_amount: number
          created_at: string
          created_by: string | null
          hospital_id: string
          id: string
          invoice_date: string
          invoice_number: string
          paid_amount: number
          status: string
          tds_amount: number
          tds_percent: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          adjustment_amount?: number
          balance_amount?: number
          created_at?: string
          created_by?: string | null
          hospital_id: string
          id?: string
          invoice_date?: string
          invoice_number: string
          paid_amount?: number
          status?: string
          tds_amount?: number
          tds_percent?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          adjustment_amount?: number
          balance_amount?: number
          created_at?: string
          created_by?: string | null
          hospital_id?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          paid_amount?: number
          status?: string
          tds_amount?: number
          tds_percent?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      page_permissions: {
        Row: {
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          page_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          page_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          page_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          bd_name: string | null
          bill_amount: number
          created_at: string
          created_by: string | null
          doctor_name: string | null
          hospital_id: string
          id: string
          invoice_status: string
          name: string
          patient_date: string
          phone: string | null
          service_type: string
          share_amount: number
          share_percent: number
          source_type: string
          updated_at: string
        }
        Insert: {
          bd_name?: string | null
          bill_amount?: number
          created_at?: string
          created_by?: string | null
          doctor_name?: string | null
          hospital_id: string
          id?: string
          invoice_status?: string
          name: string
          patient_date?: string
          phone?: string | null
          service_type: string
          share_amount?: number
          share_percent?: number
          source_type?: string
          updated_at?: string
        }
        Update: {
          bd_name?: string | null
          bill_amount?: number
          created_at?: string
          created_by?: string | null
          doctor_name?: string | null
          hospital_id?: string
          id?: string
          invoice_status?: string
          name?: string
          patient_date?: string
          phone?: string | null
          service_type?: string
          share_amount?: number
          share_percent?: number
          source_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          adjustment_amount: number
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string
          paid_amount: number
          payment_date: string
          remarks: string | null
          tds_amount: number
          tds_percent: number
        }
        Insert: {
          adjustment_amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id: string
          paid_amount?: number
          payment_date?: string
          remarks?: string | null
          tds_amount?: number
          tds_percent?: number
        }
        Update: {
          adjustment_amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string
          paid_amount?: number
          payment_date?: string
          remarks?: string | null
          tds_amount?: number
          tds_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_status: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_status"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_website_head: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "website_head" | "user"
      user_status: "pending" | "active" | "inactive"
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
      app_role: ["website_head", "user"],
      user_status: ["pending", "active", "inactive"],
    },
  },
} as const
