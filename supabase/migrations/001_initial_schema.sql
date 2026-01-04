-- Wedding Planner Pro - Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE event_type AS ENUM ('wedding', 'corporate', 'birthday', 'other');
CREATE TYPE plan_type AS ENUM ('free', 'pro', 'business');
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired', 'trialing');

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    plan plan_type DEFAULT 'free',
    status subscription_status DEFAULT 'active',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type event_type DEFAULT 'wedding',
    event_date DATE,
    budget_total NUMERIC(12, 2) DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guest groups table
CREATE TABLE guest_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#64748b',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guests table
CREATE TABLE guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    group_name TEXT NOT NULL,
    confirmed BOOLEAN DEFAULT FALSE,
    parent_id UUID REFERENCES guests(id) ON DELETE SET NULL,
    priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
    photo_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses table
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    supplier TEXT,
    estimated_value NUMERIC(12, 2) DEFAULT 0,
    actual_value NUMERIC(12, 2) DEFAULT 0,
    is_contracted BOOLEAN DEFAULT FALSE,
    include BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_guests_event_id ON guests(event_id);
CREATE INDEX idx_guests_parent_id ON guests(parent_id);
CREATE INDEX idx_guest_groups_event_id ON guest_groups(event_id);
CREATE INDEX idx_expenses_event_id ON expenses(event_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Subscriptions policies
CREATE POLICY "Users can view their own subscription"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
    ON subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
    ON subscriptions FOR UPDATE
    USING (auth.uid() = user_id);

-- Events policies
CREATE POLICY "Users can view their own events"
    ON events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own events"
    ON events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events"
    ON events FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events"
    ON events FOR DELETE
    USING (auth.uid() = user_id);

-- Guests policies (through events)
CREATE POLICY "Users can view guests of their events"
    ON guests FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM events WHERE events.id = guests.event_id AND events.user_id = auth.uid()
    ));

CREATE POLICY "Users can create guests in their events"
    ON guests FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM events WHERE events.id = guests.event_id AND events.user_id = auth.uid()
    ));

CREATE POLICY "Users can update guests in their events"
    ON guests FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM events WHERE events.id = guests.event_id AND events.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete guests from their events"
    ON guests FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM events WHERE events.id = guests.event_id AND events.user_id = auth.uid()
    ));

-- Guest groups policies (through events)
CREATE POLICY "Users can view guest groups of their events"
    ON guest_groups FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM events WHERE events.id = guest_groups.event_id AND events.user_id = auth.uid()
    ));

CREATE POLICY "Users can create guest groups in their events"
    ON guest_groups FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM events WHERE events.id = guest_groups.event_id AND events.user_id = auth.uid()
    ));

CREATE POLICY "Users can update guest groups in their events"
    ON guest_groups FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM events WHERE events.id = guest_groups.event_id AND events.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete guest groups from their events"
    ON guest_groups FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM events WHERE events.id = guest_groups.event_id AND events.user_id = auth.uid()
    ));

-- Expenses policies (through events)
CREATE POLICY "Users can view expenses of their events"
    ON expenses FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM events WHERE events.id = expenses.event_id AND events.user_id = auth.uid()
    ));

CREATE POLICY "Users can create expenses in their events"
    ON expenses FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM events WHERE events.id = expenses.event_id AND events.user_id = auth.uid()
    ));

CREATE POLICY "Users can update expenses in their events"
    ON expenses FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM events WHERE events.id = expenses.event_id AND events.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete expenses from their events"
    ON expenses FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM events WHERE events.id = expenses.event_id AND events.user_id = auth.uid()
    ));

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile
    INSERT INTO profiles (id, email, name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
    
    -- Create free subscription
    INSERT INTO subscriptions (user_id, plan, status)
    VALUES (NEW.id, 'free', 'active');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile and subscription on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guests_updated_at
    BEFORE UPDATE ON guests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

