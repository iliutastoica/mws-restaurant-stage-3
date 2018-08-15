let restaurant;
var map;
if (!port) port = 3000;

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
document.addEventListener('DOMContentLoaded', (event) => {
  loadMap();
});

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL()
    .then(restaurant => {
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
    }).catch(error => console.error(error));
}

/**
 * Get current restaurant from page URL.
 */
const fetchRestaurantFromURL = () => {
  if (self.restaurant) { // restaurant already fetched!
    return Promise.resolve(self.restaurant);
  }
  const id = parseInt(getParameterByName('id'));
  if (!id || id === NaN) { // no id found in URL
    return Promise.reject('No restaurant id in URL')
  } else {
    return DBHelper.fetchRestaurantById(id)
      .then(restaurant => {
        if (!restaurant) {
          return Promise.reject(`Restaurant with ID ${id} was not found`)
        }
        self.restaurant = restaurant;
        fillRestaurantHTML();
        return restaurant;
      });
  }
}


/**
 * Create restaurant HTML and add it to the webpage
 */
const fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  //favorite part
  const favourite = document.getElementById('favoritebtn');
  //favourite.innerHTML = `&#x2764;`; //"&#9733;";
  favourite.setAttribute('restaurant_id', restaurant.id);
  favourite.onclick = function() {
    const isFavNow = !restaurant.is_favorite;
    DBHelper.updateFavouriteStatus(restaurant.id, isFavNow);
    restaurant.is_favorite = !restaurant.is_favorite;
    changeFavElementClass(favourite, restaurant.is_favorite);
    favourite.setAttribute('aria-pressed', 'true');
  };
  changeFavElementClass(favourite, restaurant.is_favorite);

  //restaurant image
  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img';
  image.setAttribute("alt", restaurant.name + " Restaurant");
  image.setAttribute("width","100%");
  image.setAttribute('itemprop', 'image');
  image.setAttribute('src', DBHelper.imageUrlForRestaurant(restaurant));
    //console.log(image);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }

  // fill reviews
  console.log('populate reviews');
  DBHelper.fetchReviewsByRestId(restaurant.id).then(reviews => fillReviewsHTML(reviews));
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
const fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  console.log('Reviews:', reviews);
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.id = 'no-review';
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.reverse().forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}


/**
 * Create review HTML and add it to the webpage.
 */
const createReviewHTML = (review) => {
  const li = document.createElement('li');
  if (!navigator.onLine) {
    const connection_status = document.createElement('p');
    connection_status.classList.add('offline_label')
    connection_status.innerHTML = "Offline"
    li.classList.add("reviews_offline")
    li.appendChild(connection_status);
  }
  const name = document.createElement('p');
  name.innerHTML = `Name: ${review.name}`;
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = `Date: ${new Date(review.createdAt).toLocaleString()}`;
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);
  return li;
}


// Form validation & submission
const addReview = () => {
    event.preventDefault();
    // Getting the data from the form
    let restaurantId = getParameterByName('id');
    let name = document.getElementById('review-author').value;
    let rating;
    let comments = document.getElementById('review-comments').value;
    rating = document.querySelector('#rating_select option:checked').value;
    const review = [name, rating, comments, restaurantId];

    // Add data to DOM
    const frontEndReview = {
        restaurant_id: parseInt(review[3]),
        rating: parseInt(review[1]),
        name: review[0],
        comments: review[2].substring(0, 300),
        createdAt: new Date()
    };
    // Send review to backend
    DBHelper.addReview(frontEndReview);
    addReviewHTML(frontEndReview);
    document.getElementById('review-form').reset();
}

const addReviewHTML = (review) => {
    if (document.getElementById('no-review')) {
        document.getElementById('no-review').remove();
    }
    const container = document.getElementById('reviews-container');
    const ul = document.getElementById('reviews-list');

    //insert the new review on top
    ul.insertBefore(createReviewHTML(review), ul.firstChild);
    container.appendChild(ul);
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
