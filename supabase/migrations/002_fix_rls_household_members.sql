-- Supprimer toutes les politiques problématiques
DROP POLICY IF EXISTS "hm_select" ON household_members;
DROP POLICY IF EXISTS "hm_insert" ON household_members;

-- Désactiver RLS sur household_members (on sécurise via les autres tables)
ALTER TABLE household_members DISABLE ROW LEVEL SECURITY;

-- Créer une fonction sécurisée pour vérifier l'appartenance
CREATE OR REPLACE FUNCTION is_household_member(hid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = hid AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Réécrire les politiques des autres tables pour utiliser cette fonction
DROP POLICY IF EXISTS "households_select" ON households;
CREATE POLICY "households_select" ON households FOR SELECT
  USING (is_household_member(id) OR created_by = auth.uid());

DROP POLICY IF EXISTS "sl_select" ON shopping_lists;
DROP POLICY IF EXISTS "sl_insert" ON shopping_lists;
DROP POLICY IF EXISTS "sl_update" ON shopping_lists;
CREATE POLICY "sl_all" ON shopping_lists FOR ALL
  USING (is_household_member(household_id));

DROP POLICY IF EXISTS "bills_all" ON bills;
CREATE POLICY "bills_all" ON bills FOR ALL
  USING (is_household_member(household_id));

DROP POLICY IF EXISTS "eg_all" ON expense_groups;
CREATE POLICY "eg_all" ON expense_groups FOR ALL
  USING (
    household_id IS NULL OR is_household_member(household_id)
  );