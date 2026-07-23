/*
  settings.js
  Store settings panel rendering (store name, phone, currency, tax).
*/

      function renderSettings() {
        document.getElementById("store-name").value = state.settings.storeName;
        document.getElementById("store-phone").value = state.settings.storePhone;
        document.getElementById("store-phone-2").value = state.settings.storePhone2 || "";
        document.getElementById("store-email").value = state.settings.storeEmail || "";
        document.getElementById("currency").value = state.settings.currency;
        document.getElementById("default-tax").value = state.settings.defaultTax;
        els.tax.value = state.settings.defaultTax;
      }
