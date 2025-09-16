// js/controllers/loginController.js
// -------------------------------------------------------------
// Controlador de login.
// - Gestiona envío del formulario y estados de UI (alerta/botón)
// - Usa authService: login() y me() para validar sesión tras login
// -------------------------------------------------------------

import { login, me } from '../services/authService.js';

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('loginForm');

  // Contenedor de alertas: si no existe en el DOM, se crea antes del formulario.
  const alertBox = document.getElementById('loginAlert') || (() => {
    const a = document.createElement('div');
    a.id = 'loginAlert';
    a.className = 'alert alert-danger d-none'; // oculto por defecto
    form?.parentElement?.insertBefore(a, form); // inserta el alert encima del form
    return a;
  })();

  // Maneja el submit del formulario de login.
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.classList.add('d-none'); // oculta alert previo

    // 1) Obtención tolerante de campos (acepta varios selectores equivalentes)
    const correo = (document.querySelector('#correo, #email, [name=correo], [name=email], input[type=email]')?.value || '').trim();
    const contrasena = document.querySelector('#contrasena, #password, [name=contrasena], [name=password], input[type=password]')?.value || '';

    // Referencia y estado del botón "Ingresar"
    const btnIngresar = document.getElementById("btnIngresar");
    let originalText;

    try {
      // 2) Desactiva botón para evitar reenvíos múltiples y muestra feedback de carga
      if (btnIngresar) {
        originalText = btnIngresar.innerHTML;
        btnIngresar.setAttribute("disabled", "disabled");
        btnIngresar.innerHTML = 'Ingresando…';
      }

      // 3) Llama al servicio de login (envía credenciales, espera cookie de sesión)
      await login({ correo, contrasena });

      // 4) Verifica sesión con /me para confirmar que la cookie quedó activa
      const info = await me(); // el service incluye credentials:'include'
      if (info?.authenticated) {
        // 5) Redirección a la página principal si autenticado
        window.location.href = 'index.html';
      } else {
        // Entre líneas: si no se refleja autenticación, alerta de cookie/sesión
        alertBox.textContent = 'Error de Cookie';
        alertBox.classList.remove('d-none');
      }
    } catch (err) {
      // 6) Muestra mensaje de error de backend/red o fallback genérico
      alertBox.textContent = err?.message || 'No fue posible iniciar sesión.';
      alertBox.classList.remove('d-none');
    } finally {
      // 7) Restaura estado del botón (habilita y devuelve texto original)
      if (btnIngresar) {
        btnIngresar.removeAttribute("disabled");
        if (originalText) btnIngresar.innerHTML = originalText;
      }
    }
  });
});
