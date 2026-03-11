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
      bike_model_parts: {
        Row: {
          bike_model_id: string
          id: string
          notes: string | null
          part_id: string | null
          part_name_override: string | null
          quantity: number
          sort_order: number
          unit_cost: number | null
        }
        Insert: {
          bike_model_id: string
          id?: string
          notes?: string | null
          part_id?: string | null
          part_name_override?: string | null
          quantity?: number
          sort_order?: number
          unit_cost?: number | null
        }
        Update: {
          bike_model_id?: string
          id?: string
          notes?: string | null
          part_id?: string | null
          part_name_override?: string | null
          quantity?: number
          sort_order?: number
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bike_model_parts_bike_model_id_fkey"
            columns: ["bike_model_id"]
            isOneToOne: false
            referencedRelation: "bike_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bike_model_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      bike_models: {
        Row: {
          alert_stock: number
          brand: string | null
          category: string | null
          color: string | null
          cost_mode: string
          cost_price: number | null
          created_at: string
          description: string | null
          frame_size: string | null
          id: string
          images: string[] | null
          installment_count: number | null
          installment_price: number | null
          name: string
          pix_price: number | null
          rim_size: string | null
          sale_price: number | null
          sku: string | null
          stock_qty: number
          updated_at: string
          visible_on_storefront: boolean
          weight_kg: number | null
        }
        Insert: {
          alert_stock?: number
          brand?: string | null
          category?: string | null
          color?: string | null
          cost_mode?: string
          cost_price?: number | null
          created_at?: string
          description?: string | null
          frame_size?: string | null
          id?: string
          images?: string[] | null
          installment_count?: number | null
          installment_price?: number | null
          name: string
          pix_price?: number | null
          rim_size?: string | null
          sale_price?: number | null
          sku?: string | null
          stock_qty?: number
          updated_at?: string
          visible_on_storefront?: boolean
          weight_kg?: number | null
        }
        Update: {
          alert_stock?: number
          brand?: string | null
          category?: string | null
          color?: string | null
          cost_mode?: string
          cost_price?: number | null
          created_at?: string
          description?: string | null
          frame_size?: string | null
          id?: string
          images?: string[] | null
          installment_count?: number | null
          installment_price?: number | null
          name?: string
          pix_price?: number | null
          rim_size?: string | null
          sale_price?: number | null
          sku?: string | null
          stock_qty?: number
          updated_at?: string
          visible_on_storefront?: boolean
          weight_kg?: number | null
        }
        Relationships: []
      }
      cash_register_sales: {
        Row: {
          amount: number
          cash_register_id: string
          created_at: string
          id: string
          sale_id: string
        }
        Insert: {
          amount?: number
          cash_register_id: string
          created_at?: string
          id?: string
          sale_id: string
        }
        Update: {
          amount?: number
          cash_register_id?: string
          created_at?: string
          id?: string
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_register_sales_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_register_sales_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closing_amount: number | null
          difference: number | null
          expected_amount: number | null
          id: string
          opened_at: string
          opened_by: string | null
          opening_amount: number
          status: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closing_amount?: number | null
          difference?: number | null
          expected_amount?: number | null
          id?: string
          opened_at?: string
          opened_by?: string | null
          opening_amount?: number
          status?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closing_amount?: number | null
          difference?: number | null
          expected_amount?: number | null
          id?: string
          opened_at?: string
          opened_by?: string | null
          opening_amount?: number
          status?: string
        }
        Relationships: []
      }
      categories: {
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
      customers: {
        Row: {
          cpf: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          cpf?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      fixed_expenses: {
        Row: {
          active: boolean
          amount: number
          created_at: string
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount?: number
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount?: number
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      mechanic_job_additions: {
        Row: {
          approval: string
          created_at: string
          id: string
          job_id: string
          price: number
          problem: string
        }
        Insert: {
          approval?: string
          created_at?: string
          id?: string
          job_id: string
          price?: number
          problem: string
        }
        Update: {
          approval?: string
          created_at?: string
          id?: string
          job_id?: string
          price?: number
          problem?: string
        }
        Relationships: [
          {
            foreignKeyName: "mechanic_job_additions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "mechanic_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      mechanic_jobs: {
        Row: {
          bike_name: string | null
          created_at: string
          customer_cpf: string | null
          customer_name: string | null
          customer_whatsapp: string | null
          id: string
          price: number
          problem: string
          status: string
          updated_at: string
        }
        Insert: {
          bike_name?: string | null
          created_at?: string
          customer_cpf?: string | null
          customer_name?: string | null
          customer_whatsapp?: string | null
          id?: string
          price?: number
          problem: string
          status?: string
          updated_at?: string
        }
        Update: {
          bike_name?: string | null
          created_at?: string
          customer_cpf?: string | null
          customer_name?: string | null
          customer_whatsapp?: string | null
          id?: string
          price?: number
          problem?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      module_permissions: {
        Row: {
          can_access: boolean
          created_at: string
          hide_sensitive: boolean
          id: string
          module: Database["public"]["Enums"]["app_module"]
          tenant_member_id: string
          updated_at: string
        }
        Insert: {
          can_access?: boolean
          created_at?: string
          hide_sensitive?: boolean
          id?: string
          module: Database["public"]["Enums"]["app_module"]
          tenant_member_id: string
          updated_at?: string
        }
        Update: {
          can_access?: boolean
          created_at?: string
          hide_sensitive?: boolean
          id?: string
          module?: Database["public"]["Enums"]["app_module"]
          tenant_member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_permissions_tenant_member_id_fkey"
            columns: ["tenant_member_id"]
            isOneToOne: false
            referencedRelation: "tenant_members"
            referencedColumns: ["id"]
          },
        ]
      }
      parts: {
        Row: {
          alert_stock: number
          category: string | null
          color: string | null
          created_at: string
          frame_size: string | null
          gears: string | null
          hub_style: string | null
          id: string
          images: string[] | null
          installment_count: number | null
          installment_price: number | null
          material: string | null
          name: string
          notes: string | null
          pix_price: number | null
          rim_size: string | null
          sale_price: number | null
          sku: string | null
          stock_qty: number
          unit_cost: number | null
          updated_at: string
          visible_on_storefront: boolean
          weight_capacity_kg: number | null
        }
        Insert: {
          alert_stock?: number
          category?: string | null
          color?: string | null
          created_at?: string
          frame_size?: string | null
          gears?: string | null
          hub_style?: string | null
          id?: string
          images?: string[] | null
          installment_count?: number | null
          installment_price?: number | null
          material?: string | null
          name: string
          notes?: string | null
          pix_price?: number | null
          rim_size?: string | null
          sale_price?: number | null
          sku?: string | null
          stock_qty?: number
          unit_cost?: number | null
          updated_at?: string
          visible_on_storefront?: boolean
          weight_capacity_kg?: number | null
        }
        Update: {
          alert_stock?: number
          category?: string | null
          color?: string | null
          created_at?: string
          frame_size?: string | null
          gears?: string | null
          hub_style?: string | null
          id?: string
          images?: string[] | null
          installment_count?: number | null
          installment_price?: number | null
          material?: string | null
          name?: string
          notes?: string | null
          pix_price?: number | null
          rim_size?: string | null
          sale_price?: number | null
          sku?: string | null
          stock_qty?: number
          unit_cost?: number | null
          updated_at?: string
          visible_on_storefront?: boolean
          weight_capacity_kg?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          bike_model_id: string | null
          description: string
          id: string
          part_id: string | null
          quantity: number
          sale_id: string
          unit_price: number
        }
        Insert: {
          bike_model_id?: string | null
          description: string
          id?: string
          part_id?: string | null
          quantity?: number
          sale_id: string
          unit_price?: number
        }
        Update: {
          bike_model_id?: string | null
          description?: string
          id?: string
          part_id?: string | null
          quantity?: number
          sale_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_bike_model_id_fkey"
            columns: ["bike_model_id"]
            isOneToOne: false
            referencedRelation: "bike_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          card_fee: number | null
          card_tax_percent: number | null
          created_at: string
          customer_id: string | null
          id: string
          notes: string | null
          payment_method: string | null
          total: number
        }
        Insert: {
          card_fee?: number | null
          card_tax_percent?: number | null
          created_at?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          total?: number
        }
        Update: {
          card_fee?: number | null
          card_tax_percent?: number | null
          created_at?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      tenant_members: {
        Row: {
          created_at: string
          email: string | null
          id: string
          role: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      variable_expenses: {
        Row: {
          amount: number
          created_at: string
          expense_date: string
          id: string
          name: string
          notes: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          expense_date?: string
          id?: string
          name: string
          notes?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          expense_date?: string
          id?: string
          name?: string
          notes?: string | null
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          contact_name: string | null
          contact_phone: string
          contact_photo: string | null
          created_at: string
          id: string
          last_message: string | null
          last_message_at: string | null
          status: string
          unread_count: number | null
        }
        Insert: {
          contact_name?: string | null
          contact_phone: string
          contact_photo?: string | null
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          status?: string
          unread_count?: number | null
        }
        Update: {
          contact_name?: string | null
          contact_phone?: string
          contact_photo?: string | null
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          status?: string
          unread_count?: number | null
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          from_me: boolean
          id: string
          media_url: string | null
          message_id: string | null
          status: string | null
          type: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          from_me?: boolean
          id?: string
          media_url?: string | null
          message_id?: string | null
          status?: string | null
          type?: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          from_me?: boolean
          id?: string
          media_url?: string | null
          message_id?: string | null
          status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      get_user_tenant_member_id: { Args: { _user_id: string }; Returns: string }
      has_module_access: {
        Args: {
          _module: Database["public"]["Enums"]["app_module"]
          _user_id: string
        }
        Returns: boolean
      }
      is_tenant_owner: { Args: { _user_id: string }; Returns: boolean }
      should_hide_sensitive: {
        Args: {
          _module: Database["public"]["Enums"]["app_module"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_module:
        | "dashboard"
        | "dre"
        | "produtos"
        | "bikes"
        | "estoque"
        | "pdv"
        | "caixa"
        | "historico"
        | "mecanica"
        | "gastos"
        | "clientes"
        | "whatsapp"
        | "configuracoes"
      tenant_role: "owner" | "member"
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
      app_module: [
        "dashboard",
        "dre",
        "produtos",
        "bikes",
        "estoque",
        "pdv",
        "caixa",
        "historico",
        "mecanica",
        "gastos",
        "clientes",
        "whatsapp",
        "configuracoes",
      ],
      tenant_role: ["owner", "member"],
    },
  },
} as const
