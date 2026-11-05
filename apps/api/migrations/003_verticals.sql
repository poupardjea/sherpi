-- Plusieurs métiers (caviste, épicerie fine, librairie) : champs produit neutres.

ALTER TABLE shops ADD COLUMN vertical text NOT NULL DEFAULT 'caviste';

ALTER TABLE products RENAME COLUMN appellation TO origin;
ALTER TABLE products RENAME COLUMN color TO category;
ALTER TABLE products RENAME COLUMN grapes TO details;
ALTER TABLE products RENAME COLUMN style TO tags;
-- « bouteille », « pot », « livre » : affiché sur la confirmation (« 1 bouteille »).
ALTER TABLE products ADD COLUMN unit text NOT NULL DEFAULT '';
