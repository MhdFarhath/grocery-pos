/*
  sales.js
  Sales history: date-range filtering, renderSales (stats + table), and
  exportSales (CSV export of whatever's currently filtered).
*/

      function filteredSales() {
        const { from, to } = state.salesFilter;
        return state.sales.filter((sale) => {
          const key = sriLankaDateOnly(sale.date);
          if (from && key < from) return false;
          if (to && key > to) return false;
          return true;
        });
      }

      function renderSales() {
        const sales = filteredSales();
        const revenue = sales.reduce((sum, sale) => sum + sale.total, 0);
        const itemCount = sales.reduce((sum, sale) => sum + sale.items.reduce((qty, item) => qty + item.qty, 0), 0);
        document.getElementById("stat-count").textContent = sales.length;
        document.getElementById("stat-revenue").textContent = money(revenue);
        document.getElementById("stat-items").textContent = itemCount;
        document.getElementById("stat-average").textContent = money(sales.length ? revenue / sales.length : 0);

        const { pageItems, safePage, totalPages } = paginate(sales, state.salesPage);
        state.salesPage = safePage;
        document.getElementById("sales-table").innerHTML =
          pageItems
            .map(
              (sale) => `
                <tr>
                  <td>#${sale.id}</td>
                  <td>${formatSriLankaDateTime(sale.date)}</td>
                  <td>${sale.items.reduce((sum, item) => sum + item.qty, 0)}</td>
                  <td>${sale.credit > 0 ? `${sale.method} + Credit (${sale.creditorName})` : sale.method}</td>
                  <td>${money(sale.total)}</td>
                </tr>`
            )
            .join("") || `<tr><td colspan="5" class="empty">No sales in this date range.</td></tr>`;

        renderPaginationControls(
          "sales-pagination",
          safePage,
          totalPages,
          () => {
            state.salesPage = safePage - 1;
            renderSales();
          },
          () => {
            state.salesPage = safePage + 1;
            renderSales();
          }
        );
      }

      function exportSales() {
        const sales = filteredSales();
        const header = ["receipt", "date", "items", "payment", "subtotal", "discount", "tax", "total", "creditor", "credit"];
        const rows = sales.map((sale) => [
          sale.id,
          formatSriLankaDateTime(sale.date),
          sale.items.map((item) => `${item.name} x ${item.qty}`).join("; "),
          sale.method,
          sale.subtotal,
          sale.discount,
          sale.tax,
          sale.total,
          sale.creditorName || "",
          sale.credit || 0
        ]);
        const csv = [header, ...rows]
          .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
          .join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "grocery-sales.csv";
        link.click();
        URL.revokeObjectURL(url);
      }
