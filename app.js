import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  updateProfile, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp,
  doc, deleteDoc, getDoc, setDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const DEMO_KEY = "planeja_demo_plans";
let demo = false;
let plans = [];

const $ = id => document.getElementById(id);
const fields = ["instituicao","etapa","turma","disciplina","professor","data","duracao","unidade","tema","objeto","habilidades","objetivoGeral","objetivosEspecificos","conteudos","metodologia","desenvolvimento","recursos","atividades","avaliacao","inclusao","referencias"];

let app, auth, db;
const firebaseReady = firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("COLOQUE_");
// Personalização por conta.
// Para produção, troque este e-mail pelo seu e-mail administrativo.
// A segurança definitiva deve ser reforçada também nas regras do Firestore.
// O administrador é identificado pelo documento Firestore: /admin/{UID} com role: "admin".
// O UID deve ser o mesmo exibido em Firebase Authentication > Users.
const ADMIN_COLLECTION = "admin";
// Informe aqui o WhatsApp que receberá os pedidos de acesso.
// Use somente números, com código do país e DDD. Ex.: 5549999999999
const WHATSAPP_NUMBER = "5549999674823";
const STAGES = ["Educação Infantil","Pré I","Pré II","1º ano","2º ano","3º ano","4º ano","5º ano"];
const SUBJECTS = ["Português","Matemática","Ciências","História","Geografia","Ensino Religioso","Arte","Educação Física","Projetos interdisciplinares"];
const FEATURES = [
  ["criarPlano","Criar planos de aula"],
  ["bncc","Banco de habilidades BNCC"],
  ["planejamento","Planejamento semanal"],
  ["pdf","Impressão e PDF"],
  ["modelos","Modelos rápidos de aula"]
];
let currentProfile = null;
let allTeacherProfiles = [];


if (firebaseReady) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

function showToast(msg){
  $("toast").textContent = msg;
  $("toast").classList.add("show");
  setTimeout(()=>$("toast").classList.remove("show"),2400);
}

async function openApp(userName="Professor(a)"){
  $("loginScreen").classList.add("hidden");
  $("sideUserName").textContent = userName;
  $("sideAvatar").textContent = (userName || "P").trim().charAt(0).toUpperCase();

  if(firebaseReady && auth.currentUser){
    currentProfile = await loadMyProfile(auth.currentUser);
  } else {
    currentProfile = {
      uid:"demo", name:userName, role:"admin", demo:true,
      allowedStages:[...STAGES], allowedSubjects:[...SUBJECTS],
      features:Object.fromEntries(FEATURES.map(x=>[x[0],true])),
      institution:"escola", accessStatus:"approved", paymentStatus:"exempt"
    };
  }

  if(!isAdmin() && currentProfile.accessStatus !== "approved"){
    showPaymentScreen();
    return;
  }

  $("paymentScreen").classList.add("hidden");
  $("app").classList.remove("hidden");
  $("welcomeText").textContent = `Olá, ${userName}`;
  applyPermissions();
  refreshPlans();
}

if (firebaseReady) {
  onAuthStateChanged(auth, user => {
    if (user) openApp(user.displayName || user.email?.split("@")[0] || "Professor(a)");
  });
}



function showDemoNotice(){
  showToast("Modo demonstração: este plano não pode ser salvo como plano real.");
  const msg = document.querySelector("#demoNotice");
  if(msg){
    msg.classList.remove("hidden");
    setTimeout(()=>msg.classList.add("hidden"),5000);
  }
}

