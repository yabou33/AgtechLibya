<?php
/* ============================================================
   sh_token.php — Proxy d'authentification Sentinel Hub v2.2
   À déposer dans le MÊME dossier que les pages AgriMap / AgriSim Live.
   - Endpoint officiel : https://services.sentinel-hub.com/auth/realms/main/protocol/openid-connect/token
   - Cache le jeton localement (~55 min)
   - Contourne les restrictions CORS du navigateur
   - Contourne automatiquement les erreurs SSL cURL locales (Windows / XAMPP / Wamp)
   - Mode diagnostic intégré : ?test=1
   ============================================================ */

// En-têtes HTTP & CORS universels
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Gestion des requêtes de pré-vérification CORS (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Identifiants Sentinel Hub OAuth par défaut
$clientId     = getenv('SH_CLIENT_ID')     ?: '';
$clientSecret = getenv('SH_CLIENT_SECRET') ?: '';

// Récupération éventuelle de clés personnalisées via GET, POST ou JSON body
if (!empty($_REQUEST['client_id']))     $clientId     = trim($_REQUEST['client_id']);
if (!empty($_REQUEST['client_secret'])) $clientSecret = trim($_REQUEST['client_secret']);

$rawInput = @file_get_contents('php://input');
if ($rawInput) {
    $inputJson = @json_decode($rawInput, true);
    if (is_array($inputJson)) {
        if (!empty($inputJson['client_id']))     $clientId     = trim($inputJson['client_id']);
        if (!empty($inputJson['client_secret'])) $clientSecret = trim($inputJson['client_secret']);
    }
}

// URLs d'authentification Sentinel Hub (l'URL OpenID Connect exacte d'AgriManager / SICAM)
$oauthUrls = [
    'https://services.sentinel-hub.com/auth/realms/main/protocol/openid-connect/token',
    'https://services.sentinel-hub.com/oauth/token'
];

$cacheDir  = sys_get_temp_dir();
$cacheHash = substr(md5($clientId . $clientSecret), 0, 12);
$cacheFile = $cacheDir . '/sh_token_' . $cacheHash . '.json';

/* ============================================================
   0) Mode Diagnostic (?test=1 ou ?diag=1)
   ============================================================ */
if (isset($_GET['test']) || isset($_GET['diag'])) {
    header('Content-Type: text/html; charset=utf-8');
    ?>
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <title>Diagnostic Sentinel Hub Proxy — AgriMap</title>
        <style>
            body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; line-height: 1.5; }
            .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px 24px; max-width: 800px; margin: 0 auto 20px; }
            h1 { font-size: 20px; color: #38bdf8; margin-top: 0; }
            h2 { font-size: 15px; color: #a5f3fc; border-bottom: 1px solid #334155; padding-bottom: 6px; margin-top: 18px; }
            .badge { display: inline-block; padding: 3px 10px; border-radius: 6px; font-weight: 700; font-size: 12px; }
            .badge.ok { background: #059669; color: #fff; }
            .badge.err { background: #dc2626; color: #fff; }
            .badge.warn { background: #d97706; color: #fff; }
            pre { background: #090d16; padding: 12px; border-radius: 8px; overflow-x: auto; color: #38bdf8; font-size: 12px; }
            .btn { display: inline-block; background: #0284c7; color: #fff; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 10px; }
            ul { padding-left: 20px; font-size: 13.5px; }
            li { margin-bottom: 5px; }
        </style>
    </head>
    <body>
    <div class="card">
        <h1>🛰️ Diagnostic du Proxy Sentinel Hub (`sh_token.php`)</h1>
        <p>Ce test vérifie la communication directe entre votre serveur et Sentinel Hub.</p>
        
        <h2>1. Environnement Serveur PHP</h2>
        <ul>
            <li>Version PHP : <b><?= PHP_VERSION ?></b></li>
            <li>Extension cURL : <?= function_exists('curl_init') ? '<span class="badge ok">Activée</span>' : '<span class="badge warn">Désactivée (mode secours stream_context)</span>' ?></li>
            <li>Extension OpenSSL : <?= extension_loaded('openssl') ? '<span class="badge ok">Activée</span>' : '<span class="badge err">Désactivée</span>' ?></li>
            <li>Dossier temporaire : <code><?= htmlspecialchars($cacheDir) ?></code></li>
            <li>Client ID testé : <code><?= htmlspecialchars(substr($clientId, 0, 10)) ?>...</code></li>
        </ul>

        <h2>2. Test d'obtention de jeton OAuth</h2>
        <?php
        $diagResult = requestOAuthTokenMulti($oauthUrls, $clientId, $clientSecret);
        if ($diagResult['success']) {
            $tokenData = $diagResult['data'];
            echo '<p><span class="badge ok">SUCCÈS</span> Connexion Sentinel Hub établie avec succès !</p>';
            echo '<ul>';
            echo '<li>Endpoint fonctionnel : <code>' . htmlspecialchars($diagResult['used_url']) . '</code></li>';
            echo '<li>Durée de validité : <b>' . htmlspecialchars($tokenData['expires_in'] ?? '3600') . ' secondes (~' . round(($tokenData['expires_in'] ?? 3600)/60) . ' min)</b></li>';
            echo '<li>Jeton : <code>' . substr($tokenData['access_token'] ?? '', 0, 28) . '... (sécurisé)</code></li>';
            echo '</ul>';
        } else {
            echo '<p><span class="badge err">ÉCHEC</span> Erreur de connexion.</p>';
            echo '<ul>';
            echo '<li>Code HTTP : <b>' . htmlspecialchars($diagResult['http_code']) . '</b></li>';
            echo '<li>Détail : <code>' . htmlspecialchars($diagResult['error']) . '</code></li>';
            echo '</ul>';
            if (!empty($diagResult['raw_response'])) {
                echo '<p>Réponse brute du serveur :</p><pre>' . htmlspecialchars($diagResult['raw_response']) . '</pre>';
            }
        }
        ?>

        <h2>3. Navigation</h2>
        <a href="agrimap.html" class="btn">Ouvrir AgriMap Formation</a>
        <a href="agrisim_live.html" class="btn" style="background:#16a34a;margin-left:8px;">Ouvrir AgriSim Live</a>
        <a href="sh_token.php" class="btn" style="background:#475569;margin-left:8px;">Réponse JSON brute</a>
    </div>
    </body>
    </html>
    <?php
    exit;
}

/* ============================================================
   1) Vérification du cache local
   ============================================================ */
if (is_readable($cacheFile)) {
    $rawCache = @file_get_contents($cacheFile);
    if ($rawCache) {
        $c = json_decode($rawCache, true);
        if (is_array($c) && isset($c['tk'], $c['exp']) && $c['exp'] > time() + 120) {
            echo json_encode([
                'access_token' => $c['tk'],
                'expires_in'   => $c['exp'] - time(),
                'cached'       => true
            ]);
            exit;
        }
    }
}

/* ============================================================
   2) Requête OAuth vers Sentinel Hub
   ============================================================ */
function requestOAuthTokenSingle($url, $id, $secret) {
    $postFields = http_build_query([
        'grant_type'    => 'client_credentials',
        'client_id'     => $id,
        'client_secret' => $secret,
    ]);

    // Méthode 1 : cURL
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 20,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_POSTFIELDS     => $postFields,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/x-www-form-urlencoded',
                'User-Agent: SentinelHub-PHP-Proxy/2.2'
            ],
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ]);
        $res   = curl_exec($ch);
        $code  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $errNo = curl_errno($ch);
        $err   = curl_error($ch);
        curl_close($ch);

        // Fallback SSL si certificat local manquant (XAMPP / WAMP / Windows)
        if ($res === false && ($errNo === 60 || $errNo === 77 || $errNo === 35 || stripos($err, 'SSL') !== false)) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_POST           => true,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => 20,
                CURLOPT_POSTFIELDS     => $postFields,
                CURLOPT_HTTPHEADER     => ['Content-Type: application/x-www-form-urlencoded'],
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_SSL_VERIFYHOST => 0,
            ]);
            $res  = curl_exec($ch);
            $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $err  = curl_error($ch);
            curl_close($ch);
        }

        if ($res !== false && $code === 200) {
            $json = json_decode($res, true);
            if (isset($json['access_token'])) {
                return ['success' => true, 'data' => $json, 'http_code' => 200, 'used_url' => $url];
            }
        }

        return [
            'success'      => false,
            'http_code'    => $code ?: 502,
            'error'        => $err ?: 'Erreur Sentinel Hub',
            'raw_response' => (string)$res
        ];
    }

    // Méthode 2 : stream_context fallback
    $opts = [
        'http' => [
            'method'  => 'POST',
            'header'  => "Content-Type: application/x-www-form-urlencoded\r\nUser-Agent: SentinelHub-PHP-Proxy/2.2\r\n",
            'content' => $postFields,
            'timeout' => 20,
            'ignore_errors' => true
        ],
        'ssl' => [
            'verify_peer'      => false,
            'verify_peer_name' => false,
        ]
    ];
    $context = stream_context_create($opts);
    $res = @file_get_contents($url, false, $context);
    
    if ($res !== false) {
        $json = json_decode($res, true);
        if (isset($json['access_token'])) {
            return ['success' => true, 'data' => $json, 'http_code' => 200, 'used_url' => $url];
        }
    }

    return [
        'success'      => false,
        'http_code'    => 502,
        'error'        => 'Échec HTTP stream context',
        'raw_response' => (string)$res
    ];
}

