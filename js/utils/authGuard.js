import { me } from "../services/authService.js";
(async function () {
  try {
    const info = await me();
    if (!info?.authenticated) window.location.href = "login.html";
  } catch {
    window.location.href = "login.html";
  }
})();
