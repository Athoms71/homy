-- Migration 006 — nouvelles catégories shopping + bills frequency simplifiée
-- À exécuter dans Supabase SQL Editor

-- Supprimer la contrainte CHECK sur shopping_items.category si existante
ALTER TABLE shopping_items DROP CONSTRAINT IF EXISTS shopping_items_category_check;

-- Pas de contrainte CHECK strict sur category (TEXT libre = flexible)
-- Les nouvelles valeurs: snacks, canned, condiments, cereals, baby, pets, pharmacy

-- Pour bills: si vous voulez enforcer seulement monthly/annual
ALTER TABLE bills DROP CONSTRAINT IF EXISTS bills_frequency_check;
ALTER TABLE bills ADD CONSTRAINT bills_frequency_check CHECK (frequency IN ('monthly', 'annual'));
