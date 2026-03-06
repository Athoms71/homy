CREATE OR REPLACE FUNCTION find_household_by_invite_code(code TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  invite_code TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ
) AS $$
  SELECT id, name, invite_code, created_by, created_at
  FROM households
  WHERE households.invite_code = upper(trim(code))
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;