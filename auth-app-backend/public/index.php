<?php
// PHP front controller (Apache) for API requests.
// This router keeps the same routes as the previous Express server.

declare(strict_types=1);

// ---- CORS + JSON headers ----
header("Access-Control-Allow-Origin: http://localhost:3000");
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 86400');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json; charset=utf-8');



if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit();
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$path = $uri ?? '/';
// When using Apache rewrite, REQUEST_URI may include /public prefix depending on deployment.
// Normalize so router always sees /api/*.
$path = preg_replace('#^/public/#', '/', $path);
// If running with rewrite targetting this file directly, Apache may set REQUEST_URI
// without the expected /api prefix. Normalize common cases.
$path = preg_replace('#^/api/#', '/api/', $path);

require_once __DIR__ . '/../src/config.php';

require_once __DIR__ . '/../src/lib.php';
require_once __DIR__ . '/../src/mongo.php';

$mongo = mongo();

// JWT middleware helpers
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$token = null;
if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $m)) {
  $token = trim($m[1]);
}

function requireAuth($token): array {
  $payload = verify_jwt($token);
  if (!$payload) {
    json_error(400, 'Token invalide');
  }
  return $payload;
}

function requireAdmin($user): void {
  if (($user['role'] ?? null) !== 'Admin') {
    json_error(403, 'Réservé aux admins');
  }
}

// Debug CORS/router issues (remove after fixing)
// If ?debug=1 is present, return detected method/path.
if (isset($_GET['debug']) && $_GET['debug'] === '1') {
  http_response_code(200);
  echo json_encode([
    'method' => $method,
    'path' => $path,
    'request_uri' => $_SERVER['REQUEST_URI'] ?? null,
    'full_url' => (isset($_SERVER['HTTP_HOST']) ? ('http://' . $_SERVER['HTTP_HOST'] . ($_SERVER['REQUEST_URI'] ?? '')) : null),
  ]);
  exit;
}


// ---- Routing ----
// Supported routes:
// POST /api/login
// POST /api/users
// GET /api/users
// DELETE /api/users/{id}

if ($path === '/api/register' && $method === 'POST') {
  // Public registration: role is forced to Caissière.
  $body = json_body();
  $email = $body['email'] ?? null;
  $password = $body['password'] ?? null;

  if (!$email || !$password) {
    json_error(400, 'Champs requis');
  }

  // create_user already checks duplicates and hashes in mongo.php via create_user() input.
  // We must hash here because create_user expects already hashed password.
  // (Currently create_user stores password directly; so hash here.)
  $hashed = password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);

  create_user($mongo, [
    'email' => $email,
    'password' => $hashed,
    'role' => 'Caissière',
  ]);

  $user = find_user_by_email($mongo, $email);
  if (!$user) {
    json_error(500, 'Erreur création');
  }

  $token = sign_jwt([
    'id' => (string)$user['_id'],
    'email' => $user['email'],
    'role' => $user['role'],
  ]);

  http_response_code(201);
  echo json_encode(['token' => $token, 'role' => $user['role'], 'email' => $user['email']], JSON_UNESCAPED_UNICODE);
  exit;
}

if ($path === '/api/login' && $method === 'POST') {
  $body = json_body();
  $email = $body['email'] ?? null;
  $password = $body['password'] ?? null;

  if (!$email || !$password) {
    json_error(400, 'Champs requis');
  }

  $user = find_user_by_email($mongo, $email);
  if (!$user) {
    json_error(404, 'Utilisateur non trouvé');
  }

  $ok = password_verify($password, $user['password']);
  if (!$ok) {
    json_error(400, 'Mot de passe incorrect');
  }

  $token = sign_jwt([
    'id' => (string)$user['_id'],
    'email' => $user['email'],
    'role' => $user['role'],
  ]);

  http_response_code(200);
  echo json_encode([
    'token' => $token,
    'role' => $user['role'],
    'email' => $user['email'],

    // Personal info (optional)
    'fullName' => $user['fullName'] ?? null,
    'phone' => $user['phone'] ?? null,
    'address' => $user['address'] ?? null,
    'birthDate' => $user['birthDate'] ?? null,
    'accentColor' => $user['accentColor'] ?? null,
  ], JSON_UNESCAPED_UNICODE);
  exit;
}

if ($path === '/api/users' && ($method === 'GET' || $method === 'POST')) {
  if (!$token) {
    json_error(401, 'Accès refusé : token manquant');
  }

  $userPayload = requireAuth($token);
  requireAdmin($userPayload);

  if ($method === 'GET') {
    $users = list_users($mongo);
    http_response_code(200);
    echo json_encode($users, JSON_UNESCAPED_UNICODE);
    exit;
  }

  // POST
  $body = json_body();
  $email = $body['email'] ?? null;
  $password = $body['password'] ?? null;
  $role = $body['role'] ?? 'Caissière';

  // Personal info (optional)
  $fullName = $body['fullName'] ?? null;
  $phone = $body['phone'] ?? null;
  $address = $body['address'] ?? null;
  $birthDate = $body['birthDate'] ?? null;
  $accentColor = $body['accentColor'] ?? null;

  if (!$email || !$password) {
    json_error(400, 'Champs requis');
  }

  $hashed = password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);

  create_user($mongo, [
    'email' => $email,
    'password' => $hashed,
    'role' => $role,

    'fullName' => $fullName,
    'phone' => $phone,
    'address' => $address,
    'birthDate' => $birthDate,
    'accentColor' => $accentColor,
  ]);

  http_response_code(201);
  echo json_encode(['message' => 'Utilisateur créé'], JSON_UNESCAPED_UNICODE);
  exit;
}

if (preg_match('#^/api/users/([a-fA-F0-9]+)$#', $path, $m) && $method === 'DELETE') {
  if (!$token) {
    json_error(401, 'Accès refusé : token manquant');
  }

  $userPayload = requireAuth($token);
  requireAdmin($userPayload);

  $id = $m[1];
  delete_user_by_id($mongo, $id);

  http_response_code(200);
  echo json_encode(['message' => 'Utilisateur supprimé']);
  exit;
}

json_error(404, 'Not found');


