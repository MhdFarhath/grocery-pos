/*
  creditors.js
  Creditor management: renderCreditors, the creditor editor panel
  (open/close/render), and the credit-payment receipt.
*/

      function renderCreditors() {
        const { pageItems, safePage, totalPages, start } = paginate(state.creditors, state.creditorsPage);
        state.creditorsPage = safePage;
        document.getElementById("creditors-table").innerHTML =
          pageItems
            .map(
              (creditor, index) => `
                <tr>
                  <td>${start + index + 1}</td>
                  <td>${creditor.name}</td>
                  <td>${money(creditor.amount)}</td>
                  <td>
                    <button class="secondary" data-view-creditor="${creditor.id}">View</button>
                    ${
                      creditor.amount <= 0
                        ? `<span class="status-badge">Settled</span>`
                        : `<button class="secondary" data-edit-creditor="${creditor.id}">Edit</button>`
                    }
                    <button class="danger-action" data-delete-creditor="${creditor.id}">Delete</button>
                  </td>
                </tr>`
            )
            .join("") || `<tr><td colspan="4" class="empty">No credit customers yet.</td></tr>`;

        renderPaginationControls(
          "creditors-pagination",
          safePage,
          totalPages,
          () => {
            state.creditorsPage = safePage - 1;
            renderCreditors();
          },
          () => {
            state.creditorsPage = safePage + 1;
            renderCreditors();
          }
        );
      }

      function currentEditingCreditor() {
        return state.creditors.find((creditor) => creditor.id === state.editingCreditorId);
      }

      function renderCreditorEditor() {
        const creditor = currentEditingCreditor();
        if (!creditor) return;

        const base = Math.max(Number(els.editCreditorAmount.value || 0), 0);
        const addAmount = Math.max(Number(els.addCreditAmount.value || 0), 0);
        const payment = Math.max(Number(els.creditPaymentAmount.value || 0), 0);
        const remaining = Math.max(base + addAmount - payment, 0);
        els.creditRemaining.value = Math.round(remaining);
        els.creditorEditStatus.textContent = remaining <= 0 ? "Settled after payment" : "Active";
      }

      function openCreditorEditor(id) {
        const creditor = state.creditors.find((item) => item.id === id);
        if (!creditor) return;
        state.editingCreditorId = id;
        els.editCreditorName.value = creditor.name;
        els.editCreditorAmount.value = Math.max(creditor.amount, 0);
        els.addCreditAmount.value = 0;
        els.creditPaymentAmount.value = 0;
        renderCreditorEditor();
        openDrawer("edit-creditor-drawer");
      }

      function closeCreditorEditor() {
        state.editingCreditorId = null;
        closeDrawer("edit-creditor-drawer");
        els.creditorEditor.reset();
      }

      function showCreditPaymentReceipt(payment) {
        els.receiptPaper.innerHTML = `
          <h3>${state.settings.storeName}</h3>
          <small>${[state.settings.storePhone, state.settings.storePhone2].filter(Boolean).join(" / ")}</small>
          ${state.settings.storeEmail ? `<br /><small>${state.settings.storeEmail}</small>` : ""}
          <div class="line"></div>
          <div class="summary-row"><span>Credit receipt</span><strong>#${payment.id}</strong></div>
          <div class="summary-row"><span>Date</span><strong>${formatSriLankaDateTime(payment.date)}</strong></div>
          <div class="line"></div>
          <div class="summary-row"><span>Customer</span><strong>${payment.creditorName}</strong></div>
          <div class="summary-row"><span>Previous balance</span><strong>${money(payment.previousAmount)}</strong></div>
          <div class="summary-row"><span>Payment received</span><strong>${money(payment.paidAmount)}</strong></div>
          <div class="summary-row total"><span>Remaining balance</span><strong>${money(payment.remainingAmount)}</strong></div>
          <div class="summary-row"><span>Status</span><strong>${payment.remainingAmount <= 0 ? "Settled" : "Active"}</strong></div>
          <div class="receipt-actions">
            <button class="secondary" id="close-receipt">Close</button>
            <button class="primary" id="print-receipt">Print</button>
          </div>
        `;
        els.receiptModal.classList.add("open");
      }

      // ---- Dated credit history (per-creditor ledger) ----
      // Every time credit is granted, it's recorded as its own dated entry
      // and NEVER deleted, so the full history is always available for the
      // statement view. Payments settle the OLDEST entries first (FIFO) for
      // internal bookkeeping; the statement itself is a simple, permanent
      // list of every credit and payment, with a running balance.

      function creditorEntriesFor(creditorId) {
        return state.creditorEntries
          .filter((entry) => entry.creditorId === creditorId)
          .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));
      }

      async function addCreditEntry(creditorId, amount, date) {
        if (!amount || amount <= 0) return;
        const entry = { id: Date.now(), creditorId, date, amount, remainingAmount: amount };
        const { error } = await db.from("creditor_entries").insert(toDbCreditorEntry(entry));
        if (error) throw error;
        state.creditorEntries.push(entry);
      }

      // Applies `paymentAmount` across this creditor's entries, oldest first.
      // Entries are kept forever (for the statement) - only remainingAmount
      // degrades toward 0.
      async function settleCreditFIFO(creditorId, paymentAmount) {
        let remaining = Math.max(paymentAmount, 0);
        if (remaining <= 0) return;
        const entries = creditorEntriesFor(creditorId).filter((entry) => entry.remainingAmount > 0);
        for (const entry of entries) {
          if (remaining <= 0) break;
          const deduct = Math.min(entry.remainingAmount, remaining);
          entry.remainingAmount -= deduct;
          remaining -= deduct;
          const { error } = await db.from("creditor_entries").update({ remaining_amount: entry.remainingAmount }).eq("id", entry.id);
          if (error) throw error;
        }
      }

      // Logs a payment as its own permanent debit record - used by both
      // "Save changes" (silent) and "Record payment & receipt" (with receipt).
      async function recordCreditorPayment(creditor, name, previousAmount, paidAmount) {
        const remainingAmount = Math.max(previousAmount - paidAmount, 0);
        const payment = {
          id: Date.now(),
          date: sriLankaISOString(),
          creditorId: creditor.id,
          creditorName: name,
          previousAmount,
          paidAmount: Math.min(paidAmount, previousAmount),
          remainingAmount
        };
        const { error } = await db.from("creditor_payments").insert(toDbPayment(payment));
        if (error) throw error;
        state.creditorPayments.unshift(payment);
        return payment;
      }

      // Creditors that existed before this history feature have no dated
      // entries yet - fold their current balance into a single starting
      // entry the first time their history is viewed, so nothing is lost.
      async function ensureCreditorEntriesBackfilled(creditor) {
        const hasEntries = state.creditorEntries.some((entry) => entry.creditorId === creditor.id);
        if (!hasEntries && creditor.amount > 0) {
          await addCreditEntry(creditor.id, creditor.amount, sriLankaTodayKey());
        }
      }

      // Combines every credit entry and every payment into one chronological
      // statement with a running balance, then returns it newest-first.
      function creditorStatement(creditorId) {
        const credits = state.creditorEntries
          .filter((entry) => entry.creditorId === creditorId)
          .map((entry) => ({ id: entry.id, date: entry.date, type: "credit", amount: entry.amount, description: "Credit" }));
        const debits = state.creditorPayments
          .filter((payment) => payment.creditorId === creditorId)
          .map((payment) => ({
            id: payment.id,
            date: sriLankaDateOnly(payment.date),
            type: "debit",
            amount: payment.paidAmount,
            description: "Payment received"
          }));

        const combined = [...credits, ...debits].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));

        let running = 0;
        const withBalance = combined.map((txn) => {
          running += txn.type === "credit" ? txn.amount : -txn.amount;
          return { ...txn, balance: running };
        });

        return withBalance.reverse();
      }

      // Same statement, but only the rows within the selected date range.
      // The running balance on each row still reflects the true full
      // history - the filter only controls which rows are shown.
      function filteredCreditorStatement(creditorId) {
        const { from, to } = state.creditorStatementFilter;
        return creditorStatement(creditorId).filter((txn) => {
          if (from && txn.date < from) return false;
          if (to && txn.date > to) return false;
          return true;
        });
      }

      function renderCreditorView(id) {
        const creditor = state.creditors.find((item) => item.id === id);
        if (!creditor) return;
        document.getElementById("view-creditor-name").textContent = creditor.name;
        document.getElementById("view-creditor-total").textContent = money(creditor.amount);

        const statement = filteredCreditorStatement(id);
        document.getElementById("view-creditor-table").innerHTML =
          statement
            .map(
              (txn) => `
                <tr>
                  <td>${formatSriLankaDate(txn.date)}</td>
                  <td>${txn.description}</td>
                  <td>${txn.type === "credit" ? money(txn.amount) : ""}</td>
                  <td>${txn.type === "debit" ? money(txn.amount) : ""}</td>
                  <td>${money(txn.balance)}</td>
                </tr>`
            )
            .join("") || `<tr><td colspan="5" class="empty">No transactions in this date range.</td></tr>`;
      }

      async function openCreditorView(id) {
        const creditor = state.creditors.find((item) => item.id === id);
        if (!creditor) return;
        try {
          await ensureCreditorEntriesBackfilled(creditor);
        } catch (err) {
          await showAlert("Could not load this creditor's history: " + err.message);
          return;
        }
        state.viewingCreditorId = id;
        state.creditorStatementFilter = { from: "", to: "" };
        document.getElementById("creditor-statement-from").value = "";
        document.getElementById("creditor-statement-to").value = "";
        document.querySelectorAll("[data-creditor-range]").forEach((chip) => chip.classList.toggle("active", chip.dataset.creditorRange === "all"));
        renderCreditorView(id);
        openDrawer("view-creditor-drawer");
      }

      function exportCreditorStatement() {
        const creditor = state.creditors.find((item) => item.id === state.viewingCreditorId);
        if (!creditor) return;
        const statement = filteredCreditorStatement(creditor.id);
        const header = ["date", "description", "credit", "debit", "balance"];
        const rows = statement.map((txn) => [
          formatSriLankaDate(txn.date),
          txn.description,
          txn.type === "credit" ? txn.amount : "",
          txn.type === "debit" ? txn.amount : "",
          txn.balance
        ]);
        const csv = [header, ...rows]
          .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
          .join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${creditor.name.replace(/\s+/g, "_")}_statement.csv`;
        link.click();
        URL.revokeObjectURL(url);
      }

      function exportCreditorStatementPDF() {
        const creditor = state.creditors.find((item) => item.id === state.viewingCreditorId);
        if (!creditor) return;
        const statement = filteredCreditorStatement(creditor.id);
        const doc = new window.jspdf.jsPDF();

        doc.setFontSize(14);
        doc.text(state.settings.storeName, 14, 16);
        doc.setFontSize(10);
        doc.text([state.settings.storePhone, state.settings.storePhone2].filter(Boolean).join(" / "), 14, 22);
        doc.setFontSize(12);
        doc.text(`Statement of Account - ${creditor.name}`, 14, 32);
        doc.setFontSize(10);
        doc.text(`Total owed: ${money(creditor.amount)}`, 14, 39);

        doc.autoTable({
          startY: 45,
          head: [["Date", "Description", "Credit", "Debit", "Balance"]],
          body: statement.map((txn) => [
            formatSriLankaDate(txn.date),
            txn.description,
            txn.type === "credit" ? money(txn.amount) : "",
            txn.type === "debit" ? money(txn.amount) : "",
            money(txn.balance)
          ])
        });

        doc.save(`${creditor.name.replace(/\s+/g, "_")}_statement.pdf`);
      }
