<?php
declare(strict_types=1);

require_once __DIR__ . '/product_covers.php';

function catalogDefinitions(): array
{
    $games = json_decode(
        file_get_contents(__DIR__ . '/data/catalog_products.json'),
        true,
        512,
        JSON_THROW_ON_ERROR
    );

    foreach ($games as &$game) {
        $game['productType'] = 'game';

        if (!isset($game['deviceCategories'])) {
            $platform = strtolower((string) $game['platform']);

            $game['deviceCategories'] = str_contains($platform, 'playstation')
                ? ['playstation']
                : (str_contains($platform, 'xbox') ? ['xbox'] : ['pc']);
        }
    }
    unset($game);

    $additions = json_decode(
        file_get_contents(__DIR__ . '/data/marketplace_addons.json'),
        true,
        512,
        JSON_THROW_ON_ERROR
    );

    return [...$games, ...$additions];
}

function catalogName(string $name): string
{
    $name = str_replace(['’', '™', '®'], ["'", '', ''], $name);

    return preg_replace('/[^a-z0-9]/', '', strtolower($name));
}

function demoOffers(array $product): array
{
    $offers = [];

    foreach (['Pixel Vault', 'Northstar Digital', 'Level Up Keys'] as $index => $seller) {
        $offers[] = [
            'id' => $product['id'] . '-offer-' . ($index + 1),
            'seller' => $seller,
            'price' => round($product['price'] + $index * 1.50, 2),
            'currency' => 'EUR',
            'platform' => $product['platform'],
            'region' => $product['region'],
            'delivery' => 'DEMO code only (not redeemable; no entitlement granted)',
            'rating' => [4.9, 4.8, 4.7][$index],
            'ratingCount' => [1842, 967, 521][$index],
        ];
    }

    return $offers;
}

