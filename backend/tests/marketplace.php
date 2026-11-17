<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../marketplace.php';
require_once __DIR__ . '/../product_query.php';

function assertSameValue(mixed $actual, mixed $expected, string $message): void
{
    if ($actual !== $expected) {
        throw new RuntimeException($message . ': ' . var_export($actual, true));
    }
}

$product = [
    '_id' => 'sample-game',
    'name' => 'Sample Game',
    'platform' => 'Steam',
    'region' => 'Europe',
    'price' => 12.99,
    'originalPrice' => 24.99,
    'imageUrl' => '/covers/sample.jpg',
    'offers' => [
        ['id' => 'seller-a', 'seller' => 'Seller A', 'price' => 13.99],
        ['id' => 'seller-b', 'seller' => 'Seller B', 'price' => 11.99],
    ],
];

$public = publicProduct($product);
assertSameValue($public['id'], 'sample-game', 'Product id is exposed');
assertSameValue($public['price'], 11.99, 'Catalog price is the lowest offer');
assertSameValue($public['offers'][0]['id'], 'seller-b', 'Offers are ordered by price');
assertSameValue(offerById($product, 'seller-a')['seller'] ?? null, 'Seller A', 'Offer lookup uses the exact id');
assertSameValue(offerById($product, 'missing'), null, 'Missing offers are rejected');
assertSameValue(productCategoryFilter('gift-cards'), ['productType' => 'gift-card'], 'Gift cards use their own product type');
foreach (['pc' => 'Steam', 'playstation' => 'PlayStation 5', 'xbox' => 'Xbox Series X|S'] as $category => $platform) {
    $filter = productCategoryFilter($category);
    assertSameValue($filter['$and'][0]['$or'][1], ['productType' => ['$exists' => false]], 'Legacy games without a product type remain eligible');
    assertSameValue($filter['$and'][1]['$or'][0], ['deviceCategories' => $category], 'Explicit device editions remain supported');
    $pattern = $filter['$and'][1]['$or'][1]['$and'][1]['platform']['$regex'];
    assertSameValue(preg_match('~' . $pattern . '~i', $platform), 1, 'Legacy activation platform matches its device category');
}
assertSameValue(favoriteUpdate('elden-ring', 'add'), ['$addToSet' => ['favorites' => 'elden-ring']], 'Favorites add without duplicates');
assertSameValue(favoriteUpdate('elden-ring', 'remove'), ['$pull' => ['favorites' => 'elden-ring']], 'Favorites remove by ID');

for ($attempt = 0; $attempt < 20; $attempt++) {
    if (preg_match('/^DEMO-[A-F0-9]{12}$/', demoKey()) !== 1) {
        throw new RuntimeException('Generated keys must be visibly labeled demo keys.');
    }
}

echo "PASS: typed category filters, favorite idempotency, public offer prices, offer lookup and non-redeemable demo code format.\n";

// Real BSON containers reproduce the order-history failure without a database.
$storedOrder = new MongoDB\Model\BSONDocument([
    '_id' => new MongoDB\BSON\ObjectId(),
    'createdAt' => new MongoDB\BSON\UTCDateTime(0),
    'total' => 27.98,
    'items' => new MongoDB\Model\BSONArray([
        new MongoDB\Model\BSONDocument(['productName' => 'Sample Game', 'demoKeys' => new MongoDB\Model\BSONArray(['DEMO-ABCDEF012345'])]),
    ]),
]);
$history = json_decode(json_encode(publicOrder(documentArray($storedOrder)), JSON_THROW_ON_ERROR), true);
assertSameValue($history['items'][0]['demoKeys'][0], 'DEMO-ABCDEF012345', 'BSON order keys survive JSON serialization');
assertSameValue(count($history['items']), 1, 'BSON order items are returned as a JSON list');

$lookup = static fn(string $id) => $id === 'seller-a' ? $product : null;
[$lines, $cents] = checkoutLines(['items' => [['offerId' => 'seller-a', 'quantity' => 2, 'price' => 0.01]]], $lookup);
assertSameValue($cents, 2798, 'Checkout ignores forged client prices and calculates in cents');
assertSameValue(count($lines[0]['demoKeys']), 2, 'Each purchased unit receives a demo key');
foreach ([[], [['offerId' => 'missing', 'quantity' => 1]], [['offerId' => 'seller-a', 'quantity' => 0]], [['offerId' => 'seller-a', 'quantity' => 11]], [['offerId' => 'seller-a', 'quantity' => 1], ['offerId' => 'seller-a', 'quantity' => 1]]] as $items) {
    try {
        checkoutLines(['items' => $items], $lookup);
        throw new RuntimeException('Invalid checkout was accepted.');
    } catch (InvalidArgumentException) {
        // Expected: no database writes occur in this test.
    }
}
echo "PASS: BSON order history, trusted prices, quantities, missing/duplicate offers and per-unit keys.\n";
