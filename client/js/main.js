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
loadMap = () => {
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
  updateRestaurants();
}

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
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
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
const fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
  DBHelper.lazyLoad();
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
  favourite.innerHTML = `	&#x2764;`; //"&#9733;";
  favourite.setAttribute('restaurant_id', restaurant.id);
  favourite.onclick = function() {
    const isFavNow = !restaurant.is_favorite;
    DBHelper.updateFavouriteStatus(restaurant.id, isFavNow);
    restaurant.is_favorite = !restaurant.is_favorite;
    changeFavElementClass(favourite, restaurant.is_favorite);
  };
  changeFavElementClass(favourite, restaurant.is_favorite);
  li.append(favourite);

  // image part
  const image = document.createElement('img');
  image.className = 'restaurant-img lazy';
  //image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.setAttribute('data-src', DBHelper.imageUrlForRestaurant(restaurant));
  // var myLazyLoad = new LazyLoad();
  image.setAttribute("alt", restaurant.name + " Restaurant image");
  image.setAttribute("width","100%");
  image.setAttribute('itemprop', 'image');
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

  } else {
    console.log('toggle favorite update');
    el.classList.remove('favorite_no');
    el.classList.add('favorite_yes');
    el.setAttribute('aria-label', 'Remove restaurant as favorite');

  }
}

/**
 * Add markers for current restaurants to the map.
 */
const addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
}
