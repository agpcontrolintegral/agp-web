import {
  requireAuth,
  logout,
  ensureUserProfile,
  saveWorkspace,
  subscribeWorkspace,
  subscribePublicLeads,
  deletePublicLead
} from "./firebase-service.js";

const user = await requireAuth("login.html");
await ensureUserProfile(user);

window.AGPCloud = {
  user,
  saveWorkspace,
  subscribeWorkspace,
  subscribePublicLeads,
  deletePublicLead,
  logout
};

document.documentElement.dataset.firebaseReady = "true";

const pricing = document.createElement("script");
pricing.src = "pricing-engine.js?v=3.0.1";
pricing.onload = () => {
  const admin = document.createElement("script");
  admin.src = "admin.js?v=3.0.1";
  document.body.appendChild(admin);
};
document.body.appendChild(pricing);
