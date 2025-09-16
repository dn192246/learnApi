// js/controllers/indexController.js
// -------------------------------------------------------------
// Página de INICIO (index)
// - Verifica sesión con sessionController
// - Muestra productos en tarjetas (si hay sesión)
// - Si no hay sesión, muestra aviso con link a login
// -------------------------------------------------------------

import { getProducts } from "../services/productService.js";
import { auth, renderUser, requireAuth } from "./sessionController.js";

// ------- utilidades -------
// Formatea un número como precio en USD (locale es-SV). Si falla, usa un fallback simple.
function formatPrice(n) {
  try {
    return new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" }).format(n);
  } catch {
    return `$${n}`;
  }
}

// Devuelve el HTML de una tarjeta Bootstrap para un producto.
function card(p) {
  return `<div class="col-sm-6 col-md-4 col-lg-3">
    <div class="card h-100 shadow-sm">
      <div class="card-body d-flex flex-column">
        <h5 class="card-title">${p.nombreProducto ?? p.nombre ?? "Producto"}</h5>
        <p class="card-text small text-muted flex-grow-1">${p.descripcion ?? ""}</p>
        <div class="mt-2 d-flex justify-content-between align-items-center">
          <span class="fw-bold">${formatPrice(p.precio ?? 0)}</span>
          <span class="badge bg-secondary">Stock: ${p.stock ?? 0}</span>
        </div>
      </div>
    </div>
  </div>`;
}

// Muestra aviso cuando no hay sesión.
// Entre líneas: pinta un alert y sugiere ir a login.
function showLoginRequired() {
  const grid = document.getElementById("cardsContainer");
  if (grid) {
    grid.innerHTML = `
      <div class="alert alert-warning">
        Debes <a href="login.html" class="alert-link">iniciar sesión</a> para ver los productos.
      </div>
    `;
  }
}

// ------- Render principal -------
// 1) Verifica contenedor
// 2) Si no hay sesión, muestra aviso y retorna
// 3) Si hay sesión, muestra loader, pide productos y renderiza tarjetas

async function renderProducts() {
  const grid = document.getElementById("cardsContainer");
  if (!grid) return; // Evita errores si la vista no tiene el contenedor

  if (!auth.ok) {  // 2) si no hay sesión, no solicita datos
    showLoginRequired();
    return;
  }

  grid.innerHTML = '<div class="text-muted">Cargando productos…</div>';
  try {
    // 3) Solicita al backend la primera página con tamaño 24
    // Se asume respuesta SIEMPRE paginada: { content, number, totalPages, totalElements }
    const { content = [], number = 0, totalPages = 1 } = await getProducts(0, 24);

    // Compone tarjetas o muestra “No hay productos”
    grid.innerHTML = (content || []).map(card).join("") || '<div class="text-muted">No hay productos.</div>';
  }
  catch {
    // Entre líneas: manejo de error de red/servidor
    grid.innerHTML = '<div class="text-danger">No se pudieron cargar los productos.</div>';
  }
}

// 'pageshow' => ciclo de arranque en index
// 1) Pinta un “Verificando sesión…” preliminar
// 2) renderUser() para actualizar menú/usuario
// 3) requireAuth({redirect:false}) para no forzar login en index (es informativa)
// 4) renderProducts() para pintar tarjetas si hay sesión

window.addEventListener("pageshow", async () => {
  const grid = document.getElementById("cardsContainer");
  if (grid) grid.innerHTML = '<div class="text-muted">Verificando sesión…</div>';

  await renderUser();                 // 2) asegura user/menu
  await requireAuth({ redirect: false }); // 3) no bloquea index si no hay sesión
  await renderProducts();             // 4) pinta productos o aviso
});
