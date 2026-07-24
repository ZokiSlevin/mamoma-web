<?php
declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Mamoma projektni upit - SMTP slanje, AJAX JSON i no-JS povratak na stranicu
|--------------------------------------------------------------------------
| Postojeće SMTP postavke ostaju nepromijenjene.
|--------------------------------------------------------------------------
*/

if (function_exists('mb_internal_encoding')) {
    mb_internal_encoding('UTF-8');
}

/* =========================
   SMTP POSTAVKE
   ========================= */

$smtpHost = 'mamoma.hr';
$smtpPort = 465;
$smtpUsername = 'info@mamoma.hr';
$smtpPassword = 'Mamoma789!?';

$fromEmail = 'info@mamoma.hr';
$fromName = 'Mamoma web stranica';
$toEmail = 'info@mamoma.hr';
$toName = 'Mamoma interijeri';

/* =========================
   ODGOVOR KLIJENTU
   ========================= */

function wants_json_response(): bool
{
    $requestedWith = strtolower((string) ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? ''));
    $accept = strtolower((string) ($_SERVER['HTTP_ACCEPT'] ?? ''));

    return $requestedWith === 'xmlhttprequest' || str_contains($accept, 'application/json');
}

function safe_return_page(): string
{
    $allowedPages = [
        'index.html',
        'kuhinje-po-mjeri.html',
        'dnevni-boravci.html',
        'ugradbeni-ormari.html',
        'kupaonice.html',
        'poslovni-prostori.html',
    ];

    $candidate = trim((string) ($_POST['source-page'] ?? ''));
    if ($candidate === '') {
        $candidate = (string) ($_SERVER['HTTP_REFERER'] ?? '');
    }

    $path = parse_url($candidate, PHP_URL_PATH);
    $basename = is_string($path) ? basename($path) : '';

    return in_array($basename, $allowedPages, true) ? $basename : 'index.html';
}

