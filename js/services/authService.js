const API_AUTH = "https://learnapifront-9de8a2348f9a.herokuapp.com/api/auth";

export async function login({ correo, contrasena }) {
  const r = await fetch(`${API_AUTH}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ correo, contrasena }),
  });
  if (!r.ok) throw new Error(await r.text().catch(() => ""));
  return true;
}

export async function me() {
  const r = await fetch(`${API_AUTH}/me`, { credentials: "include" });
  return r.ok ? r.json() : { authenticated: false };
}

export async function logout() {
  try {
    const r = await fetch(`${API_AUTH}/logout`, {
      method: "POST",
      credentials: "include",
    });
    return r.ok;
  } catch {
    return false;
  }
}
