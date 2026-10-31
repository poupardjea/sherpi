-- Schéma initial : shops, products, reservations, search_logs (spec, tâche 2).

CREATE TABLE shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  name text NOT NULL,
  merchant_first_name text NOT NULL,
  address text NOT NULL,
  opening_hours text NOT NULL DEFAULT '',
  -- {"0": {"open": "10:00", "close": "13:00"}, "2": {...}} — clé = jour (0 = dimanche)
  opening jsonb NOT NULL DEFAULT '{}',
  tone text NOT NULL DEFAULT '',
  accent_primary text NOT NULL DEFAULT '#24533F',
  accent_secondary text NOT NULL DEFAULT '#8E2C3A',
  pickup_prefix text NOT NULL,
  merchant_email text NOT NULL,
  sells_alcohol boolean NOT NULL DEFAULT true,
  -- Compteur des n° de retrait (M-0001, M-0002…), incrémenté atomiquement.
  reservation_seq integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE products (
  shop_id uuid NOT NULL REFERENCES shops (id) ON DELETE CASCADE,
  id text NOT NULL,
  name text NOT NULL,
  appellation text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '',
  grapes text[] NOT NULL DEFAULT '{}',
  style text[] NOT NULL DEFAULT '{}',
  price numeric(10, 2) NOT NULL CHECK (price >= 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  available boolean NOT NULL DEFAULT true,
  favorite boolean NOT NULL DEFAULT false,
  pairings text[] NOT NULL DEFAULT '{}',
  merchant_note text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (shop_id, id)
);

CREATE TABLE reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops (id) ON DELETE CASCADE,
  code text NOT NULL,
  cancel_token text NOT NULL,
  status text NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'ready', 'picked_up', 'cancelled')),
  -- Copie du produit au moment de la réservation (le produit peut changer ou disparaître).
  product_id text NOT NULL,
  product_name text NOT NULL,
  product_price numeric(10, 2) NOT NULL,
  -- Données personnelles : mises à NULL 30 jours après la date de retrait (RGPD).
  first_name text,
  phone text,
  pickup_date date NOT NULL,
  gift_wrap boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, code)
);

CREATE INDEX reservations_shop_pickup ON reservations (shop_id, pickup_date);

CREATE TABLE search_logs (
  id bigserial PRIMARY KEY,
  shop_id uuid NOT NULL REFERENCES shops (id) ON DELETE CASCADE,
  input jsonb NOT NULL,
  result_count integer NOT NULL,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX search_logs_shop_created ON search_logs (shop_id, created_at);
