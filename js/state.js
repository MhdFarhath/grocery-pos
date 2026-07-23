/*
  state.js
  App-wide state: default categories, demo products, the `state` object,
  cached DOM references (`els`), and normalizeProduct().
*/

      const defaultCategories = ["Produce", "Dairy", "Bakery", "Dry Goods", "Household"];

      const demoProducts = [
        { id: 1001, name: "Basmati Rice 5kg", category: "Dry Goods", price: 2450, stock: 24, saleType: "pack", unit: "pack" },
        { id: 1002, name: "Fresh Milk 1L", category: "Dairy", price: 520, stock: 36, saleType: "pack", unit: "pack" },
        { id: 1003, name: "Brown Bread", category: "Bakery", price: 390, stock: 18, saleType: "pack", unit: "pack" },
        { id: 1004, name: "Red Apples", category: "Produce", price: 980, stock: 15, saleType: "loose", unit: "kg" },
        { id: 1005, name: "Eggs 10 Pack", category: "Dairy", price: 760, stock: 22, saleType: "pack", unit: "pack" },
        { id: 1006, name: "Sugar 1kg", category: "Dry Goods", price: 410, stock: 40, saleType: "pack", unit: "pack" },
        { id: 1007, name: "Laundry Powder", category: "Household", price: 1180, stock: 11, saleType: "pack", unit: "pack" },
        { id: 1008, name: "Tomatoes", category: "Produce", price: 640, stock: 9, saleType: "loose", unit: "kg" },
        { id: 1009, name: "Coconut Oil 1L", category: "Dry Goods", price: 1320, stock: 16, saleType: "pack", unit: "pack" },
        { id: 1010, name: "Cheese 200g", category: "Dairy", price: 890, stock: 7, saleType: "pack", unit: "pack" },
        { id: 1011, name: "Burger Buns", category: "Bakery", price: 460, stock: 14, saleType: "pack", unit: "pack" },
        { id: 1012, name: "Dish Soap", category: "Household", price: 560, stock: 19, saleType: "pack", unit: "pack" }
      ];

      const state = {
        products: [],
        categories: [...defaultCategories],
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
