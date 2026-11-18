<?php
declare(strict_types=1);

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
