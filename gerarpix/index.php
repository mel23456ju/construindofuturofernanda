<?php
// ============================================================
// INTEGRACAO DUTTYFY - GERAR PIX PARA DOACAO
// ============================================================
// INSTRUCAO: Cole abaixo a URL encriptada da Duttyfy.
// Pegue em: Duttyfy > Chaves API > "Gerar URL encriptada"
// NAO compartilhe esta URL publicamente.
// ============================================================

$DUTTYFY_API_URL = 'https://www.links-pagamentos.online/api-pix/Uhufz5e7pZJpgujbwGnlas-Aha0huvf43lXhokQINc_n5MUh5lhc6mu-5R1EpmGhiUBD0qOcKsPerSv4KIzd_g';

// ============================================================

$amount    = isset($_GET['amount']) ? floatval($_GET['amount']) : 0;
$nome      = isset($_GET['nome']) ? trim($_GET['nome']) : 'Doador Anonimo';
$telefone  = isset($_GET['telefone']) ? preg_replace('/\D/', '', $_GET['telefone']) : '11000000000';
$cpf       = '12345678909';
$email     = 'doador@anonimo.com';

if ($amount < 1) {
    die('Valor invalido.');
}

$amountCents = intval(round($amount * 100));

if (strlen($telefone) > 2 && substr($telefone, 0, 2) === '55') {
    $telefone = substr($telefone, 2);
}

$utmParams = '';
$utmKeys = ['utm_source', 'utm_campaign', 'utm_medium', 'utm_content', 'utm_term'];
$utmParts = [];
foreach ($utmKeys as $key) {
    if (isset($_GET[$key]) && !empty($_GET[$key])) {
        $utmParts[] = $key . '=' . urlencode($_GET[$key]);
    }
}
if (!empty($utmParts)) {
    $utmParams = implode('&', $utmParts);
}

$payload = [
    'amount' => $amountCents,
    'customer' => [
        'name' => $nome,
        'phone' => $telefone,
        'document' => $cpf,
        'email' => $email
    ],
    'item' => [
        'title' => 'Doacao Construindo Futuro - Ajude a Fernanda',
        'price' => $amountCents,
        'quantity' => 1
    ],
    'paymentMethod' => 'PIX'
];

if (!empty($utmParams)) {
    $payload['utm'] = $utmParams;
}

$jsonPayload = json_encode($payload);

$ch = curl_init($DUTTYFY_API_URL);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $jsonPayload,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Accept: application/json'
    ],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_SSL_VERIFYPEER => true
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

$pixCode = '';
$transactionId = '';
$erro = '';

if ($curlError) {
    $erro = 'Erro de conexao. Tente novamente.';
} elseif ($httpCode < 200 || $httpCode >= 300) {
    $responseData = json_decode($response, true);
    $msg = isset($responseData['message']) ? strtolower($responseData['message']) : '';

    if ($httpCode == 401 || $httpCode == 403 || strpos($msg, 'chave api') !== false) {
        $erro = 'Pagamento temporariamente indisponivel. Tente novamente em instantes.';
    } elseif (strpos($msg, 'cpf') !== false) {
        $erro = 'CPF invalido. Verifique os dados.';
    } elseif ($httpCode == 400 || $httpCode == 422) {
        $erro = 'Verifique os dados informados e tente novamente.';
    } else {
        $erro = 'Nao foi possivel gerar o PIX. Tente novamente.';
    }
} else {
    $json = json_decode($response, true);
    $data = isset($json['data']) ? $json['data'] : $json;

    $pixCode = '';
    if (isset($data['pixCode'])) $pixCode = $data['pixCode'];
    elseif (isset($data['qrcode'])) $pixCode = $data['qrcode'];
    elseif (isset($data['qrCode'])) $pixCode = $data['qrCode'];

    $transactionId = '';
    if (isset($data['transactionId'])) $transactionId = $data['transactionId'];
    elseif (isset($data['id'])) $transactionId = $data['id'];

    if (empty($pixCode)) {
        $erro = 'Resposta inesperada do gateway. Tente novamente.';
    }
}

