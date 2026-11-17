<?php
declare(strict_types=1);

function productCoverManifest(): array
{
    return json_decode(file_get_contents(__DIR__ . '/data/product_covers.json'), true, 512, JSON_THROW_ON_ERROR);
}

function seededProductCover(string $id): string
{
    static $covers;
    $covers ??= productCoverManifest();
    return $covers[$id]['imageUrl'] ?? '/covers/fallback.svg';
}
