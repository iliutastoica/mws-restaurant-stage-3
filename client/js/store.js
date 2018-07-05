'use strict';

var store = {
  db: null,

  init: function() {
    if (store.db) { return Promise.resolve(store.db); }
    return idb.open('restaurants', 1, function(upgradeDb) {
      switch (upgradeDb.oldVersion) {
        case 0:
          upgradeDb.createObjectStore('restaurants', {keyPath: 'id'})
          upgradeDb.createObjectStore('reviews', {keyPath: 'id'})
          upgradeDb.createObjectStore('outbox', {autoIncrement : true, keyPath: 'id'})
      }
    }).then(function(db) {
      return store.db = db;
    });
  },

  outbox: function(mode) {
    return store.init().then(function(db) {
      return db.transaction('outbox', mode).objectStore('outbox');
    })
  },

  restaurants: function(mode) {
    return store.init().then(function(db) {
      return db.transaction('restaurants', mode).objectStore('restaurants');
    })
  },
  reviews: function(mode) {
    return store.init().then(function(db) {
      return db.transaction('reviews', mode).objectStore('reviews');
    })
  }

}
