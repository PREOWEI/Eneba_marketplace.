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
