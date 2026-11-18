<?php
declare(strict_types=1);

function favoriteUpdate(string $productId, string $action): array
{
    if ($productId === '' || strlen($productId) > 120 || !in_array($action, ['add', 'remove'], true)) {
        throw new InvalidArgumentException('Choose a valid product and favorite action.');
    }
    return $action === 'add' ? ['$addToSet' => ['favorites' => $productId]] : ['$pull' => ['favorites' => $productId]];
}
