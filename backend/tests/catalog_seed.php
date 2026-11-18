<?php

declare(strict_types=1);

require_once __DIR__ . '/../catalog_seed.php';
require_once __DIR__ . '/../marketplace.php';

function check(bool $condition, string $message): void
{
    if (!$condition) throw new RuntimeException($message);
}

function applyInMemory(array $documents, array $plan): array
{
    foreach ($plan as $operation) {
        if (isset($operation['insertOne'])) {
            $documents[] = $operation['insertOne'][0];
        } else {
            [$filter, $update] = $operation['updateOne'];
            foreach ($documents as &$document) {
                if ($document['_id'] === $filter['_id']) $document = array_replace($document, $update['$set']);
            }
            unset($document);
        }
    }
    return $documents;
}

$definitions = catalogDefinitions();
$covers = productCoverManifest();
check(count($definitions) === 61, 'Expected 37 games and 24 digital products.');
check(count(array_unique(array_column($definitions, 'id'))) === count($definitions), 'Duplicate product IDs.');
$fresh = applyInMemory([], catalogSeedPlan([], $definitions, $covers));
check(catalogSeedPlan($fresh, $definitions, $covers) === [], 'Second run must make no changes.');
$platforms = array_unique(array_column($fresh, 'platform'));
foreach (['PlayStation 5', 'Xbox Series X|S', 'Steam', 'EA App', 'Epic Games', 'GOG'] as $platform) {
    check(in_array($platform, $platforms, true), 'Missing platform: ' . $platform);
}
foreach ($fresh as $product) {
    check(in_array($product['productType'], ['game', 'gift-card', 'subscription', 'game-credit'], true), 'Unknown product type.');
    check(count($product['offers']) === 3, 'Three sellers required for ' . $product['_id']);
    check($product['description'] !== '' && $product['price'] > 0, 'Missing product data.');
    foreach ($product['offers'] as $offer) {
        check($offer['platform'] === $product['platform'] && $offer['region'] === $product['region'], 'Mixed entitlement.');
        [$lines, $cents] = checkoutLines(['items' => [['offerId' => $offer['id'], 'quantity' => 2]]], static fn() => $product);
        check($cents === (int) round($offer['price'] * 200) && count($lines[0]['demoKeys']) === 2, 'Checkout mismatch.');
    }
    if (str_starts_with($product['imageUrl'], '/covers/')) {
        $path = __DIR__ . '/../../frontend/public' . $product['imageUrl'];
        check(is_file($path) && filesize($path) > 0, 'Missing cover file.');
        if (!str_ends_with($path, '.svg')) check(getimagesize($path) !== false, 'Invalid cover image.');
    }
}
check(count(array_filter($fresh, static fn($p) => $p['productType'] === 'gift-card')) === 7, 'Expected seven gift card listings.');
check(count(array_filter($fresh, static fn($p) => $p['productType'] === 'subscription')) === 3, 'Expected three subscription listings.');
check(count(array_filter($fresh, static fn($p) => $p['productType'] === 'game-credit')) === 2, 'Expected two game credit demos.');

// Simulate the original catalog and custom seller data, never using MongoDB.
$existing = array_slice($fresh, 0, 18);
foreach ($existing as &$product) {
    $product['imageUrl'] = '/covers/custom-' . $product['_id'] . '.jpg';
    $product['offers'][0]['seller'] = 'Existing custom seller';
    $product['offers'][0]['price'] = 3.21;
    if ($product['_id'] === 'gta-6-ultimate-edition') {
        $product['name'] = 'GTA 6 Ultimate Edition';
        $product['platform'] = 'Rockstar Games Launcher';
        foreach ($product['offers'] as &$offer) $offer['platform'] = $product['platform'];
        unset($offer);
    }
    if ($product['_id'] === 'forza-horizon-5') {
        $product['platform'] = 'Steam / Xbox / PC';
        foreach ($product['offers'] as &$offer) $offer['platform'] = $product['platform'];
        unset($offer);
    }
    if ($product['_id'] === 'the-witcher-3') unset($product['offers']);
}
unset($product);
$plan = catalogSeedPlan($existing, $definitions, $covers);
check(count(array_filter($plan, static fn($op) => isset($op['insertOne']))) === 23, 'Missing catalog additions must be inserted without duplication.');
$updated = applyInMemory($existing, $plan);
check(count($updated) === count($existing), 'Existing products must not be deleted.');
check(catalogSeedPlan($updated, $definitions, $covers) === [], 'Update must be repeatable.');
foreach ($existing as $before) {
    $after = array_values(array_filter($updated, static fn($p) => $p['_id'] === $before['_id']))[0];
    if (!in_array($before['_id'], ['gta-6-ultimate-edition', 'call-of-duty-modern-warfare-4'], true)) {
        check($after['imageUrl'] === $before['imageUrl'], 'Existing cover was overwritten.');
    }
    if (isset($before['offers'])) {
        foreach ($before['offers'] as $index => $offer) {
            foreach (['id', 'seller', 'price', 'region'] as $field) check($after['offers'][$index][$field] === $offer[$field], 'Existing offer changed.');
        }
    }
}
// A title already stored under another ID must not be inserted a second time.
$alias = $fresh[18];
$alias['_id'] = 'existing-detroit-id';
$alias['offers'] = [];
$aliasPlan = catalogSeedPlan([$alias], [$definitions[18]], $covers);
check(count(array_filter($aliasPlan, static fn($op) => isset($op['insertOne']))) === 0, 'Title alias duplicated.');
check($aliasPlan[0]['updateOne'][1]['$set']['offers'][0]['id'] === 'existing-detroit-id-offer-1', 'Offer must reference the existing ID.');
check(isset($aliasPlan[0]['updateOne'][0]['offers']), 'Updates must guard against concurrent offer changes.');
echo "PASS: 61 unique products, typed categories, platform-specific sellers, demo checkout, images, duplicate prevention, preservation and repeatable updates.\n";
