/*
  catalog.js
  Category & product catalog rendering: renderCategories, renderCategoryList,
  filteredProducts, renderProducts, renderInventory (the inventory table).
*/

      function renderCategories() {
        const selected = els.categoryFilter.value || "all";
        const categories = [...new Set([...state.categories, ...state.products.map((product) => product.category)])].sort();
        state.categories = categories;
        els.categoryFilter.innerHTML = `<option value="all">All categories</option>${categories
          .map((category) => `<option value="${category}">${category}</option>`)
          .join("")}`;
        els.categoryFilter.value = categories.includes(selected) ? selected : "all";
        els.productCategory.innerHTML = categories.map((category) => `<option value="${category}">${category}</option>`).join("");
        renderCategoryList(categories);
      }

      // Category Management page: one row per category, with its products,
      // item count, and Edit / Delete buttons.
      function renderCategoryList(categories = state.categories) {
        const { pageItems, safePage, totalPages, start } = paginate(categories, state.categoriesPage || 1);
        state.categoriesPage = safePage;
        const MAX_NAMES = 8;

        els.categoryList.innerHTML =
          pageItems
            .map((category, index) => {
              const products = state.products.filter((product) => product.category === category);
              const names = products
                .slice(0, MAX_NAMES)
                .map((product) => `<span>${product.name}</span>`)
                .join("");
              const more =
                products.length > MAX_NAMES ? `<span class="more">+${products.length - MAX_NAMES} more</span>` : "";
              return `
                <tr>
                  <td>${start + index + 1}</td>
                  <td><strong>${category}</strong></td>
                  <td>${products.length}</td>
                  <td>${
                    products.length
                      ? `<div class="category-products">${names}${more}</div>`
                      : `<small>No products yet</small>`
                  }</td>
                  <td class="category-actions">
                    <button type="button" class="secondary" data-edit-category="${category}">Edit</button>
                    <button type="button" class="danger-action" data-delete-category="${category}">Delete</button>
                  </td>
                </tr>`;
            })
            .join("") || `<tr><td colspan="5" class="empty">No categories yet. Add one above.</td></tr>`;

        renderPaginationControls(
          "categories-pagination",
          safePage,
          totalPages,
          () => {
            state.categoriesPage = safePage - 1;
            renderCategoryList();
          },
          () => {
            state.categoriesPage = safePage + 1;
            renderCategoryList();
          }
        );
      }

      function filteredProducts() {
        const search = els.search.value.trim().toLowerCase();
        const category = els.categoryFilter.value;
        return state.products.filter((product) => {
          const matchesSearch =
            !search ||
            product.name.toLowerCase().includes(search) ||
            String(product.id).includes(search) ||
            (product.barcode && product.barcode.toLowerCase().includes(search));
          const matchesCategory = category === "all" || product.category === category;
          return matchesSearch && matchesCategory;
        });
      }

      function renderProducts() {
        const products = filteredProducts();
        els.productGrid.innerHTML =
          products
            .map(
              (product) => `
                <button class="product" data-add="${product.id}" ${product.stock <= 0 ? "disabled" : ""}>
                  <div class="product-top">
                    <span class="thumb ${categoryClass(product.category)}">${
                      product.image ? `<img src="${product.image}" alt="">` : initials(product.name)
                    }</span>
                    <span>
                      <strong>${product.name}</strong>
                      <small>#${product.id} &middot; ${product.category} &middot; ${product.saleType === "loose" ? "Loose" : "Pack"}</small>
                    </span>
                  </div>
                  <div class="price-row">
                    <span class="price">${priceLabel(product)}</span>
                    <span class="stock ${product.stock <= 10 ? "low" : ""}">${stockLabel(product)}</span>
                  </div>
                </button>`
            )
            .join("") || `<div class="empty">No products found.</div>`;
      }
      function renderInventory() {
        const { pageItems, safePage, totalPages } = paginate(state.products, state.inventoryPage);
        state.inventoryPage = safePage;
        document.getElementById("inventory-table").innerHTML =
          pageItems
            .map(
              (product) => `
                <tr>
                  <td>${product.barcode || "#" + product.id}</td>
                  <td>
                    <span class="product-top">
                      <span class="thumb ${categoryClass(product.category)}">${
                        product.image ? `<img src="${product.image}" alt="">` : initials(product.name)
                      }</span>
                      <strong>${product.name}</strong>
                    </span>
                  </td>
                  <td>${product.category}</td>
                  <td>${priceLabel(product)}</td>
                  <td>${displayQty(product.stock, product.unit)}</td>
                  <td>${product.saleType === "loose" ? `Loose / ${product.unit}` : "Pack"}</td>
                  <td>
                    <button class="secondary" data-edit-product="${product.id}">Edit</button>
                    <button class="danger-action" data-delete-product="${product.id}">Delete</button>
                  </td>
                </tr>`
            )
            .join("") || `<tr><td colspan="7" class="empty">No products yet.</td></tr>`;

        renderPaginationControls(
          "inventory-pagination",
          safePage,
          totalPages,
          () => {
            state.inventoryPage = safePage - 1;
            renderInventory();
          },
          () => {
            state.inventoryPage = safePage + 1;
            renderInventory();
          }
        );
      }
