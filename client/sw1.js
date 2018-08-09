'use strict';
const static4Restaurant = 'cache-restaurant-v2';
var urlsToCache = [
    '/',
    // 'index.html',
    // 'restaurant.html',
    './css/styles.css',
    './js/dbhelper.js',
    './js/lazyload.js',
    './js/main.js',
    './js/idb.js',
    // './js/IndexController.js',
    './js/restaurant_info.js'
    //'./js/store.js',
];
self.addEventListener('install', (event) => {
  // Perform install steps
  event.waitUntil(
    caches.open(static4Restaurant).then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
    })
  );
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
                const rest = requestURL.includes("restaurants");
                const rev = requestURL.includes("reviews");
                //cache only GET requests
                   if(event.request.method == "GET" &&  !rest && !rev ) {
                    let responseToCache = response.clone();
                    caches.open(static4Restaurant).then((cache) => {
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
self.addEventListener('sync', function(event) {
  if (event.tag == 'syncFavorites') {
    event.waitUntil(syncFavorites());
  }
   if (event.tag == 'syncReviews') {
    event.waitUntil(syncReviews());
  }
});
function syncFavorites(){
    const indexedDBOpenRequest = indexedDB.open('restaurantsDB', 1);
      // This top-level error handler will be invoked any time there's an IndexedDB-related error.
    indexedDBOpenRequest.onerror = function(error) {
        console.error('IndexedDB error:', error);
    };
      // This will execute each time the database is opened.
    indexedDBOpenRequest.onsuccess = function(event) {
          console.log("DB open in ServiceWorker. Ready to do the dirty job!!!");
          const db = event.target.result;
          const objectStore = db.transaction(["favs"], "readwrite").objectStore("favs");
          let favs = [];
        objectStore.openCursor().onsuccess = (event) => {
              const cursor = event.target.result;
              if (cursor) {
                favs.push(cursor.value);
                cursor.continue();
              }
              else {
                //console.log(favs);
                favs.forEach(function(fav){
                //console.log(fav.id, fav.isFavorite);
                    fetch(`http://localhost:${port}/restaurants/` + fav.id + "/?is_favorite=" + fav.isFavorite, {
                        method: 'PUT'
                    }).then(res => res.text())
                      .catch(error => console.error('Error:', error))
                      .then( response => {
                          console.log('Success: Restaurant'+fav.id+' was set as a favorite' + fav.isFavorite)
                          const delRequest = db.transaction(["favs"], "readwrite")
                            .objectStore("favs")
                            .delete(fav.id);
                        delRequest.onsuccess = function(event) {
                              console.log("And it was deleted from IndexedDB");
                        };
                      });
                })
              }
        };
    };
}
function syncReviews(){
    const indexedDBOpenRequest = indexedDB.open('restaurantsDB', 1);
      // This top-level error handler will be invoked any time there's an IndexedDB-related error.
    indexedDBOpenRequest.onerror = function(error) {
        console.error('IndexedDB error:', error);
    };
      // This will execute each time the database is opened.
    indexedDBOpenRequest.onsuccess = function(event) {
          console.log("DB open in ServiceWorker. Ready to do the dirty job!!!");
          const db = event.target.result;
          const objectStore = db.transaction(["revs"], "readwrite").objectStore("revs");
          let revs = [];
          objectStore.openCursor().onsuccess = (event) => {
              const cursor = event.target.result;
              if (cursor) {
                revs.push(cursor.value);
                cursor.continue();
              }
              else {
                //console.log(favs);
                revs.forEach(function(rev){
                    //store de reviews ID in order to be able to delete the review afterwards
                    const tempId = rev.id;
                    //delete the id property from the review object so it will not be sent to server
                    delete rev.id;
                      fetch(`http://localhost:${port}/reviews`, {
                        method: "POST",
                        body: JSON.stringify(rev),
                        headers:{
                          'Content-Type': 'application/json'
                        }
                    })
                    .then(res => res.text())
                    .catch(error => console.error('Error:', error))
                    .then(response => {
                        console.log('Success: Review added to server database');
                        //delete the review after beeing stored in server database
                        const delRequest = db.transaction(["revs"], "readwrite")
                            .objectStore("revs")
                            .delete(tempId);
                        delRequest.onsuccess = function(event) {
                              console.log("And it was deleted from IndexedDB");
                        };
                    });
                })
              }
        };
    }
}
