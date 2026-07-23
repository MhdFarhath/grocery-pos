/*
  db.js
  Talking to Supabase: row-to-app and app-to-row converters (fromDb.../toDb...),
  loadState() (initial full load) and refreshFromServer() (background poll).
*/

      // ---- Convert between the server's row format and this app's in-memory format ----
      function fromDbProduct(row) {
        return normalizeProduct({
          id: row.id,
          name: row.name,
          category: row.category,
          price: row.price,
          stock: row.stock,
          saleType: row.sale_type,
          unit: row.unit,
          image: row.image || "",
          barcode: row.barcode || ""
        });
      }

      function toDbProduct(product) {
        return {
          id: product.id,
          name: product.name,
          category: product.category,
          price: product.price,
          stock: product.stock,
          sale_type: product.saleType,
          unit: product.unit,
          image: product.image || null,
          barcode: product.barcode || String(product.id)
        };
      }

      function fromDbSale(row) {
        return {
          id: row.id,
          date: row.date,
          items: row.items || [],
          method: row.method,
          subtotal: row.subtotal,
          discount: row.discount,
          tax: row.tax,
          total: row.total,
          paid: row.paid,
          credit: row.credit,
          creditorName: row.creditor_name || "",
          change: row.change
        };
      }

      function toDbSale(sale) {
        return {
          id: sale.id,
          date: sale.date,
          items: sale.items,
          method: sale.method,
          subtotal: sale.subtotal,
          discount: sale.discount,
          tax: sale.tax,
          total: sale.total,
          paid: sale.paid,
          credit: sale.credit,
          creditor_name: sale.creditorName || null,
          change: sale.change
        };
      }

      function fromDbPayment(row) {
        return {
          id: row.id,
          date: row.date,
          creditorId: row.creditor_id,
          creditorName: row.creditor_name,
          previousAmount: row.previous_amount,
          paidAmount: row.paid_amount,
          remainingAmount: row.remaining_amount
        };
      }

      function toDbPayment(payment) {
        return {
          id: payment.id,
          date: payment.date,
          creditor_id: payment.creditorId,
          creditor_name: payment.creditorName,
          previous_amount: payment.previousAmount,
          paid_amount: payment.paidAmount,
          remaining_amount: payment.remainingAmount
        };
      }

      // ---- Per-creditor dated credit history (each purchase-on-credit is its
      // own entry; payments settle the oldest entries first) ----
      function fromDbCreditorEntry(row) {
        return {
          id: row.id,
          creditorId: row.creditor_id,
          date: row.date,
          amount: Number(row.amount || 0),
          remainingAmount: Number(row.remaining_amount || 0)
        };
      }

      function toDbCreditorEntry(entry) {
        return {
          id: entry.id,
          creditor_id: entry.creditorId,
          date: entry.date,
          amount: entry.amount,
          remaining_amount: entry.remainingAmount
        };
      }

      function fromDbCheque(row) {
        return {
          id: row.id,
          chequeNumber: row.cheque_number,
          supplierName: row.supplier_name,
          issueDate: row.issue_date,
          chequeDate: row.cheque_date,
          amount: Number(row.amount || 0),
          status: row.status || "pending",
          resolvedDate: row.resolved_date || null
        };
      }

      function toDbCheque(cheque) {
        return {
          id: cheque.id,
          cheque_number: cheque.chequeNumber,
          supplier_name: cheque.supplierName,
          issue_date: cheque.issueDate,
          cheque_date: cheque.chequeDate,
          amount: cheque.amount,
          status: cheque.status || "pending",
          resolved_date: cheque.resolvedDate || null
        };
      }

      // ---- Load everything from the shared server ----
      async function loadState() {
        const [productsRes, categoriesRes, salesRes, creditorsRes, paymentsRes, settingsRes, chequesRes, creditorEntriesRes] =
          await Promise.all([
            db.from("products").select("*").order("id"),
            db.from("categories").select("*").order("name"),
            db.from("sales").select("*").order("date", { ascending: false }),
            db.from("creditors").select("*").order("name"),
            db.from("creditor_payments").select("*").order("date", { ascending: false }),
            db.from("settings").select("*").eq("id", 1).maybeSingle(),
            db.from("cheques").select("*").order("cheque_date"),
            db.from("creditor_entries").select("*").order("date")
          ]);

        [productsRes, categoriesRes, salesRes, creditorsRes, paymentsRes, settingsRes, chequesRes, creditorEntriesRes].forEach(
          (res) => {
            if (res.error) throw res.error;
          }
        );

        state.products = (productsRes.data || []).map(fromDbProduct);
        state.categories = categoriesRes.data && categoriesRes.data.length ? categoriesRes.data.map((row) => row.name) : [];
        state.sales = (salesRes.data || []).map(fromDbSale);
        state.creditors = (creditorsRes.data || []).map((row) => ({ id: row.id, name: row.name, amount: row.amount }));
        state.creditorPayments = (paymentsRes.data || []).map(fromDbPayment);
        state.creditorEntries = (creditorEntriesRes.data || []).map(fromDbCreditorEntry);
        state.cheques = (chequesRes.data || []).map(fromDbCheque);
        await purgeStaleCheques();
        if (settingsRes.data) {
          state.settings = {
            storeName: settingsRes.data.store_name,
            storePhone: settingsRes.data.store_phone,
            storePhone2: settingsRes.data.store_phone_2 || "",
            storeEmail: settingsRes.data.store_email || "",
            currency: settingsRes.data.currency,
            defaultTax: settingsRes.data.default_tax
          };
        }
      }

      // Quietly re-pull shared data in the background so other devices' changes show up here.
      async function refreshFromServer() {
        if (!isConfigured) return;
        const modalOpen =
          els.receiptModal.classList.contains("open") ||
          els.quantityModal.classList.contains("open") ||
          document.getElementById("credit-customer-modal").classList.contains("open") ||
          document.getElementById("app-dialog").classList.contains("open") ||
          document.querySelector(".drawer.open");
        if (modalOpen) return;
        try {
          await loadState();
          renderAll();
        } catch (err) {
          console.error("Background refresh failed", err);
        }
      }
