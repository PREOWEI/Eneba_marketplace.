# Catalog sources

MongoDB is the source read by the running API. These JSON files are seed inputs, not a replacement live database.

- `catalog_products.json`: game definitions.
- `marketplace_addons.json`: gift cards, subscriptions and game credits.
- `product_covers.json`: verified artwork overrides.
- `products.json`: legacy sample catalog; not the current combined seed source.

`../catalog_seed.php` combines the game and addon definitions and applies the artwork logic. `../scripts/seed_products.php` is the command entry point. Updating these files alone does not update MongoDB. Review a dry run before explicitly applying changes; never reset collections as part of a code refactor.
