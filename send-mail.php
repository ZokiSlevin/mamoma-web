<?php
declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Mamoma kontakt forma - SMTP slanje + JSON odgovor
|--------------------------------------------------------------------------
| Prije uploadanja na server upišite lozinku mailboxa info@mamoma.hr
| u varijablu $smtpPassword.
|
| SMTP podaci iz Pleska:
| Server: mamoma.hr
| Port: 465
| Enkripcija: SSL/TLS
| Korisnik: info@mamoma.hr
|--------------------------------------------------------------------------
*/

mb_internal_encoding('UTF-8');

header('Content-Type: application/json; charset=UTF-8');

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
   POMOĆNE FUNKCIJE
   ========================= */

function json_response(bool $success, string $message): void
{
    echo json_encode([
        'success' => $success,
        'message' => $message
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function clean_input(string $value): string
{
    $value = trim($value);
    $value = str_replace(["\r", "\n"], ' ', $value);
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
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
        throw new RuntimeException(
            'SMTP greška nakon naredbe: ' . $command . ' | Odgovor servera: ' . $response
        );
    }

    return $response;
}

function encode_header(string $text): string
{
    return mb_encode_mimeheader($text, 'UTF-8', 'B', "\r\n");
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
    string $body
): void {
    $remote = 'ssl://' . $smtpHost;

    $socket = fsockopen($remote, $smtpPort, $errno, $errstr, 30);

    if (!$socket) {
        throw new RuntimeException("Ne mogu se spojiti na SMTP server: $errstr ($errno)");
    }

    stream_set_timeout($socket, 30);

    $response = smtp_read($socket);
    $code = (int) substr($response, 0, 3);

    if ($code !== 220) {
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

    $headers = [];
    $headers[] = 'Date: ' . date('r');
    $headers[] = 'From: ' . encode_header($fromName) . ' <' . $fromEmail . '>';
    $headers[] = 'To: ' . encode_header($toName) . ' <' . $toEmail . '>';
    $headers[] = 'Reply-To: ' . encode_header($replyToName) . ' <' . $replyToEmail . '>';
    $headers[] = 'Subject: ' . encode_header($subject);
    $headers[] = 'MIME-Version: 1.0';
    $headers[] = 'Content-Type: text/html; charset=UTF-8';
	$headers[] = 'Content-Transfer-Encoding: 8bit';
    $headers[] = 'X-Mailer: Mamoma kontakt forma';

    $message = implode("\r\n", $headers) . "\r\n\r\n" . $body;

    $message = str_replace("\n.", "\n..", $message);

    fwrite($socket, $message . "\r\n.\r\n");

    $response = smtp_read($socket);
    $code = (int) substr($response, 0, 3);

    if ($code !== 250) {
        fclose($socket);
        throw new RuntimeException('SMTP poruka nije prihvaćena: ' . $response);
    }

    smtp_command($socket, 'QUIT', [221]);
    fclose($socket);
}

/* =========================
   OBRADA FORME
   ========================= */

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(false, 'Neispravan način slanja forme.');
}

// Honeypot zaštita.
if (!empty($_POST['website'] ?? '')) {
    json_response(true, 'Hvala! Vaš upit je uspješno poslan.');
}

$name = clean_input((string) ($_POST['name'] ?? ''));
$email = trim((string) ($_POST['email'] ?? ''));
$projectType = clean_input((string) ($_POST['project-type'] ?? ''));
$message = trim((string) ($_POST['message'] ?? ''));

if ($name === '' || $email === '' || $projectType === '' || $message === '') {
    json_response(false, 'Molimo popunite sva obavezna polja.');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_response(false, 'Molimo unesite ispravnu e-mail adresu.');
}

$projectLabels = [
    'kuhinja' => 'Kuhinja po mjeri',
    'dnevni-boravak' => 'Dnevni boravak',
    'ormari' => 'Ugradbeni ormari',
    'poslovni-prostor' => 'Poslovni prostor',
    '3d-dizajn' => '3D dizajn interijera',
    'opremanje' => 'Kompletno opremanje prostora',
    'ostalo' => 'Ostalo',
];

$projectLabel = $projectLabels[$projectType] ?? $projectType;

$subject = 'Upit: ' . $projectLabel . ' | ' . $name;

$safeName = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
$safeEmail = htmlspecialchars($email, ENT_QUOTES, 'UTF-8');
$safeProjectLabel = htmlspecialchars($projectLabel, ENT_QUOTES, 'UTF-8');
$safeMessage = nl2br(htmlspecialchars($message, ENT_QUOTES, 'UTF-8'));

$body = '
<!DOCTYPE html>
<html lang="hr">
<head>
    <meta charset="UTF-8">
    <title>Novi upit s web stranice Mamoma.hr</title>
</head>

<body style="margin:0; padding:0; background-color:#ffffff; font-family:Arial, Helvetica, sans-serif; color:#222222;">

    <div style="max-width:720px; margin:0 auto; background-color:#ffffff;">

        <!-- Header u stilu Mamoma stranice -->
        <div style="background-color:#2b2723; padding:26px 34px;">
            <p style="margin:0 0 8px; color:#d8b98f; font-size:13px; letter-spacing:2px; text-transform:uppercase; font-weight:bold;">
                Mamoma interijeri d.o.o.
            </p>

            <h1 style="margin:0; color:#ffffff; font-size:25px; line-height:1.25; font-weight:700;">
                Novi upit s web stranice
            </h1>
        </div>

        <!-- Jednostavan tekst maila -->
        <div style="padding:28px 34px; font-size:15px; line-height:1.6; color:#222222;">

            <p style="margin:0 0 22px;">
                Zaprimljen je novi upit preko kontakt forme na web stranici <strong>mamoma.hr</strong>.
            </p>

            <p style="margin:0 0 6px;">
                <strong>Ime i prezime:</strong> ' . $safeName . '
            </p>

            <p style="margin:0 0 6px;">
                <strong>E-mail:</strong> 
                <a href="mailto:' . $safeEmail . '" style="color:#9b6b43; text-decoration:none;">
                    ' . $safeEmail . '
                </a>
            </p>

            <p style="margin:0 0 22px;">
                <strong>Vrsta projekta:</strong> ' . $safeProjectLabel . '
            </p>

            <p style="margin:0 0 6px;">
                <strong>Poruka klijenta:</strong>
            </p>

            <p style="margin:0 0 26px; white-space:normal;">
                ' . $safeMessage . '
            </p>

            <p style="margin:0; padding-top:16px; border-top:1px solid #dddddd; color:#777777; font-size:13px;">
                Ova poruka poslana je automatski preko kontakt forme na web stranici mamoma.hr.
            </p>

        </div>

    </div>

</body>
</html>';

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
        $body
    );

    json_response(true, 'Hvala! Vaš upit je uspješno poslan. Javit ćemo vam se u najkraćem mogućem roku.');
} catch (Throwable $exception) {
    error_log('[Mamoma kontakt forma] ' . $exception->getMessage());

    json_response(false, 'Nažalost, poruka trenutno nije poslana. Molimo pokušajte ponovno ili nas kontaktirajte telefonom.');
}