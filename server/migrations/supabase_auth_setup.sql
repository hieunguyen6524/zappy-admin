-- Migration for Supabase Auth-based Admin System
-- Run this SQL in your Supabase SQL Editor
-- This uses Supabase Auth (auth.users) instead of custom users table

-- Create admin_profiles table to store additional admin information
-- Links to auth.users via user_id (UUID)
CREATE TABLE IF NOT EXISTS admin_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(191) NOT NULL,
  role VARCHAR(64) NOT NULL DEFAULT 'admin', -- 'superadmin' or 'admin'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index on role for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_profiles_role ON admin_profiles(role);

-- Create index on is_active
CREATE INDEX IF NOT EXISTS idx_admin_profiles_is_active ON admin_profiles(is_active);

-- Enable RLS (Row Level Security) on admin_profiles
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy: Service role can do everything (for backend)
CREATE POLICY "Service role full access" ON admin_profiles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create function to automatically create admin_profile when user is created
CREATE OR REPLACE FUNCTION public.handle_new_admin_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admin_profiles (id, full_name, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'admin',
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create admin_profile (optional, can be done manually)
-- Uncomment if you want automatic profile creation
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_admin_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admin_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_admin_profiles_updated_at
  BEFORE UPDATE ON admin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_profiles_updated_at();

-- Function to check if user is superadmin
CREATE OR REPLACE FUNCTION is_superadmin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_profiles
    WHERE id = user_id AND role = 'superadmin' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin (superadmin or admin)
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_profiles
    WHERE id = user_id AND role IN ('superadmin', 'admin') AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: To create the superadmin account, run the following after creating a user via Supabase Auth:
-- INSERT INTO admin_profiles (id, full_name, role, is_active)
-- VALUES ('<user-uuid-from-auth-users>', 'Super Admin', 'superadmin', true)
-- ON CONFLICT (id) DO UPDATE SET role = 'superadmin';




