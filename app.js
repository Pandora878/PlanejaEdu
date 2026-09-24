import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  updateProfile, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, addDoc, collection, query, where, orderBy, getDocs,
  deleteDoc, serverTimestamp, limit
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig={
 apiKey:"AIzaSyCAoPpo30vk_aWjLRJPm1D55U10r25hr00",
 authDomain:"planejaeducaaaa.firebaseapp.com",
 projectId:"planejaeducaaaa",
 storageBucket:"planejaeducaaaa.firebasestorage.app",
 messagingSenderId:"619532705806",
 appId:"1:619532705806:web:dcb28fc66b8675298e1c5f",
 measurementId:"G-FJFKHN7W8J"
};
const ADMIN_UID="BDmAQWzHytWVucAsuy4JiCOlIgB2";
const app=initializeApp(firebaseConfig), auth=getAuth(app), db=getFirestore(app);

const $=id=>document.getElementById(id);
const toast=(msg,error=false)=>{const el=document.createElement("div");el.className="toast"+(error?" error":"");el.textContent=msg;$("toast").appendChild(el);setTimeout(()=>el.remove(),4200)};
const views={login:$("loginView"),dash:$("dashboardView"),new:$("newPlanView")};
function show(view){Object.values(views).forEach(v=>v.classList.add("hidden"));view.classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"})}
function go(hash){if(hash==="#novo-plano"){show(views.new);$("pDate").value=new Date().toISOString().slice(0,10)}
else {show(views.dash);loadPlans()}}
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.go)));
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{
 document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");
 $("loginForm").classList.toggle("hidden",b.dataset.tab!=="login");$("registerForm").classList.toggle("hidden",b.dataset.tab!=="register");
}));

async function isAdmin(user){
 if(user.uid===ADMIN_UID)return true;
 try{const s=await getDoc(doc(db,"admin",user.uid));return s.exists() && s.data().role==="admin"}
 catch(e){console.error("Erro ao consultar /admin/UID:",e);toast("Login realizado, mas não foi possível consultar sua permissão administrativa. Firestore: "+e.message,true);return false}
}
async function enterUser(user){
 $("userLabel").textContent=user.displayName||user.email||"Usuário";
 $("logoutBtn").classList.remove("hidden");
 const admin=await isAdmin(user);
 if(admin){$("adminBtn").classList.remove("hidden")}
 else $("adminBtn").classList.add("hidden");
 $("welcomeName").textContent=(user.displayName||user.email||"professora").split(" ")[0];
 show(views.dash);loadPlans();
}
onAuthStateChanged(auth,user=>{if(user)enterUser(user);else{ $("logoutBtn").classList.add("hidden");$("adminBtn").classList.add("hidden");show(views.login)}});

$("loginBtn").onclick=async()=>{
 const email=$("email").value.trim(),pass=$("password").value;
 if(!email||!pass)return toast("Preencha e-mail e senha.",true);
 try{const r=await signInWithEmailAndPassword(auth,email,pass);await enterUser(r.user)}
 catch(e){console.error(e);toast("Não foi possível entrar: "+friendly(e),true)}
};
$("registerBtn").onclick=async()=>{
 const name=$("regName").value.trim(),email=$("regEmail").value.trim(),p=$("regPassword").value,p2=$("regPassword2").value;
 if(!name||!email||p.length<6||p!==p2)return toast("Confira nome, e-mail e senhas.",true);
 try{const r=await createUserWithEmailAndPassword(auth,email,p);await updateProfile(r.user,{displayName:name});await setDoc(doc(db,"professores",r.user.uid),{uid:r.user.uid,nome:name,email,criadoEm:serverTimestamp(),ativo:true},{merge:true});toast("Conta criada com sucesso!");await enterUser(r.user)}
 catch(e){console.error(e);toast("Não foi possível criar a conta: "+friendly(e),true)}
};
$("forgot").onclick=async()=>{
 const email=$("email").value.trim();if(!email)return toast("Digite seu e-mail primeiro.",true);
 try{await sendPasswordResetEmail(auth,email);toast("Link de redefinição enviado para seu e-mail.")}catch(e){toast("Não foi possível enviar: "+friendly(e),true)}
};
$("googleBtn").onclick=async()=>{try{const r=await signInWithPopup(auth,new GoogleAuthProvider());await enterUser(r.user)}catch(e){toast("Login com Google não concluído: "+friendly(e),true)}};
$("logoutBtn").onclick=()=>signOut(auth);
$("demoBtn").onclick=()=>{toast("Modo demonstração: os planos criados aqui NÃO são salvos.");show(views.new);$("pDate").value=new Date().toISOString().slice(0,10);document.querySelectorAll("#newPlanView input,#newPlanView textarea").forEach(x=>x.value="");};

