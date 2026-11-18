<?php
declare(strict_types=1);

function documentArray(mixed $document): array
{
    if (is_array($document)) {
        return $document;
    }

    return $document instanceof Traversable ? iterator_to_array($document) : [];
}

function publicProduct(array $product): array
{
    $product = documentArray($product);
    $offers = [];
    foreach (($product['offers'] ?? []) as $offer) {
        $offer = documentArray($offer);
        $offers[] = [
            'id' => (string) ($offer['id'] ?? ''),
            'seller' => (string) ($offer['seller'] ?? ''),
            'price' => (float) ($offer['price'] ?? $product['price'] ?? 0),
            'currency' => (string) ($offer['currency'] ?? $product['currency'] ?? 'EUR'),
            'platform' => (string) ($offer['platform'] ?? $product['platform'] ?? ''),
            'region' => (string) ($offer['region'] ?? $product['region'] ?? ''),
            'delivery' => (string) ($offer['delivery'] ?? 'Digital delivery'),
            'rating' => (float) ($offer['rating'] ?? 0),
            'ratingCount' => (int) ($offer['ratingCount'] ?? 0),
        ];
    }

    usort($offers, static fn(array $left, array $right): int => $left['price'] <=> $right['price']);
    $lowestPrice = $offers === [] ? (float) ($product['price'] ?? 0) : $offers[0]['price'];

    return [
        'id' => (string) ($product['_id'] ?? $product['id'] ?? ''),
        'name' => (string) ($product['name'] ?? ''),
        'platform' => (string) ($product['platform'] ?? ''),
        'region' => (string) ($product['region'] ?? ''),
        'price' => $lowestPrice,
        'originalPrice' => (float) ($product['originalPrice'] ?? 0),
        'currency' => (string) ($product['currency'] ?? 'EUR'),
        'description' => (string) ($product['description'] ?? ''),
        'imageUrl' => (string) ($product['imageUrl'] ?? ''),
        'productType' => (string) ($product['productType'] ?? 'game'),
        'deviceCategories' => array_values(documentArray($product['deviceCategories'] ?? [])),
        'duration' => (string) ($product['duration'] ?? ''),
        'redemptionPlatform' => (string) ($product['redemptionPlatform'] ?? ''),
        'source' => (string) ($product['source'] ?? ''),
        'offers' => $offers,
    ];
}

function homePayload(MongoDB\Collection $collection): array
{
    $products = [];
    // Rank curated products first; MongoDB otherwise sorts missing ranks first.
    $ranked = $collection->find(['bestsellerRank' => ['$gt' => 0]], ['sort' => ['bestsellerRank' => 1, 'name' => 1]]);
    $unranked = $collection->find(['$nor' => [['bestsellerRank' => ['$gt' => 0]]]], ['sort' => ['name' => 1]]);
    foreach ([...$ranked, ...$unranked] as $product) {
        $products[] = publicProduct(documentArray($product));
    }

    $bestsellers = array_slice($products, 0, 8);
    $deals = array_values(array_filter(
        $products,
        static fn(array $product): bool => $product['originalPrice'] > $product['price']
    ));
    usort($deals, static function (array $left, array $right): int {
        $leftDiscount = $left['originalPrice'] > 0 ? $left['price'] / $left['originalPrice'] : 1;
        $rightDiscount = $right['originalPrice'] > 0 ? $right['price'] / $right['originalPrice'] : 1;
        return $leftDiscount <=> $rightDiscount;
    });

    $bannerProducts = array_slice($bestsellers, 0, 3);
    $banners = [];
    foreach ($bannerProducts as $index => $product) {
        $banners[] = [
            'id' => $product['id'],
            'title' => $product['name'],
            'eyebrow' => $index === 0 ? 'Featured game' : 'Find your next game',
            'description' => $product['description'],
            'imageUrl' => $product['imageUrl'],
        ];
    }

    return [
        'banners' => $banners,
        'sections' => [
            ['id' => 'bestsellers', 'title' => 'Bestsellers', 'products' => $bestsellers],
            ['id' => 'deals', 'title' => 'Deals worth a look', 'products' => array_slice($deals, 0, 8)],
        ],
    ];
}
