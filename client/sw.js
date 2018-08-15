    var staticCacheName = 'restaurant-static-v3';
    var contentImgsCache = 'restaurant-content-imgs';
    var allCaches = [staticCacheName, contentImgsCache];

    self.addEventListener('install', function (event) {
    // Perform install steps
      event.waitUntil(caches.open(staticCacheName).then(function (cache) {
        console.log('Opened cache');

        return cache.addAll(['/',
          '/css/styles.css',
          '/img/1.webp',
          '/img/2.webp',
          '/img/3.webp',
          '/img/4.webp',
          '/img/5.webp',
          '/img/6.webp',
          '/img/7.webp',
          '/img/8.webp',
          '/img/9.webp',
          '/img/10.webp',
          '/img/undefined.webp',
          '/img/map.webp',
          '/js/main.js',
          '/js/idb.js',
          '/js/dbhelper.js',
          '/js/restaurant_info.js',
          '/data/restaurants.json'
        ]);
      }));
    });

    self.addEventListener('activate', function (event) {
      event.waitUntil(caches.keys().then(function (cacheNames) {
        return Promise.all(cacheNames.filter(function (cacheName) {
          return cacheName.startsWith('restaurant-') && !allCaches.includes(cacheName);
        }).map(function (cacheName) {
          return caches['delete'](cacheName);
        }));
      }));
    });

    self.addEventListener('fetch', (event) => {
        event.respondWith(
            caches.match(event.request).then((response) => {
            // Cache hit - return response
                if (response) {
                  return response;
                }
                   const fetchRequest = event.request.clone();
                   const requestURL = event.request.url;
                return fetch(fetchRequest).then( (response) => {
                    // Check if we received a valid response
                    if(!response || response.status !== 200) {
                          return response;
                    }
                    //do not cache API data!
                    // const rest = requestURL.includes("restaurants");
                    const rev = requestURL.includes("reviews");
                    //cache only GET requests
                       if(event.request.method == "GET" &&  !rev ) {
                        let responseToCache = response.clone();
                        caches.open(staticCacheName).then((cache) => {
                            cache.put(event.request, responseToCache);
                         });
                        return response;
                    } else {
                    return response;
                    }
                }).catch(error => {
                        console.error('Error fetching in ServiceWorker:', error)
                })
            }).catch(error => console.error('Response error :', error))
        );
    });

    // self.addEventListener('fetch', function (event) {
    //   var requestUrl = new URL(event.request.url);
    //
    //   if (requestUrl.origin === location.origin) {
    //     if (requestUrl.pathname === '/') {
    //       event.respondWith(caches.match('/'));
    //       return;
    //     }
    //   }
    //   // Cache hit - return response
    //   event.respondWith(caches.match(event.request).then(function (response) {
    //     return response || fetch(event.request);
    //   }));
    // });
