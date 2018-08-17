/**
 * idb by https://github.com/jakearchibald
 * LICENSE: https://github.com/jakearchibald/idb/blob/master/LICENSE
 */
'use strict';(function(){function a(q){return Array.prototype.slice.call(q)}function b(q){return new Promise(function(r,s){q.onsuccess=function(){r(q.result)},q.onerror=function(){s(q.error)}})}function c(q,r,s){var t,u=new Promise(function(v,w){t=q[r].apply(q,s),b(t).then(v,w)});return u.request=t,u}function d(q,r,s){var t=c(q,r,s);return t.then(function(u){return u?new j(u,t.request):void 0})}function e(q,r,s){s.forEach(function(t){Object.defineProperty(q.prototype,t,{get:function get(){return this[r][t]},set:function set(u){this[r][t]=u}})})}function f(q,r,s,t){t.forEach(function(u){u in s.prototype&&(q.prototype[u]=function(){return c(this[r],u,arguments)})})}function g(q,r,s,t){t.forEach(function(u){u in s.prototype&&(q.prototype[u]=function(){return this[r][u].apply(this[r],arguments)})})}function h(q,r,s,t){t.forEach(function(u){u in s.prototype&&(q.prototype[u]=function(){return d(this[r],u,arguments)})})}function i(q){this._index=q}function j(q,r){this._cursor=q,this._request=r}function k(q){this._store=q}function l(q){this._tx=q,this.complete=new Promise(function(r,s){q.oncomplete=function(){r()},q.onerror=function(){s(q.error)},q.onabort=function(){s(q.error)}})}function m(q,r,s){this._db=q,this.oldVersion=r,this.transaction=new l(s)}function n(q){this._db=q}e(i,'_index',['name','keyPath','multiEntry','unique']),f(i,'_index',IDBIndex,['get','getKey','getAll','getAllKeys','count']),h(i,'_index',IDBIndex,['openCursor','openKeyCursor']),e(j,'_cursor',['direction','key','primaryKey','value']),f(j,'_cursor',IDBCursor,['update','delete']),['advance','continue','continuePrimaryKey'].forEach(function(q){q in IDBCursor.prototype&&(j.prototype[q]=function(){var r=this,s=arguments;return Promise.resolve().then(function(){return r._cursor[q].apply(r._cursor,s),b(r._request).then(function(t){return t?new j(t,r._request):void 0})})})}),k.prototype.createIndex=function(){return new i(this._store.createIndex.apply(this._store,arguments))},k.prototype.index=function(){return new i(this._store.index.apply(this._store,arguments))},e(k,'_store',['name','keyPath','indexNames','autoIncrement']),f(k,'_store',IDBObjectStore,['put','add','delete','clear','get','getAll','getKey','getAllKeys','count']),h(k,'_store',IDBObjectStore,['openCursor','openKeyCursor']),g(k,'_store',IDBObjectStore,['deleteIndex']),l.prototype.objectStore=function(){return new k(this._tx.objectStore.apply(this._tx,arguments))},e(l,'_tx',['objectStoreNames','mode']),g(l,'_tx',IDBTransaction,['abort']),m.prototype.createObjectStore=function(){return new k(this._db.createObjectStore.apply(this._db,arguments))},e(m,'_db',['name','version','objectStoreNames']),g(m,'_db',IDBDatabase,['deleteObjectStore','close']),n.prototype.transaction=function(){return new l(this._db.transaction.apply(this._db,arguments))},e(n,'_db',['name','version','objectStoreNames']),g(n,'_db',IDBDatabase,['close']),['openCursor','openKeyCursor'].forEach(function(q){[k,i].forEach(function(r){q in r.prototype&&(r.prototype[q.replace('open','iterate')]=function(){var s=a(arguments),t=s[s.length-1],u=this._store||this._index,v=u[q].apply(u,s.slice(0,-1));v.onsuccess=function(){t(v.result)}})})}),[i,k].forEach(function(q){q.prototype.getAll||(q.prototype.getAll=function(r,s){var t=this,u=[];return new Promise(function(v){t.iterateCursor(r,function(w){return w?(u.push(w.value),void 0!==s&&u.length==s?void v(u):void w.continue()):void v(u)})})})});var o={open:function open(q,r,s){var t=c(indexedDB,'open',[q,r]),u=t.request;return u&&(u.onupgradeneeded=function(v){s&&s(new m(u.result,v.oldVersion,u.transaction))}),t.then(function(v){return new n(v)})},delete:function _delete(q){return c(indexedDB,'deleteDatabase',[q])}};'undefined'==typeof module?self.idb=o:(module.exports=o,module.exports.default=module.exports)})();
const port = 3000; // Change this to your server port 1337

 /**
  * Common database helper functions.
  */
 class DBHelper {

   /**
    * Database URL.
    * Change this to restaurants.json file location on your server.
    */
   static get DATABASE_URL() {
     return `http://localhost:${port}/`;
   }


   static dbPromise() {
     return idb.open('db', 2, function(upgradeDb) {
       switch (upgradeDb.oldVersion) {
         case 0:
           upgradeDb.createObjectStore('restaurants', {
             keyPath: 'id'
           });
         case 1:
           const reviewsStore = upgradeDb.createObjectStore('reviews', {
             keyPath: 'id'
           });
           reviewsStore.createIndex('restaurant', 'restaurant_id');
       }
     });
   }

   static fetchRestaurants() {
     return this.dbPromise()
       .then(db => {
         const tx = db.transaction('restaurants');
         const restaurantStore = tx.objectStore('restaurants');
         return restaurantStore.getAll();
       })
       .then(restaurants => {
         if (restaurants.length !== 0) {
           return Promise.resolve(restaurants);
         }
         return this.fetchAndCacheRestaurants();
       })
   }

   static fetchAndCacheRestaurants() {
     return fetch(DBHelper.DATABASE_URL + 'restaurants')
       .then(response => response.json())
       .then(restaurants => {
         return this.dbPromise()
           .then(db => {
             const tx = db.transaction('restaurants', 'readwrite');
             const restaurantStore = tx.objectStore('restaurants');
             restaurants.forEach(restaurant => restaurantStore.put(restaurant));

             return tx.complete.then(() => Promise.resolve(restaurants));
           });
       });
   }

   /**
    * Fetch a restaurant by its ID.
    */
   static fetchRestaurantById(id) {
     return DBHelper.fetchRestaurants()
       .then(restaurants => restaurants.find(r => r.id === id));
   }

   /**
    * Fetch restaurants by a cuisine type with proper error handling.
    */
   static fetchRestaurantByCuisine(cuisine) {
     return DBHelper.fetchRestaurants()
       .then(restaurants => restaurants.filter(r => r.cuisine_type === cuisine));
   }

   /**
    * Fetch restaurants by a neighborhood with proper error handling.
    */
   static fetchRestaurantByNeighborhood(neighborhood) {
     return DBHelper.fetchRestaurants()
       .then(restaurants => restaurants.filter(r => r.neighborhood === neighborhood));
   }

   /**
    * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
    */
   static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood) {
     return DBHelper.fetchRestaurants()
       .then(restaurants => {
         let results = restaurants;
         if (cuisine !== 'all') { // filter by cuisine
           results = results.filter(r => r.cuisine_type == cuisine);
         }
         if (neighborhood !== 'all') { // filter by neighborhood
           results = results.filter(r => r.neighborhood == neighborhood);
         }
         return results;
       });
   }

   /**
    * Fetch all neighborhoods with proper error handling.
    */
   static fetchNeighborhoods() {
     // Fetch all restaurants
     return DBHelper.fetchRestaurants()
       .then(restaurants => {
         // Get all neighborhoods from all restaurants
         const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
         // Remove duplicates from neighborhoods
         const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
         return uniqueNeighborhoods;
       });
   }

   /**
    * Fetch all cuisines with proper error handling.
    */
   static fetchCuisines(callback) {
     // Fetch all restaurants
     return DBHelper.fetchRestaurants()
       .then(restaurants => {
         // Get all cuisines from all restaurants
         const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
         // Remove duplicates from cuisines
         const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
         return uniqueCuisines;
       });
   }
   /**
    * Restaurant page URL.
    */
   static urlForRestaurant(restaurant) {
     return (`./restaurant.html?id=${restaurant.id}`);
   }

   /**
    * Restaurant image URL.
    */
   static imageUrlForRestaurant(restaurant) {
     return (`/img/${restaurant.photograph}.webp`);
   }

   /**
    * Map marker for a restaurant.
    */
   static mapMarkerForRestaurant(restaurant, map) {
       const marker = new google.maps.Marker({
         position: restaurant.latlng,
         title: restaurant.name,
         url: DBHelper.urlForRestaurant(restaurant),
         map: map,
         animation: google.maps.Animation.DROP}
       );
     return marker;
   }

   static addReview(review) {
     let offline_obj = {
       name: 'addReview',
       data: review,
       object_type: 'review'
     };
     // Check if online
     if (!navigator.onLine && (offline_obj.name === 'addReview')) {
       DBHelper.sendDataWhenOnline(offline_obj);
       return;
     }
     let reviewSend = {
       "name": review.name,
       "rating": parseInt(review.rating),
       "comments": review.comments,
       "restaurant_id": parseInt(review.restaurant_id)
     };
     console.log('Sending review: ', reviewSend);
     var fetch_options = {
       method: 'POST',
       body: JSON.stringify(reviewSend),
       headers: new Headers({
         'Content-Type': 'application/json'
       })
     };
     fetch(`http://localhost:${port}/reviews`, fetch_options).then((response) => {
       const contentType = response.headers.get('content-type');
       if (contentType && contentType.indexOf('application/json') !== -1) {
         return response.json();
       } else { return 'API call successfull'}})
     .then((data) => {console.log(`Fetch successful!`)})
     .catch(error => console.log('error:', error));
   }



   static sendDataWhenOnline(offline_obj) {
     console.log('Offline OBJ', offline_obj);
     localStorage.setItem('data', JSON.stringify(offline_obj.data));
     console.log(`Local Storage: ${offline_obj.object_type} stored`);
     window.addEventListener('online', (event) => {
       console.log('Browser: Online again!');
       let data = JSON.parse(localStorage.getItem('data'));
       console.log('updating and cleaning ui');
       [...document.querySelectorAll(".reviews_offline")]
       .forEach(el => {
         el.classList.remove("reviews_offline")
         el.querySelector(".offline_label").remove()
       });
       if (data !== null) {
         console.log(data);
         if (offline_obj.name === 'addReview') {
           DBHelper.addReview(offline_obj.data);
         }

         console.log('LocalState: data sent to api');

         localStorage.removeItem('data');
         console.log(`Local Storage: ${offline_obj.object_type} removed`);
       }
     });
   }


   static updateFavouriteStatus(restaurantId, isFavourite) {
     console.log('changing status to: ', isFavourite);

     fetch(`http://localhost:${port}/restaurants/${restaurantId}/?is_favorite=${isFavourite}`, {
         method: 'PUT'
       })
       .then(() => {
         console.log('changed');
         this.dbPromise()
           .then(db => {
             const tx = db.transaction('restaurants', 'readwrite');
             const restaurantsStore = tx.objectStore('restaurants');
             restaurantsStore.get(restaurantId)
               .then(restaurant => {
                 restaurant.is_favorite = isFavourite;
                 restaurantsStore.put(restaurant);
               });
           })
       })

   }


   /**
    * Fetch all reviews.
    */

   static storeIndexedDB(table, objects) {
     this.dbPromise.then(function(db) {
       if (!db) return;

       let tx = db.transaction(table, 'readwrite');
       const store = tx.objectStore(table);
       if (Array.isArray(objects)) {
         objects.forEach(function(object) {
           store.put(object);
         });
       } else {
         store.put(objects);
       }
     });
   }

   static getStoredObjectById(table, idx, id) {
     return this.dbPromise()
       .then(function(db) {
         if (!db) return;

         const store = db.transaction(table).objectStore(table);
         const indexId = store.index(idx);
         return indexId.getAll(id);
       });
   }

   static fetchReviewsByRestId(id) {
     return fetch(`${DBHelper.DATABASE_URL}reviews/?restaurant_id=${id}`)
       .then(response => response.json())
       .then(reviews => {
         this.dbPromise()
           .then(db => {
             if (!db) return;

             let tx = db.transaction('reviews', 'readwrite');
             const store = tx.objectStore('reviews');
             if (Array.isArray(reviews)) {
               reviews.forEach(function(review) {
                 store.put(review);
               });
             } else {
               store.put(reviews);
             }
           });
         // console.log('revs are: ', reviews);
         return Promise.resolve(reviews);
       })
       .catch(error => {
         return DBHelper.getStoredObjectById('reviews', 'restaurant', id)
           .then((storedReviews) => {
             console.log('looking for offline stored reviews');
             return Promise.resolve(storedReviews);
           })
       });
   }

   static fetchReviews(id) {
     return this.dbPromise()
       .then(db => {
         const tx = db.transaction('reviews');
         const reviewStore = tx.objectStore('reviews');
         console.log('all are: ', reviewStore.getAll());
         return reviewStore.getAll();
       })
       .then(reviews => {
         if (reviews.length !== 0) {
           console.log('before resolve: ', reviews);
           return Promise.resolve(reviews);
         }
         return this.fetchAndCacheReviews(id);
       })

   }

   static fetchAndCacheReviews(id) {
     console.log("id is", id);
     return fetch(`${DBHelper.DATABASE_URL}reviews/?restaurant_id=${id}`)
       .then(response => response.json())
       .then(reviews => {
         console.log("all rev are", reviews);
         return this.dbPromise()
           .then(db => {
             const tx = db.transaction('reviews', 'readwrite');
             const restaurantStore = tx.objectStore('reviews');
             reviews.forEach(review => restaurantStore.put(review));

             return tx.complete.then(() => Promise.resolve(reviews));
           });
       });
   }

   static fetchReviewsByRestaurantId(id) {
     return this.fetchReviews(id).then(reviews => {
       return this.dbPromise().then(db => {
         const tx = db.transaction('reviews');
         const reviewsStore = tx.objectStore('reviews');
         const restaurantIndex = reviewsStore.index('restaurant');
         return restaurantIndex.getAll(id);
       }).then(restaurantReviews => {
         const filtered = reviews.filter(review => review.restaurant_id === id);
         console.log('by id revs are: ', filtered);
         return filtered;

       })
     })
   }

    static lazyLoad() {
        let lazyImages = [].slice.call(document.querySelectorAll("img.lazy"));
        let active = false;
        //console.log(lazyImages);
        const lazyLoad = function() {
         if (active === false) {
           active = true;   console.log("Lazy loading for images!");
           setTimeout(function() {
             lazyImages.forEach(function(lazyImage) {
               if ((lazyImage.getBoundingClientRect().top <= window.innerHeight && lazyImage.getBoundingClientRect().bottom >= 0) && getComputedStyle(lazyImage).display !== "none") {
                 lazyImage.src = lazyImage.dataset.src;
                 lazyImage.classList.remove("lazy");
                 lazyImages = lazyImages.filter(function(image) {
                   return image !== lazyImage;
                 });
                 if (lazyImages.length === 0) {
                   document.removeEventListener("scroll", lazyLoad);
                   window.removeEventListener("resize", lazyLoad);
                   window.removeEventListener("orientationchange", lazyLoad);
                 }
               }
             });
             active = false;
           }, 200);
         }
        };
        document.addEventListener("scroll", lazyLoad);
        window.addEventListener("resize", lazyLoad);
        window.addEventListener("orientationchange", lazyLoad);
    }

 }

