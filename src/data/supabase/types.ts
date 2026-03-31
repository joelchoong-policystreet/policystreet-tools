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
      audit_logs: {
        Row: {
          change: string
          event_type: string
          id: string
          item_affected: string
          time: string
          user_name: string
        }
        Insert: {
          change: string
          event_type: string
          id?: string
          item_affected: string
          time?: string
          user_name: string
        }
        Update: {
          change?: string
          event_type?: string
          id?: string
          item_affected?: string
          time?: string
          user_name?: string
        }
        Relationships: []
      }
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
      imotorbike_billing_field_history: {
        Row: {
          changed_at: string
          changed_by: string
          field_name: string
          id: string
          new_value: string | null
          normalised_id: string
          old_value: string | null
        }
        Insert: {
          changed_at?: string
          changed_by: string
          field_name: string
          id?: string
          new_value?: string | null
          normalised_id: string
          old_value?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string
          field_name?: string
          id?: string
          new_value?: string | null
          normalised_id?: string
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imotorbike_billing_field_history_normalised_id_fkey"
            columns: ["normalised_id"]
            isOneToOne: false
            referencedRelation: "imotorbike_billing_normalised"
            referencedColumns: ["id"]
          },
        ]
      }
      imotorbike_billing_normalised: {
        Row: {
          billing_id: string
          client_name: string | null
          company_id: string
          contact_no: string | null
          created_at: string
          email: string | null
          gross_premium: string | null
          ic: string | null
          id: string
          insurer: string
          issue_date: string
          issue_year: number | null
          ncd: string | null
          premium: string | null
          project: string | null
          service_tax: string | null
          stamp_duty: string | null
          sum_insured: number | null
          total_amount_payable: string | null
          total_base_premium: string | null
          total_extra_coverage: string | null
          type_of_cover: string | null
          updated_at: string
          vehicle_make_model: string | null
          vehicle_no: string | null
          verification_status: string
        }
        Insert: {
          billing_id: string
          client_name?: string | null
          company_id: string
          contact_no?: string | null
          created_at?: string
          email?: string | null
          gross_premium?: string | null
          ic?: string | null
          id?: string
          insurer: string
          issue_date: string
          issue_year?: number | null
          ncd?: string | null
          premium?: string | null
          project?: string | null
          service_tax?: string | null
          stamp_duty?: string | null
          sum_insured?: number | null
          total_amount_payable?: string | null
          total_base_premium?: string | null
          total_extra_coverage?: string | null
          type_of_cover?: string | null
          updated_at?: string
          vehicle_make_model?: string | null
          vehicle_no?: string | null
          verification_status?: string
        }
        Update: {
          billing_id?: string
          client_name?: string | null
          company_id?: string
          contact_no?: string | null
          created_at?: string
          email?: string | null
          gross_premium?: string | null
          ic?: string | null
          id?: string
          insurer?: string
          issue_date?: string
          issue_year?: number | null
          ncd?: string | null
          premium?: string | null
          project?: string | null
          service_tax?: string | null
          stamp_duty?: string | null
          sum_insured?: number | null
          total_amount_payable?: string | null
          total_base_premium?: string | null
          total_extra_coverage?: string | null
          type_of_cover?: string | null
          updated_at?: string
          vehicle_make_model?: string | null
          vehicle_no?: string | null
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "imotorbike_billing_normalised_billing_id_fkey"
            columns: ["billing_id"]
            isOneToOne: false
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
      insurer_billing_data: {
        Row: {
          account_no: string | null
          agent_code: string | null
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
          project: string | null
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
          project?: string | null
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
          project?: string | null
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
      milestone_task_checklist_items: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          label: string
          task_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          label: string
          task_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          label?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_task_checklist_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "milestone_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          milestone_id: string
          title: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          milestone_id: string
          title: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          milestone_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_updates: {
        Row: {
          author_name: string
          created_at: string
          id: string
          message: string
          milestone_id: string
        }
        Insert: {
          author_name: string
          created_at?: string
          id: string
          message: string
          milestone_id: string
        }
        Update: {
          author_name?: string
          created_at?: string
          id?: string
          message?: string
          milestone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_updates_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_tags: {
        Row: {
          id: string
          milestone_id: string
          tag: string
        }
        Insert: {
          id: string
          milestone_id: string
          tag: string
        }
        Update: {
          id?: string
          milestone_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_tags_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          department: string
          description: string
          driver: string
          due_date: string | null
          id: string
          link: string | null
          quarter: string
          status: string
          /** Legacy mirror; canonical tags live in `milestone_tags`. */
          tags?: string[]
          tier: string
          title: string
          user_id: string
          year: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          department: string
          description: string
          driver: string
          due_date?: string | null
          id?: string
          link?: string | null
          quarter: string
          status: string
          tags?: string[]
          tier: string
          title: string
          user_id: string
          year: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          department?: string
          description?: string
          driver?: string
          due_date?: string | null
          id?: string
          link?: string | null
          quarter?: string
          status?: string
          tags?: string[]
          tier?: string
          title?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      ocr_data_table: {
        Row: {
          company_id: string
          created_at: string
          created_timestamp: string | null
          date_issue: string | null
          date_issue_clean: string | null
          file_name: string | null
          formatted_timestamp: string | null
          gross_premium: string | null
          id: string
          insured_email: string | null
          insured_ic_no: string | null
          insured_name: string | null
          insurer: string
          insurer_contact_no: string | null
          ncd: string | null
          premium: string | null
          process_duration: string | null
          project: string | null
          service_tax: string | null
          stamp_duty: string | null
          sum_insured: string | null
          total_amount_payable_rounded: string | null
          total_base_premium: string | null
          total_extra_coverage: string | null
          type_of_cover: string | null
          vehicle_make_model: string | null
          vehicle_no: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_timestamp?: string | null
          date_issue?: string | null
          date_issue_clean?: string | null
          file_name?: string | null
          formatted_timestamp?: string | null
          gross_premium?: string | null
          id?: string
          insured_email?: string | null
          insured_ic_no?: string | null
          insured_name?: string | null
          insurer: string
          insurer_contact_no?: string | null
          ncd?: string | null
          premium?: string | null
          process_duration?: string | null
          project?: string | null
          service_tax?: string | null
          stamp_duty?: string | null
          sum_insured?: string | null
          total_amount_payable_rounded?: string | null
          total_base_premium?: string | null
          total_extra_coverage?: string | null
          type_of_cover?: string | null
          vehicle_make_model?: string | null
          vehicle_no?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_timestamp?: string | null
          date_issue?: string | null
          date_issue_clean?: string | null
          file_name?: string | null
          formatted_timestamp?: string | null
          gross_premium?: string | null
          id?: string
          insured_email?: string | null
          insured_ic_no?: string | null
          insured_name?: string | null
          insurer?: string
          insurer_contact_no?: string | null
          ncd?: string | null
          premium?: string | null
          process_duration?: string | null
          project?: string | null
          service_tax?: string | null
          stamp_duty?: string | null
          sum_insured?: string | null
          total_amount_payable_rounded?: string | null
          total_base_premium?: string | null
          total_extra_coverage?: string | null
          type_of_cover?: string | null
          vehicle_make_model?: string | null
          vehicle_no?: string | null
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
          created_at?: string
          file_name?: string | null
          id?: string
          raw_data: Json
          rejection_reason: string
          source: string
          workflow?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          file_name?: string | null
          id?: string
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
      norm_text: { Args: { v: string }; Returns: string }
      norm_vehicle: { Args: { v: string }; Returns: string }
      parse_ocr_date_to_iso: { Args: { d: string }; Returns: string }
      projects_match_imotorbike: {
        Args: { a: string; b: string }
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
