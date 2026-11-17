<?php

declare(strict_types=1);

function requestJson(): array
{
    $data = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($data)) {
        throw new InvalidArgumentException('Request body must be valid JSON.');
    }

    return $data;
}

function validateRegistrationName(string $name): string
{
    $name = trim($name);
    if ($name === '') {
        throw new InvalidArgumentException('Please enter your name.');
    }
    if (preg_match('/^[\p{L}\p{M}]+(?:[ \'\x{2019}-][\p{L}\p{M}]+)*$/u', $name) !== 1) {
        throw new InvalidArgumentException('Your name should contain letters, spaces, hyphens or apostrophes.');
    }
    if (strlen($name) > 80) {
        throw new InvalidArgumentException('Your name is too long.');
    }
    return $name;
}

function validateRegistrationEmail(string $email): string
{
    if (preg_match('/\s/u', $email) === 1) {
        throw new InvalidArgumentException('Email addresses cannot contain spaces.');
    }
    $email = strtolower($email);
    if (filter_var($email, FILTER_VALIDATE_EMAIL) === false || strlen($email) > 254) {
        throw new InvalidArgumentException('Please enter a valid email address.');
    }
    return $email;
}

function validateRegistrationPassword(string $password): string
{
    if ($password === '') {
        throw new InvalidArgumentException('Please enter your password.');
    }
    if (preg_match('/\s/u', $password) === 1) {
        throw new InvalidArgumentException('Password cannot contain spaces.');
    }
    if (strlen($password) < 8) {
        throw new InvalidArgumentException('Use at least 8 characters.');
    }
    if (strlen($password) > 72) {
        throw new InvalidArgumentException('Your password is too long. Choose a shorter one.');
    }
    return $password;
}

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

function demoKey(): string
{
    return 'DEMO-' . strtoupper(bin2hex(random_bytes(6)));
}

function favoriteUpdate(string $productId, string $action): array
{
    if ($productId === '' || strlen($productId) > 120 || !in_array($action, ['add', 'remove'], true)) {
        throw new InvalidArgumentException('Choose a valid product and favorite action.');
    }
    return $action === 'add' ? ['$addToSet' => ['favorites' => $productId]] : ['$pull' => ['favorites' => $productId]];
}

function offerById(array $product, string $offerId): ?array
{
    foreach (($product['offers'] ?? $product) as $offer) {
        $offer = documentArray($offer);
        if (($offer['id'] ?? null) === $offerId) {
            return $offer;
        }
    }

    return null;
}

function authenticatedUser(): ?array
{
    if (!isset($_SESSION['user']) || !is_array($_SESSION['user'])) {
        return null;
    }

    return $_SESSION['user'];
}

function requireUser(): array
{
    $user = authenticatedUser();
    if ($user === null) {
        http_response_code(401);
        echo json_encode(['error' => 'Sign in to continue.']);
        exit;
    }

    return $user;
}

function respondError(Throwable $error): void
{
    if ($error instanceof InvalidArgumentException) {
        http_response_code(400);
        echo json_encode(['error' => $error->getMessage()]);
        return;
    }

    error_log('Marketplace API error: ' . get_class($error));
    http_response_code(500);
    echo json_encode(['error' => 'The request could not be completed. Please try again.']);
}

function publicOrder(array $order): array
{
    $createdAt = $order['createdAt'] ?? null;
    return [
        'id' => (string) ($order['_id'] ?? ''),
        'createdAt' => $createdAt instanceof MongoDB\BSON\UTCDateTime ? $createdAt->toDateTime()->format(DATE_ATOM) : '',
        'total' => (float) ($order['total'] ?? 0),
        'paymentStatus' => (string) ($order['paymentStatus'] ?? ''),
        'items' => array_values(array_map(
            static fn($item): array => documentArray($item),
            documentArray($order['items'] ?? [])
        )),
    ];
}

// Resolve offers from server data, never from client prices.
function checkoutLines(array $input, callable $findProduct): array
{
    $cartItems = $input['items'] ?? null;
    if (!is_array($cartItems) || count($cartItems) < 1 || count($cartItems) > 20) {
        throw new InvalidArgumentException('Your cart must contain between 1 and 20 offers.');
    }
    $lines = [];
    $seenOffers = [];
    $totalCents = 0;
    foreach ($cartItems as $cartItem) {
        if (!is_array($cartItem) || !is_string($cartItem['offerId'] ?? null)) {
            throw new InvalidArgumentException('The cart contains an invalid offer.');
        }
        $offerId = $cartItem['offerId'];
        $quantity = filter_var($cartItem['quantity'] ?? null, FILTER_VALIDATE_INT);
        if ($offerId === '' || isset($seenOffers[$offerId]) || $quantity === false || $quantity < 1 || $quantity > 10) {
            throw new InvalidArgumentException('The cart contains an invalid offer or quantity.');
        }
        $seenOffers[$offerId] = true;
        $productDocument = $findProduct($offerId);
        if ($productDocument === null) {
            throw new InvalidArgumentException('An offer in your cart is no longer available.');
        }
        $product = documentArray($productDocument);
        $offer = offerById(documentArray($product['offers'] ?? []), $offerId);
        if ($offer === null) {
            throw new InvalidArgumentException('An offer in your cart is no longer available.');
        }
        $offer = documentArray($offer);
        $unitCents = (int) round((float) ($offer['price'] ?? 0) * 100);
        if ($unitCents < 1) {
            throw new InvalidArgumentException('An offer has an invalid price.');
        }
        $lineCents = $unitCents * $quantity;
        $totalCents += $lineCents;
        $keys = [];
        for ($unit = 0; $unit < $quantity; $unit++) {
            $keys[] = demoKey();
        }
        $lines[] = [
            'productId' => (string) ($product['_id'] ?? ''),
            'productName' => (string) ($product['name'] ?? ''),
            'productType' => (string) ($product['productType'] ?? 'game'),
            'duration' => (string) ($product['duration'] ?? ''),
            'redemptionPlatform' => (string) ($product['redemptionPlatform'] ?? $product['platform'] ?? ''),
            'offerId' => $offerId,
            'seller' => (string) ($offer['seller'] ?? ''),
            'quantity' => $quantity,
            'unitPrice' => $unitCents / 100,
            'lineTotal' => $lineCents / 100,
            'currency' => (string) ($offer['currency'] ?? 'EUR'),
            'demoKeys' => $keys,
        ];
    }

    return [$lines, $totalCents];
}
