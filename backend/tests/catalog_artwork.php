<?php
declare(strict_types=1);
require_once __DIR__ . '/../catalog_seed.php';
function checkArtwork(bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
}
$definitions = catalogDefinitions();
$covers = productCoverManifest();
$existing = [];
foreach ($definitions as $definition) {
    $existing[$definition['id']] = ['_id' => $definition['id'], 'imageUrl' => '/old-cover.png',
        'name' => 'Existing name', 'price' => 23.45, 'region' => 'Existing region',
        'offers' => [['id' => 'existing-offer', 'price' => 9.87]]];
}
$plan = catalogArtworkPlan(array_values($existing), $definitions, $covers);
checkArtwork(count($plan) === 18, 'Exactly 18 distinct artwork updates expected.');
foreach ($plan as $operation) {
    [$filter, $update, $options] = $operation['updateOne'];
    checkArtwork(array_keys($update['$set']) === ['imageUrl'], 'Only imageUrl may change.');
    checkArtwork($options === ['upsert' => false], 'No inserts permitted.');
    checkArtwork($filter['imageUrl'] === '/old-cover.png', 'Protect concurrent artwork edits.');
    $id = $filter['_id'];
    $original = $existing[$id];
    $existing[$id] = array_replace($original, $update['$set']);
    unset($original['imageUrl']);
    $updated = $existing[$id];
    unset($updated['imageUrl']);
    checkArtwork($original === $updated, 'Preserve all non-artwork fields.');
    checkArtwork(str_starts_with($covers[$id]['imageUrl'], 'https://'), 'Use verified direct HTTPS artwork.');
}
checkArtwork(catalogArtworkPlan(array_values($existing), $definitions, $covers) === [], 'Repeat run must be a no-op.');
unset($existing['steam-wallet-10']);
try {
    catalogArtworkPlan(array_values($existing), $definitions, $covers);
    throw new LogicException('Missing target was not rejected.');
} catch (RuntimeException $error) {
    checkArtwork(str_contains($error->getMessage(), 'steam-wallet-10'), 'Missing target must be identified.');
}
echo "PASS: 18 artwork-only updates, duplicate IDs, field preservation, concurrency guard, missing targets and idempotence.\n";
