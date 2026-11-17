# Marketplace PHP API

PHP uses the MongoDB extension, mongodb/mongodb and phpdotenv. The existing private backend/.env supplies MONGODB_URI and optional MONGODB_DATABASE. Keep connection credentials private.

See the [main README](../README.md) for executable paths, startup, dependency installation, artwork-only commands and current test status.

## API routes

| Method | Route | Purpose |
| --- | --- | --- |
| GET | /api/health | PHP process health; does not check MongoDB |
| GET | /api/home | Homepage banners and product sections |
| GET | /api/products | Search, category/platform/activation/region/price filters and sorting |
| GET | /api/products/filters | Platform and region values |
| GET | /api/products/suggestions | Autocomplete and spelling suggestions |
| GET | /api/products/{id} | Product details and seller offers |
| POST | /api/auth/register | Create a demo account |
| POST | /api/auth/login | Start an authenticated session |
| GET | /api/auth/me | Current session user |
| POST | /api/auth/logout | End authentication |
| GET | /api/favorites | Signed-in user's saved products |
| POST | /api/favorites | Add/remove using productId and action |
| GET | /api/orders | Signed-in user's orders and demo codes |
| POST | /api/checkout | Validate offers/prices and store a simulated order |

Catalog query parameters include q, id, category, platform, activation, productName, productType, region, minPrice, maxPrice, onSaleOnly and sort. Sort values include default, price_asc, price_desc, name_asc and name_desc; name remains an alias.

Passwords are hashed. Sessions use HttpOnly, SameSite=Lax cookies. Orders and Favorites are scoped to the authenticated user. Code reveal controls are presentation behavior: the existing protected API returns codes to their owner. No real payment or redeemable key processing takes place.

## Database updates

JSON edits do not automatically change MongoDB. General seeding can insert products and update selected catalog details; inspect its preview before applying.

For the 18 digital-product covers, use seed_products.php with --artwork-only --dry-run, then --artwork-only --apply after reviewing the plan. This updates only imageUrl on existing add-ons, rejects missing targets, handles repeated IDs once and protects concurrent image changes. Exact commands are in the main README.

The latest artwork dry-run encountered a MongoDB connection timeout and wrote nothing. The older CATALOG_UPDATE.md describes an earlier expansion, not the current artwork-only procedure.

## Checks and limitations

Tests in tests/marketplace.php, tests/auth_validation.php and tests/catalog_artwork.php run without database writes. Artwork tests cover 18 distinct updates, field preservation, repeated IDs, missing targets, concurrent-edit guards and idempotence.

The older tests/catalog_seed.php fails its outdated 41-product expectation. The add-on JSON has six repeated IDs; the artwork planner deduplicates these without changing product details.

tests/products.ps1 requires a running backend and populated, reachable MongoDB. Frontend tests use mocked responses. Verify login, Favorites persistence and simulated order history against your local Atlas setup.
