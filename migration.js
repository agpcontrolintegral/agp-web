import { requireAuth, loadWorkspace, saveWorkspace } from "./firebase-service.js";

const status = document.getElementById("migrationStatus");
const button = document.getElementById("migrateButton");
const preview = document.getElementById("migrationPreview");
const LOCAL_KEY = "agp-erp-v3-data";

await requireAuth("login.html");

function localData() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "null"); }
  catch { return null; }
}

function summary(data) {
  if (!data) return "No se encontraron datos locales.";
  return Object.entries(data)
    .filter(([, value]) => Array.isArray(value))
    .map(([key, value]) => `${key}: ${value.length}`)
    .join("\n");
}

preview.textContent = summary(localData());

button.addEventListener("click", async () => {
  const data = localData();
  if (!data) {
    status.textContent = "No hay información local para migrar.";
    return;
  }

  if (!confirm("Esta acción reemplazará el estado actual de Firebase con los datos locales. ¿Continuar?")) return;

  button.disabled = true;
  status.textContent = "Migrando información…";

  try {
    const backup = await loadWorkspace();
    if (backup) localStorage.setItem("agp-firebase-backup-before-migration", JSON.stringify(backup));
    await saveWorkspace(data);
    status.textContent = "Migración finalizada correctamente.";
  } catch (error) {
    console.error(error);
    status.textContent = "No se pudo completar la migración. Revisa las reglas de Firestore.";
  } finally {
    button.disabled = false;
  }
});
