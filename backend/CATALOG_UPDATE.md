# Catalog update — 17 November 2026

No MongoDB writes were performed by the assistant. The existing API returned 18 products before this change. The Witcher 3 already exists as `the-witcher-3` (GOG), so 11 titles are added for an expected total of 29.

## Run manually from the project root (PowerShell)

Preview only:

```powershell
.\php-8.4.27-1-nts-Win32-vs17-x64\php.exe backend\scripts\seed_products.php --dry-run
```

Apply the additions and corrections:

```powershell
.\php-8.4.27-1-nts-Win32-vs17-x64\php.exe backend\scripts\seed_products.php --apply
```

Running without arguments also previews only. Do not expect JSON changes alone to update Atlas. The same command inserts missing sample products on a fresh database. A second run on unchanged data should report zero operations.

## Changes applied

- Inserts only missing games, matching IDs plus normalized names/known aliases to avoid duplicates. Never deletes products. Conflicting identities stop planning before writes.
- Corrects GTA VI name, description, artwork and platform while keeping `gta-6-ultimate-edition`. All its existing legacy PC offers become explicitly PS5 Standard; seller IDs, seller names, prices and regions are retained. Official supported platforms are PS5 and Xbox Series X|S; this listing sells only the PS5 demo entitlement. Release is scheduled for 19 November 2026.
- Keeps Modern Warfare 4: the official publisher says it is released. Updates its Standard Battle.net description/artwork while retaining its ID and offers.
- Corrects only the legacy combined Forza label `Steam / Xbox / PC` to Steam, including those legacy offers. A mixed set of genuinely different seller platforms stops the plan for manual review instead of being silently relabeled.
- Preserves all other existing covers, prices and working offers. Fills missing/empty offer lists using each existing product's price and region; six of the current older titles have no offers, including The Witcher 3.
- Each new product has three demo sellers with stable offer IDs and one platform/region. First seller price equals the catalog price; the other two are EUR 1.50 and EUR 3.00 higher. Prices are illustrative, not scraped retail prices.
- Guarded updates refuse to overwrite changed fields if another edit occurs between planning and writing. If an error interrupts application, earlier writes can remain; resolve the conflict and rerun. Already-completed changes are skipped. No credentials are printed.

## New listings

| Game | Listing platform | Region | Lowest demo EUR |
|---|---|---|---:|
| Detroit: Become Human | Epic Games | Europe | 19.99 |
| Test Drive Unlimited Solar Crown | Xbox Series X\|S | Europe | 29.99 |
| Ghost of Tsushima Director's Cut | Steam | Europe | 39.99 |
| Tekken 8 | PlayStation 5 | Europe | 34.99 |
| Resident Evil 4 (2023 Remake) | Steam | Europe | 24.99 |
| Gran Turismo 7 | PlayStation 5 | Europe | 39.99 |
| It Takes Two | EA App | Europe | 19.99 |
| Black Myth: Wukong | Epic Games | Europe | 44.99 |
| Assassin's Creed Shadows | Xbox Series X\|S | Europe | 44.99 |
| Halo Infinite (Campaign) | Xbox Series X\|S | Europe | 24.99 |
| Marvel's Spider-Man Remastered | Steam | Europe | 29.99 |

Halo is the paid Campaign, not free multiplayer. Resident Evil 4 is the 2023 remake. Ghost includes Director's Cut/Iki Island. Spider-Man Remastered is separate from the existing Miles Morales. Console listings are not PC keys; no cross-platform entitlement is implied. PlayStation 5, Xbox Series X|S, Steam, EA App, Epic Games, GOG and existing Battle.net/Rockstar listings are exposed automatically by the API's database-driven platform filter. No frontend redesign or filter rewrite was needed.

## Verification

The offline test `php backend/tests/catalog_seed.php` checks 29 unique definitions, repeat runs, preservation of custom covers and seller fields, duplicate names under another ID, missing-offer backfill, readable local images, platform-specific offers and checkout for all three sellers of every definition. It does not connect to MongoDB.

After applying, refresh the homepage, verify 29 products, filter by the new platforms, check GTA/MW4 artwork, and test a new seller offer in the existing simulated checkout. Historical orders remain untouched.

## Official references

- [GTA VI](https://www.rockstargames.com/VI)
- [Modern Warfare 4](https://www.callofduty.com/modernwarfare4)
- [Detroit: Become Human](https://store.epicgames.com/en-US/p/detroit-become-human)
- [Test Drive Unlimited Solar Crown](https://www.xbox.com/en-US/games/store/test-drive-unlimited-solar-crown/9pcz7r12wndl)
- [Ghost of Tsushima Director's Cut](https://store.steampowered.com/app/2215430/)
- [Tekken 8](https://store.playstation.com/en-us/concept/10006270/)
- [Resident Evil 4 (2023 Remake)](https://store.steampowered.com/app/2050650/)
- [Gran Turismo 7](https://www.playstation.com/en-us/games/gran-turismo-7/)
- [It Takes Two](https://www.ea.com/games/it-takes-two/it-takes-two/buy)
- [Black Myth: Wukong](https://store.epicgames.com/en-US/p/black-myth-wukong-87a72b)
- [Assassin's Creed Shadows](https://www.xbox.com/en-us/games/store/assassins-creed-shadows/9P42LWGMC7K4)
- [Halo Infinite (Campaign)](https://www.xbox.com/en-US/games/store/halo-infinite-campaign/9pd22xjdr74n)
- [Marvel's Spider-Man Remastered](https://store.steampowered.com/app/1817070/)

Exact cover asset URLs are recorded in `data/product_covers.json`; product definitions are in `data/catalog_products.json`.