function getWhatsAppUrl(){
  const number = WHATSAPP_NUMBER.replace(/\D/g,"");
  if(!number || number.length < 10) return null;
  const name = currentProfile?.name || auth?.currentUser?.email || "Professora";
  const msg = `Olá! Criei minha conta no PlanejaEdu e quero solicitar a liberação do acesso. Nome: ${name}. Estou enviando o comprovante do PIX de R$ 10,00.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
}
function showPaymentScreen(){
  $("app").classList.add("hidden");
  $("paymentScreen").classList.remove("hidden");
  const url=getWhatsAppUrl();
  const btn=$("whatsappRequestBtn");
  if(url){
    btn.href=url;
    btn.classList.remove("disabled");
  }else{
    btn.href="#";
    btn.classList.add("disabled");
    btn.onclick=(e)=>{e.preventDefault();showToast("O WhatsApp do administrador ainda não foi configurado.");};
  }
  const status=$("paymentStatus");
  const exempt=currentProfile?.paymentStatus==="exempt";
  const requested=currentProfile?.paymentRequested===true;
  if(exempt){
    status.className="payment-status approved";
    status.innerHTML="<b>✓ Acesso liberado pelo administrador</b><span>Você não precisa realizar o pagamento. Clique em verificar acesso.</span>";
  }else if(currentProfile?.accessStatus==="approved"){
    status.className="payment-status approved";
    status.innerHTML="<b>✓ Acesso liberado</b><span>Sua conta já está autorizada a entrar na plataforma.</span>";
  }else if(requested){
    status.className="payment-status requested";
    status.innerHTML="<b>📩 Pedido enviado</b><span>Seu pedido está aguardando a análise do administrador.</span>";
  }else{
    status.className="payment-status pending";
    status.innerHTML="<b>⏳ Aguardando liberação</b><span>Faça o PIX e envie o pedido pelo WhatsApp para solicitar a liberação.</span>";
  }
}
$("whatsappRequestBtn")?.addEventListener("click", async e=>{
  if($("whatsappRequestBtn").classList.contains("disabled")) return;
  if(firebaseReady && auth.currentUser){
    try{
      await updateDoc(doc(db,"usuarios",auth.currentUser.uid),{
        paymentRequested:true, paymentRequestedAt:serverTimestamp()
      });
      currentProfile.paymentRequested=true;
      showPaymentScreen();
    }catch(err){ console.warn(err); }
  }
});
$("paymentRefreshBtn")?.addEventListener("click", async ()=>{
  if(firebaseReady && auth.currentUser){
    currentProfile=await loadMyProfile(auth.currentUser);
    if(currentProfile.accessStatus==="approved" || isAdmin()){
      showToast("Acesso liberado!");
      openApp(currentProfile.name||auth.currentUser.email?.split("@")[0]||"Professor(a)");
    }else{
      showPaymentScreen();
      showToast("Ainda aguardando a liberação do administrador.");
    }
  }
});
$("paymentLogoutBtn")?.addEventListener("click", async ()=>{
  if(firebaseReady && auth.currentUser) await signOut(auth);
  $("paymentScreen").classList.add("hidden");
  $("loginScreen").classList.remove("hidden");
});

async function loadAccessRequests(){
  if(!isAdmin() || !firebaseReady) return;
  const snap=await getDocs(collection(db,"usuarios"));
  const list=snap.docs.map(d=>({uid:d.id,...d.data()}))
    .filter(p=>p.role!=="admin" && (p.paymentRequested || p.accessStatus==="pending" || p.paymentStatus==="exempt"));
  const box=$("accessRequestList");
  if(!list.length){
    box.innerHTML='<div class="empty-admin">Nenhum pedido pendente.</div>'; return;
  }
  box.innerHTML=list.map(p=>{
    const state=p.accessStatus==="approved" ? "Aprovado" : p.paymentStatus==="exempt" ? "Cortesia" : "Pendente";
    return `<div class="access-row">
      <div class="access-person"><span class="teacher-avatar">${esc((p.name||p.email||"P").charAt(0).toUpperCase())}</span>
        <div><strong>${esc(p.name||"Sem nome")}</strong><small>${esc(p.email||"")}</small></div>
      </div>
      <span class="access-state ${state==="Aprovado"?"ok":state==="Cortesia"?"gift":"wait"}">${state}</span>
      <div class="access-actions">
        <button class="mini-action approve" data-access-action="approve" data-uid="${esc(p.uid)}">Liberar</button>
        <button class="mini-action gift" data-access-action="gift" data-uid="${esc(p.uid)}">Cortesia</button>
        <button class="mini-action block" data-access-action="block" data-uid="${esc(p.uid)}">Bloquear</button>
      </div>
    </div>`;
  }).join("");
  box.querySelectorAll("[data-access-action]").forEach(b=>b.onclick=()=>handleAccessAction(b.dataset.uid,b.dataset.accessAction));
}
async function handleAccessAction(uid,action){
  if(!isAdmin()) return;
  const ref=doc(db,"usuarios",uid);
  const data = action==="approve"
    ? {accessStatus:"approved",paymentStatus:"paid",approvedAt:serverTimestamp()}
    : action==="gift"
      ? {accessStatus:"approved",paymentStatus:"exempt",approvedAt:serverTimestamp()}
      : {accessStatus:"pending",paymentStatus:"pending",approvedAt:null};
  try{
    await updateDoc(ref,data);
    await loadAccessRequests();
    showToast(action==="approve"?"Acesso liberado.":action==="gift"?"Cortesia liberada.":"Acesso bloqueado.");
  }catch(err){showToast("Erro: "+err.message);}
}

async function loadMyProfile(user){
  let profile = {
    uid:user.uid,
    name:user.displayName||user.email?.split("@")[0]||"Professor(a)",
    email:user.email,
    role:"teacher",
    allowedStages:[],allowedSubjects:[],features:{},
    accessStatus:"pending",paymentStatus:"pending",paymentRequested:false
  };

  if(!firebaseReady) return profile;

  try{
    // Primeiro verifica o documento /admin/{UID}.
    // Se role === "admin", esta conta entra como administradora.
    const adminSnap = await getDoc(doc(db, ADMIN_COLLECTION, user.uid));
    if(adminSnap.exists() && adminSnap.data()?.role === "admin"){
      profile.role = "admin";
      profile.accessStatus = "approved";
      profile.paymentStatus = "exempt";
    }
  }catch(err){
    console.warn("Não foi possível verificar o perfil de administrador", err);
  }

  try{
    const snap = await getDoc(doc(db,"usuarios",user.uid));
    if(snap.exists()) profile = {...profile, ...snap.data(), uid:user.uid};
  }catch(err){
    console.warn("Perfil de professora não carregado",err);
  }

  // O documento /admin/{UID} tem prioridade sobre role salvo em /usuarios/{UID}.
  try{
    const adminSnap = await getDoc(doc(db, ADMIN_COLLECTION, user.uid));
    if(adminSnap.exists() && adminSnap.data()?.role === "admin"){
      profile.role = "admin";
      profile.accessStatus = "approved";
      profile.paymentStatus = "exempt";
    }
  }catch(err){
    console.warn("Verificação final de admin falhou",err);
  }
  return profile;
}
function isAdmin(){
  return currentProfile?.role === "admin";
}

function applyPermissions(){
  const admin = isAdmin();
  $("adminMenuWrap").classList.toggle("hidden",!admin);

  const stages = currentProfile?.allowedStages || [];
  const subjects = currentProfile?.allowedSubjects || [];
  const features = currentProfile?.features || {};

  // Filter stage and subject selectors for each professor.
  const etapa = $("etapa"), disciplina = $("disciplina");
  if(etapa && !admin){
    [...etapa.options].forEach((o,i)=>{ if(i>0) o.hidden = !stages.includes(o.value); });
  }
  if(disciplina && !admin){
    [...disciplina.options].forEach((o,i)=>{ if(i>0) o.hidden = !subjects.includes(o.value); });
  }

  // Hide modules that the admin did not grant.
  document.querySelectorAll('[data-page="bncc"]').forEach(el=>el.closest("nav")?.classList.toggle("hidden",!admin && features.bncc===false));
  document.querySelectorAll('[data-page="calendario"]').forEach(el=>el.closest("nav")?.classList.toggle("hidden",!admin && features.planejamento===false));
  $("headerNewBtn").classList.toggle("hidden",!admin && features.criarPlano===false);
  $("heroNewBtn").classList.toggle("hidden",!admin && features.criarPlano===false);

  if(!admin && features.criarPlano===false) {
    showToast("Sua conta está aguardando a liberação de áreas pelo administrador.");
  }
}

function buildChecks(containerId, items, selected, type){
  const box=$(containerId);
  box.innerHTML=items.map(item=>{
    const value=Array.isArray(item)?item[0]:item;
    const label=Array.isArray(item)?item[1]:item;
    const checked=type==="feature" ? !!(selected||{})[value] : (selected||[]).includes(value);
    return `<label class="check-chip"><input type="checkbox" data-check-type="${type}" value="${esc(value)}" ${checked?"checked":""}><span>${esc(label)}</span></label>`;
  }).join("");
}
function getChecks(containerId,type){
  return [...document.querySelectorAll(`#${containerId} input[data-check-type="${type}"]`)]
    .filter(x=>x.checked).map(x=>x.value);
}
function getFeatureChecks(){
  const obj={};
  document.querySelectorAll('#featureChecks input[data-check-type="feature"]').forEach(x=>obj[x.value]=x.checked);
  return obj;
}

