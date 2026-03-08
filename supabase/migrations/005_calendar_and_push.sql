-- ============================================================
-- Homy — Migration 005 : Calendrier partagé + Push subscriptions
-- ============================================================

-- ─── Énumérations ────────────────────────────────────────────

-- Couleurs disponibles pour les catégories d'événements
CREATE TYPE event_color AS ENUM (
  'blue', 'green', 'red', 'orange', 'purple', 'pink', 'yellow', 'gray'
);

-- Fréquences de récurrence
CREATE TYPE recurrence_freq AS ENUM (
  'none', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly'
);

-- ─── Calendar Events ─────────────────────────────────────────
CREATE TABLE calendar_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Contenu
  title           TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description     TEXT,
  location        TEXT,
  color           event_color NOT NULL DEFAULT 'blue',

  -- Dates
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  all_day         BOOLEAN NOT NULL DEFAULT FALSE,

  -- Récurrence
  recurrence      recurrence_freq NOT NULL DEFAULT 'none',
  recurrence_end  DATE,                          -- date de fin de récurrence (nullable = infini)

  -- Rappels (tableau de minutes avant l'événement, ex: [10, 60, 1440])
  reminders       INT[] NOT NULL DEFAULT '{60}', -- défaut : 1h avant

  -- Participants (sous-ensemble des membres du foyer)
  -- NULL = tout le foyer est concerné
  participant_ids UUID[],

  -- Métadonnées
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contrainte : ends_at >= starts_at
  CONSTRAINT valid_dates CHECK (ends_at >= starts_at)
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_calendar_events_household  ON calendar_events (household_id);
CREATE INDEX idx_calendar_events_starts_at  ON calendar_events (starts_at);
CREATE INDEX idx_calendar_events_created_by ON calendar_events (created_by);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Push Subscriptions ──────────────────────────────────────
-- Stocke les tokens Web Push par device/utilisateur
CREATE TABLE push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Données de la subscription Web Push (PushSubscription JSON)
  endpoint    TEXT NOT NULL,
  p256dh      TEXT NOT NULL,   -- clé publique ECDH du client
  auth        TEXT NOT NULL,   -- secret d'authentification

  -- Métadonnées device (optionnel, pour debug)
  user_agent  TEXT,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Un endpoint est unique par utilisateur
  UNIQUE (user_id, endpoint)
);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions (user_id);

CREATE TRIGGER push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Notification Log ────────────────────────────────────────
-- Évite d'envoyer deux fois le même rappel (idempotence du cron)
CREATE TABLE notification_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reminder_min INT NOT NULL,           -- combien de minutes avant (ex: 60)
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Un seul envoi par (event, user, rappel)
  UNIQUE (event_id, user_id, reminder_min)
);

CREATE INDEX idx_notif_log_event ON notification_log (event_id);

-- ─── Row Level Security ──────────────────────────────────────
ALTER TABLE calendar_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log    ENABLE ROW LEVEL SECURITY;

-- calendar_events : visible et modifiable par tous les membres du foyer
CREATE POLICY "ce_all" ON calendar_events FOR ALL
  USING (is_household_member(household_id));

-- push_subscriptions : chaque utilisateur ne voit et gère que ses propres subscriptions
CREATE POLICY "ps_select" ON push_subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "ps_insert" ON push_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "ps_update" ON push_subscriptions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "ps_delete" ON push_subscriptions FOR DELETE
  USING (user_id = auth.uid());

-- notification_log : lecture seule pour l'utilisateur concerné
-- (les écritures se font via la Edge Function avec service_role)
CREATE POLICY "nl_select" ON notification_log FOR SELECT
  USING (user_id = auth.uid());

-- ─── Realtime ────────────────────────────────────────────────
-- Activer Realtime sur calendar_events pour la sync entre membres
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_events;

-- ─── Vue utilitaire : prochains événements ───────────────────
-- Utilisée par le widget dashboard et la Edge Function de rappels
CREATE OR REPLACE VIEW upcoming_events AS
SELECT
  ce.*,
  p.name  AS creator_name,
  h.name  AS household_name
FROM calendar_events ce
JOIN profiles   p ON p.id = ce.created_by
JOIN households h ON h.id = ce.household_id
WHERE ce.starts_at >= NOW()
ORDER BY ce.starts_at ASC;