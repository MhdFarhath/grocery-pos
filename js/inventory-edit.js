/*
  inventory-edit.js
  Editing existing inventory:
  - Edit Item panel (name, barcode, category, price, stock, sale type, unit, image)
  - Rename Category panel (renames the category AND moves every product in it)
  Loaded after events.js, before main.js.
*/

      let editingProductId = null;
      let editingCategoryName = null;

      // ---------------- Edit product ----------------

      function syncEditUnitField() {
        const saleType = document.getElementById("edit-product-sale-type").value;
        const unit = document.getElementById("edit-product-unit");
        if (saleType === "pack") unit.value = "pack";
        else if (unit.value === "pack") unit.value = "kg";
        unit.disabled = saleType === "pack";
      }

      function setEditImagePreview(src) {
        const preview = document.getElementById("edit-product-image-preview");
        if (src) {
          preview.src = src;
          preview.classList.add("active");
        } else {
          preview.removeAttribute("src");
          preview.classList.remove("active");
        }
      }

      function openProductEditor(id) {
        const product = state.products.find((item) => item.id === id);
        if (!product) return;
        editingProductId = id;

        document.getElementById("edit-product-category").innerHTML = state.categories
          .map((category) => `<option value="${category}">${category}</option>`)
          .join("");

        document.getElementById("edit-product-name").value = product.name;
        document.getElementById("edit-product-barcode").value = product.barcode || "";
        document.getElementById("edit-product-category").value = product.category;
        document.getElementById("edit-product-price").value = product.price;
        document.getElementById("edit-product-stock").value = product.stock;
        document.getElementById("edit-product-sale-type").value = product.saleType;
        document.getElementById("edit-product-unit").value = product.unit;
        document.getElementById("edit-product-image").value = "";
        document.getElementById("edit-product-remove-image").checked = false;
        syncEditUnitField();
        setEditImagePreview(product.image);
        openDrawer("edit-product-drawer");
      }

      function closeProductEditor() {
        editingProductId = null;
        closeDrawer("edit-product-drawer");
        document.getElementById("product-editor").reset();
        setEditImagePreview("");
      }

      document.getElementById("inventory-table").addEventListener("click", (event) => {
        const button = event.target.closest("[data-edit-product]");
        if (button) openProductEditor(Number(button.dataset.editProduct));
      });

      document.getElementById("edit-product-sale-type").addEventListener("change", syncEditUnitField);

      document.getElementById("edit-product-image").addEventListener("change", async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        document.getElementById("edit-product-remove-image").checked = false;
        setEditImagePreview(await readImageFile(file));
      });

      document.getElementById("edit-product-remove-image").addEventListener("change", (event) => {
        if (event.target.checked) {
          document.getElementById("edit-product-image").value = "";
          setEditImagePreview("");
        } else {
          const product = state.products.find((item) => item.id === editingProductId);
          setEditImagePreview(product ? product.image : "");
        }
      });

      document.getElementById("cancel-product-edit").addEventListener("click", closeProductEditor);

      document.getElementById("product-editor").addEventListener("submit", async (event) => {
        event.preventDefault();
        const product = state.products.find((item) => item.id === editingProductId);
        if (!product) return;

        const name = document.getElementById("edit-product-name").value.trim();
        const barcode = document.getElementById("edit-product-barcode").value.trim();
        const saleType = document.getElementById("edit-product-sale-type").value;
        const unit = saleType === "pack" ? "pack" : document.getElementById("edit-product-unit").value;
        const price = Number(document.getElementById("edit-product-price").value);
        const stock = Number(document.getElementById("edit-product-stock").value);

        if (!name) {
          await showAlert("Enter a product name.");
          return;
        }
        if (barcode && state.products.some((item) => item.id !== product.id && item.barcode === barcode)) {
          await showAlert("That barcode is already used by another product. Enter a different one.");
          return;
        }

        let image = product.image;
        const newFile = document.getElementById("edit-product-image").files[0];
        if (newFile) image = await readImageFile(newFile);
        else if (document.getElementById("edit-product-remove-image").checked) image = "";

        const updated = normalizeProduct({
          ...product,
          name,
          barcode,
          category: document.getElementById("edit-product-category").value,
          price,
          stock,
          saleType,
          unit,
          image
        });

        const saveButton = event.target.querySelector('button[type="submit"]');
        saveButton.disabled = true;
        try {
          const { id, ...changes } = toDbProduct(updated);
          const { error } = await db.from("products").update(changes).eq("id", product.id);
          if (error) throw error;

          Object.assign(product, updated);

          // Keep any open sale in step with the edited product.
          state.cart.forEach((line) => {
            if (line.id !== product.id || line.isCustom) return;
            line.name = product.name;
            line.price = product.price;
            line.saleType = product.saleType;
            line.unit = product.unit;
            if (line.qty > product.stock) line.qty = product.stock;
          });
          state.cart = state.cart.filter((line) => line.isCustom || line.qty > 0);

          closeProductEditor();
          renderAll();
        } catch (err) {
          await showAlert("Could not update the product on the server: " + err.message);
        } finally {
          saveButton.disabled = false;
        }
      });

      // ---------------- Rename category ----------------

      function openCategoryEditor(category) {
        editingCategoryName = category;
        const count = state.products.filter((product) => product.category === category).length;
        document.getElementById("edit-category-name").value = category;
        document.getElementById("edit-category-usage").textContent =
          count === 0
            ? "No products use this category yet."
            : `${count} product${count === 1 ? "" : "s"} will be moved to the new name.`;
        openDrawer("edit-category-drawer");
      }

      function closeCategoryEditor() {
        editingCategoryName = null;
        closeDrawer("edit-category-drawer");
      }

      els.categoryList.addEventListener("click", (event) => {
        const button = event.target.closest("[data-edit-category]");
        if (button) openCategoryEditor(button.dataset.editCategory);
      });

      document.getElementById("cancel-category-edit").addEventListener("click", closeCategoryEditor);

      document.getElementById("category-editor").addEventListener("submit", async (event) => {
        event.preventDefault();
        const oldName = editingCategoryName;
        const newName = document.getElementById("edit-category-name").value.trim();
        if (!oldName || !newName) return;
        if (newName === oldName) {
          closeCategoryEditor();
          return;
        }
        const clash = state.categories.some(
          (item) => item !== oldName && item.toLowerCase() === newName.toLowerCase()
        );
        if (clash) {
          await showAlert(`A category called "${newName}" already exists. Choose a different name.`);
          return;
        }

        const saveButton = event.target.querySelector('button[type="submit"]');
        saveButton.disabled = true;
        try {
          // The category might only exist on products (never saved to the
          // categories table), so make sure the new name exists there.
          const { data: existing, error: findError } = await db
            .from("categories")
            .select("name")
            .eq("name", oldName)
            .maybeSingle();
          if (findError) throw findError;

          if (existing) {
            const { error } = await db.from("categories").update({ name: newName }).eq("name", oldName);
            if (error) throw error;
          } else {
            const { error } = await db.from("categories").insert({ name: newName });
            if (error) throw error;
          }

          const { error: productsError } = await db
            .from("products")
            .update({ category: newName })
            .eq("category", oldName);
          if (productsError) throw productsError;

          state.categories = state.categories.map((item) => (item === oldName ? newName : item)).sort();
          state.products.forEach((product) => {
            if (product.category === oldName) product.category = newName;
          });
          if (els.categoryFilter.value === oldName) {
            els.categoryFilter.innerHTML += `<option value="${newName}">${newName}</option>`;
            els.categoryFilter.value = newName;
          }

          closeCategoryEditor();
          renderAll();
        } catch (err) {
          await showAlert("Could not rename the category on the server: " + err.message);
        } finally {
          saveButton.disabled = false;
        }
      });

      // ---------------- Sidebar highlight for sub-pages ----------------
      // In-page buttons like "Categories" / "Back to Inventory" also switch
      // views; keep the matching sidebar item highlighted when they do.
      const SUB_PAGE_PARENT = { categories: "inventory", "cheque-history": "cheques" };

      document.querySelectorAll("[data-view-button]").forEach((button) => {
        button.addEventListener("click", () => {
          const view = button.dataset.viewButton;
          const navView = SUB_PAGE_PARENT[view] || view;
          const navButton = document.querySelector(`.nav [data-view-button="${navView}"]`);
          if (!navButton) return;
          document.querySelectorAll("[data-view-button]").forEach((item) => item.classList.remove("active"));
          navButton.classList.add("active");
          if (view === "categories") {
            state.categoriesPage = 1;
            renderCategoryList();
          }
        });
      });
