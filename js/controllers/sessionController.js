// js/controllers/sessionController.js
// -------------------------------------------------------------
// Controlador de sesión y menú
// - Mantiene el estado de autenticación
// - Ajusta el menú dinámico según la sesión (Productos / Categorías)
// - Gestiona logout y visibilidad de "Iniciar sesión"
// - Expone funciones de apoyo: renderUser(), requireAuth()
// - Usa 'pageshow' para refrescar cuando se vuelve con el botón Atrás
// -------------------------------------------------------------

import { me, logout } from "../services/authService.js";

// Estado de sesión global
export const auth = {
  ok: false,   // indica si la sesión está activa
  user: null,  // guarda datos del usuario autenticado
};

// Controla qué enlaces de menú deben mostrarse según el estado de sesión
export function ensureMenuLinks(shouldShow) {
  const mainMenu = document.getElementById("mainMenu");
  const loginLink = document.getElementById("loginLink");

  if (shouldShow) {
    // Se oculta el enlace "Iniciar sesión"
    loginLink?.classList.add("d-none");

    // Se agrega el enlace a "Productos" si no existe
    if (!document.getElementById("menuProducts")) {
      const li = document.createElement("li");
      li.id = "menuProducts";
      li.className = "nav-item";
      li.innerHTML = `<a class="nav-link" href="products.html">Productos</a>`;
      mainMenu?.appendChild(li);
    }

    // Se agrega el enlace a "Categorías" si no existe
    if (!document.getElementById("menuCategories")) {
      const li = document.createElement("li");
      li.id = "menuCategories";
      li.className = "nav-item";
      li.innerHTML = `<a class="nav-link" href="categories.html">Categorías</a>`;
      mainMenu?.appendChild(li);
    }
  } else {
    // Se vuelve a mostrar el enlace "Iniciar sesión"
    loginLink?.classList.remove("d-none");
    // Se eliminan los enlaces dinámicos de Productos y Categorías
    document.getElementById("menuProducts")?.remove();
    document.getElementById("menuCategories")?.remove();
  }
}

// Renderiza la caja de usuario y ajusta el menú según el estado de autenticación
export async function renderUser() {
  const userBox = document.getElementById("userBox");
  const loginLink = document.getElementById("loginLink");

  try {
    const info = await me();               // consulta al endpoint /me
    auth.ok = !!info?.authenticated;      // true si está autenticado
    auth.user = info?.user ?? null;

    if (auth.ok) {
      ensureMenuLinks(true);

      if (userBox) {
        // Construye saludo y botón de logout
        userBox.innerHTML = `
          <span class="me-3">Hola, <strong>${auth.user?.nombre ?? auth.user?.correo ?? "usuario"}</strong></span>
          <button id="btnLogout" class="btn btn-outline-danger btn-sm">Salir</button>
        `;
        userBox.classList.remove("d-none");

        // Listener para logout
        document.getElementById("btnLogout")?.addEventListener("click", async () => {
          await logout();             // llama al backend para cerrar sesión
          auth.ok = false;
          auth.user = null;
          ensureMenuLinks(false);     // limpia enlaces del menú
          window.location.replace("login.html"); // redirige al login
        });
      }
    } else {
      // Caso: no autenticado
      auth.ok = false;
      auth.user = null;
      userBox?.classList.add("d-none");
      ensureMenuLinks(false);
    }
  } catch {
    // Caso: error consultando /me → se trata como no autenticado
    auth.ok = false;
    auth.user = null;
    loginLink?.classList.remove("d-none");
    document.getElementById("userBox")?.classList.add("d-none");
    ensureMenuLinks(false);
  }
}

// Verifica si hay sesión activa
// Si no existe sesión y redirect es true, se envía al login
export async function requireAuth({ redirect = true } = {}) {
  try {
    const info = await me();             // consulta al backend
    auth.ok = !!info?.authenticated;
    auth.user = info?.user ?? null;
  } catch {
    auth.ok = false;
    auth.user = null;
  }

  if (!auth.ok && redirect) {
    window.location.replace("login.html");
  }
  return auth.ok; // devuelve booleano indicando si hay sesión
}

// Usa exactamente los valores que vienen en /me
export function getUserRole() {
  // "Administrador" | "Almacenista" | "Cliente" (o undefined)
  return auth.user?.rol || "";
}

export function hasAuthority(authority) {
  // "ROLE_Administrador", "ROLE_Almacenista", "ROLE_Cliente"
  return Array.isArray(auth.user?.authorities)
    ? auth.user.authorities.includes(authority)
    : false;
}

export const role = {
  isAdmin: () =>
    getUserRole() === "Administrador" || hasAuthority("ROLE_Administrador"),

  isAlmacenista: () =>
    getUserRole() === "Almacenista" || hasAuthority("ROLE_Almacenista"),

  isCliente: () =>
    getUserRole() === "Cliente" || hasAuthority("ROLE_Cliente"),
};

// Refresca automáticamente la sesión y el menú al volver con botón Atrás (bfcache)
window.addEventListener("pageshow", async () => {
  await renderUser();
});
