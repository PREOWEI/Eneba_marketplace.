<?php
declare(strict_types=1);

function demoKey(): string
{
    return 'DEMO-' . strtoupper(bin2hex(random_bytes(6)));
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
