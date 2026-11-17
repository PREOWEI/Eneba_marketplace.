<?php
declare(strict_types=1);
require_once __DIR__ . '/product_query.php';

function productSuggestions(MongoDB\Collection $collection, array $input): array
{
    unset($input['id']);
    [$filter, $options] = productQuery($collection, $input);
    $query = normalizeProductName($input['q'] ?? '');
    if ($query === '') return ['items' => [], 'didYouMean' => null];

    // Reuse the catalog's fuzzy matching and MongoDB constraints; rank this small
    // candidate set by relevance before limiting to five (not alphabetically first).
    $items = [];
    foreach ($collection->find($filter, $options) as $product) {
        $items[] = [
            'id' => (string) $product['_id'], 'name' => $product['name'],
            'platform' => $product['platform'], 'region' => $product['region'],
            'price' => $product['price'], 'imageUrl' => $product['imageUrl'] ?? '',
            'productType' => $product['productType'] ?? 'game',
            'deviceCategories' => $product['deviceCategories'] ?? [],
            'originalPrice' => $product['originalPrice'] ?? 0,
        ];
    }
    $rank = function (array $item) use ($query): array {
        $name = normalizeProductName($item['name']);
        return [$name === $query ? 0 : (str_starts_with($name, $query) ? 1 : (str_contains($name, $query) ? 2 : 3)), levenshtein($query, $name), $name, $item['id']];
    };
    usort($items, fn(array $a, array $b): int => $rank($a) <=> $rank($b));
    $literalMatch = false;
    foreach ($items as $item) {
        $name = normalizeProductName($item['name']);
        if (array_all(explode(' ', $query), fn($word) => str_contains($name, $word))) $literalMatch = true;
    }
    return ['items' => array_slice($items, 0, 5), 'didYouMean' => !$literalMatch && $items !== [] ? $items[0]['name'] : null];
}
