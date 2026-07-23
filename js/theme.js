/*
  theme.js
  Light/dark theme toggle. The initial theme is already set synchronously
  in <head> (before any of this loads) to avoid a flash of the wrong theme.
  This file keeps the toggle button's icon/label in sync and handles clicks.
*/

      function updateThemeToggleLabel() {
        const theme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
        const icon = document.getElementById("theme-toggle-icon");
        const label = document.getElementById("theme-toggle-label");
        if (!icon || !label) return;
        icon.textContent = theme === "dark" ? "☀️" : "🌙";
        label.textContent = theme === "dark" ? "Light mode" : "Dark mode";
      }

      function toggleTheme() {
        const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
        const next = current === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        try {
          localStorage.setItem("pos-theme", next);
        } catch (e) {}
        updateThemeToggleLabel();
      }

      updateThemeToggleLabel();
      document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
