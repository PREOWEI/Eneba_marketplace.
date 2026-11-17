<?php

declare(strict_types=1);

require_once __DIR__ . '/vendor/autoload.php';

function marketplaceCollection(string $name): MongoDB\Collection
{
    Dotenv\Dotenv::createImmutable(__DIR__)->safeLoad();
    $uri = $_ENV['MONGODB_URI'] ?? getenv('MONGODB_URI') ?: '';
    if ($uri === '') {
        throw new RuntimeException('MongoDB configuration is missing.');
    }

    $uriDatabase = trim((string) parse_url($uri, PHP_URL_PATH), '/');
    $database = $_ENV['MONGODB_DATABASE'] ?? getenv('MONGODB_DATABASE') ?: ($uriDatabase ?: 'eneba_marketplace');
    $client = new MongoDB\Client($uri, ['serverSelectionTimeoutMS' => 10000]);

    return $client->selectCollection($database, $name);
}

function productsCollection(): MongoDB\Collection
{
    return marketplaceCollection('products');
}
