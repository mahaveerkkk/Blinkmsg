-- ========================================================
-- BlinkMsg Supabase Database Schema & Auto-Cleanup Engine
-- ========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop previous tables if recreating
DROP TABLE IF EXISTS public.ephemeral_messages CASCADE;
DROP TABLE IF EXISTS public.chat_rooms CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 1. Profiles Table (For Radar & @Handle Discovery)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    handle TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_id INT DEFAULT 1,
    vibe TEXT DEFAULT '⚡ Ghost mode active',
    is_available BOOLEAN DEFAULT TRUE,
    country TEXT DEFAULT 'India',
    state TEXT DEFAULT 'Delhi',
    city TEXT DEFAULT 'New Delhi',
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast @handle search
CREATE INDEX IF NOT EXISTS idx_profiles_handle ON public.profiles (handle);
CREATE INDEX IF NOT EXISTS idx_profiles_radar ON public.profiles (is_available, country, city);

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
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ephemeral_messages ENABLE ROW LEVEL SECURITY;

-- Allow public reads on available profiles for Radar
CREATE POLICY "Public radar read" ON public.profiles
    FOR SELECT USING (is_available = TRUE);

CREATE POLICY "Public profile insert" ON public.profiles
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Public profile update" ON public.profiles
    FOR UPDATE USING (TRUE);

-- Allow reading and creating rooms
CREATE POLICY "Public room read" ON public.chat_rooms
    FOR SELECT USING (NOW() < expires_at);

CREATE POLICY "Public room insert" ON public.chat_rooms
    FOR INSERT WITH CHECK (TRUE);

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
    DELETE FROM public.ephemeral_messages
    WHERE expires_at <= NOW();

    DELETE FROM public.chat_rooms
    WHERE expires_at <= NOW();

    UPDATE public.profiles
    SET is_available = FALSE
    WHERE last_seen < (NOW() - INTERVAL '15 minutes');
END;
$$ LANGUAGE plpgsql;