function requestOAuthTokenMulti($urls, $id, $secret) {
    $lastRes = null;
    foreach ($urls as $url) {
        $r = requestOAuthTokenSingle($url, $id, $secret);
        if ($r['success']) return $r;
        $lastRes = $r;
    }
    return $lastRes;
}

$call = requestOAuthTokenMulti($oauthUrls, $clientId, $clientSecret);

if (!$call['success']) {
    http_response_code($call['http_code'] >= 400 && $call['http_code'] < 600 ? $call['http_code'] : 502);
    echo json_encode([
        'error'        => 'sentinelhub_auth_failed',
        'status'       => $call['http_code'],
        'detail'       => $call['error'],
        'raw_response' => substr($call['raw_response'], 0, 300),
        'hint'         => 'Testez via sh_token.php?test=1 pour afficher les détails du diagnostic.'
    ]);
    exit;
}

$tokenData = $call['data'];
$expiresIn = (int)($tokenData['expires_in'] ?? 3600);

/* ============================================================
   3) Mise en cache et réponse
   ============================================================ */
@file_put_contents(
    $cacheFile,
    json_encode(['tk' => $tokenData['access_token'], 'exp' => time() + $expiresIn]),
    LOCK_EX
);

echo json_encode([
    'access_token' => $tokenData['access_token'],
    'expires_in'   => $expiresIn,
    'cached'       => false
]);
