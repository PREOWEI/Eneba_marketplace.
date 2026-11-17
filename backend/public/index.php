<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

if ($path === '/api/health' && $method === 'GET') {
    http_response_code(200);

    echo json_encode([
        'status' => 'ok',
        'phpVersion' => PHP_VERSION
    ]);

    exit;
}

require_once __DIR__ . '/../marketplace.php';
session_set_cookie_params([
    'httponly' => true,
    // Render terminates TLS before forwarding to Apache.
    'secure' => getenv('APP_ENV') === 'production' || (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
    'samesite' => 'Lax',
    'path' => '/',
]);
session_start();

if ($path === '/api/home' && $method === 'GET') {
    try {
        require_once __DIR__ . '/../database.php';
        echo json_encode(homePayload(productsCollection()), JSON_THROW_ON_ERROR);
    } catch (Throwable $error) {
        http_response_code(500);
        echo json_encode(['error' => 'Unable to load the storefront.']);
    }
    exit;
}

if ($path === '/api/auth/me' && $method === 'GET') {
    echo json_encode(['user' => authenticatedUser()], JSON_THROW_ON_ERROR);
    exit;
}

if ($path === '/api/favorites' && $method === 'GET') {
    $user = requireUser();
    try {
        require_once __DIR__ . '/../database.php';
        $account = marketplaceCollection('users')->findOne(['_id' => $user['id']]);
        $accountData = documentArray($account);
        $favoriteIds = array_values(array_map('strval', documentArray($accountData['favorites'] ?? [])));
        $favorites = [];
        if ($favoriteIds !== []) {
            $cursor = productsCollection()->find(['_id' => ['$in' => $favoriteIds]]);
            $byId = [];
            foreach ($cursor as $product) {
                $product = documentArray($product);
                $byId[(string) $product['_id']] = publicProduct($product);
            }
            foreach ($favoriteIds as $id) if (isset($byId[$id])) $favorites[] = $byId[$id];
        }
        echo json_encode(['favoriteIds' => $favoriteIds, 'products' => $favorites], JSON_THROW_ON_ERROR);
    } catch (Throwable $error) { respondError($error); }
    exit;
}

if ($path === '/api/favorites' && $method === 'POST') {
    $user = requireUser();
    try {
        $input = requestJson();
        $productId = $input['productId'] ?? null;
        $action = $input['action'] ?? null;
        if (!is_string($productId) || !is_string($action)) throw new InvalidArgumentException('Choose a valid product and favorite action.');
        $update = favoriteUpdate($productId, $action);
        require_once __DIR__ . '/../database.php';
        if (productsCollection()->findOne(['_id' => $productId], ['projection' => ['_id' => 1]]) === null) {
            http_response_code(404);
            echo json_encode(['error' => 'Product not found.']);
            exit;
        }
        marketplaceCollection('users')->updateOne(['_id' => $user['id']], $update);
        $account = documentArray(marketplaceCollection('users')->findOne(['_id' => $user['id']]));
        echo json_encode(['favoriteIds' => array_values(array_map('strval', documentArray($account['favorites'] ?? [])))], JSON_THROW_ON_ERROR);
    } catch (Throwable $error) { respondError($error); }
    exit;
}

if ($path === '/api/auth/register' && $method === 'POST') {
    try {
        $input = requestJson();
        $name = $input['name'] ?? null;
        $email = $input['email'] ?? null;
        $password = $input['password'] ?? null;
        if (!is_string($name) || !is_string($email) || !is_string($password)) {
            throw new InvalidArgumentException('Enter a name, valid email address, and password.');
        }
        $name = validateRegistrationName($name);
        $email = validateRegistrationEmail($email);
        $password = validateRegistrationPassword($password);

        require_once __DIR__ . '/../database.php';
        $users = marketplaceCollection('users');
        if ($users->findOne(['_id' => $email]) !== null) {
            http_response_code(409);
            echo json_encode(['error' => 'An account with that email already exists.']);
            exit;
        }
        $users->insertOne([
            '_id' => $email,
            'name' => $name,
            'email' => $email,
            'passwordHash' => password_hash($password, PASSWORD_DEFAULT),
            'createdAt' => new MongoDB\BSON\UTCDateTime(),
        ]);
        $user = ['id' => $email, 'name' => $name, 'email' => $email];
        session_regenerate_id(true);
        $_SESSION['user'] = $user;
        http_response_code(201);
        echo json_encode(['user' => $user], JSON_THROW_ON_ERROR);
    } catch (Throwable $error) {
        respondError($error);
    }
    exit;
}

if ($path === '/api/auth/login' && $method === 'POST') {
    try {
        $input = requestJson();
        $email = $input['email'] ?? null;
        $password = $input['password'] ?? null;
        if (!is_string($email) || !is_string($password) || trim($email) === '' || $password === '') {
            throw new InvalidArgumentException('Enter your email and password.');
        }
        $email = strtolower(trim($email));
        require_once __DIR__ . '/../database.php';
        $account = marketplaceCollection('users')->findOne(['_id' => $email]);
        $account = $account === null ? [] : documentArray($account);
        if (!isset($account['passwordHash']) || !password_verify($password, $account['passwordHash'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Email or password is incorrect.']);
            exit;
        }
        $user = ['id' => $email, 'name' => (string) $account['name'], 'email' => $email];
        session_regenerate_id(true);
        $_SESSION['user'] = $user;
        echo json_encode(['user' => $user], JSON_THROW_ON_ERROR);
    } catch (Throwable $error) {
        respondError($error);
    }
    exit;
}

if ($path === '/api/auth/logout' && $method === 'POST') {
    unset($_SESSION['user']);
    session_regenerate_id(true);
    echo json_encode(['user' => null]);
    exit;
}

if ($path === '/api/orders' && $method === 'GET') {
    $user = requireUser();
    try {
        require_once __DIR__ . '/../database.php';
        $orders = [];
        foreach (marketplaceCollection('orders')->find(['userId' => $user['id']], ['sort' => ['createdAt' => -1]]) as $order) {
            $order = documentArray($order);
            $orders[] = publicOrder($order);
        }
        echo json_encode($orders, JSON_THROW_ON_ERROR);
    } catch (Throwable $error) {
        respondError($error);
    }
    exit;
}

if ($path === '/api/checkout' && $method === 'POST') {
    $user = requireUser();
    try {
        $input = requestJson();
        require_once __DIR__ . '/../database.php';
        $products = productsCollection();
        [$lines, $totalCents] = checkoutLines($input,
            static fn(string $offerId) => $products->findOne(['offers.id' => $offerId]));

        $order = [
            'userId' => $user['id'],
            'createdAt' => new MongoDB\BSON\UTCDateTime(),
            'paymentStatus' => 'simulated-paid',
            'paymentMethod' => 'demo',
            'total' => $totalCents / 100,
            'currency' => 'EUR',
            'items' => $lines,
        ];
        $inserted = marketplaceCollection('orders')->insertOne($order);
        $order['id'] = (string) $inserted->getInsertedId();
        $order['createdAt'] = gmdate(DATE_ATOM);
        unset($order['userId']);
        echo json_encode($order, JSON_THROW_ON_ERROR);
    } catch (Throwable $error) {
        respondError($error);
    }
    exit;
}

if ($path === '/api/products/suggestions' && $method === 'GET') {
    try {
        require_once __DIR__ . '/../database.php';
        require_once __DIR__ . '/../product_suggestions.php';
        echo json_encode(productSuggestions(productsCollection(), $_GET), JSON_THROW_ON_ERROR);
    } catch (InvalidArgumentException $error) {
        http_response_code(400);
        echo json_encode(['error' => $error->getMessage()]);
    } catch (Throwable $error) {
        http_response_code(500);
        echo json_encode(['error' => 'Unable to retrieve suggestions']);
    }
    exit;
}

if ($path === '/api/products/filters' && $method === 'GET') {
    try {
        require_once __DIR__ . '/../database.php';
        $collection = productsCollection();
        $platforms = $collection->distinct('platform');
        $regions = $collection->distinct('region');
        sort($platforms);
        sort($regions);
        echo json_encode(['platforms' => $platforms, 'regions' => $regions], JSON_THROW_ON_ERROR);
    } catch (Throwable $error) {
        http_response_code(500);
        echo json_encode(['error' => 'Unable to retrieve filters']);
    }
    exit;
}

if ($path === '/api/products' && $method === 'GET') {
    try {
        require_once __DIR__ . '/../database.php';
        require_once __DIR__ . '/../product_query.php';
        $collection = productsCollection();
        [$filter, $options] = productQuery($collection, $_GET);

        $products = [];

        foreach ($collection->find($filter, $options) as $product) {
            $products[] = [
                'id' => (string) $product['_id'],
                'name' => $product['name'],
                'platform' => $product['platform'],
                'region' => $product['region'],
                'price' => $product['price'],
                'originalPrice' => $product['originalPrice'] ?? 0,
                'currency' => $product['currency'] ?? 'EUR',
                'description' => $product['description'],
                'imageUrl' => $product['imageUrl'],
                'productType' => $product['productType'] ?? 'game',
                'deviceCategories' => $product['deviceCategories'] ?? [],
                'duration' => $product['duration'] ?? '',
                'redemptionPlatform' => $product['redemptionPlatform'] ?? '',
                'source' => $product['source'] ?? '',
            ];
        }

        $response = json_encode($products, JSON_THROW_ON_ERROR);

    } catch (InvalidArgumentException $error) {
        http_response_code(400);
        echo json_encode(['error' => $error->getMessage()]);
        exit;
    } catch (Throwable $error) {
        http_response_code(500);
        echo json_encode([
            'error' => 'Unable to retrieve products'
        ]);
        exit;
    }

    http_response_code(200);
    echo $response;
    exit;
}

if (preg_match('#^/api/products/([^/]+)$#', (string) $path, $matches) === 1 && $method === 'GET') {
    try {
        require_once __DIR__ . '/../database.php';
        $product = productsCollection()->findOne(['_id' => rawurldecode($matches[1])]);
        if ($product === null) {
            http_response_code(404);
            echo json_encode(['error' => 'Game not found.']);
            exit;
        }
        echo json_encode(publicProduct(documentArray($product)), JSON_THROW_ON_ERROR);
    } catch (Throwable $error) {
        respondError($error);
    }
    exit;
}

http_response_code(404);

echo json_encode([
    'error' => 'Route not found'
]);
