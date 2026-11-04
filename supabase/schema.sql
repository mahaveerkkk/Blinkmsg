-- ========================================================
-- BlinkMsg Supabase Database Schema & Auto-Cleanup Engine
-- ========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Ghost Profiles (For Radar & @Handle Discovery)
CREATE TABLE IF NOT EXISTS public.ghost_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    handle TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_id INT DEFAULT 1,
    vibe TEXT DEFAULT '⚡ Ghost mode active',
    is_available BOOLEAN DEFAULT TRUE,
    country TEXT DEFAULT 'India',
    state TEXT DEFAULT 'Delhi',
    city TEXT DEFAULT 'New Delhi',
    last_active TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast @handle search
CREATE INDEX IF NOT EXISTS idx_ghost_handle ON public.ghost_profiles (handle);
CREATE INDEX IF NOT EXISTS idx_ghost_radar ON public.ghost_profiles (is_available, country, city);

-- 2. Chat Rooms (Ephemeral E2EE Sessions)
CREATE TABLE IF NOT EXISTS public.chat_rooms (
    id TEXT PRIMARY KEY,
    code VARCHAR(6) NOT NULL,
    timer_seconds INT DEFAULT 30,
    is_burn_on_read BOOLEAN DEFAULT FALSE,
    participant_count INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_room_code ON public.chat_rooms (code);

-- 3. Ephemeral Messages (Stored ONLY until expiry)
CREATE TABLE IF NOT EXISTS public.ephemeral_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id TEXT NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    sender_handle TEXT NOT NULL,
    encrypted_payload TEXT NOT NULL, -- AES-256-GCM Ciphertext
    iv TEXT NOT NULL,                -- 96-bit Initialization Vector
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_msg_room ON public.ephemeral_messages (room_id);
CREATE INDEX IF NOT EXISTS idx_msg_expires ON public.ephemeral_messages (expires_at);

-- ========================================================
-- Row Level Security (RLS) Policies
-- ========================================================
ALTER TABLE public.ghost_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ephemeral_messages ENABLE ROW LEVEL SECURITY;

-- Allow anonymous reads on available profiles for Radar
CREATE POLICY "Public radar read" ON public.ghost_profiles
    FOR SELECT USING (is_available = TRUE);

-- Allow anyone to create / update their own profile
CREATE POLICY "Anyone can upsert profile" ON public.ghost_profiles
    FOR ALL USING (TRUE);

-- Allow anyone to create and read rooms
CREATE POLICY "Anyone can manage rooms" ON public.chat_rooms
    FOR ALL USING (TRUE);

-- Messages can only be read if not expired
CREATE POLICY "Read unexpired messages" ON public.ephemeral_messages
    FOR SELECT USING (NOW() < expires_at);

CREATE POLICY "Insert messages" ON public.ephemeral_messages
    FOR INSERT WITH CHECK (TRUE);

-- ========================================================
-- Automatic TTL Auto-Cleanup Function (Purge Expired Data)
-- ========================================================
CREATE OR REPLACE FUNCTION purge_expired_blinkmsg_data()
RETURNS void AS $$
BEGIN
    -- Delete all expired messages
    DELETE FROM public.ephemeral_messages
    WHERE expires_at <= NOW();

    -- Delete all expired rooms older than 24 hours
    DELETE FROM public.chat_rooms
    WHERE expires_at <= NOW();

    -- Set users to unavailable if inactive for more than 15 minutes
    UPDATE public.ghost_profiles
    SET is_available = FALSE
    WHERE last_active < (NOW() - INTERVAL '15 minutes');
END;
$$ LANGUAGE plpgsql;

-- Enable Supabase Realtime replication on ephemeral_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.ephemeral_messages;
