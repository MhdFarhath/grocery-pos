/*
  drawers.js
  Generic slide-in drawer panels, used for Add/Edit forms instead of
  always-visible inline forms. openDrawer/closeDrawer are called by each
  module (creditors.js, cheques.js, events.js); this file also wires up the
  close (x) buttons and backdrop clicks that are common to every drawer.
*/

      function openDrawer(id) {
        document.getElementById(id).classList.add("open");
      }

      function closeDrawer(id) {
        document.getElementById(id).classList.remove("open");
      }

      document.querySelectorAll(".drawer").forEach((drawer) => {
        drawer.addEventListener("click", (event) => {
          if (event.target === drawer) closeDrawer(drawer.id);
        });
      });

      document.querySelectorAll("[data-close-drawer]").forEach((button) => {
        button.addEventListener("click", () => closeDrawer(button.dataset.closeDrawer));
      });
