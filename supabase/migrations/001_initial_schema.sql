-- ============================================================
-- Homy — Migration initiale
-- ============================================================

-- Extension pour les UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Profiles (lié à auth.users de Supabase) ─────────────────
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT '',
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Créer le profil automatiquement à l'inscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Households ──────────────────────────────────────────────
CREATE TABLE households (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  invite_code  TEXT NOT NULL UNIQUE DEFAULT upper(substring(gen_random_uuid()::text, 1, 8)),
  created_by   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE household_members (
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (household_id, user_id)
);

-- ─── Shopping ────────────────────────────────────────────────
CREATE TABLE shopping_lists (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  created_by    UUID NOT NULL REFERENCES profiles(id),
  archived_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE shopping_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id      UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  quantity     NUMERIC NOT NULL DEFAULT 1,
  unit         TEXT,
  category     TEXT NOT NULL DEFAULT 'other',
  is_urgent    BOOLEAN NOT NULL DEFAULT FALSE,
  checked_by   UUID REFERENCES profiles(id),
  checked_at   TIMESTAMPTZ,
  assigned_to  UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Expenses ────────────────────────────────────────────────
CREATE TABLE expense_groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  UUID REFERENCES households(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  created_by    UUID NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE expenses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     UUID NOT NULL REFERENCES expense_groups(id) ON DELETE CASCADE,
  description  TEXT NOT NULL,
  amount       NUMERIC(10, 2) NOT NULL,
  paid_by      UUID NOT NULL REFERENCES profiles(id),
  category     TEXT NOT NULL DEFAULT 'other',
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE expense_splits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id  UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id),
  amount      NUMERIC(10, 2) NOT NULL,
  is_paid     BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at     TIMESTAMPTZ
);

-- ─── Bills ───────────────────────────────────────────────────
CREATE TABLE bills (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL,
  amount        NUMERIC(10, 2) NOT NULL,
  category      TEXT NOT NULL DEFAULT 'other',
  frequency     TEXT NOT NULL DEFAULT 'monthly'
                  CHECK (frequency IN ('monthly','quarterly','biannual','annual','one_time')),
  due_date      DATE NOT NULL,
  paid_at       TIMESTAMPTZ,
  auto_renew    BOOLEAN NOT NULL DEFAULT TRUE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Row Level Security ───────────────────────────────────────
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE households         ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists     ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_groups     ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits     ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills               ENABLE ROW LEVEL SECURITY;

-- Profiles : visible par tous les membres d'un même foyer
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (
    id = auth.uid() OR
    id IN (
      SELECT hm.user_id FROM household_members hm
      WHERE hm.household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Households : accessibles uniquement aux membres
CREATE POLICY "households_select" ON households FOR SELECT
  USING (id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

CREATE POLICY "households_insert" ON households FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "households_update" ON households FOR UPDATE
  USING (created_by = auth.uid());

-- Household members
CREATE POLICY "hm_select" ON household_members FOR SELECT
  USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

CREATE POLICY "hm_insert" ON household_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Shopping lists
CREATE POLICY "sl_select" ON shopping_lists FOR SELECT
  USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

CREATE POLICY "sl_insert" ON shopping_lists FOR INSERT
  WITH CHECK (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

CREATE POLICY "sl_update" ON shopping_lists FOR UPDATE
  USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

-- Shopping items (hérite de la visibilité de la liste)
CREATE POLICY "si_select" ON shopping_items FOR SELECT
  USING (list_id IN (SELECT id FROM shopping_lists));

CREATE POLICY "si_all" ON shopping_items FOR ALL
  USING (list_id IN (SELECT id FROM shopping_lists));

-- Bills
CREATE POLICY "bills_all" ON bills FOR ALL
  USING (household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()));

-- Expense groups
CREATE POLICY "eg_all" ON expense_groups FOR ALL
  USING (
    household_id IS NULL OR
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

-- Expenses & splits
CREATE POLICY "expenses_all" ON expenses FOR ALL
  USING (group_id IN (SELECT id FROM expense_groups));

CREATE POLICY "splits_all" ON expense_splits FOR ALL
  USING (expense_id IN (SELECT id FROM expenses));