function respond(bool $success, string $message, int $statusCode = 200): void
{
    header('Cache-Control: no-store, max-age=0');

    if (wants_json_response()) {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode([
            'success' => $success,
            'message' => $message,
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    $status = $success ? 'uspjeh' : 'greska';
    header('Location: ' . safe_return_page() . '?upit=' . $status . '#kontakt', true, 303);
    exit;
}

/* =========================
   POMOĆNE FUNKCIJE
   ========================= */

function utf8_substr(string $value, int $start, int $length): string
{
    if (function_exists('mb_substr')) {
        return mb_substr($value, $start, $length, 'UTF-8');
    }
    if (function_exists('iconv_substr')) {
        $result = iconv_substr($value, $start, $length, 'UTF-8');
        return $result === false ? substr($value, $start, $length) : $result;
    }
    return substr($value, $start, $length);
}

function clean_single_line(string $value, int $maxLength = 500): string
{
    $value = trim($value);
    $value = preg_replace('/[\r\n\t]+/u', ' ', $value) ?? '';
    $value = preg_replace('/\s{2,}/u', ' ', $value) ?? '';
    return utf8_substr($value, 0, $maxLength);
}

function clean_multiline(string $value, int $maxLength = 5000): string
{
    $value = trim($value);
    $value = str_replace(["\r\n", "\r"], "\n", $value);
    return utf8_substr($value, 0, $maxLength);
}

function safe_html(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function smtp_read($socket): string
{
    $response = '';

    while ($line = fgets($socket, 515)) {
        $response .= $line;

        if (isset($line[3]) && $line[3] === ' ') {
            break;
        }
    }

    return $response;
}

function smtp_command($socket, string $command, array $expectedCodes): string
{
    fwrite($socket, $command . "\r\n");

    $response = smtp_read($socket);
    $code = (int) substr($response, 0, 3);

    if (!in_array($code, $expectedCodes, true)) {
        throw new RuntimeException('SMTP naredba nije prihvaćena. Odgovor servera: ' . $response);
    }

    return $response;
}

function encode_header(string $text): string
{
    if (function_exists('mb_encode_mimeheader')) {
        return mb_encode_mimeheader($text, 'UTF-8', 'B', "\r\n");
    }
    return '=?UTF-8?B?' . base64_encode($text) . '?=';
}

function sanitize_filename(string $filename): string
{
    $filename = basename(str_replace('\\', '/', $filename));
    $filename = preg_replace('/[^A-Za-z0-9._-]+/', '-', $filename) ?? 'privitak';
    $filename = trim($filename, '.-_');
    return $filename !== '' ? utf8_substr($filename, 0, 120) : 'privitak';
}

function normalize_uploads(array $files): array
{
    if (!isset($files['name'])) {
        return [];
    }

    if (!is_array($files['name'])) {
        return [$files];
    }

    $normalized = [];
    foreach ($files['name'] as $index => $name) {
        $normalized[] = [
            'name' => (string) $name,
            'type' => (string) ($files['type'][$index] ?? ''),
            'tmp_name' => (string) ($files['tmp_name'][$index] ?? ''),
            'error' => (int) ($files['error'][$index] ?? UPLOAD_ERR_NO_FILE),
            'size' => (int) ($files['size'][$index] ?? 0),
        ];
    }

    return $normalized;
}

function collect_attachments(array $fieldNames): array
{
    $allowedTypes = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'application/pdf' => 'pdf',
    ];

    $maxFiles = 5;
    $maxFileSize = 5 * 1024 * 1024;
    $maxTotalSize = 15 * 1024 * 1024;
    $attachments = [];
    $totalSize = 0;

    foreach ($fieldNames as $fieldName) {
        if (!isset($_FILES[$fieldName])) {
            continue;
        }

        foreach (normalize_uploads($_FILES[$fieldName]) as $file) {
            if ($file['error'] === UPLOAD_ERR_NO_FILE) {
                continue;
            }

            if (count($attachments) >= $maxFiles) {
                throw new InvalidArgumentException('Možete dodati najviše 5 datoteka.');
            }

            if ($file['error'] !== UPLOAD_ERR_OK) {
                throw new InvalidArgumentException('Jedan od privitaka nije ispravno prenesen. Pokušajte ponovno.');
            }

            if ($file['size'] <= 0 || $file['size'] > $maxFileSize) {
                throw new InvalidArgumentException('Svaka datoteka može imati najviše 5 MB.');
            }

            $totalSize += $file['size'];
            if ($totalSize > $maxTotalSize) {
                throw new InvalidArgumentException('Ukupna veličina privitaka može biti najviše 15 MB.');
            }

            if (!is_uploaded_file($file['tmp_name'])) {
                throw new InvalidArgumentException('Privitak nije valjana prenesena datoteka.');
            }

            $finfo = new finfo(FILEINFO_MIME_TYPE);
            $mime = (string) $finfo->file($file['tmp_name']);

            if (!array_key_exists($mime, $allowedTypes)) {
                throw new InvalidArgumentException('Podržani su JPG, PNG, WebP i PDF privici.');
            }

            $safeName = sanitize_filename($file['name']);
            if (pathinfo($safeName, PATHINFO_EXTENSION) === '') {
                $safeName .= '.' . $allowedTypes[$mime];
            }

            $attachments[] = [
                'path' => $file['tmp_name'],
                'name' => $safeName,
                'mime' => $mime,
                'size' => $file['size'],
            ];
        }
    }

    return $attachments;
}

function build_message_body(string $htmlBody, array $attachments): array
{
    if ($attachments === []) {
        return [
            [
                'MIME-Version: 1.0',
                'Content-Type: text/html; charset=UTF-8',
                'Content-Transfer-Encoding: 8bit',
            ],
            $htmlBody,
        ];
    }

    $boundary = '=_Mamoma_' . bin2hex(random_bytes(12));
    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: multipart/mixed; boundary="' . $boundary . '"',
    ];

    $parts = [
        '--' . $boundary,
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        $htmlBody,
    ];

    foreach ($attachments as $attachment) {
        $contents = file_get_contents($attachment['path']);
        if ($contents === false) {
            throw new RuntimeException('Privitak nije moguće pročitati.');
        }

        $parts[] = '--' . $boundary;
        $parts[] = 'Content-Type: ' . $attachment['mime'] . '; name="' . $attachment['name'] . '"';
        $parts[] = 'Content-Transfer-Encoding: base64';
        $parts[] = 'Content-Disposition: attachment; filename="' . $attachment['name'] . '"';
        $parts[] = '';
        $parts[] = rtrim(chunk_split(base64_encode($contents), 76, "\r\n"));
    }

    $parts[] = '--' . $boundary . '--';
    $parts[] = '';

    return [$headers, implode("\r\n", $parts)];
}

function send_smtp_mail(
    string $smtpHost,
    int $smtpPort,
    string $smtpUsername,
    string $smtpPassword,
    string $fromEmail,
    string $fromName,
    string $toEmail,
    string $toName,
    string $replyToEmail,
    string $replyToName,
    string $subject,
    string $htmlBody,
    array $attachments = []
): void {
    $remote = 'ssl://' . $smtpHost;
    $socket = fsockopen($remote, $smtpPort, $errno, $errstr, 30);

    if (!$socket) {
        throw new RuntimeException("Ne mogu se spojiti na SMTP server: $errstr ($errno)");
    }

    stream_set_timeout($socket, 30);

    $response = smtp_read($socket);
    if ((int) substr($response, 0, 3) !== 220) {
        fclose($socket);
        throw new RuntimeException('SMTP server nije spreman: ' . $response);
    }

    $serverName = $_SERVER['SERVER_NAME'] ?? 'mamoma.hr';

    smtp_command($socket, 'EHLO ' . $serverName, [250]);
    smtp_command($socket, 'AUTH LOGIN', [334]);
    smtp_command($socket, base64_encode($smtpUsername), [334]);
    smtp_command($socket, base64_encode($smtpPassword), [235]);
    smtp_command($socket, 'MAIL FROM:<' . $fromEmail . '>', [250]);
    smtp_command($socket, 'RCPT TO:<' . $toEmail . '>', [250, 251]);
    smtp_command($socket, 'DATA', [354]);

    [$mimeHeaders, $messageBody] = build_message_body($htmlBody, $attachments);

    $headers = [
        'Date: ' . date('r'),
        'From: ' . encode_header($fromName) . ' <' . $fromEmail . '>',
        'To: ' . encode_header($toName) . ' <' . $toEmail . '>',
        'Reply-To: ' . encode_header($replyToName) . ' <' . $replyToEmail . '>',
        'Subject: ' . encode_header($subject),
        ...$mimeHeaders,
        'X-Mailer: Mamoma projektni upit',
    ];

    $message = implode("\r\n", $headers) . "\r\n\r\n" . $messageBody;
    $message = preg_replace('/(?m)^\./', '..', $message) ?? $message;

    fwrite($socket, $message . "\r\n.\r\n");

    $response = smtp_read($socket);
    if ((int) substr($response, 0, 3) !== 250) {
        fclose($socket);
        throw new RuntimeException('SMTP poruka nije prihvaćena: ' . $response);
    }

    smtp_command($socket, 'QUIT', [221]);
    fclose($socket);
}

function email_row(string $label, string $value): string
{
    if ($value === '') {
        return '';
    }

    return '<tr>'
        . '<td style="width:190px;padding:9px 12px;border-bottom:1px solid #ece7df;color:#756b62;font-size:13px;vertical-align:top;">' . safe_html($label) . '</td>'
        . '<td style="padding:9px 12px;border-bottom:1px solid #ece7df;color:#231f1b;font-size:14px;font-weight:600;vertical-align:top;">' . safe_html($value) . '</td>'
        . '</tr>';
}

/* =========================
   OBRADA FORME
   ========================= */

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    header('Allow: POST');
    respond(false, 'Neispravan način slanja obrasca.', 405);
}

if (!empty($_POST['website'] ?? '')) {
    respond(true, 'Hvala! Vaš upit je uspješno zaprimljen.');
}

$name = clean_single_line((string) ($_POST['name'] ?? ''), 120);
$email = trim((string) ($_POST['email'] ?? ''));
$phone = clean_single_line((string) ($_POST['phone'] ?? ''), 60);
$projectType = clean_single_line((string) ($_POST['project-type'] ?? ''), 80);
$location = clean_single_line((string) ($_POST['location'] ?? ''), 160);
$dimensions = clean_single_line((string) ($_POST['dimensions'] ?? ''), 220);
$budget = clean_single_line((string) ($_POST['budget'] ?? ''), 80);
$timeframe = clean_single_line((string) ($_POST['timeframe'] ?? $_POST['timeline'] ?? ''), 80);
$preferredContact = clean_single_line((string) ($_POST['preferred-contact'] ?? 'email'), 40);
$message = clean_multiline((string) ($_POST['message'] ?? ''), 5000);
$privacyConsent = clean_single_line((string) ($_POST['privacy-consent'] ?? ''), 30);
$sourcePage = clean_single_line((string) ($_POST['source-page'] ?? ''), 240);
$sourceCta = clean_single_line((string) ($_POST['source-cta'] ?? ''), 120);
$landingPage = clean_single_line((string) ($_POST['landing-page'] ?? ''), 500);
$referrer = clean_single_line((string) ($_POST['referrer'] ?? ''), 500);
$utmSource = clean_single_line((string) ($_POST['utm-source'] ?? ''), 120);
$utmMedium = clean_single_line((string) ($_POST['utm-medium'] ?? ''), 120);
$utmCampaign = clean_single_line((string) ($_POST['utm-campaign'] ?? ''), 160);
$formStartedAt = clean_single_line((string) ($_POST['form-started-at'] ?? ''), 30);

if ($name === '' || $email === '' || $projectType === '' || $location === '' || $message === '') {
    respond(false, 'Molimo popunite sva obavezna polja u obrascu.', 422);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $email)) {
    respond(false, 'Molimo unesite ispravnu e-mail adresu.', 422);
}

