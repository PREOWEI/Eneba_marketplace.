# Eneba-inspired marketplace

A demo digital marketplace built with React, TypeScript, PHP and MongoDB Atlas. Payments are simulated and generated DEMO codes are not redeemable.

## Implemented features

- Backend-driven homepage banners, featured products, popular products and deals.
- Home, All Products, PC, PlayStation, Xbox, Gift Cards, Subscriptions, Game Credits and Deals navigation. Category browsing hides homepage sections; Home or the logo restores them. Browser Back and Forward restore navigation state.
- Partial-name and typo-tolerant backend search, debounced autocomplete with up to five suggestions, keyboard navigation and spelling suggestions.
- Category-specific store, console, brand, service or game filters; activation, region, price and sale filters; price and name sorting. Dropdown choices come from the full category, independently of filtered results, so choices remain available after selection.
- Product details, activation/region information and seller comparisons. Device categories and activation platforms are distinguished; gift cards, subscriptions and credits have explicit product types.
- Cart quantities, removal and totals, plus login-required simulated checkout with server-validated offers and prices.
- Signup, login, logout and MongoDB order history. Each code starts hidden and has independent Reveal, Hide and Copy controls. Reveal state is not persisted across refreshes or login sessions.
- MongoDB Favorites, hearts on product cards/details and a Favorites page. Guest save intent is retained through authentication.
- Compact cart/count, Favorites heart and account header controls. The account dropdown contains My Account, Order History and Log Out and closes on outside interaction, Escape or focus leaving it.
- Responsive dark styling with cyan accents, locally bundled Metropolis typography, loading/error states and image fallbacks.

## Run locally

Use Node.js compatible with frontend/package.json, npm, PHP with the MongoDB extension, and Composer dependencies. This Windows workspace includes PHP and backend/composer.phar.

The backend reads MONGODB_URI and optional MONGODB_DATABASE from the existing private backend/.env. The database defaults to the URI database or eneba_marketplace. Keep credentials private. Atlas must be reachable with appropriate network access and database-user permissions.

Install dependencies if needed, from the project root:

~~~powershell
.\php-8.4.27-1-nts-Win32-vs17-x64\php.exe backend/composer.phar install --working-dir=backend
npm.cmd ci --prefix frontend
~~~

Start PHP from the project root:

~~~powershell
.\php-8.4.27-1-nts-Win32-vs17-x64\php.exe -S 127.0.0.1:8000 -t backend/public backend/public/index.php
~~~

In another terminal:

~~~powershell
Set-Location frontend
npm.cmd run dev
~~~

Open the URL printed by Vite. Vite proxies /api to http://127.0.0.1:8000, keeping authenticated requests on the storefront origin. The health endpoint checks the PHP process, not MongoDB.

## Catalog and artwork

MongoDB supplies runtime products. Editing JSON alone does not update existing database records.

| File | Purpose |
| --- | --- |
| backend/data/catalog_products.json | Game seed definitions |
| backend/data/marketplace_addons.json | Gift card, subscription and game-credit definitions |
| backend/data/product_covers.json | Cover URLs and artwork source references |
| backend/product_covers.php | Cover manifest loader |
| backend/catalog_seed.php | Pure update planning and demo offer generation |
| backend/scripts/seed_products.php | Preview or explicit application of planned changes |
| frontend/public/covers | Existing locally stored artwork |

All 18 distinct digital add-ons have selected official product or brand imagery: seven gift cards, three subscriptions and eight game-credit products. Shared images avoid incorrect denomination labels; PlayStation Plus Essential uses matching one-month artwork. Sources are recorded in the manifest. External images can change; the frontend retains its error fallback.

### Update only the 18 product images

From the project root, preview first:

~~~powershell
.\php-8.4.27-1-nts-Win32-vs17-x64\php.exe backend/scripts/seed_products.php --artwork-only --dry-run
~~~

After a successful review showing only imageUrl updates:

~~~powershell
.\php-8.4.27-1-nts-Win32-vs17-x64\php.exe backend/scripts/seed_products.php --artwork-only --apply
~~~

Keep --artwork-only. It updates existing add-on images without inserting products or changing names, prices, regions, offers, accounts or orders. It handles repeated definition IDs once, rejects missing targets before applying, guards against concurrent artwork edits and skips already-correct images.

### General catalog updates

The general seeder previews by default; --apply enables writes. It can insert missing products, backfill metadata/offers and apply existing targeted catalog corrections. It is broader than an artwork update. Review its entire preview before choosing to apply it:

~~~powershell
.\php-8.4.27-1-nts-Win32-vs17-x64\php.exe backend/scripts/seed_products.php --dry-run
~~~

It does not reset collections. Operations are not one transaction: earlier successful writes can remain if a later operation fails. backend/CATALOG_UPDATE.md describes an earlier game expansion; use the commands above for the current artwork-only workflow.

## Validation and known limits

Frontend checks:

~~~powershell
npm.cmd test --prefix frontend
npm.cmd run lint --prefix frontend
npm.cmd run build --prefix frontend
~~~

Database-independent PHP tests, from the root:

~~~powershell
.\php-8.4.27-1-nts-Win32-vs17-x64\php.exe backend/tests/marketplace.php
.\php-8.4.27-1-nts-Win32-vs17-x64\php.exe backend/tests/auth_validation.php
.\php-8.4.27-1-nts-Win32-vs17-x64\php.exe backend/tests/catalog_artwork.php
.\php-8.4.27-1-nts-Win32-vs17-x64\php.exe backend/tests/catalog_seed.php
~~~

Latest recorded results, not a fresh run for this documentation update:

- Frontend: 43 tests passed after the dropdown fix; lint and production build passed.
- Artwork: all 18 selected URLs loaded and decoded in a browser. PHP syntax and artwork planner tests passed, covering field preservation, duplicate IDs, missing targets, concurrent edits and repeatability.
- Known failure: the older general catalog test still expects 41 products and fails against the expanded catalog.
- The artwork database dry-run failed with a MongoDB connection timeout. No artwork database changes were applied during that work. Retry the dry-run before applying.
- Frontend tests mock API calls. Verify live Atlas Favorites persistence, login/order flows and applied artwork locally.
- The add-on JSON currently contains six repeated definition IDs. Artwork-only planning handles each once without changing other product data.

## Project layout

- [Frontend README](frontend/README.md): React interface and frontend checks.
- [Backend README](backend/README.md): PHP API, protected routes and data updates.

This is a demonstration project, not a real payment, key-distribution or gaming-account top-up service.
