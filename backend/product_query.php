<?php
declare(strict_types=1);

function normalizeProductName(string $text): string
{
    return trim(preg_replace('/[^a-z0-9]+/', ' ', strtolower($text)));
}

// Small-catalog fuzzy search: partial words, up to two edits, and transpositions.
function matchesProductName(string $name, string $query): bool
{
    $name = normalizeProductName($name);
    $query = normalizeProductName($query);
    if ($query === '') return false;
    if (str_contains($name, $query)) return true;
    foreach (explode(' ', $query) as $term) {
        $found = false;
        foreach (explode(' ', $name) as $word) {
            $limit = strlen($term) >= 6 ? 2 : (strlen($term) >= 4 ? 1 : 0);
            $transposed = false;
            for ($i = 0; $i < strlen($term) - 1; $i++) {
                $swap = $term;
                [$swap[$i], $swap[$i + 1]] = [$swap[$i + 1], $swap[$i]];
                if ($swap === $word) $transposed = true;
            }
            if (str_contains($word, $term) || levenshtein($term, $word) <= $limit || $transposed) {
                $found = true;
                break;
            }
        }
        if (!$found) return false;
    }
    return true;
}

function productCategoryFilter(string $category): array
{
    if (in_array($category, ['gift-cards', 'subscriptions', 'game-credits'], true)) {
        return ['productType' => match ($category) {
            'gift-cards' => 'gift-card', 'subscriptions' => 'subscription', default => 'game-credit',
        }];
    }
    if (in_array($category, ['pc', 'playstation', 'xbox'], true)) {
        $platformPattern = match ($category) {
            'playstation' => 'playstation|\\bps[345]\\b',
            'xbox' => 'xbox',
            default => '\\b(pc|steam|gog|epic|ea app|origin|ubisoft|uplay|battle\\.net|rockstar|windows)\\b',
        };
        return ['$and' => [
            ['$or' => [['productType' => 'game'], ['productType' => ['$exists' => false]]]],
            ['$or' => [
                ['deviceCategories' => $category],
                ['$and' => [
                    ['$or' => [['deviceCategories' => ['$exists' => false]], ['deviceCategories' => []]]],
                    ['platform' => ['$regex' => $platformPattern, '$options' => 'i']],
                ]],
            ]],
        ]];
    }
    if ($category === 'deals') return ['$expr' => ['$gt' => ['$originalPrice', '$price']]];
    if ($category !== '' && $category !== 'all') throw new InvalidArgumentException('Invalid product category.');
    return [];
}

function productQuery(MongoDB\Collection $collection, array $input): array
{
    foreach (['q', 'id', 'platform', 'activation', 'productName', 'productType', 'region', 'minPrice', 'maxPrice', 'sort', 'category', 'onSaleOnly'] as $key) {
        if (isset($input[$key]) && (!is_string($input[$key]) || strlen($input[$key]) > 120)) {
            throw new InvalidArgumentException('Invalid query parameter: ' . $key);
        }
    }
    $filter = [];
    if (($input['id'] ?? '') !== '') $filter['_id'] = $input['id'];
    foreach (['platform', 'productType', 'region'] as $field) {
        if (trim($input[$field] ?? '') !== '') $filter[$field] = trim($input[$field]);
    }
    $facetConditions = [];
    if (trim($input['activation'] ?? '') !== '') {
        $activation = trim($input['activation']);
        $facetConditions[] = ['$or' => [['platform' => $activation], ['redemptionPlatform' => $activation]]];
    }
    if (trim($input['productName'] ?? '') !== '') $facetConditions[] = ['name' => trim($input['productName'])];
    if ($facetConditions !== []) $filter['$and'] = array_merge($filter['$and'] ?? [], $facetConditions);
    $filter = array_merge($filter, productCategoryFilter($input['category'] ?? ''));
    if (($input['onSaleOnly'] ?? '') === '1') $filter['$expr'] = ['$gt' => ['$originalPrice', '$price']];
    foreach (['minPrice' => '$gte', 'maxPrice' => '$lte'] as $key => $operator) {
        if (($input[$key] ?? '') !== '') {
            if (!is_numeric($input[$key]) || !is_finite((float) $input[$key]) || (float) $input[$key] < 0) {
                throw new InvalidArgumentException('Prices must be non-negative numbers.');
            }
            $filter['price'][$operator] = (float) $input[$key];
        }
    }
    if (isset($filter['price']['$gte'], $filter['price']['$lte']) && $filter['price']['$gte'] > $filter['price']['$lte']) {
        throw new InvalidArgumentException('Minimum price must not exceed maximum price.');
    }
    $sorts = ['default' => ['_id' => 1], 'name' => ['name' => 1, '_id' => 1], 'name_asc' => ['name' => 1, '_id' => 1], 'name_desc' => ['name' => -1, '_id' => 1], 'price_asc' => ['price' => 1, 'name' => 1], 'price_desc' => ['price' => -1, 'name' => 1]];
    $sort = $input['sort'] ?? 'default';
    if (!isset($sorts[$sort])) throw new InvalidArgumentException('Invalid sort order.');
    $query = trim($input['q'] ?? '');
    if ($query !== '') {
        $names = $collection->distinct('name', $filter);
        $filter['name'] = ['$in' => array_values(array_filter($names, fn($name) => matchesProductName($name, $query)))];
    }
    return [$filter, ['sort' => $sorts[$sort], 'collation' => ['locale' => 'en', 'strength' => 2]]];
}