if (!in_array($privacyConsent, ['1', 'prihvacam', 'on'], true)) {
    respond(false, 'Za slanje upita potrebno je potvrditi suglasnost za obradu podataka.', 422);
}

$projectLabels = [
    'kuhinja' => 'Kuhinja po mjeri',
    'dnevni-boravak' => 'Dnevni boravak',
    'ormari' => 'Ugradbeni ormari',
    'kupaonice' => 'Kupaonski namještaj',
    'poslovni-prostor' => 'Poslovni prostor',
    '3d-dizajn' => '3D dizajn interijera',
    'opremanje' => 'Kompletno opremanje prostora',
    'ostalo' => 'Ostalo / nisam siguran',
];

$budgetLabels = [
    'do-3000' => 'Do 3.000 €',
    '3000-6000' => '3.000 – 6.000 €',
    '6000-10000' => '6.000 – 10.000 €',
    '10000-20000' => '10.000 – 20.000 €',
    '20000-plus' => 'Više od 20.000 €',
    '3000-7000' => '3.000 – 7.000 €',
    '7000-15000' => '7.000 – 15.000 €',
    '15000-30000' => '15.000 – 30.000 €',
    'iznad-30000' => 'Više od 30.000 €',
];

$timeframeLabels = [
    'sto-prije' => 'Što prije',
    '1-3-mjeseca' => 'U 1 – 3 mjeseca',
    '3-6-mjeseci' => 'U 3 – 6 mjeseci',
    '6-plus-mjeseci' => 'Za više od 6 mjeseci',
    'istrazujem' => 'Tek istražujem mogućnosti',
];

