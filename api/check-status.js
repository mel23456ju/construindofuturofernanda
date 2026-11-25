export default async function handler(req, res) {
  const ZENITH_API_URL = 'https://api.zenithworld.com.br/integrations/checkouts';
  const ZENITH_PUBLIC_KEY = 'zp_pub_252245bb33f50e89d481f2fd909c91fb';
  const ZENITH_SECRET_KEY = 'zp_sec_dc74d58555de16f6838c0246ed0991291642443bb9e19c97';
  const FB_PIXEL_ID = '28252040934472100';
  const FB_ACCESS_TOKEN = 'EAAUUUjCZAP4sBTBUv0G7uBtCnCN7hx0UR8rIBUtKZC0BL8umeQZAgXVZAMRQ5dYRm6KXQ1nrua2CzFY1g0IdFJMAH4bwmtohIV1ztQc2qkGZBNG6ZCYDnSwlEjTZBNx1pm2y4i5bGBEIXtoN3PWZCZCzSRZAuDPTkknzY85ZBhE51tQmZAZB2LttcKBmOo32ioekY4gZDZD';

  const orderId = req.query.order_id;

  if (!orderId) {
    res.status(400).json({ status: 'error', message: 'order_id obrigatorio' });
    return;
  }

  try {
    try {
      await fetch(ZENITH_API_URL + '/' + encodeURIComponent(orderId) + '/refresh', {
        method: 'POST',
        headers: {
          'X-API-Key': ZENITH_PUBLIC_KEY,
          'X-API-Secret': ZENITH_SECRET_KEY
        }
      });
    } catch (_) {}

    const response = await fetch(ZENITH_API_URL + '/' + encodeURIComponent(orderId), {
      method: 'GET',
      headers: {
        'X-API-Key': ZENITH_PUBLIC_KEY,
        'X-API-Secret': ZENITH_SECRET_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      res.status(200).json({ status: 'pending' });
      return;
    }

    const json = await response.json();
    const checkoutStatus = (json.checkout?.status || '').toLowerCase();
    const paymentStatus = (json.payment?.status || '').toLowerCase();

    if (checkoutStatus === 'succeeded' || paymentStatus === 'succeeded' ||
        paymentStatus === 'captured' || paymentStatus === 'paid' ||
        paymentStatus === 'approved' || paymentStatus === 'confirmed') {

      const amountCents = json.checkout?.amount || 0;
      const amountBRL = amountCents / 100;

      const fbp = req.query.fbp || '';
      const fbc = req.query.fbc || '';
      const clientIp = (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '').split(',')[0].trim();
      const userAgent = req.headers['user-agent'] || '';

      const userData = {};
      if (fbp) userData.fbp = fbp;
      if (fbc) userData.fbc = fbc;
      if (clientIp) userData.client_ip_address = clientIp;
      if (userAgent) userData.client_user_agent = userAgent;

      try {
        await fetch('https://graph.facebook.com/v18.0/' + FB_PIXEL_ID + '/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: [{
              event_name: 'Purchase',
              event_time: Math.floor(Date.now() / 1000),
              action_source: 'website',
              event_id: 'purchase_' + orderId,
              event_source_url: req.query.page_url || 'https://construindofuturo.co.ua/fernanda/',
              user_data: userData,
              custom_data: {
                currency: 'BRL',
                value: amountBRL,
                content_name: 'Doacao Fernanda',
                content_category: 'doacao'
              }
            }],
            access_token: FB_ACCESS_TOKEN
          })
        });
      } catch (_) {}

      res.status(200).json({ status: 'paid', amount: amountBRL });
    } else if (checkoutStatus === 'failed' || checkoutStatus === 'canceled' ||
               checkoutStatus === 'refunded' || paymentStatus === 'failed' ||
               paymentStatus === 'canceled' || paymentStatus === 'expired') {
      res.status(200).json({ status: 'expired' });
    } else {
      res.status(200).json({ status: 'pending' });
    }
  } catch (e) {
    res.status(200).json({ status: 'pending' });
  }
}
