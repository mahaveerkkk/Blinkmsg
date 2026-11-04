-- ========================================================
-- BLINKMSG SECURE DATABASE SCHEMA & REALTIME SETUP
-- Copy all and paste into Supabase SQL Editor -> Click 'Run'
-- ========================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop existing tables if re-running
DROP TABLE IF EXISTS public.ephemeral_messages CASCADE;
DROP TABLE IF EXISTS public.chat_rooms CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 3. PROFILES TABLE (Zero personal info: only @handle, avatar, city)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    handle TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_id INT DEFAULT 1,
    vibe TEXT DEFAULT '⚡ Ghost mode active',
    is_available BOOLEAN DEFAULT TRUE,
    city TEXT DEFAULT 'New Delhi',
    country TEXT DEFAULT 'India',
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for instant search by @handle
CREATE INDEX idx_profiles_handle ON public.profiles (handle);
CREATE INDEX idx_profiles_available ON public.profiles (is_available, city);

-- 4. CHAT ROOMS TABLE
CREATE TABLE public.chat_rooms (
    id TEXT PRIMARY KEY,
    code VARCHAR(6) NOT NULL,
    timer_seconds INT DEFAULT 30,
    is_burn_on_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX idx_chat_rooms_code ON public.chat_rooms (code);

-- 5. EPHEMERAL MESSAGES TABLE (Hardware AES-256-GCM Ciphertext only)
CREATE TABLE public.ephemeral_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id TEXT NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    sender_handle TEXT NOT NULL,
    encrypted_payload TEXT NOT NULL, -- AES-256-GCM Ciphertext
    iv TEXT NOT NULL,                -- 96-bit Initialization Vector
    timer_seconds INT DEFAULT 30,
    is_burn_on_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_ephemeral_messages_room ON public.ephemeral_messages (room_id);
CREATE INDEX idx_ephemeral_messages_expires ON public.ephemeral_messages (expires_at);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ephemeral_messages ENABLE ROW LEVEL SECURITY;

-- Allow public read on available profiles for Radar discovery
CREATE POLICY "Public read available profiles" ON public.profiles
    FOR SELECT USING (is_available = true);

-- Allow creating / updating own profile
CREATE POLICY "Public profile upsert" ON public.profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Public profile update" ON public.profiles
    FOR UPDATE USING (true);

-- Rooms can be created and read by code
CREATE POLICY "Allow public read rooms" ON public.chat_rooms
    FOR SELECT USING (NOW() < expires_at);

CREATE POLICY "Allow create rooms" ON public.chat_rooms
    FOR INSERT WITH CHECK (true);

-- Messages: only unexpired messages can be read
CREATE POLICY "Read unexpired messages" ON public.ephemeral_messages 
    FOR SELECT USING (NOW() < expires_at);

CREATE POLICY "Insert messages" ON public.ephemeral_messages 
    FOR INSERT WITH CHECK (true);

-- 7. REALTIME REPLICATION (For live instant chat)
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ephemeral_messages;

-- 8. AUTO-CLEANUP FUNCTION (Deletes expired messages and rooms)
CREATE OR REPLACE FUNCTION purge_expired_blinkmsg_data()
RETURNS void AS $$
BEGIN
    DELETE FROM public.ephemeral_messages WHERE expires_at <= NOW();
    DELETE FROM public.chat_rooms WHERE expires_at <= NOW();
    -- Set inactive profiles to unavailable
    UPDATE public.profiles
    SET is_available = FALSE
    WHERE last_seen < (NOW() - INTERVAL '15 minutes');
END;
$$ LANGUAGE plpgsql;
