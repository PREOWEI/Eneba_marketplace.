<?php

declare(strict_types=1);

require_once __DIR__ . '/../database.php';
require_once __DIR__ . '/../catalog_seed.php';

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
$arguments = array_slice($argv, 1);
if (array_diff($arguments, ['--apply', '--dry-run', '--artwork-only']) !== [] || (in_array('--apply', $arguments, true) && in_array('--dry-run', $arguments, true))) {
    fwrite(STDERR, "Usage: php backend/scripts/seed_products.php [--dry-run|--apply] [--artwork-only]\n");
    exit(1);
}
$apply = in_array('--apply', $arguments, true);
try {
    $collection = productsCollection();
    $existing = $collection->find([], ['typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array']])->toArray();
    $planner = in_array('--artwork-only', $arguments, true) ? 'catalogArtworkPlan' : 'catalogSeedPlan';
    $plan = $planner($existing, catalogDefinitions(), productCoverManifest());
    echo $apply ? "Applying catalog changes.\n" : "DRY RUN: no MongoDB writes. Use --apply to save this plan.\n";
    foreach ($plan as $operation) {
        if (isset($operation['insertOne'])) {
            $product = $operation['insertOne'][0];
            echo 'ADD ' . $product['_id'] . ' | ' . $product['platform'] . PHP_EOL;
            if ($apply) $collection->insertOne($product);
        } else {
            [$filter, $update, $options] = $operation['updateOne'];
            echo 'UPDATE ' . $filter['_id'] . ' | ' . implode(', ', array_keys($update['$set'])) . PHP_EOL;
            if ($apply && $collection->updateOne($filter, $update, $options)->getMatchedCount() !== 1) {
                throw new RuntimeException('A product changed since planning; review and rerun.');
            }
        }
    }
    echo count($plan) . ' planned operations. ' . ($apply ? 'Applied.' : 'Nothing written.') . PHP_EOL;
} catch (Throwable $error) {
    // Never print driver messages or connection strings. Earlier successful writes
    // may remain; the planner is repeatable and skips already-completed changes.
    fwrite(STDERR, 'Catalog update stopped (' . get_class($error) . '). Review the catalog and retry; completed operations are safe to repeat.' . PHP_EOL);
    exit(1);
}
