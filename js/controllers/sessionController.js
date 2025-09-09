// js/controllers/sessionController.js
// -------------------------------------------------------------
// Controlador COMÚN de sesión y menú
// - Mantiene el estado de autenticación (auth)
// - Construye el menú dinámico (Productos / Categorías) si hay sesión
// - Gestiona logout y visibilidad de "Iniciar sesión"
// - Expone helpers: renderUser(), requireAuth()
// - Usa 'pageshow' para refrescar al volver con el botón Atrás (bfcache)
// -------------------------------------------------------------

import { me, logout } from "../services/authService.js";

// Estado de sesión compartido (mutable)
export const auth = {
  ok: false,
  user: null,
};

// Inyecta o limpia los enlaces de menú según estado de sesión
export function ensureMenuLinks(shouldShow) {
  const mainMenu  = document.getElementById("mainMenu");
  const loginLink = document.getElementById("loginLink");

  if (shouldShow) {
    // Ocultamos "Iniciar sesión"
    loginLink?.classList.add("d-none");

    // Agregar "Productos" si no existe
    if (!document.getElementById("menuProducts")) {
      const li = document.createElement("li");
      li.id = "menuProducts";
      li.className = "nav-item";
      li.innerHTML = `<a class="nav-link" href="products.html">Productos</a>`;
      mainMenu?.appendChild(li);
    }

    // Agregar "Categorías" si no existe
    if (!document.getElementById("menuCategories")) {
      const li = document.createElement("li");
      li.id = "menuCategories";
      li.className = "nav-item";
      li.innerHTML = `<a class="nav-link" href="categories.html">Categorías</a>`;
      mainMenu?.appendChild(li);
    }
  } else {
    // Mostrar "Iniciar sesión" y limpiar ítems dinámicos
    loginLink?.classList.remove("d-none");
    document.getElementById("menuProducts")?.remove();
    document.getElementById("menuCategories")?.remove();
  }
}

// Renderiza userBox y menú según /me
export async function renderUser() {
  const userBox   = document.getElementById("userBox");
  const loginLink = document.getElementById("loginLink");

  try {
    const info = await me();                 // /api/auth/me (con credentials: 'include')
    auth.ok    = !!info?.authenticated;
    auth.user  = info?.user ?? null;

    if (auth.ok) {
      ensureMenuLinks(true);

      if (userBox) {
        userBox.innerHTML = `
          <span class="me-3">Hola, <strong>${auth.user?.nombre ?? auth.user?.correo ?? "usuario"}</strong></span>
          <button id="btnLogout" class="btn btn-outline-danger btn-sm">Salir</button>
        `;
        userBox.classList.remove("d-none");

        // Logout: limpiar menú y evitar volver al index "viejo" con replace()
        document.getElementById("btnLogout")?.addEventListener("click", async () => {
          await logout();
          auth.ok = false;
          auth.user = null;
          ensureMenuLinks(false);
          window.location.replace("login.html");
        });
      }
    } else {
      // No autenticado
      auth.ok = false;
      auth.user = null;
      userBox?.classList.add("d-none");
      ensureMenuLinks(false);
    }
  } catch {
    // Error consultando /me => tratamos como no autenticado
    auth.ok = false;
    auth.user = null;
    loginLink?.classList.remove("d-none");
    document.getElementById("userBox")?.classList.add("d-none");
    ensureMenuLinks(false);
  }
}

// Requiere sesión: si no hay, redirige a login (por defecto)
// Útil para páginas protegidas (products.html / categories.html)
export async function requireAuth({ redirect = true } = {}) {
  try {
    const info = await me();
    auth.ok   = !!info?.authenticated;
    auth.user = info?.user ?? null;
  } catch {
    auth.ok = false;
    auth.user = null;
  }

  if (!auth.ok && redirect) {
    window.location.replace("login.html");
  }
  return auth.ok;
}

// 'pageshow' cubre carga inicial y regreso desde bfcache (botón Atrás)
window.addEventListener("pageshow", async () => {
  await renderUser();
});
