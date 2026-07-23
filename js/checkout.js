/*
  checkout.js
  Checkout flow: image file reading, creditor dropdown, credit controls,
  addCreditToCustomer, checkout(), and the sale receipt.
*/

      function readImageFile(file) {
        return new Promise((resolve) => {
          if (!file) {
            resolve("");
            return;
          }
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => resolve("");
          reader.readAsDataURL(file);
        });
      }

      function renderCreditorOptions() {
        const selected = els.creditorSelect.value;
        els.creditorSelect.innerHTML =
          state.creditors
            .map((creditor) => `<option value="${creditor.id}">${creditor.name} - ${money(creditor.amount)}</option>`)
            .join("") + `<option value="new">New credit customer</option>`;

        if (state.creditors.some((creditor) => String(creditor.id) === selected) || selected === "new") {
          els.creditorSelect.value = selected;
        } else {
          els.creditorSelect.value = state.creditors.length ? String(state.creditors[0].id) : "new";
        }
      }

      // Shows the credit-customer popup pre-filled with the amount owed;
      // resolves with the chosen/typed customer name, or null if cancelled.
      function promptCreditCustomer(creditAmount) {
        return new Promise((resolve) => {
          els.creditAmount.value = Math.round(creditAmount);
          renderCreditorOptions();
          els.newCreditorField.classList.toggle("active", els.creditorSelect.value === "new");
          document.getElementById("credit-customer-subtitle").textContent = `Amount owed: ${money(creditAmount)}`;

          const modal = document.getElementById("credit-customer-modal");
          const confirmButton = document.getElementById("confirm-credit-customer");
          const cancelButton = document.getElementById("cancel-credit-customer");

          function cleanup() {
            confirmButton.removeEventListener("click", onConfirm);
            cancelButton.removeEventListener("click", onCancel);
            modal.removeEventListener("click", onBackdrop);
            modal.classList.remove("open");
          }
          async function onConfirm() {
            const name = selectedCreditorName();
            if (!name) {
              await showAlert("Enter or choose a customer name.");
              return;
            }
            cleanup();
            resolve(name);
          }
          function onCancel() {
            cleanup();
            resolve(null);
          }
          function onBackdrop(event) {
            if (event.target.id === "credit-customer-modal") onCancel();
          }

          confirmButton.addEventListener("click", onConfirm);
          cancelButton.addEventListener("click", onCancel);
          modal.addEventListener("click", onBackdrop);
          modal.classList.add("open");
        });
      }

      function selectedCreditorName() {
        if (els.creditorSelect.value === "new") return els.newCreditorName.value.trim();
        const creditor = state.creditors.find((item) => String(item.id) === els.creditorSelect.value);
        return creditor ? creditor.name : "";
      }

      async function addCreditToCustomer(name, amount) {
        if (!amount) return null;
        let creditor = state.creditors.find((item) => item.name.toLowerCase() === name.toLowerCase());
        if (!creditor) {
          creditor = { id: Date.now(), name, amount };
          const { error } = await db.from("creditors").insert(creditor);
          if (error) throw error;
          state.creditors.push(creditor);
        } else {
          creditor.amount += amount;
          const { error } = await db.from("creditors").update({ amount: creditor.amount }).eq("id", creditor.id);
          if (error) throw error;
        }
        await addCreditEntry(creditor.id, amount, sriLankaTodayKey());
        return creditor;
      }

      async function checkout() {
        if (!state.cart.length) {
          await showAlert("Cart is empty.");
          return;
        }

        const paymentType = await showAppDialog("How is this sale being paid?", [
          { label: "Cancel", value: null, className: "secondary" },
          { label: "Cash", value: "cash", className: "primary" },
          { label: "Credit (Customer Account)", value: "credit", className: "danger-action" }
        ]);
        if (!paymentType) return;

        let totals = cartTotals();
        let creditName = "";
        let credit = 0;

        if (paymentType === "cash") {
          if (totals.paid < totals.total) {
            els.paid.value = totals.total;
            totals = cartTotals();
          }
        } else {
          credit = Math.max(totals.total - totals.paid, 0);
          if (credit <= 0) {
            await showAlert("The amount paid already covers the total, so there's nothing to put on credit. Choose Cash instead.");
            return;
          }
          creditName = await promptCreditCustomer(credit);
          if (!creditName) return;
        }

        const confirmMessage =
          paymentType === "cash"
            ? `Complete this cash sale for ${money(totals.total)}?`
            : `Complete this sale for ${money(totals.total)}, with ${money(credit)} on credit to ${creditName}?`;
        if (!(await showConfirm(confirmMessage))) return;

        const sale = {
          id: Date.now(),
          date: sriLankaISOString(),
          items: state.cart.map((item) => ({ ...item })),
          method: els.method.value,
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          total: totals.total,
          paid: totals.paid,
          credit,
          creditorName: creditName,
          change: totals.change
        };

        const checkoutButton = document.getElementById("checkout");
        checkoutButton.disabled = true;
        try {
          if (sale.credit > 0) await addCreditToCustomer(creditName, sale.credit);

          const stockUpdates = sale.items
            .map((sold) => {
              const product = state.products.find((item) => item.id === sold.id);
              if (!product) return null;
              product.stock = Math.max(product.stock - sold.qty, 0);
              return db.from("products").update({ stock: product.stock }).eq("id", product.id);
            })
            .filter(Boolean);

          const { error: saleError } = await db.from("sales").insert(toDbSale(sale));
          if (saleError) throw saleError;
          const stockResults = await Promise.all(stockUpdates);
          const failed = stockResults.find((res) => res && res.error);
          if (failed) throw failed.error;

          state.sales.unshift(sale);
          state.cart = [];
          els.paid.value = 0;
          els.newCreditorName.value = "";
          renderAll();
          showReceipt(sale);
        } catch (err) {
          await showAlert("Could not complete the sale on the server: " + err.message + "\nCheck your connection and try again.");
        } finally {
          checkoutButton.disabled = false;
        }
      }

      function showReceipt(sale) {
        const rows = sale.items
          .map(
            (item) => `
              <div class="summary-row">
                <span>${item.name}<br><small>${displayQty(item.qty, item.unit)} x ${priceLabel(item)}</small></span>
                <strong>${money(item.qty * item.price)}</strong>
              </div>`
          )
          .join("");

        els.receiptPaper.innerHTML = `
          <h3>${state.settings.storeName}</h3>
          <small>${[state.settings.storePhone, state.settings.storePhone2].filter(Boolean).join(" / ")}</small>
          ${state.settings.storeEmail ? `<br /><small>${state.settings.storeEmail}</small>` : ""}
          <div class="line"></div>
          <div class="summary-row"><span>Receipt</span><strong>#${sale.id}</strong></div>
          <div class="summary-row"><span>Date</span><strong>${formatSriLankaDateTime(sale.date)}</strong></div>
          <div class="line"></div>
          ${rows}
          <div class="line"></div>
          <div class="summary-row"><span>Subtotal</span><strong>${money(sale.subtotal)}</strong></div>
          <div class="summary-row"><span>Discount</span><strong>${money(sale.discount)}</strong></div>
          <div class="summary-row"><span>Tax</span><strong>${money(sale.tax)}</strong></div>
          <div class="summary-row total"><span>Total</span><strong>${money(sale.total)}</strong></div>
          <div class="summary-row"><span>Paid by ${sale.method}</span><strong>${money(sale.paid)}</strong></div>
          ${
            sale.credit > 0
              ? `<div class="summary-row"><span>Credit to ${sale.creditorName}</span><strong>${money(sale.credit)}</strong></div>`
              : ""
          }
          <div class="summary-row"><span>Change</span><strong>${money(sale.change)}</strong></div>
          <div class="receipt-actions">
            <button class="secondary" id="close-receipt">Close</button>
            <button class="primary" id="print-receipt">Print</button>
          </div>
        `;
        els.receiptModal.classList.add("open");
      }
