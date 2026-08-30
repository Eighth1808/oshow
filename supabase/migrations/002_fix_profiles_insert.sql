-- ============================================
-- FIX: Make phone column nullable for email auth
-- ============================================

ALTER TABLE profiles ALTER COLUMN phone DROP NOT NULL;

-- ============================================
-- FIX: Allow users to insert their own profile
-- ============================================

CREATE POLICY profiles_insert ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- SAFETY NET: Auto-create profile on signup
-- Triggers on auth.users insert so a profile
-- always exists even if the app-level insert fails.
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, full_name, email, role)
  VALUES (
    NEW.id,
    NEW.phone,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      'Utilisateur'
    ),
    NEW.email,
    'attendee'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- BACKFILL: Insert profiles for any existing
-- auth.users that are missing a profile row
-- ============================================

INSERT INTO public.profiles (id, phone, full_name, email, role)
SELECT
  u.id,
  u.phone,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    'Utilisateur'
  ),
  u.email,
  'attendee'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