async function loadTeacherProfiles(){
  if(!isAdmin() || !firebaseReady) return;
  const snap=await getDocs(collection(db,"usuarios"));
  allTeacherProfiles=snap.docs.map(d=>({uid:d.id,...d.data()})).filter(p=>p.role!=="admin");
  renderTeacherList();
}
function renderTeacherList(){
  const box=$("teacherList");
  if(!allTeacherProfiles.length){
    box.innerHTML='<div class="empty-admin">Nenhuma professora cadastrada ainda.</div>'; return;
  }
  box.innerHTML=allTeacherProfiles.map(p=>`
    <button class="teacher-row" data-teacher-id="${esc(p.uid)}">
      <span class="teacher-avatar">${esc((p.name||p.email||"P").charAt(0).toUpperCase())}</span>
      <span class="teacher-info"><strong>${esc(p.name||"Sem nome")}</strong><small>${esc(p.email||"")}</small></span>
      <span class="teacher-status">${(p.allowedStages?.length||0)+(p.allowedSubjects?.length||0)>0?"Personalizada":"Aguardando"}</span>
    </button>`).join("");
  box.querySelectorAll(".teacher-row").forEach(b=>b.onclick=()=>selectTeacher(b.dataset.teacherId));
}
function selectTeacher(uid){
  const p=allTeacherProfiles.find(x=>x.uid===uid); if(!p)return;
  $("selectedTeacherId").value=uid;
  $("selectedTeacherLabel").textContent=p.name||p.email||"Conta";
  $("adminTeacherName").value=p.name||"";
  $("adminTeacherEmail").value=p.email||"";
  $("adminInstitution").value=p.institution||"escola";
  $("adminNotes").value=p.notes||"";
  buildChecks("stageChecks",STAGES,p.allowedStages||[],"stage");
  buildChecks("subjectChecks",SUBJECTS,p.allowedSubjects||[],"subject");
  buildChecks("featureChecks",FEATURES,p.features||{},"feature");
}
$("refreshTeachersBtn")?.addEventListener("click",loadTeacherProfiles);
$("refreshAccessBtn")?.addEventListener("click",loadAccessRequests);
$("teacherAccessForm")?.addEventListener("submit",async e=>{
  e.preventDefault();
  if(!isAdmin()){showToast("Acesso administrativo não autorizado.");return;}
  const uid=$("selectedTeacherId").value;
  if(!uid){showToast("Selecione uma professora.");return;}
  try{
    await updateDoc(doc(db,"usuarios",uid),{
      institution:$("adminInstitution").value,
      allowedStages:getChecks("stageChecks","stage"),
      allowedSubjects:getChecks("subjectChecks","subject"),
      features:getFeatureChecks(),
      notes:$("adminNotes").value.trim(),
      updatedAt:serverTimestamp()
    });
    showToast("Personalização salva com sucesso!");
    await loadTeacherProfiles();
  }catch(err){showToast("Erro ao salvar: "+err.message);}
});