// Pure planning: no connection or writes. The CLI applies the reviewed operations.
function catalogSeedPlan(array $existing, array $definitions, array $covers): array
{
    $byId = [];
    $byName = [];

    foreach ($existing as $product) {
        $byId[(string) $product['_id']] = $product;
        $byName[catalogName($product['name'])][] = (string) $product['_id'];
    }

    $operations = [];

    foreach ($definitions as $definition) {
        $id = $definition['id'];
        $matches = [];

        foreach ([$definition['name'], ...($definition['aliases'] ?? [])] as $name) {
            $matches = array_merge(
                $matches,
                $byName[catalogName($name)] ?? []
            );
        }

        $matches = array_values(array_unique($matches));

        if (
            count($matches) > 1 ||
            (
                isset($byId[$id]) &&
                $matches !== [] &&
                !in_array($id, $matches, true)
            )
        ) {
            throw new RuntimeException(
                'Conflicting catalog identities for ' . $id . '; review duplicates before applying.'
            );
        }

        $current = $byId[$id] ?? (
            isset($matches[0]) ? $byId[$matches[0]] : null
        );

        if ($current === null) {
            $product = $definition;

            unset($product['id'], $product['aliases']);

            $product['_id'] = $id;
            $product['currency'] = 'EUR';

            $product['imageUrl'] =
                $covers[$id]['imageUrl']
                ?? $definition['imageUrl']
                ?? '/covers/fallback.svg';

            $product['offers'] = demoOffers($definition);

            $operations[] = ['insertOne' => [$product]];

            $byId[$id] = $product;
            $byName[catalogName($definition['name'])][] = $id;

            continue;
        }

        $changes = [];
        $currentId = (string) $current['_id'];

        // Update existing gift cards, subscriptions and game credits.
        $addonIds = [
            'steam-wallet-10',
            'steam-wallet-20',
            'steam-wallet-50',
            'playstation-store-25',
            'xbox-gift-card-25',
            'roblox-gift-card',
            'nintendo-eshop-card',
            'xbox-game-pass-ultimate-1-month',
            'playstation-plus-essential-1-month',
            'nintendo-switch-online-12-months',
            'roblox-credit-demo',
            'fortnite-vbucks-demo',
        ];

        if (in_array($id, $addonIds, true)) {
            foreach (['name', 'region', 'description'] as $field) {
                if (
                    isset($definition[$field]) &&
                    ($current[$field] ?? null) !== $definition[$field]
                ) {
                    $changes[$field] = $definition[$field];
                }
            }
        }

        // Add missing product metadata without overwriting existing values.
        foreach (
            ['productType', 'deviceCategories', 'duration', 'redemptionPlatform']
            as $field
        ) {
            if (isset($definition[$field]) && !isset($current[$field])) {
                $changes[$field] = $definition[$field];
            }
        }

        // Preserve the special updates for these two game listings.
        if (
            in_array(
                $id,
                ['gta-6-ultimate-edition', 'call-of-duty-modern-warfare-4'],
                true
            )
        ) {
            if ($currentId !== $id) {
                throw new RuntimeException(
                    'Expected stable product ID missing: ' . $id
                );
            }

            foreach (
                [
                    'name',
                    'description',
                    'platform',
                    'edition',
                    'supportedPlatforms',
                    'releaseDate',
                    'source',
                ] as $field
            ) {
                if (isset($definition[$field])) {
                    $changes[$field] = $definition[$field];
                }
            }

            $changes['imageUrl'] = $covers[$id]['imageUrl'];
        }

        // Correct the older Forza Horizon 5 platform label.
        if (
            $id === 'forza-horizon-5' &&
            ($current['platform'] ?? '') === 'Steam / Xbox / PC'
        ) {
            $changes['platform'] = 'Steam';
        }

        // Update artwork for the eight new PlayStation games.
        // This is separate from the Forza condition above.
        $playstationCoverIds = [
            'bloodborne-ps4',
            'uncharted-4-ps4',
            'horizon-zero-dawn-ps4',
            'days-gone-ps4',
            'astro-bot-ps5',
            'marvels-spider-man-2-ps5',
            'ratchet-and-clank-rift-apart-ps5',
            'demons-souls-ps5',
        ];

        if (
            in_array($id, $playstationCoverIds, true) &&
            isset($covers[$id]['imageUrl'])
        ) {
            $newImageUrl = $covers[$id]['imageUrl'];

            if (($current['imageUrl'] ?? null) !== $newImageUrl) {
                $changes['imageUrl'] = $newImageUrl;
            }
        }

        // Preserve existing seller offers.
        $offers = $current['offers'] ?? [];

        if ($offers === []) {
            // Backfill missing offers using existing prices and regions.
            $changes['offers'] = demoOffers([
                'id' => $currentId,
                'price' => $current['price'],
                'platform' => $changes['platform'] ?? $current['platform'],
                'region' => $current['region'],
            ]);
        } elseif (
            isset($changes['platform']) &&
            $changes['platform'] !== $current['platform']
        ) {
            foreach ($offers as &$offer) {
                $oldPlatform = $offer['platform'] ?? $current['platform'];

                if (
                    !in_array(
                        $oldPlatform,
                        [$current['platform'], $changes['platform']],
                        true
                    )
                ) {
                    throw new RuntimeException(
                        'Mixed seller platforms on ' . $id .
                        '; split editions before applying.'
                    );
                }

                // Preserve seller identities, offer prices and regions.
                $offer['platform'] = $changes['platform'];
            }

            unset($offer);

            $changes['offers'] = $offers;
        }

        // Keep seller offer regions consistent with updated product regions.
        if (isset($changes['region'])) {
            $updatedOffers = $changes['offers'] ?? $offers;

            foreach ($updatedOffers as &$offer) {
                $offer['region'] = $changes['region'];
            }

            unset($offer);

            $changes['offers'] = $updatedOffers;
        }

        // Avoid overwriting records that changed after the plan was created.
        $filter = ['_id' => $current['_id']];

        foreach ($changes as $field => $value) {
            if (
                array_key_exists($field, $current) &&
                $current[$field] == $value
            ) {
                unset($changes[$field]);
            } else {
                $filter[$field] = array_key_exists($field, $current)
                    ? $current[$field]
                    : ['$exists' => false];
            }
        }

        if ($changes !== []) {
            $operations[] = [
                'updateOne' => [
                    $filter,
                    ['$set' => $changes],
                    ['upsert' => false],
                ],
            ];
        }
    }

    return $operations;
}


// Image-only updates for existing add-ons. Never inserts products or changes offers.
function catalogArtworkPlan(array $existing, array $definitions, array $covers): array
{
    $byId = [];
    foreach ($existing as $product) $byId[(string) $product['_id']] = $product;
    $targets = [];
    foreach ($definitions as $definition) {
        if (in_array($definition['productType'] ?? '', ['gift-card', 'subscription', 'game-credit'], true)) {
            $targets[$definition['id']] = true;
        }
    }
    $operations = [];
    foreach (array_keys($targets) as $id) {
        if (!isset($byId[$id], $covers[$id]['imageUrl'])) {
            throw new RuntimeException('Missing artwork target: ' . $id);
        }
        $current = $byId[$id];
        $url = $covers[$id]['imageUrl'];
        if (($current['imageUrl'] ?? null) === $url) continue;
        $operations[] = ['updateOne' => [
            ['_id' => $current['_id'], 'imageUrl' => $current['imageUrl'] ?? ['$exists' => false]],
            ['$set' => ['imageUrl' => $url]],
            ['upsert' => false],
        ]];
    }
    return $operations;
}
