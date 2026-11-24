export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const FB_PIXEL_ID = '28252040934472100';
  const FB_ACCESS_TOKEN = 'EAAUUUjCZAP4sBTBUv0G7uBtCnCN7hx0UR8rIBUtKZC0BL8umeQZAgXVZAMRQ5dYRm6KXQ1nrua2CzFY1g0IdFJMAH4bwmtohIV1ztQc2qkGZBNG6ZCYDnSwlEjTZBNx1pm2y4i5bGBEIXtoN3PWZCZCzSRZAuDPTkknzY85ZBhE51tQmZAZB2LttcKBmOo32ioekY4gZDZD';

  try {
    const event = req.body;
    const eventType = (event.type || event.event || '').toLowerCase();

    if (eventType === 'payment.captured' || eventType === 'checkout.succeeded' ||
        eventType === 'payment.succeeded' || eventType === 'checkout.completed') {

      const checkoutId = event.data?.checkout?.id || event.checkout?.id || event.data?.id || '';
      const amountCents = event.data?.checkout?.amount || event.checkout?.amount || event.data?.amount || 0;
      const amountBRL = amountCents / 100;

      if (checkoutId && amountBRL > 0) {
        await fetch('https://graph.facebook.com/v18.0/' + FB_PIXEL_ID + '/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: [{
              event_name: 'Purchase',
              event_time: Math.floor(Date.now() / 1000),
              action_source: 'website',
              event_id: 'purchase_' + checkoutId,
              event_source_url: 'https://construindofuturo.co.ua/fernanda/',
              user_data: {},
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
      }
    }
  } catch (_) {}

  res.status(200).json({ received: true });
}