$("loginForm").addEventListener("submit", async e=>{
  e.preventDefault();
  if(!firebaseReady){
    showToast("Firebase ainda não foi configurado. Use o modo demonstração ou preencha firebase-config.js.");
    return;
  }
  try {
    await signInWithEmailAndPassword(auth, $("email").value, $("password").value);
  } catch(err) {
    showToast("Não foi possível entrar: " + (err.code || err.message));
  }
});

// Alternância entre login e criação de conta
function switchAuth(mode){
  const login = mode === "login";
  $("loginPanel").classList.toggle("hidden", !login);
  $("signupPanel").classList.toggle("hidden", login);
  $("tabLogin").classList.toggle("active", login);
  $("tabSignup").classList.toggle("active", !login);
}
$("tabLogin").addEventListener("click", ()=>switchAuth("login"));
$("tabSignup").addEventListener("click", ()=>switchAuth("signup"));

$("signupForm").addEventListener("submit", async e=>{
  e.preventDefault();
  const name = $("signupName").value.trim();
  const email = $("signupEmail").value.trim();
  const password = $("signupPassword").value;
  const confirm = $("signupPassword2").value;

  if(password !== confirm){
    showToast("As senhas não são iguais.");
    return;
  }
  if(password.length < 6){
    showToast("A senha precisa ter pelo menos 6 caracteres.");
    return;
  }
  if(!firebaseReady){
    showToast("Configure o Firebase para criar contas.");
    return;
  }

  try{
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, {displayName:name});

    const defaultProfile = {
      uid: cred.user.uid,
      name,
      email,
      role: "teacher",
      institution: "escola",
      allowedStages: [],
      allowedSubjects: [],
      features: {criarPlano:false,bncc:false,planejamento:false,pdf:false,modelos:false},
      accessStatus: "pending",
      paymentStatus: "pending",
      paymentRequested: false,
      notes: "",
      createdAt: serverTimestamp()
    };
    await setDoc(doc(db,"usuarios",cred.user.uid), defaultProfile);
    showToast("Conta criada! O administrador precisa liberar suas áreas.");
  }catch(err){
    const messages = {
      "auth/email-already-in-use":"Este e-mail já possui uma conta.",
      "auth/invalid-email":"Digite um e-mail válido.",
      "auth/weak-password":"A senha é muito fraca.",
      "auth/operation-not-allowed":"Ative o login por e-mail e senha no Firebase."
    };
    showToast(messages[err.code] || "Não foi possível criar a conta.");
  }
});

