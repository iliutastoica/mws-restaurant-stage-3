// register serviceWorker ======================
const registerServiceWorker = () => {
  if (!navigator.serviceWorker) return;

  navigator.serviceWorker.register("sw.js").then(() => {
    console.log ("Registration worked!");
    // Then later, request a one-off sync:

  }).catch((error) => {
    console.log ("Registration failed!", error);
  });
}
registerServiceWorker();
