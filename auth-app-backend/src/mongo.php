<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

function mongo(): MongoDB\Driver\Manager {
  static $manager = null;
  if ($manager) return $manager;

  $uri = mongodb_uri();

  // For DEV parity with previous Node code.
  // The mongodb:// URI can include tls options. We keep it simple here.
  $manager = new MongoDB\Driver\Manager($uri);
  return $manager;
}

function users_collection(MongoDB\Driver\Manager $mongo): MongoDB\Driver\Collection {
  // Default DB name derived from URI is not handled here; we explicitly set it by parsing URI.
  // If your URI contains /<db>, the driver can still work with the given namespace.
  $uri = mongodb_uri();

  $dbName = 'test';
  $path = parse_url($uri, PHP_URL_PATH);
  if (is_string($path) && trim($path) !== '') {
    $dbName = trim($path, '/');
  }

  return new MongoDB\Driver\Collection($mongo, $dbName . '.users');
}

function find_user_by_email(MongoDB\Driver\Manager $mongo, string $email): ?array {
  $collection = users_collection($mongo);

  $filter = ['email' => $email];
  $options = ['limit' => 1];

  $cursor = $collection->find($filter, $options);
  foreach ($cursor as $doc) {
    return (array)$doc;
  }
  return null;
}

function create_user(MongoDB\Driver\Manager $mongo, array $user): void {
  $collection = users_collection($mongo);

  $doc = [
    'email' => $user['email'],
    'password' => $user['password'],
    'role' => $user['role'] ?? 'Caissière',

    // Personal / aesthetic information (optional)
    'fullName' => $user['fullName'] ?? null,
    'phone' => $user['phone'] ?? null,
    'address' => $user['address'] ?? null,
    'birthDate' => $user['birthDate'] ?? null, // ISO: YYYY-MM-DD (optional)
    'accentColor' => $user['accentColor'] ?? null,
  ];

  // Normalize empties to null
  foreach (['fullName', 'phone', 'address', 'birthDate', 'accentColor'] as $k) {
    if (isset($doc[$k]) && is_string($doc[$k]) && trim($doc[$k]) === '') {
      $doc[$k] = null;
    }
  }

  // Prevent duplicate inserts (best-effort)
  $existing = find_user_by_email($mongo, (string)$doc['email']);
  if ($existing) {
    http_response_code(409);
    echo json_encode(['error' => 'Utilisateur existe déjà'], JSON_UNESCAPED_UNICODE);
    exit;
  }

  $collection->insertOne($doc);
}

function list_users(MongoDB\Driver\Manager $mongo): array {
  $collection = users_collection($mongo);

  $cursor = $collection->find([], ['sort' => ['_id' => -1]]);
  $out = [];

  foreach ($cursor as $doc) {
    $arr = (array)$doc;

    // Never expose password in list endpoints
    unset($arr['password']);

    if (isset($arr['_id'])) {
      $arr['_id'] = (string)$arr['_id'];
    }

    $out[] = $arr;
  }

  return $out;
}

function delete_user_by_id(MongoDB\Driver\Manager $mongo, string $id): void {
  $collection = users_collection($mongo);

  // MongoDB ObjectId
  $filter = ['_id' => new MongoDB\BSON\ObjectId($id)];
  $collection->deleteOne($filter);
}

