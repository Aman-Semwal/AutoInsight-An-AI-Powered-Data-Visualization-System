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
      dataset_versions: {
        Row: {
          ai_insights: Json
          column_count: number | null
          columns: Json
          created_at: string
          dataset_id: string
          file_size: number | null
          file_url: string | null
          id: string
          preview_rows: Json
          quality_report: Json
          row_count: number | null
          source_kind: string
          user_id: string
          version_number: number
        }
        Insert: {
          ai_insights?: Json
          column_count?: number | null
          columns?: Json
          created_at?: string
          dataset_id: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          preview_rows?: Json
          quality_report?: Json
          row_count?: number | null
          source_kind?: string
          user_id: string
          version_number: number
        }
        Update: {
          ai_insights?: Json
          column_count?: number | null
          columns?: Json
          created_at?: string
          dataset_id?: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          preview_rows?: Json
          quality_report?: Json
          row_count?: number | null
          source_kind?: string
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "dataset_versions_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      datasets: {
        Row: {
          ai_insights: Json | null
          column_count: number | null
          columns: Json | null
          created_at: string
          current_version_id: string | null
          file_size: number | null
          file_type: string
          file_url: string | null
          id: string
          last_opened_at: string | null
          name: string
          preview_rows: Json
          project_id: string | null
          quality_report: Json
          row_count: number | null
          status: string
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_insights?: Json | null
          column_count?: number | null
          columns?: Json | null
          created_at?: string
          current_version_id?: string | null
          file_size?: number | null
          file_type: string
          file_url?: string | null
          id?: string
          last_opened_at?: string | null
          name: string
          preview_rows?: Json
          project_id?: string | null
          quality_report?: Json
          row_count?: number | null
          status?: string
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_insights?: Json | null
          column_count?: number | null
          columns?: Json | null
          created_at?: string
          current_version_id?: string | null
          file_size?: number | null
          file_type?: string
          file_url?: string | null
          id?: string
          last_opened_at?: string | null
          name?: string
          preview_rows?: Json
          project_id?: string | null
          quality_report?: Json
          row_count?: number | null
          status?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "datasets_current_version_id_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "dataset_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datasets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_activity: {
        Row: {
          activity_label: string
          activity_type: string
          created_at: string
          id: string
          metadata: Json
          project_id: string
          user_id: string
        }
        Insert: {
          activity_label: string
          activity_type: string
          created_at?: string
          id?: string
          metadata?: Json
          project_id: string
          user_id: string
        }
        Update: {
          activity_label?: string
          activity_type?: string
          created_at?: string
          id?: string
          metadata?: Json
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activity_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_collaborators: {
        Row: {
          access_level: string
          collaborator_email: string
          created_at: string
          id: string
          invite_status: string
          owner_user_id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          access_level?: string
          collaborator_email: string
          created_at?: string
          id?: string
          invite_status?: string
          owner_user_id: string
          project_id: string
          updated_at?: string
        }
        Update: {
          access_level?: string
          collaborator_email?: string
          created_at?: string
          id?: string
          invite_status?: string
          owner_user_id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_collaborators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_snapshots: {
        Row: {
          created_at: string
          id: string
          project_id: string
          snapshot_data: Json
          snapshot_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          snapshot_data?: Json
          snapshot_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          snapshot_data?: Json
          snapshot_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          ai_summary: string
          created_at: string
          description: string | null
          id: string
          is_template: boolean
          last_edited_by: string
          last_opened_at: string | null
          name: string
          tags: string[]
          template_category: string
          thumbnail_config: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_summary?: string
          created_at?: string
          description?: string | null
          id?: string
          is_template?: boolean
          last_edited_by?: string
          last_opened_at?: string | null
          name: string
          tags?: string[]
          template_category?: string
          thumbnail_config?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_summary?: string
          created_at?: string
          description?: string | null
          id?: string
          is_template?: boolean
          last_edited_by?: string
          last_opened_at?: string | null
          name?: string
          tags?: string[]
          template_category?: string
          thumbnail_config?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      visualizations: {
        Row: {
          ai_explanation: string | null
          chart_type: string
          config: Json | null
          created_at: string
          dataset_id: string
          id: string
          name: string
          project_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_explanation?: string | null
          chart_type?: string
          config?: Json | null
          created_at?: string
          dataset_id: string
          id?: string
          name: string
          project_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_explanation?: string | null
          chart_type?: string
          config?: Json | null
          created_at?: string
          dataset_id?: string
          id?: string
          name?: string
          project_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visualizations_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visualizations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_project_snapshot: {
        Args: { _project_id: string; _snapshot_name?: string }
        Returns: string
      }
      restore_dataset_version: {
        Args: { _dataset_id: string; _version_id: string }
        Returns: undefined
      }
      restore_project_snapshot: {
        Args: { _snapshot_id: string }
        Returns: string
      }
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
