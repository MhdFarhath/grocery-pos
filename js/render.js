/*
  render.js
  renderAll() - the single entry point that refreshes every view.
*/

      function renderAll() {
        renderCategories();
        renderProducts();
        renderCart();
        renderInventory();
        renderSales();
        renderCreditors();
        renderCheques();
        renderChequeHistory();
      }
