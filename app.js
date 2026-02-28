const cfgWarn = document.getElementById("configWarning");
const authView = document.getElementById("authView");
const dashView = document.getElementById("dashboardView");
const loginForm = document.getElementById("loginForm");
const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const signUpBtn = document.getElementById("signUpBtn");
const authErr = document.getElementById("authError");
const logoutBtn = document.getElementById("logoutBtn");
const reloadBtn = document.getElementById("reloadBtn");
const genKeyBtn = document.getElementById("genKeyBtn");
const insertBtn = document.getElementById("insertBtn");
const newKeyEl = document.getElementById("newKey");
const newExpiryEl = document.getElementById("newExpiry");
const newActiveEl = document.getElementById("newActive");
const insertMsg = document.getElementById("insertMsg");
const loadMsg = document.getElementById("loadMsg");
const tbody = document.getElementById("licensesBody");

const supabase = window.supabase.createClient(
  "https://whhpiweaonnarrktiaqb.supabase.co",
  "sb_publishable_yBIw95BY3FevRkAPSjHjHw_V86TYPXl"
);

let hasSession = false;

function setView(auth) {
  hasSession = !!auth;
  if (!supabase) {
    authView.classList.remove("hidden");
    dashView.classList.add("hidden");
    return;
  }
  if (auth) {
    authView.classList.add("hidden");
    dashView.classList.remove("hidden");
  } else {
    authView.classList.remove("hidden");
    dashView.classList.add("hidden");
  }
}

function syncRoute() {
  const target = hasSession ? "#dashboard" : "#login";
  if (location.hash !== target) location.hash = target;
}

function fmtDateInput(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDate(v) {
  if (!v) return null;
  const t = new Date(v);
  if (isNaN(t.getTime())) return null;
  return t;
}

function randKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += chars[bytes[i] % chars.length];
  }
  return `SOVEMENT-${out}`;
}

async function signIn(email, password) {
  authErr.textContent = "";
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) authErr.textContent = error.message;
}

async function signUp(email, password) {
  authErr.textContent = "";
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) authErr.textContent = error.message;
}

async function loadLicenses() {
  loadMsg.textContent = "Loading…";
  tbody.innerHTML = "";
  const { data, error } = await supabase.from("licenses").select("*").order("created_at", { ascending: false });
  if (error) {
    loadMsg.textContent = error.message;
    return;
  }
  loadMsg.textContent = data.length ? "" : "No licenses found.";
  for (const row of data) {
    const tr = document.createElement("tr");
    const keyTd = document.createElement("td");
    keyTd.textContent = row.key || row.license_key || "";
    const expiryTd = document.createElement("td");
    const expiryInput = document.createElement("input");
    expiryInput.type = "date";
    if (row.expiry_date) {
      const d = new Date(row.expiry_date);
      if (!isNaN(d.getTime())) expiryInput.value = fmtDateInput(d);
    }
    expiryTd.appendChild(expiryInput);
    const activeTd = document.createElement("td");
    const activeChk = document.createElement("input");
    activeChk.type = "checkbox";
    activeChk.checked = !!row.is_active;
    activeTd.appendChild(activeChk);
    const actionsTd = document.createElement("td");
    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save";
    actionsTd.appendChild(saveBtn);
    tr.appendChild(keyTd);
    tr.appendChild(expiryTd);
    tr.appendChild(activeTd);
    tr.appendChild(actionsTd);
    tbody.appendChild(tr);

    activeChk.addEventListener("change", async () => {
      const { error } = await supabase.from("licenses").update({ is_active: activeChk.checked }).eq("id", row.id);
      if (error) loadMsg.textContent = error.message; else loadMsg.textContent = "";
    });
    saveBtn.addEventListener("click", async () => {
      const val = expiryInput.value || null;
      const { error } = await supabase.from("licenses").update({ expiry_date: val }).eq("id", row.id);
      if (error) loadMsg.textContent = error.message; else loadMsg.textContent = "Saved";
      setTimeout(()=>{loadMsg.textContent="";},1200);
    });
  }
}

async function insertLicense() {
  insertMsg.textContent = "";
  const key = newKeyEl.value.trim();
  const exp = newExpiryEl.value || null;
  const active = newActiveEl.checked;
  if (!key) {
    insertMsg.textContent = "Key is required.";
    return;
  }
  const payload = { key, expiry_date: exp, is_active: active };
  const { error } = await supabase.from("licenses").insert([payload]);
  if (error) {
    insertMsg.textContent = error.message;
    return;
  }
  newKeyEl.value = "";
  newExpiryEl.value = "";
  newActiveEl.checked = true;
  insertMsg.textContent = "Inserted";
  await loadLicenses();
  setTimeout(()=>{insertMsg.textContent="";},1200);
}

function hookAuth() {
  if (!supabase) return;
  supabase.auth.getSession().then(({ data }) => {
    setView(!!data.session);
    syncRoute();
    if (data.session) loadLicenses();
  });
  supabase.auth.onAuthStateChange(async (_e, session) => {
    setView(!!session);
    syncRoute();
    if (session) loadLicenses();
  });
}

if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!supabase) return;
    signIn(emailEl.value, passEl.value);
  });
}
if (signUpBtn) {
  signUpBtn.addEventListener("click", () => {
    if (!supabase) return;
    signUp(emailEl.value, passEl.value);
  });
}
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  });
}
if (reloadBtn) {
  reloadBtn.addEventListener("click", () => {
    if (!supabase) return;
    loadLicenses();
  });
}
if (genKeyBtn) {
  genKeyBtn.addEventListener("click", () => {
    newKeyEl.value = randKey();
  });
}
if (insertBtn) {
  insertBtn.addEventListener("click", () => {
    if (!supabase) return;
    insertLicense();
  });
}

hookAuth();

if (!location.hash) {
  syncRoute();
}
window.addEventListener("hashchange", () => {
  if (location.hash === "#dashboard" && !hasSession) {
    setView(false);
    syncRoute();
  } else if (location.hash === "#login" && hasSession) {
    setView(true);
    syncRoute();
  }
});
