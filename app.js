
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCAoPpo30vk_aWjLRJPm1D55U10r25hr00",
  authDomain: "planejaeducaaaa.firebaseapp.com",
  projectId: "planejaeducaaaa",
  storageBucket: "planejaeducaaaa.firebasestorage.app",
  messagingSenderId: "619532705806",
  appId: "1:619532705806:web:dcb28fc66b8675298e1c5f",
  measurementId: "G-FJFKHN7W8J"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_UID = "BDmAQWzHytWVucAsuy4JiCOlIgB2";

const $ = (id) => document.getElementById(id);
const loginForm = $("loginForm");
const signupForm = $("signupForm");
const alertBox = $("alertBox");
const loading = $("loading");
const authCard = $("authCard");

function showAlert(message, type = "error") {
  alertBox.textContent = message;
  alertBox.className = `alert ${type} show`;
}
function hideAlert() {
  alertBox.className = "alert";
  alertBox.textContent = "";
}
function setLoading(on) {
  loading.classList.toggle("show", on);
  document.querySelectorAll("button").forEach(b => b.disabled = on);
}
function friendlyError(error) {
  const code = error?.code || "";
  const map = {
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/invalid-login-credentials": "E-mail ou senha incorretos.",
    "auth/user-not-found": "Não encontramos uma conta com este e-mail.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/email-already-in-use": "Este e-mail já possui uma conta.",
    "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
    "auth/invalid-email": "Digite um e-mail válido.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.",
    "auth/popup-closed-by-user": "A janela do Google foi fechada.",
    "auth/unauthorized-domain": "Este domínio não está autorizado no Firebase Authentication.",
    "auth/network-request-failed": "Falha de conexão. Verifique sua internet.",
    "auth/popup-blocked": "O navegador bloqueou a janela de login do Google."
  };
  return map[code] || `Firebase: ${error?.message || "ocorreu um erro inesperado."}`;
}

async function checkAdmin(uid) {
  if (uid === ADMIN_UID) return true;
  try {
    const snap = await getDoc(doc(db, "admin", uid));
    return snap.exists() && snap.data()?.role === "admin";
  } catch (error) {
    console.error("Falha ao consultar /admin/UID:", error);
    throw error;
  }
}

async function routeUser(user) {
  if (!user) return;
  try {
    const isAdmin = await checkAdmin(user.uid);
    if (isAdmin) {
      window.location.href = "admin.html";
      return;
    }
    // Keep normal users in the app. Replace with your real dashboard later.
    window.location.href = "dashboard.html";
  } catch (error) {
    showAlert(`Login realizado, mas houve um problema ao consultar o Firestore: ${error.message}`, "error");
  }
}

$("demoBtn").addEventListener("click", () => {
  sessionStorage.setItem("planeja_demo", "1");
  window.location.href = "dashboard.html?demo=1";
});

$("adminBtn").addEventListener("click", async () => {
  hideAlert();
  const user = auth.currentUser;
  if (!user) {
    showAlert("Entre com sua conta para acessar a Área Admin.", "info");
    $("email").focus();
    return;
  }
  setLoading(true);
  try {
    if (await checkAdmin(user.uid)) {
      window.location.href = "admin.html";
    } else {
      showAlert("Sua conta não possui permissão de administrador.", "error");
    }
  } catch (error) {
    showAlert(`Erro ao consultar a Área Admin: ${error.message}`, "error");
  } finally {
    setLoading(false);
  }
});

$("tabLogin").addEventListener("click", () => {
  $("tabLogin").classList.add("active");
  $("tabSignup").classList.remove("active");
  loginForm.classList.remove("hidden");
  signupForm.classList.add("hidden");
  hideAlert();
});

$("tabSignup").addEventListener("click", () => {
  $("tabSignup").classList.add("active");
  $("tabLogin").classList.remove("active");
  signupForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
  hideAlert();
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();
  setLoading(true);
  try {
    const email = $("email").value.trim();
    const password = $("password").value;
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await routeUser(cred.user);
  } catch (error) {
    console.error(error);
    showAlert(friendlyError(error));
  } finally {
    setLoading(false);
  }
});

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();
  const name = $("name").value.trim();
  const email = $("signupEmail").value.trim();
  const password = $("signupPassword").value;
  const confirm = $("confirmPassword").value;

  if (password !== confirm) {
    showAlert("As senhas não coincidem.");
    return;
  }
  setLoading(true);
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "usuarios", cred.user.uid), {
      uid: cred.user.uid,
      nome: name,
      email,
      role: "professora",
      criadoEm: serverTimestamp()
    });
    showAlert("Conta criada com sucesso. Redirecionando...", "success");
    setTimeout(() => routeUser(cred.user), 500);
  } catch (error) {
    console.error(error);
    showAlert(friendlyError(error));
  } finally {
    setLoading(false);
  }
});

$("forgotPassword").addEventListener("click", async () => {
  const email = $("email").value.trim();
  if (!email) {
    showAlert("Digite seu e-mail para receber o link de redefinição.", "info");
    $("email").focus();
    return;
  }
  setLoading(true);
  try {
    await sendPasswordResetEmail(auth, email);
    showAlert("Enviamos um link de redefinição para seu e-mail.", "success");
  } catch (error) {
    showAlert(friendlyError(error));
  } finally {
    setLoading(false);
  }
});

$("googleBtn").addEventListener("click", async () => {
  setLoading(true);
  hideAlert();
  try {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    await setDoc(doc(db, "usuarios", cred.user.uid), {
      uid: cred.user.uid,
      nome: cred.user.displayName || "",
      email: cred.user.email || "",
      role: cred.user.uid === ADMIN_UID ? "admin" : "professora",
      atualizadoEm: serverTimestamp()
    }, { merge: true });
    await routeUser(cred.user);
  } catch (error) {
    console.error(error);
    showAlert(friendlyError(error));
  } finally {
    setLoading(false);
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    $("authStatus").textContent = `Conectado como ${user.email || "usuário"}`;
  } else {
    $("authStatus").textContent = "Use sua conta cadastrada no Firebase.";
  }
});