async function loadPlans(){
 const user=auth.currentUser;if(!user)return;
 $("plansGrid").innerHTML='<div class="empty">Carregando seus planos...</div>';
 try{
  const q=query(collection(db,"planos"),where("uid","==",user.uid),orderBy("criadoEm","desc"));
  const snap=await getDocs(q);renderPlans(snap.docs.map(d=>({id:d.id,...d.data()})));
 }catch(e){
  console.error(e); $("plansGrid").innerHTML='<div class="empty">Não foi possível carregar seus planos.<br><small>'+e.message+'</small></div>';
 }
}
function renderPlans(plans){
 $("totalPlans").textContent=plans.length;
 const now=new Date();$("monthPlans").textContent=plans.filter(p=>{const d=p.criadoEm?.toDate?.();return d&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()}).length;
 const term=$("searchPlans").value.toLowerCase();
 const filtered=plans.filter(p=>(p.titulo+" "+p.turma+" "+p.disciplina).toLowerCase().includes(term));
 if(!filtered.length){$("plansGrid").innerHTML='<div class="empty"><strong>Você ainda não tem planos salvos.</strong><br>Crie seu primeiro planejamento usando “Novo plano de aula”.</div>';return}
 $("plansGrid").innerHTML=filtered.map(p=>`<article class="plan-card"><span class="tag">${esc(p.disciplina||"Planejamento")}</span><h3>${esc(p.titulo||"Sem título")}</h3><p>${esc(p.turma||"")} · ${esc(p.data||"")}</p><p>${esc(p.escola||"")}</p><div class="plan-actions"><button class="mini-btn" data-open="${p.id}">Visualizar</button><button class="mini-btn" data-del="${p.id}">Excluir</button></div></article>`).join("");
 document.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>deletePlan(b.dataset.del));
 document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>openPlan(plans.find(p=>p.id===b.dataset.open)));
}
$("searchPlans").addEventListener("input",loadPlans);
async function deletePlan(id){if(!confirm("Excluir este plano?"))return;try{await deleteDoc(doc(db,"planos",id));toast("Plano excluído.");loadPlans()}catch(e){toast("Não foi possível excluir: "+e.message,true)}}
function openPlan(p){
 const w=window.open("","_blank");w.document.write(`<html><head><title>${esc(p.titulo)}</title><style>body{font:16px Arial;color:#18213c;max-width:850px;margin:50px auto;line-height:1.7}h1{font-size:30px}h2{font-size:16px;color:#5b4be7;border-bottom:1px solid #ddd;padding-bottom:7px;margin-top:28px}.meta{background:#f4f5fb;padding:16px;border-radius:10px}</style></head><body><h1>${esc(p.titulo)}</h1><div class="meta"><b>${esc(p.escola||"")}</b><br>${esc(p.turma||"")} · ${esc(p.disciplina||"")} · ${esc(p.data||"")}</div>${section("Objetivos",p.objetivos)}${section("Habilidades / BNCC",p.bncc)}${section("Conteúdo",p.conteudo)}${section("Metodologia",p.metodologia)}${section("Recursos",p.recursos)}${section("Avaliação",p.avaliacao)}${section("Observações",p.observacoes)}</body></html>`);w.document.close();
}
function section(t,v){return `<h2>${t}</h2><p>${esc(v||"—").replace(/\n/g,"<br>")}</p>`}
$("savePlanBtn").onclick=async()=>{
 const user=auth.currentUser;
 if(!user)return toast("Faça login para salvar.",true);
 const title=$("pTitle").value.trim();if(!title)return toast("Informe o título do plano.",true);
 const data={uid:user.uid,titulo:title,data:$("pDate").value,turma:$("pGrade").value,disciplina:$("pSubject").value,escola:$("pSchool").value.trim(),modalidade:$("pMode").value,objetivos:$("pObjectives").value,bncc:$("pBncc").value,conteudo:$("pContent").value,metodologia:$("pMethod").value,recursos:$("pResources").value,avaliacao:$("pAssessment").value,observacoes:$("pNotes").value,criadoEm:serverTimestamp()};
 try{await addDoc(collection(db,"planos"),data);toast("Plano salvo no seu espaço!");show(views.dash);loadPlans()}catch(e){console.error(e);toast("Não foi possível salvar. Verifique as regras do Firestore: "+e.message,true)}
};
$("adminBtn").onclick=async()=>{
 const u=auth.currentUser;if(!u)return;
 if(!(await isAdmin(u)))return toast("Acesso administrativo negado.",true);
 $("adminUid").textContent=u.uid;$("adminModal").classList.remove("hidden");
 try{const s=await getDocs(query(collection(db,"professores"),limit(1000)));$("teacherCount").textContent=s.size}catch(e){$("teacherCount").textContent="erro"}
};
$("closeAdmin").onclick=()=>$("adminModal").classList.add("hidden");
$("grantAdminBtn").onclick=async()=>{
 const uid=$("adminUidInput").value.trim();if(!uid)return toast("Informe o UID.",true);
 if(auth.currentUser?.uid!==ADMIN_UID)return toast("Somente o administrador principal pode conceder acesso.",true);
 try{await setDoc(doc(db,"admin",uid),{role:"admin",updatedAt:serverTimestamp()},{merge:true});toast("Permissão administrativa registrada.");$("adminUidInput").value=""}catch(e){toast("Falha ao gravar /admin/"+uid+": "+e.message,true)}
};
function friendly(e){return ({ "auth/invalid-credential":"E-mail ou senha incorretos.","auth/invalid-email":"E-mail inválido.","auth/user-not-found":"Usuário não encontrado.","auth/wrong-password":"Senha incorreta.","auth/email-already-in-use":"Este e-mail já possui uma conta.","auth/too-many-requests":"Muitas tentativas. Aguarde alguns minutos e tente novamente.","auth/operation-not-allowed":"O método de login ainda não está habilitado no Firebase."})[e.code]||e.message||"Erro desconhecido."}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