$("demoBtn").addEventListener("click", ()=>{
  demo = true;
  openApp("Modo demonstração");
});

$("logoutBtn").addEventListener("click", async ()=>{
  if(firebaseReady && !demo) await signOut(auth);
  demo=false;
  $("app").classList.add("hidden");
  $("loginScreen").classList.remove("hidden");
});

document.querySelectorAll(".nav-btn[data-page]").forEach(btn=>{
  btn.addEventListener("click", ()=>goPage(btn.dataset.page));
});
$("headerNewBtn").onclick=()=>goPage("novo");
$("heroNewBtn").onclick=()=>goPage("novo");
document.querySelector(".text-btn").onclick=()=>goPage("planos");

function goPage(page){
  document.querySelectorAll(".page").forEach(p=>p.classList.add("hidden"));
  $("page-"+page).classList.remove("hidden");
  document.querySelectorAll(".nav-btn[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  const titles={dashboard:"Início",novo:"Novo plano",planos:"Meus planos",calendario:"Planejamento semanal",bncc:"BNCC"};
  $("pageTitle").textContent=titles[page]||"PlanejaEdu";
  if(page==="planos") renderPlans();
  if(page==="calendario") renderCalendar();
  if(page==="admin"){ loadTeacherProfiles(); loadAccessRequests(); }
}

$("instituicao").addEventListener("change", updateHeaderPreview);
$("tema").addEventListener("input", updateMini);
$("etapa").addEventListener("change", updateMini);
$("disciplina").addEventListener("change", updateMini);
$("objetivoGeral").addEventListener("input", updateMini);
$("metodologia").addEventListener("input", updateMini);

function headerAsset(inst){
  if(inst==="creche") return "assets/cabecalho-creche.png";
  if(inst==="escola") return "assets/cabecalho-escola.png";
  if(inst==="integral") return "assets/cabecalho-integral.png";
  return "";
}
function updateHeaderPreview(){
  const inst=$("instituicao").value;
  $("previewInstitution").textContent =
    inst==="creche" ? "Creche" :
    inst==="escola" ? "Escola Irmã Blandina" :
    inst==="integral" ? "Educação em Tempo Integral" : "Selecione a instituição";
  const src=headerAsset(inst);
  $("miniHeader").innerHTML=src ? `<img src="${src}" alt="Cabeçalho">` : "O cabeçalho aparecerá aqui.";
}
function updateMini(){
  $("miniTema").textContent=$("tema").value||"Tema da aula";
  $("miniMeta").textContent=`${$("etapa").value||"Ano/Série"} • ${$("disciplina").value||"Componente"}`;
  $("miniObjetivo").textContent=$("objetivoGeral").value||"—";
  $("miniMetodologia").textContent=$("metodologia").value||"—";
}

const models = {
  leitura:{
    tema:"Leitura e interpretação de texto",
    objeto:"Estratégias de leitura; compreensão global e localização de informações.",
    habilidades:"Registrar a habilidade da BNCC correspondente ao ano/série.",
    objetivoGeral:"Desenvolver a compreensão leitora e a capacidade de localizar e interpretar informações.",
    objetivosEspecificos:"• Ler com atenção.\n• Identificar informações explícitas.\n• Compartilhar interpretações.",
    conteudos:"Leitura, compreensão, vocabulário e interpretação.",
    metodologia:"Leitura compartilhada, conversa orientada e resolução de questões.",
    desenvolvimento:"1. Acolhida e levantamento de conhecimentos prévios.\n2. Leitura do texto.\n3. Discussão coletiva.\n4. Atividade de interpretação.\n5. Socialização.",
    recursos:"Texto impresso, quadro, lápis e caderno.",
    atividades:"Questões de compreensão e produção de respostas.",
    avaliacao:"Participação, compreensão do texto e qualidade das respostas.",
    inclusao:"Oferecer leitura mediada, fonte ampliada e apoio individual quando necessário."
  },
  fracao:{
    tema:"Frações no cotidiano",
    objeto:"Representação de partes de um todo.",
    habilidades:"Registrar a habilidade da BNCC correspondente ao ano/série.",
    objetivoGeral:"Compreender frações por meio de situações concretas e representações visuais.",
    objetivosEspecificos:"• Identificar partes de um inteiro.\n• Representar frações.\n• Relacionar frações a situações cotidianas.",
    conteudos:"Frações, numerador, denominador e representação pictórica.",
    metodologia:"Exploração concreta, representação visual, resolução de situações-problema e jogo.",
    desenvolvimento:"1. Situação-problema inicial.\n2. Manipulação de representações.\n3. Registro no caderno.\n4. Desafios em duplas.\n5. Correção dialogada.",
    recursos:"Material manipulável, figuras, quadro e caderno.",
    atividades:"Representar, comparar e resolver situações com frações.",
    avaliacao:"Observação das estratégias e resolução das atividades.",
    inclusao:"Usar imagens ampliadas, materiais concretos e instruções em etapas."
  },
  ciencias:{
    tema:"Investigando o ambiente",
    objeto:"Observação, investigação e registro de fenômenos.",
    habilidades:"Registrar a habilidade da BNCC correspondente ao ano/série.",
    objetivoGeral:"Estimular a curiosidade e a investigação científica a partir da observação.",
    objetivosEspecificos:"• Formular hipóteses.\n• Observar fenômenos.\n• Registrar descobertas.",
    conteudos:"Observação, hipótese, investigação e registro.",
    metodologia:"Pergunta-problema, investigação guiada, registro e socialização.",
    desenvolvimento:"1. Pergunta disparadora.\n2. Levantamento de hipóteses.\n3. Investigação.\n4. Registro.\n5. Socialização das descobertas.",
    recursos:"Objetos do ambiente, folhas, lápis e materiais de registro.",
    atividades:"Ficha de observação e desenho/registro das descobertas.",
    avaliacao:"Participação, capacidade de observar e qualidade dos registros.",
    inclusao:"Permitir diferentes formas de registro, inclusive desenho e resposta oral."
  },
  projeto:{
    tema:"Projeto interdisciplinar",
    objeto:"Integração de conhecimentos e resolução de uma situação-problema.",
    habilidades:"Selecionar habilidades da BNCC dos componentes envolvidos.",
    objetivoGeral:"Articular diferentes áreas do conhecimento em uma experiência significativa.",
    objetivosEspecificos:"• Pesquisar.\n• Colaborar.\n• Produzir e apresentar resultados.",
    conteudos:"Conteúdos definidos de acordo com o projeto.",
    metodologia:"Aprendizagem baseada em projetos, trabalho colaborativo e produção final.",
    desenvolvimento:"1. Apresentação do desafio.\n2. Pesquisa.\n3. Planejamento das equipes.\n4. Produção.\n5. Apresentação e avaliação.",
    recursos:"Livros, internet, cartazes, materiais recicláveis e recursos digitais.",
    atividades:"Pesquisa, produção coletiva e apresentação.",
    avaliacao:"Processo, participação, colaboração e produto final.",
    inclusao:"Distribuir funções conforme as possibilidades de cada estudante e oferecer recursos acessíveis."
  }
};

document.querySelectorAll(".quick-models button").forEach(btn=>{
  btn.onclick=()=>{
    const m=models[btn.dataset.model];
    Object.entries(m).forEach(([k,v])=>{if($(k)) $(k).value=v});
    updateMini();
    showToast("Modelo preenchido. Revise e personalize.");
  };
});

$("clearBtn").onclick=()=>{
  $("planForm").reset(); updateHeaderPreview(); updateMini();
};

$("previewBtn").onclick=()=>printPlan(buildPlan(), true);

$("planForm").addEventListener("submit", async e=>{
  e.preventDefault();

  if(currentProfile?.demo === true || auth?.currentUser?.uid === "demo"){
    showDemoNotice();
    return;
  }
  if(!isAdmin() && currentProfile && currentProfile.features?.criarPlano===false){
    showToast("O administrador ainda não liberou a criação de planos para sua conta.");
    return;
  }
  const plan=buildPlan();
  if(!plan.tema){showToast("Informe o tema.");return;}
  try{
    if(demo){
      const arr=JSON.parse(localStorage.getItem(DEMO_KEY)||"[]");
      plan.id=crypto.randomUUID(); plan.criadoEm=new Date().toISOString(); arr.unshift(plan);
      localStorage.setItem(DEMO_KEY,JSON.stringify(arr));
    }else{
      await addDoc(collection(db,"planos"), {...plan, criadoEm:serverTimestamp(), uid:auth.currentUser.uid});
    }
    showToast("Plano salvo com sucesso!");
    await refreshPlans();
    printPlan(plan,true);
  }catch(err){showToast("Erro ao salvar: "+err.message)}
});

function buildPlan(){
  const p={}; fields.forEach(f=>p[f]=$(f)?.value||"");
  return p;
}

async function refreshPlans(){
  if(demo){
    plans=JSON.parse(localStorage.getItem(DEMO_KEY)||"[]");
  }else if(firebaseReady && auth.currentUser){
    const snap=await getDocs(query(collection(db,"planos"),orderBy("criadoEm","desc")));
    plans=snap.docs.map(d=>({id:d.id,...d.data()}));
  }else plans=[];
  updateStats(); renderRecent(); renderPlans(); renderCalendar();
}

function updateStats(){
  $("statPlans").textContent=plans.length;
  const month=new Date().toISOString().slice(0,7);
  $("statMonth").textContent=plans.filter(p=>(p.data||"").startsWith(month)).length;
  $("statFav").textContent=plans.filter(p=>p.favorito).length;
}

function card(p){
  const date=p.data?new Date(p.data+"T12:00:00").toLocaleDateString("pt-BR"):"Sem data";
  return `<article class="plan-card">
    <span class="tag">${esc(p.disciplina||"Plano")}</span>
    <h3>${esc(p.tema||"Sem tema")}</h3>
    <p>${esc(p.etapa||"")} ${p.turma?"• "+esc(p.turma):""}</p>
    <p>📅 ${date}</p>
    <div class="card-actions">
      <button class="icon-btn" onclick="window.viewPlan('${p.id}')">👁️</button>
      <button class="icon-btn" onclick="window.printSaved('${p.id}')">🖨️</button>
      <button class="icon-btn" onclick="window.deletePlan('${p.id}')">🗑️</button>
    </div>
  </article>`;
}
function renderRecent(){
  $("recentPlans").innerHTML=plans.slice(0,4).map(card).join("")||`<div class="plan-card"><h3>Nenhum plano ainda</h3><p>Crie seu primeiro plano para começar.</p></div>`;
}
function renderPlans(){
  const term=($("searchPlans")?.value||"").toLowerCase();
  const disc=$("filterDisc")?.value||"";
  const list=plans.filter(p=>(`${p.tema} ${p.turma} ${p.disciplina}`).toLowerCase().includes(term)&&(disc===""||p.disciplina===disc));
  const opts=[...new Set(plans.map(p=>p.disciplina).filter(Boolean))];
  if($("filterDisc")) $("filterDisc").innerHTML='<option value="">Todas as disciplinas</option>'+opts.map(x=>`<option>${esc(x)}</option>`).join("");
  $("allPlans").innerHTML=list.map(card).join("")||`<div class="plan-card"><h3>Nenhum resultado</h3><p>Altere os filtros ou crie um novo plano.</p></div>`;
}
$("searchPlans").addEventListener("input",renderPlans);
$("filterDisc").addEventListener("change",renderPlans);

window.viewPlan=(id)=>{const p=plans.find(x=>x.id===id);if(p)printPlan(p,false)};
window.printSaved=(id)=>{const p=plans.find(x=>x.id===id);if(p)printPlan(p,true)};
window.deletePlan=async(id)=>{
  if(!confirm("Excluir este plano?"))return;
  if(demo){
    plans=plans.filter(p=>p.id!==id); localStorage.setItem(DEMO_KEY,JSON.stringify(plans));
  }else await deleteDoc(doc(db,"planos",id));
  refreshPlans(); showToast("Plano excluído.");
};

function renderCalendar(){
  const days=["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
  const today=new Date(); const monday=new Date(today); const diff=(today.getDay()+6)%7; monday.setDate(today.getDate()-diff);
  $("weeklyGrid").innerHTML=Array.from({length:7},(_,i)=>{
    const d=new Date(monday);d.setDate(monday.getDate()+i); const iso=d.toISOString().slice(0,10);
    const items=plans.filter(p=>p.data===iso).map(p=>`<div class="day-item"><b>${esc(p.tema)}</b><br>${esc(p.disciplina||"")}</div>`).join("");
    return `<div class="day"><strong>${days[d.getDay()]}<br>${d.toLocaleDateString("pt-BR")}</strong>${items||"<p style='color:#9aa3b2;font-size:11px'>Sem planos</p>"}</div>`;
  }).join("");
}

const bnccSamples=[
  ["BNCC","Cadastre aqui as habilidades específicas da sua rede."],
  ["Educação Infantil","Campos de experiências e objetivos de aprendizagem devem ser associados conforme a etapa."],
  ["Anos iniciais","Use os códigos e descrições oficiais correspondentes ao ano e componente."]
];
$("bnccList").innerHTML=bnccSamples.map(x=>`<div class="bncc-item"><strong>${x[0]}</strong><div>${x[1]}</div></div>`).join("");

function printPlan(p, autoPrint){
  const src=headerAsset(p.instituicao);
  const escHtml=s=>esc(s||"").replace(/\n/g,"<br>");
  $("printArea").innerHTML=`<div class="print-document">
    <div class="print-header">${src?`<img src="${src}" alt="Cabeçalho institucional">`:""}</div>
    <h2 class="print-title">PLANO DE AULA</h2>
    <div class="print-meta">
      <div><b>Professor(a):</b> ${esc(p.professor)}</div><div><b>Data:</b> ${esc(p.data)}</div>
      <div><b>Instituição:</b> ${esc(p.instituicao==="creche"?"Creche":p.instituicao==="escola"?"Escola Municipal Professora Irmã Blandina CISZ":"Educação em Tempo Integral")}</div>
      <div><b>Turma:</b> ${esc(p.turma)}</div>
      <div><b>Ano/Série:</b> ${esc(p.etapa)}</div><div><b>Componente:</b> ${esc(p.disciplina)}</div>
      <div><b>Duração:</b> ${esc(p.duracao)}</div><div><b>Unidade temática:</b> ${esc(p.unidade)}</div>
    </div>
    ${section("Tema",p.tema)}${section("Objeto de conhecimento",p.objeto)}${section("Habilidades da BNCC",p.habilidades)}
    ${section("Objetivo geral",p.objetivoGeral)}${section("Objetivos específicos",p.objetivosEspecificos)}
    ${section("Conteúdos",p.conteudos)}${section("Metodologia",p.metodologia)}${section("Desenvolvimento da aula",p.desenvolvimento)}
    ${section("Recursos didáticos",p.recursos)}${section("Atividades",p.atividades)}${section("Avaliação",p.avaliacao)}
    ${section("Adaptações e inclusão",p.inclusao)}${section("Referências",p.referencias)}
  </div>`;
  if(autoPrint) setTimeout(()=>window.print(),150);
}
function section(title,val){return val?`<div class="print-section"><h4>${title}</h4><p>${esc(val).replace(/\n/g,"<br>")}</p></div>`:"";}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

updateHeaderPreview(); updateMini();

$("profileBtn")?.addEventListener("click", ()=>{
  const name = $("sideUserName")?.textContent || "Professor(a)";
  showToast(`Perfil ativo: ${name}`);
});