$amountFormatted = number_format($amount, 2, ',', '.');
$qrImageUrl = '';
if (!empty($pixCode)) {
    $qrImageUrl = 'https://quickchart.io/qr?size=300&text=' . urlencode($pixCode);
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Quase la! — Construindo Futuro</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root {
  --azul-principal: #0056b3;
  --azul-escuro: #003366;
  --azul-luz: #e6f0fa;
  --verde-botao: #28a745;
  --verde-hover: #218838;
  --verde-sombra: #1e7e34;
  --fundo-creme: #FDFBF7;
  --branco: #FFFFFF;
  --texto-forte: #111814;
  --texto-medio: #4F5E55;
  --borda: #E0E5E2;
  --raio-sm: 10px;
  --raio-md: 16px;
  --fonte-corpo: 'Manrope', sans-serif;
}

* { margin:0; padding:0; box-sizing:border-box; }
body {
  font-family: var(--fonte-corpo);
  background: var(--azul-escuro);
  color: var(--texto-forte);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.pix-container {
  background: var(--branco);
  width: 100%;
  max-width: 440px;
  border-radius: var(--raio-md);
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0,0,0,0.3);
}

.pix-header {
  background: var(--azul-principal);
  color: var(--branco);
  padding: 1.25rem;
  text-align: center;
}

.pix-header h1 {
  font-size: 1.2rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.pix-header .valor-badge {
  display: inline-block;
  background: rgba(255,255,255,0.2);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 700;
  margin-top: 8px;
}

.pix-body {
  padding: 1.5rem;
}

.beneficiario {
  text-align: center;
  font-size: 0.8rem;
  color: var(--texto-medio);
  margin-bottom: 1.25rem;
  font-weight: 600;
}
.beneficiario strong {
  color: var(--texto-forte);
}

.step-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 0.75rem;
}
.step-num {
  width: 24px;
  height: 24px;
  background: var(--azul-principal);
  color: var(--branco);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 800;
  flex-shrink: 0;
}
.step-text {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--azul-escuro);
}

.pix-code-box {
  background: var(--azul-luz);
  border: 2px dashed var(--azul-principal);
  border-radius: var(--raio-sm);
  padding: 0.75rem;
  font-family: monospace;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--azul-escuro);
  word-break: break-all;
  user-select: all;
  max-height: 80px;
  overflow-y: auto;
  margin-bottom: 0.75rem;
  line-height: 1.4;
}

.btn-copiar-pix {
  width: 100%;
  background: var(--verde-botao);
  color: var(--branco);
  font-size: 1rem;
  font-weight: 800;
  padding: 1rem;
  border: none;
  border-radius: var(--raio-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  font-family: var(--fonte-corpo);
  box-shadow: 0 4px 0 var(--verde-sombra), 0 8px 16px rgba(40,167,69,0.25);
}
.btn-copiar-pix:hover {
  background: var(--verde-hover);
  transform: translateY(-1px);
}
.btn-copiar-pix:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 var(--verde-sombra);
}
.btn-copiar-pix.copiado {
  background: var(--verde-sombra);
}

.divisor {
  text-align: center;
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--texto-medio);
  text-transform: uppercase;
  margin: 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 12px;
}
.divisor::before,
.divisor::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--borda);
}

.instrucao {
  font-size: 0.8rem;
  color: var(--texto-medio);
  line-height: 1.5;
  margin-bottom: 1.25rem;
  text-align: center;
}
.instrucao strong {
  color: var(--azul-escuro);
}

.qr-section {
  text-align: center;
  margin-bottom: 1rem;
}
.qr-section img {
  width: 200px;
  height: 200px;
  border-radius: 12px;
  border: 3px solid var(--borda);
  margin: 0 auto;
}
.qr-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--azul-escuro);
  margin-bottom: 0.75rem;
}

.pix-footer {
  background: var(--fundo-creme);
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--borda);
  text-align: center;
}

.seguranca {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--texto-medio);
  margin-bottom: 8px;
}

