export default async function handler(req, res) {
  const ZENITH_API_URL = 'https://api.zenithworld.com.br/integrations/checkouts';
  const ZENITH_PUBLIC_KEY = 'zp_pub_3114ffe65bbe012cf669d735414ecd2c';
  const ZENITH_SECRET_KEY = 'zp_sec_f1e45266fd75d3e52fa5398574b6e8ac4e97a41da7b47706';

  const orderId = req.query.order_id;

  if (!orderId) {
    res.status(400).json({ status: 'error', message: 'order_id obrigatorio' });
    return;
  }

  try {
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
      res.status(200).json({ status: 'paid' });
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
