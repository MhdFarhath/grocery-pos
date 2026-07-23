/*
  cheques.js
  Cheques given to suppliers: remaining-days calculation, row + nav-badge
  alerts, the edit panel, and the pending/history split. A cheque is either
  "pending" (tracked on the main page), "deposited" (marked done - shown
  green in history), or "overdue_removed" (auto-archived once more than a
  day overdue - shown in history too, never silently deleted).
  (The add form and delete/edit clicks are wired up in events.js.)
*/

      // Whole calendar days between today (in Sri Lanka) and the cheque date
      // (negative = overdue). Uses UTC-based arithmetic throughout so the
      // result never depends on the viewing device's own timezone.
      function daysRemaining(chequeDateStr) {
        const nowSL = sriLankaNow();
        const startOfToday = Date.UTC(nowSL.getUTCFullYear(), nowSL.getUTCMonth(), nowSL.getUTCDate());
        const chequeDate = new Date(chequeDateStr);
        const startOfChequeDate = Date.UTC(chequeDate.getUTCFullYear(), chequeDate.getUTCMonth(), chequeDate.getUTCDate());
        return Math.round((startOfChequeDate - startOfToday) / 86400000);
      }

      function remainingLabel(days) {
        if (days < 0) return { text: `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`, className: "overdue" };
        if (days === 0) return { text: "Due today", className: "overdue" };
        if (days === 1) return { text: "1 day left", className: "overdue" };
        if (days <= 3) return { text: `${days} days left`, className: "due-soon" };
        return { text: `${days} days left`, className: "" };
      }

      // A pending cheque counts as "urgent" once it's overdue, due today, or due tomorrow.
      function isUrgent(cheque) {
        return cheque.status === "pending" && daysRemaining(cheque.chequeDate) <= 1;
      }

      function renderCheques() {
        const pending = state.cheques.filter((cheque) => cheque.status === "pending");
        const sorted = [...pending].sort((a, b) => daysRemaining(a.chequeDate) - daysRemaining(b.chequeDate));
        const { pageItems, safePage, totalPages } = paginate(sorted, state.chequesPage);
        state.chequesPage = safePage;
        document.getElementById("cheques-table").innerHTML =
          pageItems
            .map((cheque) => {
              const days = daysRemaining(cheque.chequeDate);
              const remaining = remainingLabel(days);
              const rowClass = days <= 1 ? "cheque-row-alert" : "";
              return `
                <tr class="${rowClass}">
                  <td>${cheque.chequeNumber}</td>
                  <td>${cheque.supplierName}</td>
                  <td>${formatSriLankaDate(cheque.issueDate)}</td>
                  <td>${formatSriLankaDate(cheque.chequeDate)}</td>
                  <td>${money(cheque.amount)}</td>
                  <td><span class="cheque-days ${remaining.className}">${remaining.text}</span></td>
                  <td>
                    <button class="secondary" data-deposit-cheque="${cheque.id}">Deposited</button>
                    <button class="secondary" data-edit-cheque="${cheque.id}">Edit</button>
                    <button class="danger-action" data-delete-cheque="${cheque.id}">Delete</button>
                  </td>
                </tr>`;
            })
            .join("") || `<tr><td colspan="7" class="empty">No pending cheques.</td></tr>`;

        renderPaginationControls(
          "cheques-pagination",
          safePage,
          totalPages,
          () => {
            state.chequesPage = safePage - 1;
            renderCheques();
          },
          () => {
            state.chequesPage = safePage + 1;
            renderCheques();
          }
        );

        const badge = document.getElementById("cheque-alert-badge");
        if (badge) {
          const urgentCount = state.cheques.filter(isUrgent).length;
          badge.textContent = urgentCount > 0 ? String(urgentCount) : "";
        }
      }

      function filteredChequeHistory() {
        const { from, to } = state.chequeHistoryFilter;
        return state.cheques
          .filter((cheque) => cheque.status !== "pending")
          .filter((cheque) => {
            const key = cheque.resolvedDate || "";
            if (from && key < from) return false;
            if (to && key > to) return false;
            return true;
          })
          .sort((a, b) => {
            const dateA = a.resolvedDate || "";
            const dateB = b.resolvedDate || "";
            return dateA < dateB ? 1 : dateA > dateB ? -1 : b.id - a.id;
          });
      }

      function renderChequeHistory() {
        const historyTable = document.getElementById("cheque-history-table");
        if (!historyTable) return;
        const resolved = filteredChequeHistory();
        const { pageItems, safePage, totalPages } = paginate(resolved, state.chequeHistoryPage);
        state.chequeHistoryPage = safePage;
        historyTable.innerHTML =
          pageItems
            .map((cheque) => {
              const deposited = cheque.status === "deposited";
              const rowClass = deposited ? "cheque-row-deposited" : "cheque-row-alert";
              const statusLabel = deposited
                ? `<span class="cheque-status-badge deposited">Deposited</span>`
                : `<span class="cheque-status-badge removed">Removed (overdue)</span>`;
              return `
                <tr class="${rowClass}">
                  <td>${cheque.chequeNumber}</td>
                  <td>${cheque.supplierName}</td>
                  <td>${formatSriLankaDate(cheque.chequeDate)}</td>
                  <td>${money(cheque.amount)}</td>
                  <td>${statusLabel}</td>
                  <td>${cheque.resolvedDate ? formatSriLankaDate(cheque.resolvedDate) : ""}</td>
                  <td><button class="secondary" data-undo-cheque="${cheque.id}">Undo</button></td>
                </tr>`;
            })
            .join("") || `<tr><td colspan="7" class="empty">No resolved cheques yet.</td></tr>`;

        renderPaginationControls(
          "cheque-history-pagination",
          safePage,
          totalPages,
          () => {
            state.chequeHistoryPage = safePage - 1;
            renderChequeHistory();
          },
          () => {
            state.chequeHistoryPage = safePage + 1;
            renderChequeHistory();
          }
        );
      }

      // Marks a cheque as deposited: archives it into history (green) and
      // takes it out of the active/pending tracking list.
      async function markChequeDeposited(id) {
        const cheque = state.cheques.find((item) => item.id === id);
        if (!cheque) return;
        if (!(await showConfirm(`Mark cheque #${cheque.chequeNumber} (${cheque.supplierName}) as deposited?`))) return;
        const resolvedDate = sriLankaTodayKey();
        try {
          const { error } = await db
            .from("cheques")
            .update({ status: "deposited", resolved_date: resolvedDate })
            .eq("id", id);
          if (error) throw error;
          cheque.status = "deposited";
          cheque.resolvedDate = resolvedDate;
          renderCheques();
          renderChequeHistory();
        } catch (err) {
          await showAlert("Could not update the cheque on the server: " + err.message);
        }
      }

      function exportChequeHistoryCSV() {
        const history = filteredChequeHistory();
        const header = ["cheque_number", "supplier", "cheque_date", "amount", "status", "resolved_on"];
        const rows = history.map((cheque) => [
          cheque.chequeNumber,
          cheque.supplierName,
          formatSriLankaDate(cheque.chequeDate),
          cheque.amount,
          cheque.status === "deposited" ? "Deposited" : "Removed (overdue)",
          cheque.resolvedDate ? formatSriLankaDate(cheque.resolvedDate) : ""
        ]);
        const csv = [header, ...rows]
          .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
          .join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "cheque_history.csv";
        link.click();
        URL.revokeObjectURL(url);
      }

      function exportChequeHistoryPDF() {
        const history = filteredChequeHistory();
        const doc = new window.jspdf.jsPDF();

        doc.setFontSize(14);
        doc.text(state.settings.storeName, 14, 16);
        doc.setFontSize(12);
        doc.text("Cheque History", 14, 26);

        doc.autoTable({
          startY: 32,
          head: [["Cheque #", "Supplier", "Cheque date", "Amount", "Status", "Resolved on"]],
          body: history.map((cheque) => [
            cheque.chequeNumber,
            cheque.supplierName,
            formatSriLankaDate(cheque.chequeDate),
            money(cheque.amount),
            cheque.status === "deposited" ? "Deposited" : "Removed (overdue)",
            cheque.resolvedDate ? formatSriLankaDate(cheque.resolvedDate) : ""
          ])
        });

        doc.save("cheque_history.pdf");
      }

      // Reverses a "deposited" or "overdue_removed" cheque back to pending -
      // for when the Deposited button (or the automatic overdue archive) was
      // triggered by mistake.
      async function undoChequeResolution(id) {
        const cheque = state.cheques.find((item) => item.id === id);
        if (!cheque) return;
        if (!(await showConfirm(`Move cheque #${cheque.chequeNumber} (${cheque.supplierName}) back to pending?`))) return;
        try {
          const { error } = await db.from("cheques").update({ status: "pending", resolved_date: null }).eq("id", id);
          if (error) throw error;
          cheque.status = "pending";
          cheque.resolvedDate = null;
          renderCheques();
          renderChequeHistory();
        } catch (err) {
          await showAlert("Could not update the cheque on the server: " + err.message);
        }
      }

      function currentEditingCheque() {
        return state.cheques.find((cheque) => cheque.id === state.editingChequeId);
      }

      function openChequeEditor(id) {
        const cheque = state.cheques.find((item) => item.id === id);
        if (!cheque) return;
        state.editingChequeId = id;
        document.getElementById("edit-cheque-number").value = cheque.chequeNumber;
        document.getElementById("edit-cheque-supplier").value = cheque.supplierName;
        document.getElementById("edit-cheque-issue-date").value = cheque.issueDate;
        document.getElementById("edit-cheque-date").value = cheque.chequeDate;
        document.getElementById("edit-cheque-amount").value = cheque.amount;
        openDrawer("edit-cheque-drawer");
      }

      function closeChequeEditor() {
        state.editingChequeId = null;
        closeDrawer("edit-cheque-drawer");
        document.getElementById("cheque-editor").reset();
      }

      // Cheques overdue by 1 day or more are archived into history automatically
      // (whether or not they were ever marked Deposited) instead of being
      // deleted, so the record is never lost - it just moves out of the
      // active tracking list, where it's still visible.
      async function purgeStaleCheques() {
        const stale = state.cheques.filter((cheque) => cheque.status === "pending" && daysRemaining(cheque.chequeDate) < 0);
        if (!stale.length) return;
        const resolvedDate = sriLankaTodayKey();
        for (const cheque of stale) {
          try {
            const { error } = await db
              .from("cheques")
              .update({ status: "overdue_removed", resolved_date: resolvedDate })
              .eq("id", cheque.id);
            if (error) throw error;
            cheque.status = "overdue_removed";
            cheque.resolvedDate = resolvedDate;
          } catch (err) {
            console.error("Could not archive stale cheque", cheque.id, err);
          }
        }
        const staleIds = new Set(stale.map((cheque) => cheque.id));
        if (state.editingChequeId !== null && staleIds.has(state.editingChequeId)) closeChequeEditor();
      }