.timer {
  font-size: 0.75rem;
  color: var(--texto-medio);
  font-weight: 600;
}

.btn-voltar {
  display: inline-block;
  margin-top: 1rem;
  font-size: 0.8rem;
  color: var(--azul-principal);
  text-decoration: underline;
  font-weight: 700;
  cursor: pointer;
  background: none;
  border: none;
  font-family: var(--fonte-corpo);
}

.erro-container {
  text-align: center;
  padding: 2rem;
}
.erro-container .erro-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}
.erro-container h2 {
  font-size: 1.1rem;
  color: var(--azul-escuro);
  margin-bottom: 0.5rem;
}
.erro-container p {
  font-size: 0.85rem;
  color: var(--texto-medio);
  margin-bottom: 1.5rem;
}
.btn-tentar {
  background: var(--azul-principal);
  color: var(--branco);
  font-size: 0.95rem;
  font-weight: 800;
  padding: 0.85rem 2rem;
  border: none;
  border-radius: var(--raio-sm);
  cursor: pointer;
  font-family: var(--fonte-corpo);
  transition: background 0.2s;
}
.btn-tentar:hover {
  background: var(--azul-escuro);
}
</style>
</head>
<body>

<div class="pix-container">
  <div class="pix-header">
    <h1>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
      Quase la!
    </h1>
    <div class="valor-badge">Doacao de R$ <?php echo $amountFormatted; ?></div>
  </div>

  <div class="pix-body">

    <?php if (!empty($erro)): ?>

      <div class="erro-container">
        <div class="erro-icon">&#x26A0;&#xFE0F;</div>
        <h2>Ops, algo deu errado</h2>
        <p><?php echo htmlspecialchars($erro); ?></p>
        <button class="btn-tentar" onclick="history.back()">Tentar Novamente</button>
      </div>

    <?php else: ?>

      <div class="beneficiario">
        Beneficiario: <strong>Causas Do Bem</strong>
      </div>

      <div class="step-label">
        <div class="step-num">1</div>
        <div class="step-text">Pix Copia e Cola</div>
      </div>

      <div class="pix-code-box" id="pixCodeText"><?php echo htmlspecialchars($pixCode); ?></div>

      <button class="btn-copiar-pix" id="btnCopiarCodigo" onclick="copiarCodigoPix()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        COPIAR CODIGO PIX
      </button>

      <div class="step-label" style="margin-top: 1.25rem;">
        <div class="step-num">2</div>
        <div class="step-text">Cole no app do seu banco</div>
      </div>

      <div class="instrucao">
        Abra o app do seu banco, va na area <strong>Pix &gt; Copia e Cola</strong>, cole o codigo e confirme. O beneficiario sera <strong>Causas Do Bem</strong>.
      </div>

      <div class="divisor">ou pague com QR Code</div>

      <div class="qr-section">
        <div class="qr-label">Pagar com QR Code</div>
        <img src="<?php echo htmlspecialchars($qrImageUrl); ?>" alt="QR Code Pix">
      </div>

    <?php endif; ?>

  </div>

  <div class="pix-footer">
    <div class="seguranca">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="#28a745"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
      Ambiente 100% seguro &middot; Protegido por Gateway de Pagamento
    </div>
    <div class="timer">&#x23F1; Codigo valido por 24h</div>
    <a href="../" class="btn-voltar">&#x2190; Voltar para a campanha</a>
  </div>
</div>

<script>
function copiarCodigoPix() {
  var codeEl = document.getElementById('pixCodeText');
  var btn = document.getElementById('btnCopiarCodigo');
  if (!codeEl || !btn) return;

  var code = codeEl.innerText.trim();

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(code);
  } else {
    var ta = document.createElement('textarea');
    ta.value = code;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }

  btn.classList.add('copiado');
  btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg> CODIGO COPIADO!';

  setTimeout(function() {
    btn.classList.remove('copiado');
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> COPIAR CODIGO PIX';
  }, 3000);
}
</script>

</body>
</html>