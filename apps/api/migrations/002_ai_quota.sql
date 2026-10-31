-- Plafond mensuel d'appels au modèle par boutique. Au-delà : classement simple, sans erreur.

ALTER TABLE shops ADD COLUMN ai_monthly_quota integer NOT NULL DEFAULT 5000 CHECK (ai_monthly_quota >= 0);

CREATE TABLE ai_usage (
  shop_id uuid NOT NULL REFERENCES shops (id) ON DELETE CASCADE,
  -- Premier jour du mois, heure de Paris.
  month date NOT NULL,
  calls integer NOT NULL DEFAULT 0,
  PRIMARY KEY (shop_id, month)
);
