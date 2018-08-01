/**
 * Common database helper functions.
 */
const openDatabase = () => {
  // If the browser doesn't support service worker,
  // we don't care about having a database
  console.log('open DB ...');
  if (!navigator.serviceWorker) {
    return Promise.resolve();
  }

  return idb.open('restaurantsDB', 1, function(upgradeDb) {

    const restaurantsStore = upgradeDb.createObjectStore('restaurants', {
      keyPath: 'id'
    });

    const reviewsStore = upgradeDb.createObjectStore('reviews', {
      keyPath: 'id'
    });

    const favsStore = upgradeDb.createObjectStore('favs', {
      keyPath: 'id'
    });
    const revsStore = upgradeDb.createObjectStore('revs', {
      keyPath: 'id'
    });
  });
}



class DBHelper {

    static get DATABASE_URL() {
      const port = 1337 // Change this to your server port
      return `//localhost:${port}/`;
    }

  /**
   * Fetch all restaurants.
   */

  static get DATABASE_URL_RESTAURANTS() {
    return DATABASE_URL()+"restaurants"
  }

  static get DATABASE_URL_REVIEWS() {
    return  DATABASE_URL()+"reviews"
  }

  static openDB() {
    openDatabase();
  }



  static fetchRestaurants(callback) {


    fetch(DBHelper.DATABASE_URL_RESTAURANTS)
      .then((response) => {
        return response.json();
      })
      .then((restaurants) => {
          callback(null, restaurants);
          DBHelper.addRestaurantsToDatabase(restaurants);

      })
      .catch((error) => {
        console.log(error);

        const dbPromise = openDatabase();
        dbPromise.then((db) => {
            if (!db) return;
            console.log("DB opened. Getting restaurants.. ");

            const tx = db.transaction('restaurants', 'readwrite');
            const store = tx.objectStore('restaurants');

            store.getAll().then((restaurants) => {

              if (restaurants) { // Got the restaurants
                console.log("Restaurants served from DB");
                callback(null, restaurants);
              } else { // Error occured
                callback(error, null);
              }

            });
        });
      })

  }


  static fetchReviews(callback) {


    fetch(DBHelper.DATABASE_URL_REVIEWS)
      .then((response) => {
        return response.json();
      })
      .then((reviews) => {
          //console.log(reviews);
          callback(null, reviews);
          DBHelper.addReviewsToDatabase(reviews);

      })
      .catch((error) => {
        console.log(error);
          const dbPromise = openDatabase();
          dbPromise.then((db) => {
              if (!db) return;
              console.log("DB opened. Getting reviews.. ");

              const tx = db.transaction('reviews', 'readwrite');
              const store = tx.objectStore('reviews');

              store.getAll().then((reviews) => {

                if (reviews) { // Got the restaurants
                  console.log("reviews served from DB");
                  callback(null, reviews);
                } else { // Error occured
                  callback(error, null);
                }

              });
          });

      })

  }

  static addRestaurantsToDatabase(restaurants) {

    const dbPromise = openDatabase();

    dbPromise.then((db) => {
      if (!db) return;
      console.log("DB opened. Adding restaurants.. ");
      const tx = db.transaction('restaurants', 'readwrite');
      const store = tx.objectStore('restaurants');

      restaurants.forEach((restaurant) => {
        store.put(restaurant);
      });

      console.log("Restaurants updated!!");
    });
  }

  static addReviewsToDatabase(reviews) {

    const dbPromise = openDatabase();

    dbPromise.then((db) => {
      if (!db) return;
      console.log("DB opened. Adding reviews.. ");
      const tx = db.transaction('reviews', 'readwrite');
      const store = tx.objectStore('reviews');

      reviews.forEach((review) => {
        store.put(review);
      });

      console.log("reviews updated!!");
    });

  }

  static favoriteRestaurant(restaurant_id, isFavorite) {
    const dbPromise = openDatabase();


    dbPromise.then((db) => {
      if (!db) return;
      console.log("DB opened. Adding fav.. ");
      const tx = db.transaction('favs', 'readwrite');
      const store = tx.objectStore('favs');
      store.put({
        "id": restaurant_id,
        "isFavorite": isFavorite
      });
    });
  }

  static addReview(data) {
    const dbPromise = openDatabase();

    dbPromise.then((db) => {
      if (!db) return;
      console.log("DB opened. Adding users review.. ");
      const tx = db.transaction('revs', 'readwrite');
      const store = tx.objectStore('revs');
      return store.getAll();
    })
    .then(function(revs){
      //Create a temporary ID to store reviews in the DB.
      let id = revs.length;
      data.id = id;

      //add review data to DB
      dbPromise.then((db) => {
        const tx = db.transaction('revs', 'readwrite');
        const store = tx.objectStore('revs');
        store.put(data);
      })
    })
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }


  static fetchReviewsbyRestaurantId(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchReviews((error, reviews) => {
      if (error) {
        callback(error, null);
      } else {
        reviews = reviews.filter(r => r.restaurant_id == id);
        if (reviews) { // Got the reviews
          callback(null, reviews);
        } else { // There are no reviews in the database
          callback('There are no reviews in the database', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
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
              lazyImage.srcset = lazyImage.dataset.srcset;
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
