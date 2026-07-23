/*
  state.js
  App-wide state, the `state` object, cached DOM references (`els`), and
  normalizeProduct().
*/

      const state = {
        products: [],
        categories: [],
        cart: [],
        sales: [],
        creditors: [],
        creditorPayments: [],
        creditorEntries: [],
        viewingCreditorId: null,
        creditorStatementFilter: { from: "", to: "" },
        cheques: [],
        editingCreditorId: null,
        editingChequeId: null,
        salesFilter: { from: "", to: "" },
        inventoryPage: 1,
        salesPage: 1,
        creditorsPage: 1,
        chequesPage: 1,
        chequeHistoryPage: 1,
        chequeHistoryFilter: { from: "", to: "" },
        pendingProductId: null,
        settings: {
          storeName: "M.L.A. Stores",
          storePhone: "+94 77 000 0000",
          storePhone2: "",
          storeEmail: "",
          currency: "LKR",
          defaultTax: 0
        }
      };

      const els = {
        productGrid: document.getElementById("product-grid"),
        cartItems: document.getElementById("cart-items"),
        search: document.getElementById("search"),
        categoryFilter: document.getElementById("category-filter"),
        productCategory: document.getElementById("product-category"),
        productSaleType: document.getElementById("product-sale-type"),
        productUnit: document.getElementById("product-unit"),
        productImage: document.getElementById("product-image"),
        productImagePreview: document.getElementById("product-image-preview"),
        categoryList: document.getElementById("category-list"),
        subtotal: document.getElementById("subtotal"),
        discount: document.getElementById("discount"),
        tax: document.getElementById("tax"),
        taxAmount: document.getElementById("tax-amount"),
        total: document.getElementById("total"),
        paid: document.getElementById("paid"),
        method: document.getElementById("method"),
        change: document.getElementById("change"),
        creditAmount: document.getElementById("credit-amount"),
        creditorSelect: document.getElementById("creditor-select"),
        newCreditorField: document.getElementById("new-creditor-field"),
        newCreditorName: document.getElementById("new-creditor-name"),
        creditorEditor: document.getElementById("creditor-editor"),
        editCreditorName: document.getElementById("edit-creditor-name"),
        editCreditorAmount: document.getElementById("edit-creditor-amount"),
        addCreditAmount: document.getElementById("add-credit-amount"),
        creditPaymentAmount: document.getElementById("credit-payment-amount"),
        creditRemaining: document.getElementById("credit-remaining"),
        creditorEditStatus: document.getElementById("creditor-edit-status"),
        quantityModal: document.getElementById("quantity-modal"),
        quantityTitle: document.getElementById("quantity-title"),
        quantityPrice: document.getElementById("quantity-price"),
        quantityInput: document.getElementById("quantity-input"),
        quickQty: document.getElementById("quick-qty"),
        quantityTotal: document.getElementById("quantity-total"),
        receiptModal: document.getElementById("receipt-modal"),
        receiptPaper: document.getElementById("receipt-paper")
      };

      function normalizeProduct(product) {
        const saleType = product.saleType || "pack";
        return {
          ...product,
          saleType,
          unit: product.unit || (saleType === "loose" ? "kg" : "pack"),
          image: product.image || "",
          barcode: product.barcode ? String(product.barcode).trim() : String(product.id),
          stock: Number(product.stock || 0),
          price: Number(product.price || 0)
        };
      }
