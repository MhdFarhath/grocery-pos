/*
  utils.js
  Small formatting/display helpers: money, categoryClass, initials,
  displayQty, priceLabel, unitStep, stockLabel.
*/

      function money(amount) {
        return `${state.settings.currency} ${Number(amount || 0).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`;
      }

      function categoryClass(category) {
        return category.toLowerCase().replace(" goods", "").replace(/\s+/g, "-");
      }

      function initials(name) {
        return name
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((word) => word[0])
          .join("")
          .toUpperCase();
      }

      function displayQty(qty, unit = "pack") {
        const value = Number(qty || 0);
        const formatted = Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
        return `${formatted} ${unit}`;
      }

      function priceLabel(product) {
        return product.saleType === "loose" ? `${money(product.price)} / ${product.unit}` : money(product.price);
      }

      function unitStep(product) {
        if (product.saleType !== "loose") return 1;
        if (product.unit === "kg" || product.unit === "l") return 0.1;
        if (product.unit === "g" || product.unit === "ml") return 100;
        return 0.5;
      }

      function stockLabel(product) {
        return product.saleType === "loose" ? `${displayQty(product.stock, product.unit)} left` : `${product.stock} left`;
      }

      // Sri Lanka is UTC+5:30 year-round (no daylight saving), so a fixed
      // offset is all that's needed - no timezone-database lookup required.
      const SRI_LANKA_OFFSET_MS = 5.5 * 60 * 60 * 1000;

      function sriLankaNow() {
        return new Date(Date.now() + SRI_LANKA_OFFSET_MS);
      }

      // A correct, unambiguous timestamp with Sri Lanka's +05:30 offset baked
      // in (e.g. "2026-07-22T19:45:03+05:30") - safe to store, sort, and
      // re-open correctly from a device in any timezone, and reads as the
      // right local time even when viewed directly in the Supabase table.
      function sriLankaISOString() {
        const shifted = sriLankaNow();
        const pad = (n) => String(n).padStart(2, "0");
        const y = shifted.getUTCFullYear();
        const mo = pad(shifted.getUTCMonth() + 1);
        const d = pad(shifted.getUTCDate());
        const h = pad(shifted.getUTCHours());
        const mi = pad(shifted.getUTCMinutes());
        const s = pad(shifted.getUTCSeconds());
        return `${y}-${mo}-${d}T${h}:${mi}:${s}+05:30`;
      }

      // Display any stored timestamp as Sri Lanka local time, regardless of
      // the viewer's own device timezone.
      function formatSriLankaDateTime(value) {
        return new Date(value).toLocaleString(undefined, {
          timeZone: "Asia/Colombo",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });
      }

      function formatSriLankaDate(value) {
        return new Date(value).toLocaleDateString(undefined, {
          timeZone: "Asia/Colombo",
          year: "numeric",
          month: "short",
          day: "numeric"
        });
      }

      // The Sri Lanka calendar date (YYYY-MM-DD) for any timestamp - safe for
      // filtering, sorting, and comparing regardless of the viewer's own timezone.
      function sriLankaDateOnly(value) {
        return new Date(value).toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
      }

      // Sri Lanka's current date, broken into numeric {y, m, d} parts (m is 1-12).
      function sriLankaTodayParts() {
        const parts = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Colombo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit"
        }).formatToParts(new Date());
        const map = {};
        parts.forEach((part) => (map[part.type] = part.value));
        return { y: Number(map.year), m: Number(map.month), d: Number(map.day) };
      }

      function dateKeyFromParts(y, m, d) {
        const pad = (n) => String(n).padStart(2, "0");
        return `${y}-${pad(m)}-${pad(d)}`;
      }

      function sriLankaTodayKey() {
        const { y, m, d } = sriLankaTodayParts();
        return dateKeyFromParts(y, m, d);
      }

      // Monday of the current Sri Lanka week.
      function sriLankaStartOfWeekKey() {
        const { y, m, d } = sriLankaTodayParts();
        const utcDate = new Date(Date.UTC(y, m - 1, d));
        const day = utcDate.getUTCDay();
        const diffToMonday = day === 0 ? 6 : day - 1;
        utcDate.setUTCDate(utcDate.getUTCDate() - diffToMonday);
        return dateKeyFromParts(utcDate.getUTCFullYear(), utcDate.getUTCMonth() + 1, utcDate.getUTCDate());
      }

      function sriLankaStartOfMonthKey() {
        const { y, m } = sriLankaTodayParts();
        return dateKeyFromParts(y, m, 1);
      }
