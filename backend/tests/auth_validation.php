<?php

declare(strict_types=1);

require_once __DIR__ . '/../marketplace.php';

function expectValidationError(callable $callback, string $message): void
{
    try {
        $callback();
    } catch (InvalidArgumentException) {
        return;
    }
    throw new RuntimeException($message);
}

if (validateRegistrationEmail('y@gmail.com') !== 'y@gmail.com') {
    throw new RuntimeException('Valid email was not accepted.');
}
foreach (['   y@gmail.com', 'y@gmail.com   ', 'y @gmail.com'] as $email) {
    expectValidationError(static fn() => validateRegistrationEmail($email), 'Email with spaces was accepted.');
}

expectValidationError(static fn() => validateRegistrationName('---------'), 'Symbol-only name was accepted.');
if (validateRegistrationName('Samuel John') !== 'Samuel John') {
    throw new RuntimeException('Name with spaces was not accepted.');
}
if (validateRegistrationName("Zoë O'Connor") !== "Zoë O'Connor") {
    throw new RuntimeException('International apostrophe name was not accepted.');
}

expectValidationError(static fn() => validateRegistrationPassword('        '), 'Whitespace-only password was accepted.');
if (validateRegistrationPassword('Samuel@2026') !== 'Samuel@2026') {
    throw new RuntimeException('Valid password was not accepted.');
}
expectValidationError(static fn() => validateRegistrationPassword('Samuel @2026'), 'Password with spaces was accepted.');

echo "PASS: registration email, name and password validation.\n";
