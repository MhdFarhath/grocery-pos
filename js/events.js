/*
  events.js
  All DOM event wiring: nav buttons, product grid, cart controls,
  inventory/category/creditor/settings forms, quantity & receipt modals.
*/

      document.getElementById("date-chip").textContent = new Date().toLocaleString(undefined, {
        timeZone: "Asia/Colombo",
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

      document.querySelectorAll("[data-view-button]").forEach((button) => {
        button.addEventListener("click", () => {
          document.querySelectorAll("[data-view-button]").forEach((item) => item.classList.remove("active"));
          document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
          button.classList.add("active");
          document.getElementById(`view-${button.dataset.viewButton}`).classList.add("active");
          document.getElementById("page-title").textContent = button.dataset.label || button.textContent;
        });
      });

      els.productGrid.addEventListener("click", (event) => {
        const button = event.target.closest("[data-add]");
        if (button) addToCart(Number(button.dataset.add));
      });

      els.cartItems.addEventListener("click", (event) => {
        const inc = event.target.closest("[data-inc]");
        const dec = event.target.closest("[data-dec]");
        const remove = event.target.closest("[data-remove]");
        if (inc) updateCart(Number(inc.dataset.inc), 1);
        if (dec) updateCart(Number(dec.dataset.dec), -1);
        if (remove) {
          state.cart = state.cart.filter((item) => item.id !== Number(remove.dataset.remove));
          renderCart();
        }
      });

      document.getElementById("category-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const category = document.getElementById("new-category").value.trim();
        if (!category) return;
        if (state.categories.some((item) => item.toLowerCase() === category.toLowerCase())) {
          event.target.reset();
          return;
        }
        try {
          const { error } = await db.from("categories").insert({ name: category });
          if (error) throw error;
          state.categories.push(category);
          state.categories.sort();
          event.target.reset();
          renderAll();
        } catch (err) {
          await showAlert("Could not save the category to the server: " + err.message);
        }
      });

      els.categoryList.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-delete-category]");
        if (!button) return;
        const category = button.dataset.deleteCategory;
        const inUse = state.products.some((product) => product.category === category);
        if (inUse) {
          await showAlert("This category is used by products. Move or delete those products first.");
          return;
        }
        if (!(await showConfirm(`Delete the category "${category}"?`))) return;
        try {
          const { error } = await db.from("categories").delete().eq("name", category);
          if (error) throw error;
          state.categories = state.categories.filter((item) => item !== category);
          renderAll();
        } catch (err) {
          await showAlert("Could not delete the category on the server: " + err.message);
        }
      });

      document.getElementById("open-add-product").addEventListener("click", () => {
        const nextId = Math.max(1000, ...state.products.map((item) => item.id)) + 1;
        document.getElementById("product-barcode").value = String(nextId);
        openDrawer("add-product-drawer");
      });
      document.getElementById("product-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const saleType = els.productSaleType.value;
        const unit = saleType === "pack" ? "pack" : els.productUnit.value;
        const image = await readImageFile(els.productImage.files[0]);
        const barcode = document.getElementById("product-barcode").value.trim();
        if (barcode && state.products.some((item) => item.barcode === barcode)) {
          await showAlert("That barcode is already used by another product. Enter a different one, or leave it blank.");
          return;
        }
        const product = normalizeProduct({
          id: Math.max(1000, ...state.products.map((item) => item.id)) + 1,
          name: document.getElementById("product-name").value.trim(),
          barcode,
          category: document.getElementById("product-category").value,
          price: Number(document.getElementById("product-price").value),
          stock: Number(document.getElementById("product-stock").value),
          saleType,
          unit,
          image
        });
        try {
          const { error } = await db.from("products").insert(toDbProduct(product));
          if (error) throw error;
          state.products.push(product);
          event.target.reset();
          els.productImagePreview.classList.remove("active");
          els.productImagePreview.removeAttribute("src");
          els.productUnit.value = "pack";
          renderAll();
          closeDrawer("add-product-drawer");
        } catch (err) {
          await showAlert("Could not save the product to the server: " + err.message);
        }
      });

      document.getElementById("inventory-table").addEventListener("click", async (event) => {
        const button = event.target.closest("[data-delete-product]");
        if (!button) return;
        const id = Number(button.dataset.deleteProduct);
        const product = state.products.find((item) => item.id === id);
        if (!product) return;
        if (!(await showConfirm(`Delete "${product.name}" from inventory? This cannot be undone.`))) return;
        try {
          const { error } = await db.from("products").delete().eq("id", id);
          if (error) throw error;
          state.products = state.products.filter((item) => item.id !== id);
          state.cart = state.cart.filter((item) => item.id !== id);
          renderAll();
        } catch (err) {
          await showAlert("Could not delete the product on the server: " + err.message);
        }
      });

      document.getElementById("open-add-creditor").addEventListener("click", () => openDrawer("add-creditor-drawer"));
      document.getElementById("creditor-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const name = document.getElementById("creditor-name").value.trim();
        const amount = Number(document.getElementById("creditor-amount").value || 0);
        if (!name) return;
        try {
          await addCreditToCustomer(name, amount);
          event.target.reset();
          document.getElementById("creditor-amount").value = 0;
          renderAll();
          closeDrawer("add-creditor-drawer");
        } catch (err) {
          await showAlert("Could not save the creditor to the server: " + err.message);
        }
      });

      document.getElementById("creditors-table").addEventListener("click", async (event) => {
        const view = event.target.closest("[data-view-creditor]");
        const edit = event.target.closest("[data-edit-creditor]");
        const remove = event.target.closest("[data-delete-creditor]");

        if (view) {
          await openCreditorView(Number(view.dataset.viewCreditor));
        }

        if (edit) {
          openCreditorEditor(Number(edit.dataset.editCreditor));
        }

        if (remove) {
          const id = Number(remove.dataset.deleteCreditor);
          const creditor = state.creditors.find((item) => item.id === id);
          if (!creditor) return;
          if (!(await showConfirm(`Delete ${creditor.name} from creditors?`))) return;
          try {
            const { error } = await db.from("creditors").delete().eq("id", id);
            if (error) throw error;
            const entryIds = state.creditorEntries.filter((entry) => entry.creditorId === id).map((entry) => entry.id);
            if (entryIds.length) {
              const { error: entriesError } = await db.from("creditor_entries").delete().in("id", entryIds);
              if (entriesError) throw entriesError;
            }
            state.creditors = state.creditors.filter((item) => item.id !== id);
            state.creditorEntries = state.creditorEntries.filter((entry) => entry.creditorId !== id);
            if (state.editingCreditorId === id) closeCreditorEditor();
            renderAll();
          } catch (err) {
            await showAlert("Could not delete the creditor on the server: " + err.message);
          }
        }
      });

      els.creditorEditor.addEventListener("submit", async (event) => {
        event.preventDefault();
        const creditor = currentEditingCreditor();
        if (!creditor) return;
        const name = els.editCreditorName.value.trim() || creditor.name;
        const base = Math.max(Number(els.editCreditorAmount.value || 0), 0);
        const addAmount = Math.max(Number(els.addCreditAmount.value || 0), 0);
        const paymentAmount = Math.max(Number(els.creditPaymentAmount.value || 0), 0);
        const amount = Math.max(base + addAmount - paymentAmount, 0);
        try {
          const { error } = await db.from("creditors").update({ name, amount }).eq("id", creditor.id);
          if (error) throw error;

          // Reconcile the dated history: a manual edit to "Credit amount"
          // itself counts as a correction, then any new purchase is added,
          // then the payment settles the oldest entries first.
          const manualDelta = base - creditor.amount;
          if (manualDelta > 0) await addCreditEntry(creditor.id, manualDelta, sriLankaTodayKey());
          else if (manualDelta < 0) await settleCreditFIFO(creditor.id, -manualDelta);
          if (addAmount > 0) await addCreditEntry(creditor.id, addAmount, sriLankaTodayKey());
          if (paymentAmount > 0) {
            await settleCreditFIFO(creditor.id, paymentAmount);
            await recordCreditorPayment(creditor, name, base + addAmount, paymentAmount);
          }

          creditor.name = name;
          creditor.amount = amount;
          renderAll();
          closeCreditorEditor();
          await showAlert("Creditor details saved.");
        } catch (err) {
          await showAlert("Could not update the creditor on the server: " + err.message);
        }
      });

      document.getElementById("record-credit-payment").addEventListener("click", async () => {
        const creditor = currentEditingCreditor();
        if (!creditor) return;

        const name = els.editCreditorName.value.trim() || creditor.name;
        const base = Math.max(Number(els.editCreditorAmount.value || 0), 0);
        const addAmount = Math.max(Number(els.addCreditAmount.value || 0), 0);
        const previousAmount = base + addAmount;
        const paidAmount = Math.max(Number(els.creditPaymentAmount.value || 0), 0);
        if (paidAmount <= 0) {
          await showAlert("Enter the amount paid by the creditor.");
          return;
        }

        const remainingAmount = Math.max(previousAmount - paidAmount, 0);

        try {
          const { error: updateError } = await db
            .from("creditors")
            .update({ name, amount: remainingAmount })
            .eq("id", creditor.id);
          if (updateError) throw updateError;

          const manualDelta = base - creditor.amount;
          if (manualDelta > 0) await addCreditEntry(creditor.id, manualDelta, sriLankaTodayKey());
          else if (manualDelta < 0) await settleCreditFIFO(creditor.id, -manualDelta);
          if (addAmount > 0) await addCreditEntry(creditor.id, addAmount, sriLankaTodayKey());
          await settleCreditFIFO(creditor.id, paidAmount);
          const payment = await recordCreditorPayment(creditor, name, previousAmount, paidAmount);

          creditor.name = name;
          creditor.amount = remainingAmount;
          renderAll();
          closeCreditorEditor();
          showCreditPaymentReceipt(payment);
        } catch (err) {
          await showAlert("Could not record the payment on the server: " + err.message);
        }
      });

      document.getElementById("cancel-credit-edit").addEventListener("click", closeCreditorEditor);

      ["input", "change"].forEach((type) => {
        els.editCreditorAmount.addEventListener(type, renderCreditorEditor);
        els.addCreditAmount.addEventListener(type, renderCreditorEditor);
        els.creditPaymentAmount.addEventListener(type, renderCreditorEditor);
      });

      document.getElementById("export-creditor-statement").addEventListener("click", exportCreditorStatement);
      document.getElementById("export-creditor-statement-pdf").addEventListener("click", exportCreditorStatementPDF);
      document.getElementById("print-creditor-statement").addEventListener("click", () => window.print());

      document.querySelectorAll("[data-creditor-range]").forEach((button) => {
        button.addEventListener("click", () => {
          const range = button.dataset.creditorRange;
          const todayKey = sriLankaTodayKey();
          let from = "";
          let to = "";
          if (range === "today") {
            from = todayKey;
            to = todayKey;
          } else if (range === "week") {
            from = sriLankaStartOfWeekKey();
            to = todayKey;
          } else if (range === "month") {
            from = sriLankaStartOfMonthKey();
            to = todayKey;
          }
          state.creditorStatementFilter = { from, to };
          document.getElementById("creditor-statement-from").value = from;
          document.getElementById("creditor-statement-to").value = to;
          document.querySelectorAll("[data-creditor-range]").forEach((chip) => chip.classList.toggle("active", chip === button));
          if (state.viewingCreditorId !== null) renderCreditorView(state.viewingCreditorId);
        });
      });

      ["creditor-statement-from", "creditor-statement-to"].forEach((id) => {
        document.getElementById(id).addEventListener("change", () => {
          state.creditorStatementFilter = {
            from: document.getElementById("creditor-statement-from").value,
            to: document.getElementById("creditor-statement-to").value
          };
          document.querySelectorAll("[data-creditor-range]").forEach((chip) => chip.classList.remove("active"));
          if (state.viewingCreditorId !== null) renderCreditorView(state.viewingCreditorId);
        });
      });

      document.getElementById("open-add-cheque").addEventListener("click", () => openDrawer("add-cheque-drawer"));
      document.getElementById("cheque-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const cheque = {
          id: Date.now(),
          chequeNumber: document.getElementById("cheque-number").value.trim(),
          supplierName: document.getElementById("cheque-supplier").value.trim(),
          issueDate: document.getElementById("cheque-issue-date").value,
          chequeDate: document.getElementById("cheque-date").value,
          amount: Number(document.getElementById("cheque-amount").value || 0)
        };
        if (!cheque.chequeNumber || !cheque.supplierName || !cheque.issueDate || !cheque.chequeDate) return;
        try {
          const { error } = await db.from("cheques").insert(toDbCheque(cheque));
          if (error) throw error;
          state.cheques.push(cheque);
          event.target.reset();
          renderCheques();
          closeDrawer("add-cheque-drawer");
        } catch (err) {
          await showAlert("Could not save the cheque to the server: " + err.message);
        }
      });

      document.getElementById("cheque-history-table").addEventListener("click", async (event) => {
        const undoButton = event.target.closest("[data-undo-cheque]");
        if (!undoButton) return;
        await undoChequeResolution(Number(undoButton.dataset.undoCheque));
      });

      document.getElementById("export-cheque-history-csv").addEventListener("click", exportChequeHistoryCSV);
      document.getElementById("export-cheque-history-pdf").addEventListener("click", exportChequeHistoryPDF);

      document.querySelectorAll("[data-cheque-history-range]").forEach((button) => {
        button.addEventListener("click", () => {
          const range = button.dataset.chequeHistoryRange;
          const todayKey = sriLankaTodayKey();
          let from = "";
          let to = "";
          if (range === "today") {
            from = todayKey;
            to = todayKey;
          } else if (range === "week") {
            from = sriLankaStartOfWeekKey();
            to = todayKey;
          } else if (range === "month") {
            from = sriLankaStartOfMonthKey();
            to = todayKey;
          }
          state.chequeHistoryFilter = { from, to };
          document.getElementById("cheque-history-from").value = from;
          document.getElementById("cheque-history-to").value = to;
          document
            .querySelectorAll("[data-cheque-history-range]")
            .forEach((chip) => chip.classList.toggle("active", chip === button));
          state.chequeHistoryPage = 1;
          renderChequeHistory();
        });
      });

      ["cheque-history-from", "cheque-history-to"].forEach((id) => {
        document.getElementById(id).addEventListener("change", () => {
          state.chequeHistoryFilter = {
            from: document.getElementById("cheque-history-from").value,
            to: document.getElementById("cheque-history-to").value
          };
          document.querySelectorAll("[data-cheque-history-range]").forEach((chip) => chip.classList.remove("active"));
          state.chequeHistoryPage = 1;
          renderChequeHistory();
        });
      });

      document.getElementById("cheques-table").addEventListener("click", async (event) => {
        const depositButton = event.target.closest("[data-deposit-cheque]");
        const editButton = event.target.closest("[data-edit-cheque]");
        const deleteButton = event.target.closest("[data-delete-cheque]");

        if (depositButton) {
          await markChequeDeposited(Number(depositButton.dataset.depositCheque));
          return;
        }

        if (editButton) {
          openChequeEditor(Number(editButton.dataset.editCheque));
          return;
        }

        if (deleteButton) {
          const id = Number(deleteButton.dataset.deleteCheque);
          const cheque = state.cheques.find((item) => item.id === id);
          if (!cheque) return;
          if (!(await showConfirm(`Delete cheque #${cheque.chequeNumber} (${cheque.supplierName})? This cannot be undone.`))) return;
          try {
            const { error } = await db.from("cheques").delete().eq("id", id);
            if (error) throw error;
            state.cheques = state.cheques.filter((item) => item.id !== id);
            if (state.editingChequeId === id) closeChequeEditor();
            renderCheques();
          } catch (err) {
            await showAlert("Could not delete the cheque on the server: " + err.message);
          }
        }
      });

      document.getElementById("cheque-editor").addEventListener("submit", async (event) => {
        event.preventDefault();
        const cheque = currentEditingCheque();
        if (!cheque) return;
        const updated = {
          id: cheque.id,
          chequeNumber: document.getElementById("edit-cheque-number").value.trim() || cheque.chequeNumber,
          supplierName: document.getElementById("edit-cheque-supplier").value.trim() || cheque.supplierName,
          issueDate: document.getElementById("edit-cheque-issue-date").value || cheque.issueDate,
          chequeDate: document.getElementById("edit-cheque-date").value || cheque.chequeDate,
          amount: Number(document.getElementById("edit-cheque-amount").value || 0)
        };
        try {
          const { error } = await db.from("cheques").update(toDbCheque(updated)).eq("id", cheque.id);
          if (error) throw error;
          Object.assign(cheque, updated);
          closeChequeEditor();
          renderCheques();
        } catch (err) {
          await showAlert("Could not update the cheque on the server: " + err.message);
        }
      });

      document.getElementById("cancel-cheque-edit").addEventListener("click", closeChequeEditor);

      document.getElementById("settings-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const settings = {
          storeName: document.getElementById("store-name").value.trim() || "Grocery Store",
          storePhone: document.getElementById("store-phone").value.trim(),
          storePhone2: document.getElementById("store-phone-2").value.trim(),
          storeEmail: document.getElementById("store-email").value.trim(),
          currency: document.getElementById("currency").value.trim() || "LKR",
          defaultTax: Number(document.getElementById("default-tax").value || 0)
        };
        try {
          const { error } = await db
            .from("settings")
            .update({
              store_name: settings.storeName,
              store_phone: settings.storePhone,
              store_phone_2: settings.storePhone2,
              store_email: settings.storeEmail,
              currency: settings.currency,
              default_tax: settings.defaultTax
            })
            .eq("id", 1);
          if (error) throw error;
          state.settings = settings;
          renderAll();
          await showAlert("Settings saved.");
        } catch (err) {
          await showAlert("Could not save settings to the server: " + err.message);
        }
      });

      ["input", "change"].forEach((type) => {
        els.search.addEventListener(type, renderProducts);
        els.categoryFilter.addEventListener(type, renderProducts);
        els.discount.addEventListener(type, renderCart);
        els.tax.addEventListener(type, renderCart);
        els.paid.addEventListener(type, renderCart);
      });

      // Barcode scanners type the code then send Enter - if it's an exact
      // match, add it straight to the cart and clear the box for the next scan.
      els.search.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        const query = els.search.value.trim().toLowerCase();
        if (!query) return;
        const match = state.products.find(
          (product) => (product.barcode && product.barcode.toLowerCase() === query) || String(product.id) === query
        );
        if (match) {
          addToCart(match.id);
          els.search.value = "";
          renderProducts();
        }
      });

      els.creditorSelect.addEventListener("change", () => {
        els.newCreditorField.classList.toggle("active", els.creditorSelect.value === "new");
      });

      document.getElementById("add-quantity").addEventListener("click", async () => {
        const product = state.products.find((item) => item.id === state.pendingProductId);
        if (!product) return;
        const qty = Math.max(Number(els.quantityInput.value || 0), 0);
        if (qty <= 0) {
          await showAlert("Enter a quantity greater than 0.");
          return;
        }
        addProductQuantity(product, qty);
        closeQuantityModal();
      });

      document.getElementById("cancel-quantity").addEventListener("click", closeQuantityModal);

      els.quantityInput.addEventListener("input", renderQuantityTotal);

      els.quickQty.addEventListener("click", (event) => {
        const button = event.target.closest("[data-quick-qty]");
        if (!button) return;
        els.quantityInput.value = button.dataset.quickQty;
        renderQuantityTotal();
      });

      els.quantityModal.addEventListener("click", (event) => {
        if (event.target.id === "quantity-modal") closeQuantityModal();
      });

      document.getElementById("clear-cart").addEventListener("click", () => {
        state.cart = [];
        renderCart();
      });
      async function handleAddExtraAmount() {
        const label = document.getElementById("extra-label").value;
        const amount = Number(document.getElementById("extra-amount").value || 0);
        if (amount <= 0) {
          await showAlert("Enter an amount greater than 0.");
          return;
        }
        addCustomAmount(label, amount);
        document.getElementById("extra-label").value = "";
        document.getElementById("extra-amount").value = "";
      }
      document.getElementById("add-extra-amount").addEventListener("click", handleAddExtraAmount);
      document.getElementById("extra-label").addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          handleAddExtraAmount();
        }
      });
      document.getElementById("extra-amount").addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          handleAddExtraAmount();
        }
      });
      document.getElementById("checkout").addEventListener("click", checkout);
      document.getElementById("export-sales").addEventListener("click", exportSales);

      document.querySelectorAll("[data-sales-range]").forEach((button) => {
        button.addEventListener("click", () => {
          const range = button.dataset.salesRange;
          const todayKey = sriLankaTodayKey();
          let from = "";
          let to = "";
          if (range === "today") {
            from = todayKey;
            to = todayKey;
          } else if (range === "week") {
            from = sriLankaStartOfWeekKey();
            to = todayKey;
          } else if (range === "month") {
            from = sriLankaStartOfMonthKey();
            to = todayKey;
          }
          state.salesFilter = { from, to };
          document.getElementById("sales-from").value = from;
          document.getElementById("sales-to").value = to;
          document.querySelectorAll("[data-sales-range]").forEach((chip) => chip.classList.toggle("active", chip === button));
          state.salesPage = 1;
          renderSales();
        });
      });

      ["sales-from", "sales-to"].forEach((id) => {
        document.getElementById(id).addEventListener("change", () => {
          state.salesFilter = {
            from: document.getElementById("sales-from").value,
            to: document.getElementById("sales-to").value
          };
          document.querySelectorAll("[data-sales-range]").forEach((chip) => chip.classList.remove("active"));
          state.salesPage = 1;
          renderSales();
        });
      });
      els.receiptModal.addEventListener("click", (event) => {
        if (event.target.id === "receipt-modal" || event.target.id === "close-receipt") {
          els.receiptModal.classList.remove("open");
        }
        if (event.target.id === "print-receipt") window.print();
      });
