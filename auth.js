import { login, observeAuth } from "./firebase-service.js";

const form = document.getElementById("loginForm");
const errorBox = document.getElementById("loginError");
const submitButton = form.querySelector('button[type="submit"]');

observeAuth(user => {
  if (user) location.replace("admin.html");
});

function friendlyError(error) {
  const code = error?.code || "";
  if (code.includes("invalid-credential")) return "Correo o contraseña incorrectos.";
  if (code.includes("too-many-requests")) return "Demasiados intentos. Espera unos minutos e inténtalo nuevamente.";
  if (code.includes("network-request-failed")) return "No se pudo conectar con Firebase. Revisa tu conexión.";
  if (code.includes("user-disabled")) return "Este usuario fue desactivado.";
  return "No se pudo iniciar sesión. Verifica tus datos e inténtalo nuevamente.";
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  errorBox.textContent = "";
  submitButton.disabled = true;
  submitButton.textContent = "Verificando acceso…";

  try {
    await login(
      document.getElementById("email").value,
      document.getElementById("password").value
    );
    location.replace("admin.html");
  } catch (error) {
    console.error(error);
    errorBox.textContent = friendlyError(error);
    submitButton.disabled = false;
    submitButton.textContent = "Ingresar de forma segura";
  }
});
