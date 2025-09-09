// js/controllers/loginController.js
// -------------------------------------------------------------
// Controlador de login.
// - Desactiva el botón mientras se procesa.
// - Hace login y luego verifica sesión con /me antes de redirigir.
// - Muestra mensajes claros cuando la cookie no se puede usar (SameSite / third-party).
// -------------------------------------------------------------

import { login, me } from '../services/authService.js';

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('loginForm');

  // Contenedor de alertas (si no existe, se crea encima del formulario)
  const alertBox = document.getElementById('loginAlert') || (() => {
    const a = document.createElement('div');
    a.id = 'loginAlert';
    a.className = 'alert alert-danger d-none';
    form?.parentElement?.insertBefore(a, form);
    return a;
  })();

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.classList.add('d-none');

    // Campos de correo/contraseña con selectores "tolerantes"
    const correo = (document.querySelector('#correo, #email, [name=correo], [name=email], input[type=email]')?.value || '').trim();
    const contrasena = document.querySelector('#contrasena, #password, [name=contrasena], [name=password], input[type=password]')?.value || '';

    const btnIngresar = document.getElementById("btnIngresar");
    let originalText;

    try {
      // Desactivar el botón para evitar múltiples envíos
      if (btnIngresar) {
        originalText = btnIngresar.innerHTML;
        btnIngresar.setAttribute("disabled", "disabled");
        btnIngresar.innerHTML = 'Ingresando…';
      }

      // 1) Login
      await login({ correo, contrasena });

      // 2) Confirmación de sesión
      const info = await me(); // credentials:'include' por dentro
      if (info?.authenticated) {
        window.location.href = 'index.html';
      } else {
        alertBox.textContent = 'Iniciaste sesión, pero el navegador no está enviando la cookie (revisa SameSite=None; Secure o cookies de terceros).';
        alertBox.classList.remove('d-none');
      }
    } catch (err) {
      alertBox.textContent = err?.message || 'No fue posible iniciar sesión.';
      alertBox.classList.remove('d-none');
    } finally {
      // Reactivar el botón
      if (btnIngresar) {
        btnIngresar.removeAttribute("disabled");
        if (originalText) btnIngresar.innerHTML = originalText;
      }
    }
  });
});
