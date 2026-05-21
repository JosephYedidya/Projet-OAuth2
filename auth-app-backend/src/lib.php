<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

function json_error(int $code, string $message): void {
  http_response_code($code);
  echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
  exit;
}

function json_body(): array {
  $raw = file_get_contents('php://input');
  if ($raw === false || $raw === '') return [];
  $data = json_decode($raw, true);
  if (!is_array($data)) return [];
  return $data;
}

// Minimal JWT implementation (HS256) using built-in hash functions.
function base64url_encode(string $data): string {
  return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode(string $data): string {
  $remainder = strlen($data) % 4;
  if ($remainder) {
    $padlen = 4 - $remainder;
    $data .= str_repeat('=', $padlen);
  }
  return base64_decode(strtr($data, '-_', '+/'));
}

function sign_jwt(array $payload): string {
  $header = ['alg' => 'HS256', 'typ' => 'JWT'];
  $iat = time();
  $exp = $iat + 3600; // 1h (match old server)

  $full = $payload;
  $full['iat'] = $iat;
  $full['exp'] = $exp;

  $segments = [];
  $segments[] = base64url_encode(json_encode($header));
  $segments[] = base64url_encode(json_encode($full));

  $signing_input = $segments[0] . '.' . $segments[1];
  $sig = hash_hmac('sha256', $signing_input, jwt_secret(), true);
  $segments[] = base64url_encode($sig);

  return $segments[0] . '.' . $segments[1] . '.' . $segments[2];
}

function verify_jwt(string $token): ?array {
  $parts = explode('.', $token);
  if (count($parts) !== 3) return null;
  [$b64Header, $b64Payload, $b64Sig] = $parts;

  $header = json_decode(base64url_decode($b64Header), true);
  if (!is_array($header) || ($header['alg'] ?? null) !== 'HS256') return null;

  $payload = json_decode(base64url_decode($b64Payload), true);
  if (!is_array($payload)) return null;

  // exp
  if (isset($payload['exp']) && time() > (int)$payload['exp']) return null;

  $signing_input = $b64Header . '.' . $b64Payload;
  $expected = hash_hmac('sha256', $signing_input, jwt_secret(), true);
  $actual = base64url_decode($b64Sig);

  if (!hash_equals($expected, $actual)) return null;
  return $payload;
}

