export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/**
 * Typed Supabase schema matching supabase/migrations/20260911000000_init.sql.
 * Regenerate with: `supabase gen types typescript --project-id <ref> --schema public > src/types/database.ts`
 */

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string;
          avatar_url: string | null;
          role: "user" | "admin";
          is_blocked: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          name?: string;
          email?: string;
          phone?: string;
          avatar_url?: string | null;
          role?: "user" | "admin";
          is_blocked?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string;
          avatar_url?: string | null;
          role?: "user" | "admin";
          is_blocked?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      site_settings: {
        Row: {
          key: string;
          value: string | null;
          default_value: string | null;
          label: string;
          group: string;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value?: string | null;
          default_value?: string | null;
          label?: string;
          group?: string;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          value?: string | null;
          default_value?: string | null;
          label?: string;
          group?: string;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      admin_audit_log: {
        Row: {
          id: string;
          admin_email: string;
          action: string;
          target: string | null;
          details: unknown | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_email: string;
          action: string;
          target?: string | null;
          details?: unknown | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      admin_deployments: {
        Row: {
          id: string;
          deployment_id: string;
          status: string;
          url: string | null;
          inspector_url: string | null;
          error_message: string | null;
          triggered_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          deployment_id?: string;
          status?: string;
          url?: string | null;
          inspector_url?: string | null;
          error_message?: string | null;
          triggered_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: string;
          url?: string | null;
          inspector_url?: string | null;
          error_message?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      localities: {
        Row: {
          id: string;
          city: string;
          locality: string;
          created_at: string;
        };
        Insert: { id?: string; city?: string; locality?: string; created_at?: string };
        Update: { id?: string; city?: string; locality?: string; created_at?: string };
        Relationships: [];
      };
      locations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          state: string;
          country: string;
          type: "city" | "town" | "area";
          parent_slug: string | null;
          nearby: string[];
          areas: string[];
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          state?: string;
          country?: string;
          type?: "city" | "town" | "area";
          parent_slug?: string | null;
          nearby?: string[];
          areas?: string[];
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          state?: string;
          country?: string;
          type?: "city" | "town" | "area";
          parent_slug?: string | null;
          nearby?: string[];
          areas?: string[];
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          id: string;
          owner_id: string;
          slug: string | null;
          title: string;
          description: string;
          purpose: "rent" | "sale";
          property_type:
            | "room"
            | "pg"
            | "1 bhk"
            | "2 bhk"
            | "3 bhk"
            | "flat"
            | "house"
            | "shop"
            | "office"
            | "plot"
            | "other";
          city: string;
          locality: string;
          address: string;
          pincode: string;
          latitude: number | null;
          longitude: number | null;
          price: number;
          rent_period: "monthly" | "quarterly" | "half_yearly" | "yearly" | "one_time";
          security_deposit: number | null;
          bhk: number | null;
          bathrooms: number | null;
          furnishing: "fully_furnished" | "semi_furnished" | "unfurnished";
          area_sqft: number | null;
          available_from: string | null;
          status: "pending" | "approved" | "rejected" | "rented" | "sold";
          is_verified: boolean;
          is_featured: boolean;
          featured_until: string | null;
          amenities: string[];
          views: number;
          view_count: number;
          contact_reveal_count: number;
          is_demo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          slug?: string | null;
          title: string;
          description?: string;
          purpose: "rent" | "sale";
          property_type: Database["public"]["Tables"]["properties"]["Row"]["property_type"];
          city: string;
          locality?: string;
          address?: string;
          pincode?: string;
          latitude?: number | null;
          longitude?: number | null;
          price: number;
          rent_period?: Database["public"]["Tables"]["properties"]["Row"]["rent_period"];
          security_deposit?: number | null;
          bhk?: number | null;
          bathrooms?: number | null;
          furnishing?: Database["public"]["Tables"]["properties"]["Row"]["furnishing"];
          area_sqft?: number | null;
          available_from?: string | null;
          status?: Database["public"]["Tables"]["properties"]["Row"]["status"];
          is_verified?: boolean;
          is_featured?: boolean;
          featured_until?: string | null;
          amenities?: string[];
          views?: number;
          view_count?: number;
          contact_reveal_count?: number;
          is_demo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          slug?: string | null;
          title?: string;
          description?: string;
          purpose?: "rent" | "sale";
          property_type?: Database["public"]["Tables"]["properties"]["Row"]["property_type"];
          city?: string;
          locality?: string;
          address?: string;
          pincode?: string;
          latitude?: number | null;
          longitude?: number | null;
          price?: number;
          rent_period?: Database["public"]["Tables"]["properties"]["Row"]["rent_period"];
          security_deposit?: number | null;
          bhk?: number | null;
          bathrooms?: number | null;
          furnishing?: Database["public"]["Tables"]["properties"]["Row"]["furnishing"];
          area_sqft?: number | null;
          available_from?: string | null;
          status?: Database["public"]["Tables"]["properties"]["Row"]["status"];
          is_verified?: boolean;
          is_featured?: boolean;
          featured_until?: string | null;
          amenities?: string[];
          views?: number;
          view_count?: number;
          contact_reveal_count?: number;
          is_demo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "properties_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      property_images: {
        Row: {
          id: string;
          property_id: string;
          image_url: string;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          image_url: string;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          image_url?: string;
          display_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          }
        ];
      };
      favorites: {
        Row: { id: string; user_id: string; property_id: string; created_at: string };
        Insert: { id?: string; user_id: string; property_id: string; created_at?: string };
        Update: { id?: string; user_id?: string; property_id?: string; created_at?: string };
        Relationships: [
          {
            foreignKeyName: "favorites_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favorites_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          }
        ];
      };
      reports: {
        Row: {
          id: string;
          property_id: string;
          reported_by: string;
          reason: string;
          status: "open" | "resolved" | "dismissed";
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          reported_by: string;
          reason: string;
          status?: "open" | "resolved" | "dismissed";
          created_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          reported_by?: string;
          reason?: string;
          status?: "open" | "resolved" | "dismissed";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reported_by_fkey";
            columns: ["reported_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      requirements: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          city: string;
          locality: string;
          property_type: string;
          purpose: "rent" | "sale";
          budget_min: number | null;
          budget_max: number | null;
          bhk: string;
          description: string;
          contact_preference: "call" | "whatsapp" | "both";
          status: "open" | "closed";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          city: string;
          locality?: string;
          property_type: string;
          purpose: "rent" | "sale";
          budget_min?: number | null;
          budget_max?: number | null;
          bhk?: string;
          description?: string;
          contact_preference?: "call" | "whatsapp" | "both";
          status?: "open" | "closed";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          city?: string;
          locality?: string;
          property_type?: string;
          purpose?: "rent" | "sale";
          budget_min?: number | null;
          budget_max?: number | null;
          bhk?: string;
          description?: string;
          contact_preference?: "call" | "whatsapp" | "both";
          status?: "open" | "closed";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "requirements_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      contact_requests: {
        Row: {
          id: string;
          property_id: string | null;
          requirement_id: string | null;
          name: string;
          phone: string;
          message: string;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id?: string | null;
          requirement_id?: string | null;
          name?: string;
          phone?: string;
          message?: string;
          source?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string | null;
          requirement_id?: string | null;
          name?: string;
          phone?: string;
          message?: string;
          source?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contact_requests_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contact_requests_requirement_id_fkey";
            columns: ["requirement_id"];
            isOneToOne: false;
            referencedRelation: "requirements";
            referencedColumns: ["id"];
          }
        ];
      };
      property_views: {
        Row: {
          id: string;
          property_id: string;
          viewer_id: string | null;
          visitor_hash: string;
          device_type: "mobile" | "tablet" | "desktop";
          viewed_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          viewer_id?: string | null;
          visitor_hash: string;
          device_type?: "mobile" | "tablet" | "desktop";
          viewed_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          viewer_id?: string | null;
          visitor_hash?: string;
          device_type?: "mobile" | "tablet" | "desktop";
          viewed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "property_views_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "property_views_viewer_id_fkey";
            columns: ["viewer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      contact_reveals: {
        Row: {
          id: string;
          property_id: string;
          customer_id: string;
          amount_paid: number;
          payment_id: string | null;
          revealed_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          customer_id: string;
          amount_paid?: number;
          payment_id?: string | null;
          revealed_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          customer_id?: string;
          amount_paid?: number;
          payment_id?: string | null;
          revealed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contact_reveals_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contact_reveals_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      payments: {
        Row: {
          id: string;
          user_id: string;
          property_id: string | null;
          type: "contact_reveal" | "featured_listing";
          amount: number;
          status: "pending" | "completed" | "failed";
          razorpay_order_id: string | null;
          razorpay_payment_id: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          property_id?: string | null;
          type: "contact_reveal" | "featured_listing";
          amount: number;
          status?: "pending" | "completed" | "failed";
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          property_id?: string | null;
          type?: "contact_reveal" | "featured_listing";
          amount?: number;
          status?: "pending" | "completed" | "failed";
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      public_owners: {
        Row: { id: string; name: string; avatar_url: string | null };
        Relationships: [];
      };
      properties_listing: {
        Row: {
          id: string;
          owner_id: string;
          slug: string | null;
          title: string;
          description: string;
          purpose: "rent" | "sale";
          property_type:
            | "room"
            | "pg"
            | "1 bhk"
            | "2 bhk"
            | "3 bhk"
            | "flat"
            | "house"
            | "shop"
            | "office"
            | "plot"
            | "other";
          city: string;
          locality: string;
          address: string;
          pincode: string;
          latitude: number | null;
          longitude: number | null;
          price: number;
          rent_period: "monthly" | "quarterly" | "half_yearly" | "yearly" | "one_time";
          security_deposit: number | null;
          bhk: number | null;
          bathrooms: number | null;
          furnishing: "fully_furnished" | "semi_furnished" | "unfurnished";
          area_sqft: number | null;
          available_from: string | null;
          status: "pending" | "approved" | "rejected" | "rented" | "sold";
          is_verified: boolean;
          is_featured: boolean;
          featured_until: string | null;
          amenities: string[];
          views: number;
          view_count: number;
          contact_reveal_count: number;
          is_demo: boolean;
          created_at: string;
          updated_at: string;
          featured_active: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "properties_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Functions: {
      record_property_view: {
        Args: {
          p_property_id: string;
          p_viewer_id: string | null;
          p_visitor_hash: string;
          p_device_type: "mobile" | "tablet" | "desktop";
        };
        Returns: undefined;
      };
      record_contact_reveal: {
        Args: {
          p_property_id: string;
          p_customer_id: string;
          p_amount: number;
          p_payment_id: string | null;
        };
        Returns: undefined;
      };
      get_property_analytics: {
        Args: { p_property_id: string };
        Returns: {
          total_views: number;
          unique_visitors: number;
          mobile_views: number;
          tablet_views: number;
          desktop_views: number;
          contact_reveals: number;
          daily: Array<{ day: string; count: number }>;
        };
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];