$contactLabels = [
    'email' => 'E-mail',
    'telefon' => 'Telefonski poziv',
    'whatsapp' => 'WhatsApp',
];

$projectLabel = $projectLabels[$projectType] ?? $projectType;
$budgetLabel = $budgetLabels[$budget] ?? ($budget !== '' ? $budget : 'Nije određen');
$timeframeLabel = $timeframeLabels[$timeframe] ?? ($timeframe !== '' ? $timeframe : 'Nije definiran');
$preferredContactLabel = $contactLabels[$preferredContact] ?? $preferredContact;

$formDuration = '';
if (ctype_digit($formStartedAt)) {
    $elapsed = max(0, (int) floor((microtime(true) * 1000 - (int) $formStartedAt) / 1000));
    if ($elapsed > 0 && $elapsed < 86400) {
        $formDuration = $elapsed . ' s';
    }
}

try {
    $attachments = collect_attachments(['attachments', 'project-files']);
} catch (InvalidArgumentException $exception) {
    respond(false, $exception->getMessage(), 422);
}

$subject = 'Projektni upit: ' . $projectLabel . ' | ' . $name;
$attachmentNames = implode(', ', array_map(static fn(array $file): string => $file['name'], $attachments));

$body = '<!DOCTYPE html><html lang="hr"><head><meta charset="UTF-8"><title>Novi projektni upit</title></head>'
    . '<body style="margin:0;padding:0;background:#f4f0ea;font-family:Arial,Helvetica,sans-serif;color:#231f1b;">'
    . '<div style="max-width:760px;margin:0 auto;padding:28px 14px;">'
    . '<div style="overflow:hidden;border-radius:18px;background:#fffdf9;box-shadow:0 20px 60px rgba(31,28,25,.10);">'
    . '<div style="padding:28px 32px;background:#1f1c19;">'
    . '<p style="margin:0 0 8px;color:#d9b98f;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;">Mamoma interijeri d.o.o.</p>'
    . '<h1 style="margin:0;color:#ffffff;font-size:26px;line-height:1.2;">Novi projektni upit</h1>'
    . '<p style="margin:10px 0 0;color:rgba(255,255,255,.68);font-size:14px;">' . safe_html($projectLabel) . '</p>'
    . '</div>'
    . '<div style="padding:26px 30px;">'
    . '<h2 style="margin:0 0 14px;font-size:18px;">Kontakt</h2>'
    . '<table style="width:100%;border-collapse:collapse;margin-bottom:28px;">'
    . email_row('Ime i prezime', $name)
    . email_row('E-mail', $email)
    . email_row('Telefon', $phone)
    . email_row('Preferirani odgovor', $preferredContactLabel)
    . '</table>'
    . '<h2 style="margin:0 0 14px;font-size:18px;">Projekt</h2>'
    . '<table style="width:100%;border-collapse:collapse;margin-bottom:28px;">'
    . email_row('Vrsta projekta', $projectLabel)
    . email_row('Grad / mjesto', $location)
    . email_row('Okvirne dimenzije', $dimensions)
    . email_row('Okvirni budžet', $budgetLabel)
    . email_row('Željeni rok', $timeframeLabel)
    . email_row('Privici', $attachmentNames !== '' ? $attachmentNames : 'Nema privitaka')
    . '</table>'
    . '<h2 style="margin:0 0 10px;font-size:18px;">Opis i želje</h2>'
    . '<div style="padding:18px;border-radius:12px;background:#f4f0ea;color:#2b2723;font-size:14px;line-height:1.7;">' . nl2br(safe_html($message)) . '</div>'
    . '<h2 style="margin:28px 0 14px;font-size:18px;">Izvor upita</h2>'
    . '<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">'
    . email_row('Stranica', $sourcePage)
    . email_row('CTA izvor', $sourceCta)
    . email_row('Trajanje obrasca', $formDuration)
    . email_row('Puna poveznica', $landingPage)
    . email_row('Prethodna stranica', $referrer)
    . email_row('UTM source', $utmSource)
    . email_row('UTM medium', $utmMedium)
    . email_row('UTM campaign', $utmCampaign)
    . '</table>'
    . '<p style="margin:18px 0 0;padding-top:16px;border-top:1px solid #ece7df;color:#80766d;font-size:12px;line-height:1.6;">Poruka je automatski poslana preko projektnog obrasca na mamoma.hr. Odgovorite izravno na ovaj e-mail kako biste kontaktirali pošiljatelja.</p>'
    . '</div></div></div></body></html>';

try {
    send_smtp_mail(
        $smtpHost,
        $smtpPort,
        $smtpUsername,
        $smtpPassword,
        $fromEmail,
        $fromName,
        $toEmail,
        $toName,
        $email,
        $name,
        $subject,
        $body,
        $attachments
    );

    respond(true, 'Hvala! Vaš je upit uspješno poslan. Pregledat ćemo informacije i javiti se s prijedlogom sljedećeg koraka.');
} catch (Throwable $exception) {
    error_log('[Mamoma projektni upit] ' . $exception->getMessage());
    respond(false, 'Nažalost, poruka trenutačno nije poslana. Pokušajte ponovno ili nas kontaktirajte telefonom.', 500);
}
