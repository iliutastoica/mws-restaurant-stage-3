let restaurant;
var map;
if (!port) port = 3000;
loadMap = () => {
    function loadScript() {
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyC3pa-m-yxkEYhP-ohT5qPN3o4OVt0df68&libraries=places&callback=initMap';
        document.body.appendChild(script);
        console.log('map loading');
    }
    setTimeout(loadScript(), 1000);
}
loadMap();
/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
      google.maps.event.addDomListener(window, 'resize', function () {
        map.setCenter(restaurant.latlng);
      });
    }
  });
}
/**
 * Get current restaurant from page URL.
 */
const fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}
// get the favorite restaurant
favoriteRestaurant = (fav) => {
    const name = document.getElementById('restaurant-name');
    console.log(fav, self.restaurant.name, name)
    if(fav){
        name.innerHTML = `${self.restaurant.name}
        <svg class='heart complete' onClick="favoriteRestaurant(false)" viewBox="0 0 32 29.6">
          <path id='heartpath' d="M23.6,0c-3.4,0-6.3,2.7-7.6,5.6C14.7,2.7,11.8,0,8.4,0C3.8,0,0,3.8,0,8.4c0,9.4,9.5,11.9,16,21.2
            c6.1-9.3,16-12.1,16-21.2C32,3.8,28.2,0,23.6,0z"/>
        </svg>`
      }else{
        name.innerHTML = `${self.restaurant.name}
        <svg class='heart' onClick="favoriteRestaurant(true)" viewBox="0 0 32 29.6">
            <path id='heartpath' d="M23.6,0c-3.4,0-6.3,2.7-7.6,5.6C14.7,2.7,11.8,0,8.4,0C3.8,0,0,3.8,0,8.4c0,9.4,9.5,11.9,16,21.2
          c6.1-9.3,16-12.1,16-21.2C32,3.8,28.2,0,23.6,0z"/>
        </svg>`
      }
    fetch(`http://localhost:`+port+`/restaurants/${self.restaurant.id}/?is_favorite=${fav}`, {method: 'PUT'})
    .then(function(response) {
      if (!response.ok) {
        throw Error(response.statusText);
      }
      return response.json();
    })
    .then(function(restaurant) {
      const dbPromise = idb.open('restaurants', 1)
      console.log('dbPromise', dbPromise)
      dbPromise.then(function(db) {
        if(!db) return;
        var tx = db.transaction('restaurants', 'readwrite');
        console.log(tx)
        var store = tx.objectStore('restaurants');
        store.put(restaurant)
      })
    })
    .catch((err) => {
      console.log("Fav rest err: ", err)
    });
}
/**
 * Create restaurant HTML and add it to the webpage
 */
const fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;
  if(restaurant.is_favorite === true || restaurant.is_favorite === 'true'){
    name.innerHTML = `${restaurant.name}
    <svg class='heart complete' onClick="favoriteRestaurant(false)" viewBox="0 0 32 29.6">
        <path id='heartpath' d="M23.6,0c-3.4,0-6.3,2.7-7.6,5.6C14.7,2.7,11.8,0,8.4,0C3.8,0,0,3.8,0,8.4c0,9.4,9.5,11.9,16,21.2
      c6.1-9.3,16-12.1,16-21.2C32,3.8,28.2,0,23.6,0z"/>
    </svg>`
  }else{
    name.innerHTML = `${restaurant.name}
    <svg class='heart' onClick="favoriteRestaurant(true)" viewBox="0 0 32 29.6">
    <path id='heartpath' d="M23.6,0c-3.4,0-6.3,2.7-7.6,5.6C14.7,2.7,11.8,0,8.4,0C3.8,0,0,3.8,0,8.4c0,9.4,9.5,11.9,16,21.2
  c6.1-9.3,16-12.1,16-21.2C32,3.8,28.2,0,23.6,0z"/>
    </svg>`
  }
  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;
  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img lazy';
  image.setAttribute("alt", restaurant.name + " Restaurant");
  image.setAttribute("width","100%");
  image.setAttribute('itemprop', 'image');
   //image.src = DBHelper.imageUrlForRestaurant(restaurant);
   // image.src = imgUrl;
   image.setAttribute('src', DBHelper.imageUrlForRestaurant(restaurant));
   // var myLazyLoad = new LazyLoad();
    //console.log(image);
    
  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;
  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}
/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
const fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');
    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);
    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);
    hours.appendChild(row);
  }
}
/**
 * Create all reviews HTML and add them to the webpage.
 */
const fillReviewsHTML = (id = self.restaurant.id) => {
  document.getElementById("restaurant_id").setAttribute("value", id);
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  container.appendChild(title);
  DBHelper.fetchReviewsbyRestaurantId(id, (error, reviews) => {
    if (error) {
      console.log(error);
    } else {
      if (!reviews) {
        const noReviews = document.createElement('p');
        noReviews.innerHTML = 'No reviews yet!';
        container.appendChild(noReviews);
        return;
      }
      const ul = document.getElementById('reviews-list');
      reviews.forEach(review => {
        ul.appendChild(createReviewHTML(review));
      });
      container.appendChild(ul);
    }
  });
}
/**
 * Create review HTML and add it to the webpage.
 */
const createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);
  const date = document.createElement('p');
  date.innerHTML = review.updatedAt;
  li.appendChild(date);
  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);
  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);
  return li;
}
/**
 * Add restaurant name to the breadcrumb navigation menu
 */
const fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}
/**
 * Get a parameter by name from page URL.
 */
const getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
const registerServiceWorker = () => {
  if (!navigator.serviceWorker) return;
  navigator.serviceWorker.register("/sw.js").then(() => {
    console.log ("Registration worked!");
  }).catch((error) => {
    console.log ("Registration failed!", error);
  });
}
document.getElementById("submit-review").addEventListener("click", function(){
  const data = {
    "restaurant_id": document.getElementById("restaurant_id").value,
    "name": document.getElementById("name").value,
    "rating": document.getElementById("rating").value,
    "comments": document.getElementById("comments").value
  };
  DBHelper.addReview(data);
  navigator.serviceWorker.ready.then(function(swRegistration) {
    console.log("Review sync added");
    return swRegistration.sync.register('syncReviews');
  });
  window.location.reload();
})
