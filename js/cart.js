/*
  cart.js
  Shopping cart logic: cartTotals, renderCart, addToCart, addProductQuantity,
  updateCart, the loose-item quantity modal (open/close/quick quantities).
*/

      function cartTotals() {
        const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
        const discount = Math.min(Number(els.discount.value || 0), subtotal);
        const taxable = Math.max(subtotal - discount, 0);
        const tax = taxable * (Number(els.tax.value || 0) / 100);
        const total = taxable + tax;
        const paid = Number(els.paid.value || 0);
        return { subtotal, discount, tax, total, paid, change: Math.max(paid - total, 0), credit: Math.max(total - paid, 0) };
      }

      function renderCart() {
        els.cartItems.innerHTML =
          state.cart
            .map(
              (item) => `
                <div class="cart-row">
                  <div>
                    <strong>${item.name}</strong>
                    <small>${item.isCustom ? money(item.price) : `${priceLabel(item)} x ${displayQty(item.qty, item.unit)}`}</small>
                  </div>
                  <div class="cart-controls">
                    ${
                      item.isCustom
                        ? ""
                        : `<button class="icon-btn" title="Decrease" data-dec="${item.id}">-</button>
                           <strong>${item.qty}</strong>
                           <button class="icon-btn" title="Increase" data-inc="${item.id}">+</button>`
                    }
                    <button class="icon-btn danger" title="Remove" data-remove="${item.id}">x</button>
                  </div>
                </div>`
            )
            .join("") || `<div class="empty">Add products to start a sale.</div>`;

        const totals = cartTotals();
        els.subtotal.textContent = money(totals.subtotal);
        els.taxAmount.textContent = money(totals.tax);
        els.total.textContent = money(totals.total);
        els.change.textContent = money(totals.change);
      }

      function addToCart(id) {
        const product = state.products.find((item) => item.id === id);
        if (!product || product.stock <= 0) return;
        if (product.saleType === "loose") {
          openQuantityModal(product);
          return;
        }
        addProductQuantity(product, 1);
      }

      function addProductQuantity(product, qty) {
        const line = state.cart.find((item) => item.id === product.id);
        const currentQty = line ? line.qty : 0;
        if (currentQty >= product.stock) return;
        const nextQty = Math.min(currentQty + qty, product.stock);
        if (line) line.qty = nextQty;
        else {
          state.cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            qty: nextQty,
            saleType: product.saleType,
            unit: product.unit
          });
        }
        renderCart();
      }

      function updateCart(id, delta) {
        const line = state.cart.find((item) => item.id === id);
        const product = state.products.find((item) => item.id === id);
        if (!line || !product) return;
        line.qty += delta * unitStep(product);
        if (line.qty > product.stock) line.qty = product.stock;
        if (line.qty <= 0) state.cart = state.cart.filter((item) => item.id !== id);
        renderCart();
      }

      function quickQuantities(product) {
        if (product.unit === "kg") return [0.1, 0.5, 0.6, 1];
        if (product.unit === "g") return [100, 500, 600, 1000];
        if (product.unit === "l") return [0.1, 0.5, 1, 1.5];
        if (product.unit === "ml") return [100, 500, 600, 1000];
        return [0.5, 1, 2, 5];
      }

      function openQuantityModal(product) {
        state.pendingProductId = product.id;
        els.quantityTitle.textContent = product.name;
        els.quantityPrice.textContent = `${priceLabel(product)} - Stock ${stockLabel(product)}`;
        els.quantityInput.value = quickQuantities(product)[0];
        els.quantityInput.max = product.stock;
        els.quickQty.innerHTML = quickQuantities(product)
          .map((qty) => `<button class="secondary" type="button" data-quick-qty="${qty}">${displayQty(qty, product.unit)}</button>`)
          .join("");
        renderQuantityTotal();
        els.quantityModal.classList.add("open");
      }

      function closeQuantityModal() {
        state.pendingProductId = null;
        els.quantityModal.classList.remove("open");
      }

      function renderQuantityTotal() {
        const product = state.products.find((item) => item.id === state.pendingProductId);
        if (!product) return;
        const qty = Math.max(Number(els.quantityInput.value || 0), 0);
        els.quantityTotal.textContent = money(qty * product.price);
      }

      // For charges that aren't a real inventory product (e.g. giving a toffee
      // instead of small change, a bag charge, a rounding adjustment, etc).
      // These never touch product stock and can only be removed, not stepped +/-.
      function addCustomAmount(label, amount) {
        if (!amount || amount <= 0) return;
        state.cart.push({
          id: Date.now(),
          name: label && label.trim() ? label.trim() : "Extra amount",
          price: amount,
          qty: 1,
          saleType: "pack",
          unit: "item",
          isCustom: true
        });
        renderCart();
      }
