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
