/*
  dialogs.js
  In-page replacements for the browser's native alert()/confirm(), which the
  browser always shows pinned to the top of the page. These render as a
  centered popup instead, styled to match the rest of the app.
*/

      let currentDialogResolve = null;

      function showAppDialog(message, buttons) {
        return new Promise((resolve) => {
          currentDialogResolve = resolve;
          const modal = document.getElementById("app-dialog");
          document.getElementById("app-dialog-message").textContent = message;
          const actions = document.getElementById("app-dialog-actions");
          actions.innerHTML = "";
          buttons.forEach(({ label, value, className }) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = className;
            button.textContent = label;
            button.addEventListener("click", () => {
              modal.classList.remove("open");
              currentDialogResolve = null;
              resolve(value);
            });
            actions.appendChild(button);
          });
          modal.classList.add("open");
        });
      }

      // Drop-in replacement for window.alert() - resolves once "OK" is clicked.
      function showAlert(message) {
        return showAppDialog(message, [{ label: "OK", value: true, className: "primary" }]);
      }

      // Drop-in replacement for window.confirm() - resolves true/false.
      function showConfirm(message) {
        return showAppDialog(message, [
          { label: "Cancel", value: false, className: "secondary" },
          { label: "Yes, continue", value: true, className: "danger-action" }
        ]);
      }

      // Clicking the dark backdrop counts as Cancel/dismiss, same as pressing Esc would.
      document.getElementById("app-dialog").addEventListener("click", (event) => {
        if (event.target.id === "app-dialog" && currentDialogResolve) {
          event.target.classList.remove("open");
          const resolve = currentDialogResolve;
          currentDialogResolve = null;
          resolve(false);
        }
      });
