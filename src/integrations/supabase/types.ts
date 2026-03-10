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
          brand: string | null
          category: string | null
          color: string | null
          cost_mode: string
          cost_price: number | null
          created_at: string
          description: string | null
          frame_size: string | null
          id: string
          name: string
          rim_size: string | null
          sale_price: number | null
          updated_at: string
          visible_on_storefront: boolean
          weight_kg: number | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          color?: string | null
          cost_mode?: string
          cost_price?: number | null
          created_at?: string
          description?: string | null
          frame_size?: string | null
          id?: string
          name: string
          rim_size?: string | null
          sale_price?: number | null
          updated_at?: string
          visible_on_storefront?: boolean
          weight_kg?: number | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          color?: string | null
          cost_mode?: string
          cost_price?: number | null
          created_at?: string
          description?: string | null
          frame_size?: string | null
          id?: string
          name?: string
          rim_size?: string | null
          sale_price?: number | null
          updated_at?: string
          visible_on_storefront?: boolean
          weight_kg?: number | null
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
      parts: {
        Row: {
          category: string | null
          color: string | null
          created_at: string
          frame_size: string | null
          gears: string | null
          hub_style: string | null
          id: string
          material: string | null
          name: string
          notes: string | null
          rim_size: string | null
          sale_price: number | null
          stock_qty: number
          unit_cost: number | null
          updated_at: string
          visible_on_storefront: boolean
          weight_capacity_kg: number | null
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: string
          frame_size?: string | null
          gears?: string | null
          hub_style?: string | null
          id?: string
          material?: string | null
          name: string
          notes?: string | null
          rim_size?: string | null
          sale_price?: number | null
          stock_qty?: number
          unit_cost?: number | null
          updated_at?: string
          visible_on_storefront?: boolean
          weight_capacity_kg?: number | null
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: string
          frame_size?: string | null
          gears?: string | null
          hub_style?: string | null
          id?: string
          material?: string | null
          name?: string
          notes?: string | null
          rim_size?: string | null
          sale_price?: number | null
          stock_qty?: number
          unit_cost?: number | null
          updated_at?: string
          visible_on_storefront?: boolean
          weight_capacity_kg?: number | null
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
