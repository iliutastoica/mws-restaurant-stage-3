const port = 3000; // 1337; // Change this to your server port

if ('serviceWorker' in navigator) {
    // <!-- Service Worker Registration -->
    registerServiceWorker = () => {
    if (!navigator.serviceWorker) return;

        navigator.serviceWorker.register('./sw.js').then(function (reg) {
        console.log('Registration Worked!');
        if (!navigator.serviceWorker.controller) {  return;  }

        var form = document.getElementById('review-form');
        if ('sync' in reg && form) {
          form.addEventListener('submit', function(event) {
              event.preventDefault();

              const review = {
                "restaurant_id": getParameterByName('id'),
                "name": document.getElementById("name").value,
                "rating": document.getElementById("rating").value,
                "comments": document.getElementById("comments").value,
                "createdAt": new Date()
              }

              const ul = document.getElementById('reviews-list');
              ul.insertBefore(createReviewHTML(review), ul.lastElementChild);

              store.outbox('readwrite').then(function(outbox) {
                return outbox.put(review);
              }).then(function() {
                return reg.sync.register('outbox');
              }).catch(function(err) {
                  console.error(err);
                  form.submit();
               });
          });
        }

        }).catch(function () {   console.log('Registration failed!');    });
    }
    registerServiceWorker();
}
store.init();

getParameterByName = (name, url) => {
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
createReviewHTML = (review) => {
  const li = document.createElement('li');

  const name = document.createElement('p');
  name.innerHTML = review.name;


  const date = document.createElement('p');
  date.innerHTML = new Date(review.createdAt).toLocaleString();
  date.id = 'restaurant-date';

  const ul = document.createElement('ul');
  ul.id = 'restaurant-basic-nav';

  ul.appendChild(name);
  ul.appendChild(date);
  li.appendChild(ul);


  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  rating.id = 'restaurant-rating';
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  comments.id = 'restaurant-comment';
  li.appendChild(comments);
  li.tabIndex = '0';

  return li;
}


// open Database
openDatabase = () => {
  return idb.open('restaurants', 1, upgradeDB => {
    switch (upgradeDB.oldVersion) {
      case 0:
        const store = upgradeDB.createObjectStore('restaurants', {keyPath: 'id'})
        store.createIndex('neighborhood', 'neighborhood')
    }
  })
}
const dbPromise = openDatabase();

fetch(`http://localhost:${port}/reviews`).then(function(response) {
    return response.json();
  }).then(function(reviews) {
    store.reviews('readwrite').then(function(store) {
      reviews.map((review)=>{
        store.put(review)
      })
    })
  })
  .catch((err) => {
    console.log("Error fetching data.", err)
  });

fetch(`http://localhost:${port}/restaurants`).then(function(response) {
    console.log(response)
    return response.json();
  }).then(function(restaurants) {
    console.log("Restaurants: ", restaurants)
    dbPromise.then(function(db) {
      if(!db) return;
      var tx = db.transaction('restaurants', 'readwrite');
      var store = tx.objectStore('restaurants');
      restaurants.map((restaurant)=>{
        store.put(restaurant)
      })
    })
  }).catch((err) => {
    console.log("Error fetching data.")
  });
