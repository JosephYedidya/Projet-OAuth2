<?php
declare(strict_types=1);

function env(string $key, mixed $default = null): mixed {
  $val = getenv($key);
  if ($val === false) return $default;
  return $val;
}

function jwt_secret(): string {
  $secret = env('JWT_SECRET');
  if (!$secret) {
    // Keep compatibility with old setup; fail fast.
    // In production you should inject secrets properly.
    throw new RuntimeException('Missing env JWT_SECRET');
  }
  return (string)$secret;
}

function mongodb_uri(): string {
  $uri = env('MONGODB_URI');
  if (!$uri) throw new RuntimeException('Missing env MONGODB_URI');
  return (string)$uri;
}

