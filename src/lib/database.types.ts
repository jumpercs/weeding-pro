export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan: 'free' | 'pro' | 'business';
          status: 'active' | 'cancelled' | 'expired' | 'trialing';
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan?: 'free' | 'pro' | 'business';
          status?: 'active' | 'cancelled' | 'expired' | 'trialing';
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          plan?: 'free' | 'pro' | 'business';
          status?: 'active' | 'cancelled' | 'expired' | 'trialing';
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          updated_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: 'wedding' | 'corporate' | 'birthday' | 'other';
          event_date: string | null;
          budget_total: number;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type?: 'wedding' | 'corporate' | 'birthday' | 'other';
          event_date?: string | null;
          budget_total?: number;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          type?: 'wedding' | 'corporate' | 'birthday' | 'other';
          event_date?: string | null;
          budget_total?: number;
          description?: string | null;
          updated_at?: string;
        };
      };
      guests: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          group_id: string | null;
          group_name: string | null; // deprecated, kept for backwards compatibility
          confirmed: boolean;
          parent_id: string | null;
          priority: number;
          photo_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          group_id?: string | null;
          group_name?: string | null; // deprecated
          confirmed?: boolean;
          parent_id?: string | null;
          priority?: number;
          photo_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          group_id?: string | null;
          group_name?: string | null; // deprecated
          confirmed?: boolean;
          parent_id?: string | null;
          priority?: number;
          photo_url?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      guest_groups: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          color: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          color?: string;
        };
      };
      expenses: {
        Row: {
          id: string;
          event_id: string;
          category: string;
          supplier: string | null;
          estimated_value: number;
          actual_value: number;
          is_contracted: boolean;
          include: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          category: string;
          supplier?: string | null;
          estimated_value?: number;
          actual_value?: number;
          is_contracted?: boolean;
          include?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          category?: string;
          supplier?: string | null;
          estimated_value?: number;
          actual_value?: number;
          is_contracted?: boolean;
          include?: boolean;
          notes?: string | null;
          updated_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      event_type: 'wedding' | 'corporate' | 'birthday' | 'other';
      plan_type: 'free' | 'pro' | 'business';
      subscription_status: 'active' | 'cancelled' | 'expired' | 'trialing';
    };
  };
}

// Helper types for easier usage
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Subscription = Database['public']['Tables']['subscriptions']['Row'];
export type Event = Database['public']['Tables']['events']['Row'];
export type Guest = Database['public']['Tables']['guests']['Row'];
export type GuestGroup = Database['public']['Tables']['guest_groups']['Row'];
export type Expense = Database['public']['Tables']['expenses']['Row'];

export type EventInsert = Database['public']['Tables']['events']['Insert'];
export type GuestInsert = Database['public']['Tables']['guests']['Insert'];
export type GuestGroupInsert = Database['public']['Tables']['guest_groups']['Insert'];
export type ExpenseInsert = Database['public']['Tables']['expenses']['Insert'];

