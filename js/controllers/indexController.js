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
function formatPrice(n) {
  try {
    return new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" }).format(n);
  } catch {
    return `$${n}`;
  }
}
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

// ------- render principal -------
async function renderProducts() {
  const grid = document.getElementById("cardsContainer");
  if (!grid) return;

  if (!auth.ok) {  // si no hay sesión, no pidas datos
    showLoginRequired();
    return;
  }

  grid.innerHTML = '<div class="text-muted">Cargando productos…</div>';
  try {
    const data = await getProducts(0, 24);
    const list = Array.isArray(data?.content) ? data.content : (Array.isArray(data) ? data : []);
    grid.innerHTML = list.map(card).join("") || '<div class="text-muted">No hay productos.</div>';
  } catch {
    grid.innerHTML = '<div class="text-danger">No se pudieron cargar los productos.</div>';
  }
}

// 'pageshow' => valida sesión y renderiza
window.addEventListener("pageshow", async () => {
  const grid = document.getElementById("cardsContainer");
  if (grid) grid.innerHTML = '<div class="text-muted">Verificando sesión…</div>';

  // Asegura user/menu, pero no rediriges automáticamente aquí
  await renderUser();

  // Si quieres bloquear index sin sesión, usa requireAuth({redirect:true})
  await requireAuth({ redirect: false });

  await renderProducts();
});
