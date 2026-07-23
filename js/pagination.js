/*
  pagination.js
  Generic page-slicing + Previous/Next controls, reused by Inventory, Sales,
  Creditors, and Cheques so none of those tables dump every row at once.
*/

      const PAGE_SIZE = 10;

      // Slices `items` to the given page, clamping to a valid range (e.g. if
      // the list shrank after a delete, this snaps back to the last real page).
      function paginate(items, page) {
        const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
        const safePage = Math.min(Math.max(page, 1), totalPages);
        const start = (safePage - 1) * PAGE_SIZE;
        return {
          pageItems: items.slice(start, start + PAGE_SIZE),
          safePage,
          totalPages,
          totalCount: items.length,
          start
        };
      }

      // Renders Previous/Next + "Page X of Y" into containerId, and wires up
      // the two callbacks. Renders nothing when there's only one page.
      function renderPaginationControls(containerId, safePage, totalPages, onPrev, onNext) {
        const container = document.getElementById(containerId);
        if (!container) return;
        if (totalPages <= 1) {
          container.innerHTML = "";
          return;
        }
        container.innerHTML = `
          <button type="button" class="secondary" ${safePage <= 1 ? "disabled" : ""} data-page-action="prev">&larr; Previous</button>
          <span class="pagination-info">Page ${safePage} of ${totalPages}</span>
          <button type="button" class="secondary" ${safePage >= totalPages ? "disabled" : ""} data-page-action="next">Next &rarr;</button>
        `;
        container.querySelector('[data-page-action="prev"]').addEventListener("click", onPrev);
        container.querySelector('[data-page-action="next"]').addEventListener("click", onNext);
      }
