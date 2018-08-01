// import dbhelper from "./dbhelper.js";

let restaurants,
  neighborhoods,
  cuisines;
var map, markers = [];
if (!port) port = 3000;

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  //updateRestaurants();
  fetchNeighborhoods();
  fetchCuisines();
  // registerServiceWorker();
  loadMap(); //load map with delay
});

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

/**
 * Fetch all neighborhoods and set their HTML.
 */


const fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

validateForm = () => {
  console.log(document.forms["myForm"]);
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
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
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
  updateRestaurants();
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

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
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

  const isFavorite = document.createElement('button');
  isFavorite.innerHTML = "&#9733;";

  if (restaurant.is_favorite == "true") {
    console.log("restaurant.is_favorite = true");
    isFavorite.className = 'is-favorite';
    isFavorite.setAttribute('aria-label', "Unset restaurant as a favorite");
  } else {
    console.log("restaurant.is_favorite = false");
    isFavorite.setAttribute('aria-label', "Set restaurant as a favorite");
  }

  isFavorite.setAttribute('restaurant_id', restaurant.id);
  isFavorite.addEventListener('click', toggleFavorite);

  li.append(isFavorite);

  const image = document.createElement('img');
  image.className = 'restaurant-img lazy';
  //image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.setAttribute('data-src', DBHelper.imageUrlForRestaurant(restaurant));
  // var myLazyLoad = new LazyLoad();

  image.setAttribute("alt", restaurant.name + " Restaurant");
  image.setAttribute("width","100%");
  image.setAttribute('itemprop', 'image');
  li.append(image);

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
  li.append(more)

  return li
}

/**
 * Add markers for current restaurants to the map.
 */
const addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
}

// const registerServiceWorker = () => {
//   if (!navigator.serviceWorker) return;
//
//   navigator.serviceWorker.register("/sw.js").then(() => {
//     console.log ("Registration worked!");
//     // Then later, request a one-off sync:
//
//   }).catch((error) => {
//     console.log ("Registration failed!", error);
//   });
// }



const toggleFavorite = function(){
    const toggleButton = this;
    const restaurant_id = toggleButton.getAttribute("restaurant_id");



    if (toggleButton.classList.contains('is-favorite')) {

      toggleButton.setAttribute('aria-label', "Set restaurant as a favorite");
      toggleButton.classList.toggle("is-favorite");
      DBHelper.favoriteRestaurant(restaurant_id, false);

    } else {

      toggleButton.setAttribute('aria-label', "Unset restaurant as a favorite");
      toggleButton.classList.toggle("is-favorite");
      DBHelper.favoriteRestaurant(restaurant_id, true);
    }

    navigator.serviceWorker.ready.then(function(swRegistration) {
      console.log("Favorites sync added");
      return swRegistration.sync.register('syncFavorites');
    });




};

// document.getElementById("showMap").addEventListener("click", function(){
//   document.getElementById("map").classList.toggle("hiden");
// })