// import dbhelper from "./dbhelper.js";
let restaurants,
  neighborhoods,
  cuisines;
var map, markers = [];
if (port === 'undefined') port = 3000;
/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
    // restaurants will be updated after the map is Initialized
  fetchNeighborhoods();
  fetchCuisines();
  loadMap(); //load map with delay
});
const loadMap = () => {
    function loadMapScript() {
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyC3pa-m-yxkEYhP-ohT5qPN3o4OVt0df68&libraries=places&callback=initMap';
        document.body.appendChild(script);
        console.log('map loading');
    }
    setTimeout(loadMapScript(), 1000);
}
/**
 * Fetch all neighborhoods and set their HTML.
 */
 const fetchNeighborhoods = () => {
   DBHelper.fetchNeighborhoods()
     .then(neighborhoods => {
       self.neighborhoods = neighborhoods;
       fillNeighborhoodsHTML();
     })
     .catch(error => console.error(error));
 }

/**
 * Set neighborhoods HTML.
 */
const fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}
/**
 * Fetch all cuisines and set their HTML.
 */
const fetchCuisines = () => {
  DBHelper.fetchCuisines()
    .then(cuisines => {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    })
    .catch(error => console.log(error)); // Got an error!
}
/**
 * Set cuisines HTML.
 */
const fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}
/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  // update the restaurants locations
  setTimeout(updateRestaurants(), 1500);
}

/**
 * Update page and map for current restaurants.
 */
const updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood)
    .then(restaurants => {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    })
    .catch(error => console.error(error));
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
const resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
const fillRestaurantsHTML = (restaurants = self.restaurants) => {
    let tabIndex = 3;
    const ul = document.getElementById('restaurants-list');
    restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
    });
    setTimeout(addMarkersToMap(), 1500);
}

/**
 * Create restaurant HTML.
 */
const createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');
  li.className = 'restaurant-item';

  //favorite part
  const favourite = document.createElement('button');
  favourite.classList.add("favoritebtn");
  favourite.innerHTML = `&#x2764;`; //"&#9733;";
  favourite.setAttribute('restaurant_id', restaurant.id);
  favourite.setAttribute('aria-pressed', 'false');
  favourite.onclick = function() {
    const isFavNow = !restaurant.is_favorite;
    DBHelper.updateFavouriteStatus(restaurant.id, isFavNow);
    restaurant.is_favorite = !restaurant.is_favorite;
    favourite.setAttribute('aria-pressed', 'true');
    changeFavElementClass(favourite, restaurant.is_favorite);
  };
  changeFavElementClass(favourite, restaurant.is_favorite);
  li.append(favourite);

  // image part
  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.setAttribute("alt", restaurant.name + " Restaurant image");
  image.setAttribute("width","100%");
  image.setAttribute('itemprop', 'image');
  const config = {  threshold: 0.1 };
  let observer;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(onChange, config);
    observer.observe(image);
  } else {
    console.log('Intersection Observers not supported', 'color: red');
    loadImage(image);
  }
  const loadImage = image => {
    image.className = 'restaurant-img';
    image.setAttribute('src', DBHelper.imageUrlForRestaurant(restaurant));
  }

  function onChange(changes, observer) {
    changes.forEach(change => {
      if (change.intersectionRatio > 0) {   //console.log('image in View');
        loadImage(change.target); // Stop watching and load the image
        observer.unobserve(change.target);
      }
    });
  }
  li.append(image);

  //restaurant part
  const name = document.createElement('h2');
  name.className = 'restaurant-name';
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.className = 'restaurant-neighborhood';
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.className = 'restaurant-address';
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.className = 'restaurant-more';
  more.innerHTML = 'View Details';
  more.setAttribute('title', 'View Details for ' + restaurant.name);
  more.setAttribute('itemprop', 'url');
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more);

  return li
}

/**
 * change favorite class for restaurant
 */
const changeFavElementClass = (el, fav) => {
  if (!fav) {
    el.classList.remove('favorite_yes');
    el.classList.add('favorite_no');
    el.setAttribute('aria-label', 'Set restaurant as a favorite');
    el.setAttribute('aria-pressed', 'false');
  } else {
    console.log('toggle favorite update');
    el.classList.remove('favorite_no');
    el.classList.add('favorite_yes');
    el.setAttribute('aria-label', 'Remove restaurant as favorite');
    el.setAttribute('aria-pressed', 'true');
  }
}

/**
 * Add markers for current restaurants to the map.
 */
const addMarkersToMap = (restaurants = self.restaurants) => {
    console.log('add markers to restaurants');
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
}
