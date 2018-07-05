'use strict';
importScripts('/js/idb.js');
importScripts('/js/store.js');

var staticCacheName = 'restaurant-v2';
var imageCacheName = 'mws-image';
var urlsToCache = [
    '/',
    'index.html',
    'restaurant.html',
    'css/styles.css',
    'css/normalize.css',
    'js/dbhelper.js',
    'js/lazyload.js',
    'js/main.js',
    'js/idb.js',
    'js/IndexController.js',
    'js/restaurant_info.js',
    'js/store.js',
    // 'data/restaurants.json'
];
var allCaches = [
    staticCacheName,
    imageCacheName
];

// install cache from serviceWorker
self.addEventListener('install', function (event) {
  // Perform install steps
  event.waitUntil(
    caches.open(staticCacheName).then(function (cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// activate cache from serviceWorker
self.addEventListener('activate', function (event) {
    event.waitUntil(
      caches.keys().then(function(cacheNames) {
        return Promise.all(
            cacheNames.filter(function(cacheName) {
                return cacheName.startsWith('restaurant-') &&
                   !allCaches.includes(cacheName)
            }).map(function(cacheName) {
                return caches.delete(cacheName);
            })
        );
      })
    );
});


self.addEventListener('fetch', function(event) {
    var requestUrl = new URL(event.request.url);

    if(requestUrl.pathname.startsWith("/img")) {
        event.respondWith(servePhoto(event.request));
        return;
    }
    
    event.respondWith(
      caches.match(event.request, {ignoreSearch:true}).then(response => {
        return response || fetch(event.request);
      })
      .catch(err => console.log(err, event.request))
    );
});

function servePhoto(request) {

    var storageUrlRep = request.url.replace(/-\w+\.jpg$/, '');

    return caches.open(imageCacheName).then(function(cache) {
        return cache.match(storageUrlRep).then(function (response) {
            // console.log('response',response);
            if(response) return response;

            return fetch(request).then(function(networkResponse) {
                // console.log('networkResponse', networkResponse)
                cache.put(storageUrlRep, networkResponse.clone());
                return networkResponse
            })
        })
    })

}

self.addEventListener('sync', function(event) {
  event.waitUntil(
    store.outbox('readonly').then(function(outbox) {
      return outbox.getAll();
    }).then(function(messages) {
      return Promise.all(
        messages.map(function(message) {
          console.log("Fetching :)")
          return fetch(`http://localhost:${port}/reviews`, {
            method: 'POST',
            body: JSON.stringify(message)
          }).then(function(response) {  
            return response.json();
          }).then(function(data) {
            console.log(data)
            return store.outbox('readwrite').then(function(outbox) {
              return outbox.delete(message.id);
            });
          })
        }))
      })
  );
})
