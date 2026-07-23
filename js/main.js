/*
  main.js
  App bootstrap: init() loads data from the server (or shows a
  'not configured' message) and starts the periodic background refresh.
*/

      async function init() {
        if (!isConfigured) {
          els.productGrid.innerHTML =
            `<div class="empty">Server not configured yet. Open grocery-pos.html, set SUPABASE_URL and SUPABASE_ANON_KEY near the top of the script (see the SERVER CONNECTION comment), then reload this page.</div>`;
          renderSettings();
          return;
        }
        els.productGrid.innerHTML = `<div class="empty">Loading store data...</div>`;
        try {
          await loadState();
        } catch (err) {
          console.error(err);
          await showAlert("Could not load data from the server. Check your internet connection and the Supabase configuration at the top of this file.");
        }
        renderSettings();
        renderAll();
        setInterval(refreshFromServer, 20000);
      }

      init();
