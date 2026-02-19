export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      insurer_billing_data: {
        Row: {
          id: string
          company_id: string
          billing_date: string | null
          reference_number: string | null
          insurer: string | null
          amount: string | null
          policy_number: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          billing_date?: string | null
          reference_number?: string | null
          insurer?: string | null
          amount?: string | null
          policy_number?: string | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          billing_date?: string | null
          reference_number?: string | null
          insurer?: string | null
          amount?: string | null
          policy_number?: string | null
          description?: string | null
          created_at?: string
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
      ocr_data_table: {
        Row: {
          id: string
          company_id: string
          project: string | null
          created_at: string
          date_issue: string | null
          vehicle_no: string | null
          insured_name: string | null
          insured_ic_no: string | null
          insurer_contact_no: string | null
          insured_email: string | null
          vehicle_make_model: string | null
          type_of_cover: string | null
          sum_insured: string | null
          premium: string | null
          ncd: string | null
          total_base_premium: string | null
          total_extra_coverage: string | null
          gross_premium: string | null
          service_tax: string | null
          stamp_duty: string | null
          total_amount_payable_rounded: string | null
          insurer: string | null
          file_name: string | null
          created_timestamp: string | null
          formatted_timestamp: string | null
          process_duration: string | null
        }
        Insert: {
          company_id: string
          project?: string | null
          date_issue?: string | null
          vehicle_no?: string | null
          insured_name?: string | null
          insured_ic_no?: string | null
          insurer_contact_no?: string | null
          insured_email?: string | null
          vehicle_make_model?: string | null
          type_of_cover?: string | null
          sum_insured?: string | null
          premium?: string | null
          ncd?: string | null
          total_base_premium?: string | null
          total_extra_coverage?: string | null
          gross_premium?: string | null
          service_tax?: string | null
          stamp_duty?: string | null
          total_amount_payable_rounded?: string | null
          insurer?: string | null
          file_name?: string | null
          created_timestamp?: string | null
          formatted_timestamp?: string | null
          process_duration?: string | null
        }
        Update: {
          company_id?: string
          project?: string | null
          date_issue?: string | null
          vehicle_no?: string | null
          insured_name?: string | null
          insured_ic_no?: string | null
          insurer_contact_no?: string | null
          insured_email?: string | null
          vehicle_make_model?: string | null
          type_of_cover?: string | null
          sum_insured?: string | null
          premium?: string | null
          ncd?: string | null
          total_base_premium?: string | null
          total_extra_coverage?: string | null
          gross_premium?: string | null
          service_tax?: string | null
          stamp_duty?: string | null
          total_amount_payable_rounded?: string | null
          insurer?: string | null
          file_name?: string | null
          created_timestamp?: string | null
          formatted_timestamp?: string | null
          process_duration?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ocr_data_table_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          status: string
          must_change_password: boolean
          created_at: string
        }
        Insert: {
          id: string
          name?: string
          email: string
          status?: string
          must_change_password?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          status?: string
          must_change_password?: boolean
          created_at?: string
        }
        Relationships: []
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
