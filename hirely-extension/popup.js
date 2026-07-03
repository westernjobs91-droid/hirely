function sendMsg(msg) {
  return new Promise((resolve) => chrome.runtime.sendMessage(msg, resolve));
}

const loggedOutEl = document.getElementById("loggedOut");
const loggedInEl = document.getElementById("loggedIn");

async function init() {
  const { session } = await sendMsg({ type: "HIRELY_GET_SESSION" });
  if (session) {
    loggedOutEl.style.display = "none";
    loggedInEl.style.display = "block";
    document.getElementById("userEmail").textContent = session.user.email;
  } else {
    loggedOutEl.style.display = "block";
    loggedInEl.style.display = "none";
  }
}

document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const statusEl = document.getElementById("loginStatus");
  const btn = document.getElementById("loginBtn");

  if (!email || !password) {
    statusEl.textContent = "Enter your email and password.";
    statusEl.className = "status show error";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Logging in…";
  const res = await sendMsg({ type: "HIRELY_LOGIN", email, password });
  btn.disabled = false;
  btn.textContent = "Log In";

  if (res.ok) {
    init();
  } else {
    statusEl.textContent = res.error || "Login failed.";
    statusEl.className = "status show error";
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await sendMsg({ type: "HIRELY_LOGOUT" });
  init();
});

document.getElementById("dashboardBtn").addEventListener("click", () => {
  chrome.tabs.create({ url: `${HIRELY_CONFIG.API_BASE}/` });
});

document.getElementById("signupLink").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: `${HIRELY_CONFIG.API_BASE}/signup` });
});

init();
