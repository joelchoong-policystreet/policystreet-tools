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
      companies: {
        Row: {
          created_at: string
          department_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      insurer_billing_data: {
        Row: {
          account_no: string | null
          agent_code: string | null
          project: string | null
          amount_payable: number | null
          chassis: string | null
          class_product: string | null
          client_name: string | null
          cn_no: string | null
          commission: number | null
          company_id: string
          coverage_type: string | null
          created_at: string
          effective_date: string | null
          expiry_date: string | null
          gross_premium: number | null
          gst: number | null
          gst_commission: number | null
          id: string
          insurer: string
          issue_date: string | null
          issued_by: string | null
          jpj_status: string | null
          nett_premium: number | null
          policy_no: string | null
          premium_due: number | null
          premium_due_after_ptv: number | null
          ptv_amount: number | null
          quotation: string | null
          rebate: number | null
          repl_prev_no: string | null
          row_number: string | null
          service_tax: number | null
          stamp: number | null
          status: string | null
          sum_insured: number | null
          total_amount: number | null
          transaction_date: string | null
          transaction_time: string | null
          trx_status: string | null
          type: string | null
          user_id: string | null
          vehicle_no: string | null
          vehicle_type: string | null
        }
        Insert: {
          account_no?: string | null
          agent_code?: string | null
          amount_payable?: number | null
          chassis?: string | null
          class_product?: string | null
          client_name?: string | null
          cn_no?: string | null
          commission?: number | null
          company_id: string
          project?: string | null
          coverage_type?: string | null
          created_at?: string
          effective_date?: string | null
          expiry_date?: string | null
          gross_premium?: number | null
          gst?: number | null
          gst_commission?: number | null
          id?: string
          insurer: string
          issue_date?: string | null
          issued_by?: string | null
          jpj_status?: string | null
          nett_premium?: number | null
          policy_no?: string | null
          premium_due?: number | null
          premium_due_after_ptv?: number | null
          ptv_amount?: number | null
          quotation?: string | null
          rebate?: number | null
          repl_prev_no?: string | null
          row_number?: string | null
          service_tax?: number | null
          stamp?: number | null
          status?: string | null
          sum_insured?: number | null
          total_amount?: number | null
          transaction_date?: string | null
          transaction_time?: string | null
          trx_status?: string | null
          type?: string | null
          user_id?: string | null
          vehicle_no?: string | null
          vehicle_type?: string | null
        }
        Update: {
          account_no?: string | null
          agent_code?: string | null
          amount_payable?: number | null
          chassis?: string | null
          class_product?: string | null
          client_name?: string | null
          cn_no?: string | null
          commission?: number | null
          company_id?: string
          project?: string | null
          coverage_type?: string | null
          created_at?: string
          effective_date?: string | null
          expiry_date?: string | null
          gross_premium?: number | null
          gst?: number | null
          gst_commission?: number | null
          id?: string
          insurer?: string
          issue_date?: string | null
          issued_by?: string | null
          jpj_status?: string | null
          nett_premium?: number | null
          policy_no?: string | null
          premium_due?: number | null
          premium_due_after_ptv?: number | null
          ptv_amount?: number | null
          quotation?: string | null
          rebate?: number | null
          repl_prev_no?: string | null
          row_number?: string | null
          service_tax?: number | null
          stamp?: number | null
          status?: string | null
          sum_insured?: number | null
          total_amount?: number | null
          transaction_date?: string | null
          transaction_time?: string | null
          trx_status?: string | null
          type?: string | null
          user_id?: string | null
          vehicle_no?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurer_billing_data_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      imotorbike_billing_normalised: {
        Row: {
          id: string
          billing_id: string
          company_id: string
          project: string | null
          created_at: string
          updated_at: string
          issue_date: string
          client_name: string | null
          vehicle_no: string | null
          sum_insured: number | null
          total_amount_payable: string | null
          ic: string | null
          contact_no: string | null
          email: string | null
          vehicle_make_model: string | null
          type_of_cover: string | null
          premium: string | null
          ncd: string | null
          total_base_premium: string | null
          total_extra_coverage: string | null
          gross_premium: string | null
          service_tax: string | null
          stamp_duty: string | null
          verification_status: string
        }
        Insert: {
          billing_id: string
          company_id: string
          project?: string | null
          issue_date: string
          client_name?: string | null
          vehicle_no?: string | null
          sum_insured?: number | null
          total_amount_payable?: string | null
          ic?: string | null
          contact_no?: string | null
          email?: string | null
          vehicle_make_model?: string | null
          type_of_cover?: string | null
          premium?: string | null
          ncd?: string | null
          total_base_premium?: string | null
          total_extra_coverage?: string | null
          gross_premium?: string | null
          service_tax?: string | null
          stamp_duty?: string | null
          verification_status?: string
        }
        Update: {
          billing_id?: string
          company_id?: string
          project?: string | null
          issue_date?: string
          client_name?: string | null
          vehicle_no?: string | null
          sum_insured?: number | null
          total_amount_payable?: string | null
          ic?: string | null
          contact_no?: string | null
          email?: string | null
          vehicle_make_model?: string | null
          type_of_cover?: string | null
          premium?: string | null
          ncd?: string | null
          total_base_premium?: string | null
          total_extra_coverage?: string | null
          gross_premium?: string | null
          service_tax?: string | null
          stamp_duty?: string | null
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "imotorbike_billing_normalised_billing_id_fkey"
            columns: ["billing_id"]
            isOneToOne: true
            referencedRelation: "insurer_billing_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imotorbike_billing_normalised_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      issuances: {
        Row: {
          company_id: string
          coverage: string | null
          created_at: string
          customer: string | null
          id: string
          instant_quotation: string | null
          insurer: string | null
          partner: string | null
          plate_no: string | null
          purchased_date: string | null
          time_lapsed: string | null
        }
        Insert: {
          company_id: string
          coverage?: string | null
          created_at?: string
          customer?: string | null
          id?: string
          instant_quotation?: string | null
          insurer?: string | null
          partner?: string | null
          plate_no?: string | null
          purchased_date?: string | null
          time_lapsed?: string | null
        }
        Update: {
          company_id?: string
          coverage?: string | null
          created_at?: string
          customer?: string | null
          id?: string
          instant_quotation?: string | null
          insurer?: string | null
          partner?: string | null
          plate_no?: string | null
          purchased_date?: string | null
          time_lapsed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "issuances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          must_change_password: boolean
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          must_change_password?: boolean
          name?: string
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          must_change_password?: boolean
          name?: string
          status?: string
        }
        Relationships: []
      }
      upload_errors: {
        Row: {
          company_id: string
          created_at: string
          file_name: string | null
          id: string
          raw_data: Json
          rejection_reason: string
          source: string
          workflow: string | null
        }
        Insert: {
          company_id: string
          file_name?: string | null
          raw_data: Json
          rejection_reason: string
          source: string
          workflow?: string | null
        }
        Update: {
          company_id?: string
          file_name?: string | null
          raw_data?: Json
          rejection_reason?: string
          source?: string
          workflow?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upload_errors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
