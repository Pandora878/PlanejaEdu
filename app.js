import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, addDoc, collection, query, where, getDocs, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig={apiKey:"AIzaSyCAoPpo30vk_aWjLRJPm1D55U10r25hr00",authDomain:"planejaeducaaaa.firebaseapp.com",projectId:"planejaeducaaaa",storageBucket:"planejaeducaaaa.firebasestorage.app",messagingSenderId:"619532705806",appId:"1:619532705806:web:dcb28fc66b8675298e1c5f",measurementId:"G-FJFKHN7W8J"};
const ADMIN_UID="BDmAQWzHytWVucAsuy4JiCOlIgB2";
// Configure aqui a sua chave Pix. A contribuição é opcional e nunca bloqueia o cadastro.
const PIX_KEY="COLOQUE_SUA_CHAVE_PIX_AQUI";
const HEADER_LABELS={creche:"Cabeçalho institucional",escola:"Cabeçalho ESCOLA PROJETO",escola_integral:"Cabeçalho ESCOLA PROJETO INTEGRAL"};
const GRADES=["Educação Infantil","Pré I","Pré II","1º ano","2º ano","3º ano","4º ano","5º ano"];
const SUBJECTS=["Português","Matemática","Ciências","História","Geografia","Ensino Religioso","Arte","Educação Física","Projetos interdisciplinares"];
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id);
const toast=(msg,error=false)=>{const el=document.createElement("div");el.className="toast"+(error?" error":"");el.textContent=msg;$("toast").appendChild(el);setTimeout(()=>el.remove(),5000)};
const views={login:$('loginView'),onboarding:$('onboardingView'),dash:$('dashboardView'),new:$('newPlanView'),admin:$('adminView')};
function show(view){Object.values(views).forEach(v=>v.classList.add('hidden'));view.classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'})}
function go(hash){if(hash==='#novo-plano'){show(views.new);setPlanDate()}else if(hash==='#admin'){openAdminPage()}else{show(views.dash);loadPlans()}}
function setPlanDate(){$('pDate').value=new Date().toISOString().slice(0,10)}
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('loginForm').classList.toggle('hidden',b.dataset.tab!=='login');$('registerForm').classList.toggle('hidden',b.dataset.tab!=='register')}));

async function isAdmin(user){if(user?.uid===ADMIN_UID)return true;try{const s=await getDoc(doc(db,'admin',user.uid));return s.exists()&&s.data().role==='admin'}catch(e){console.error(e);toast('Não foi possível consultar sua permissão administrativa. '+e.message,true);return false}}
async function getTeacherProfile(uid){try{const s=await getDoc(doc(db,'professores',uid));return s.exists()?s.data():null}catch(e){console.error(e);return null}}
async function enterUser(user){
  $('userLabel').textContent=user.displayName||user.email||'Usuário';
  $('logoutBtn').classList.remove('hidden');
  const admin=await isAdmin(user);
  $('adminBtn').classList.toggle('hidden',!admin);
  $('welcomeName').textContent=(user.displayName||user.email||'professora').split(' ')[0];
  const profile=await getTeacherProfile(user.uid);
  if(!admin && !profile?.cadastroCompleto){
    fillOnboarding(profile,user);
    show(views.onboarding);
    return;
  }
  await applyTeacherSettings(user);
  show(views.dash);
  loadPlans();
}
onAuthStateChanged(auth,user=>{if(user)enterUser(user);else{$('logoutBtn').classList.add('hidden');$('adminBtn').classList.add('hidden');show(views.login)}});

$('loginBtn').onclick=async()=>{const email=$('email').value.trim(),pass=$('password').value;if(!email||!pass)return toast('Preencha e-mail e senha.',true);try{const r=await signInWithEmailAndPassword(auth,email,pass);await enterUser(r.user)}catch(e){console.error(e);toast('Não foi possível entrar: '+friendly(e),true)}};
$('registerBtn').onclick=async()=>{
  const btn=$('registerBtn');
  const name=$('regName').value.trim(),email=$('regEmail').value.trim().toLowerCase(),p=$('regPassword').value,p2=$('regPassword2').value;
  if(!name||!email||!p||!p2)return toast('Preencha todos os campos para criar sua conta.',true);
  if(!/^\S+@\S+\.\S+$/.test(email))return toast('Digite um e-mail válido.',true);
  if(p.length<6)return toast('A senha precisa ter pelo menos 6 caracteres.',true);
  if(p!==p2)return toast('As senhas não coincidem.',true);
  btn.disabled=true;btn.classList.add('loading');btn.innerHTML='<span class="spinner"></span> Criando sua conta...';
  try{
    const r=await createUserWithEmailAndPassword(auth,email,p);
    try{await updateProfile(r.user,{displayName:name})}catch(profileErr){console.warn('Não foi possível atualizar o nome agora:',profileErr)}
    // A criação do usuário no Authentication é independente do perfil no Firestore.
    // Assim, um problema temporário de permissão/índice não faz parecer que a conta não foi criada.
    try{
      await setDoc(doc(db,'professores',r.user.uid),{uid:r.user.uid,nome:name,email,criadoEm:serverTimestamp(),ativo:true,turmas:[],disciplinas:[],escola:'',modalidade:'Regular',cabecalhoTipo:'',cabecalhoTexto:'',acessoGratuito:false,cadastroCompleto:false,provedor:'senha'},{merge:true});
    }catch(profileErr){
      console.error('Conta criada, mas perfil não foi gravado no Firestore:',profileErr);
      toast('Conta criada. Vamos concluir seu cadastro; se aparecer um erro do Firestore, ele será mostrado.',true);
    }
    $('regPassword').value='';$('regPassword2').value='';
    toast('Conta criada com sucesso! Agora complete seu cadastro profissional.');
    await enterUser(r.user);
  }catch(e){
    console.error('Erro ao criar conta:',e);
    toast('Não foi possível criar a conta: '+friendly(e),true);
  }finally{
    btn.disabled=false;btn.classList.remove('loading');btn.innerHTML='Criar minha conta <span>→</span>';
  }
};
$('forgot').onclick=async()=>{const email=$('email').value.trim();if(!email)return toast('Digite seu e-mail primeiro.',true);try{await sendPasswordResetEmail(auth,email);toast('Link de redefinição enviado para seu e-mail.')}catch(e){toast('Não foi possível enviar: '+friendly(e),true)}};
$('googleBtn').onclick=async()=>{try{const r=await signInWithPopup(auth,new GoogleAuthProvider());if(!await getDoc(doc(db,'professores',r.user.uid)).then(s=>s.exists()))await setDoc(doc(db,'professores',r.user.uid),{uid:r.user.uid,nome:r.user.displayName||'',email:r.user.email||'',criadoEm:serverTimestamp(),ativo:true,turmas:[],disciplinas:[],escola:'',modalidade:'Regular',cabecalhoTipo:'',cabecalhoTexto:'',acessoGratuito:false},{merge:true});await enterUser(r.user)}catch(e){toast('Login com Google não concluído: '+friendly(e),true)}};
$('googleRegisterBtn').onclick=async()=>{
  const btn=$('googleRegisterBtn');btn.disabled=true;btn.classList.add('loading');
  try{
    const r=await signInWithPopup(auth,new GoogleAuthProvider());
    const ref=doc(db,'professores',r.user.uid);const profile=await getDoc(ref);
    if(!profile.exists()){
      try{await setDoc(ref,{uid:r.user.uid,nome:r.user.displayName||'',email:r.user.email||'',criadoEm:serverTimestamp(),ativo:true,turmas:[],disciplinas:[],escola:'',modalidade:'Regular',cabecalhoTipo:'',cabecalhoTexto:'',acessoGratuito:false,provedor:'google',cadastroCompleto:false},{merge:true})}catch(profileErr){console.error('Google autenticado, perfil pendente:',profileErr)}
      toast('Conta criada com Google! Agora complete seu cadastro profissional.');
    }else toast('Conta Google reconhecida. Entrando...');
    await enterUser(r.user);
  }catch(e){console.error(e);toast('Não foi possível criar a conta com Google: '+friendly(e),true)}
  finally{btn.disabled=false;btn.classList.remove('loading')}
};
$('logoutBtn').onclick=()=>signOut(auth);
$('demoBtn').onclick=()=>{toast('Modo demonstração: os planos criados aqui NÃO são salvos.');show(views.new);setPlanDate();$('demoMode').value='true';document.querySelectorAll('#newPlanView input,#newPlanView textarea').forEach(x=>x.value='')};

function fillOnboarding(profile,user){
  $('onName').value=profile?.nome||user.displayName||'';
  $('onPhone').value=profile?.whatsapp||'';
  $('onSchool').value=profile?.escola||'';
  $('onNetwork').value=profile?.redeEnsino||'';
  $('onCity').value=profile?.cidade||'';
  $('onState').value=profile?.estado||'';
  $('onMode').value=profile?.modalidade||'Regular';
  $('onRole').value=profile?.funcao||'Professora';
  $('onHeaderType').value=profile?.cabecalhoTipo||'';
  $('onNotes').value=profile?.observacoesAdmin||'';
  document.querySelectorAll('.on-grade').forEach(c=>c.checked=(profile?.turmas||[]).includes(c.value));
  document.querySelectorAll('.on-subject').forEach(c=>c.checked=(profile?.disciplinas||[]).includes(c.value));
  $('pixKeyDisplay').textContent=PIX_KEY&&PIX_KEY!=='COLOQUE_SUA_CHAVE_PIX_AQUI'?PIX_KEY:'Configure sua chave Pix no app.js';
  $('copyPixBtn').disabled=!PIX_KEY||PIX_KEY==='COLOQUE_SUA_CHAVE_PIX_AQUI';
}

$('copyPixBtn').onclick=async()=>{if(!PIX_KEY||PIX_KEY==='COLOQUE_SUA_CHAVE_PIX_AQUI')return toast('Configure sua chave Pix no app.js para liberar a cópia.',true);try{await navigator.clipboard.writeText(PIX_KEY);toast('Chave Pix copiada.');}catch(e){toast('Não foi possível copiar automaticamente.',true)}};
$('continueOnboardingBtn').onclick=async()=>{
  const user=auth.currentUser;if(!user)return toast('Sua sessão expirou. Entre novamente.',true);
  const turmas=[...document.querySelectorAll('.on-grade:checked')].map(c=>c.value);
  const disciplinas=[...document.querySelectorAll('.on-subject:checked')].map(c=>c.value);
  const nome=$('onName').value.trim(), escola=$('onSchool').value.trim(), cidade=$('onCity').value.trim();
  if(!nome||!escola||!cidade||!$('onState').value||!turmas.length||!disciplinas.length)return toast('Preencha nome, escola, cidade, estado, pelo menos uma turma e uma disciplina.',true);
  const dados={uid:user.uid,nome,email:user.email||'',whatsapp:$('onPhone').value.trim(),escola,redeEnsino:$('onNetwork').value, cidade,estado:$('onState').value,modalidade:$('onMode').value,funcao:$('onRole').value,turmas,disciplinas,cabecalhoTipo:$('onHeaderType').value,cabecalhoTexto:HEADER_LABELS[$('onHeaderType').value]||'',observacoesAdmin:$('onNotes').value.trim(),cadastroCompleto:true,statusSolicitacao:'pendente',enviadoEm:serverTimestamp()};
  try{
    await setDoc(doc(db,'professores',user.uid),{...dados,ativo:true,acessoGratuito:false},{merge:true});
    await setDoc(doc(db,'solicitacoes_professoras',user.uid),{...dados,status:'pendente',recebidoEm:serverTimestamp()},{merge:true});
    toast('Formulário enviado para a administração. Seu espaço está pronto!');
    await applyTeacherSettings(user);show(views.dash);loadPlans();
  }catch(e){console.error(e);toast('Não foi possível enviar o formulário: '+e.message,true)}
};

async function applyTeacherSettings(user){const p=await getTeacherProfile(user.uid);const allowedGrades=(p?.turmas||[]).filter(x=>GRADES.includes(x));const allowedSubjects=(p?.disciplinas||[]).filter(x=>SUBJECTS.includes(x));fillSelect($('pGrade'),allowedGrades.length?allowedGrades:GRADES);fillSelect($('pSubject'),allowedSubjects.length?allowedSubjects:SUBJECTS);if(p){$('pSchool').value=p.escola||'';$('pMode').value=p.modalidade||'Regular';$('teacherHeaderNote').textContent=p.cabecalhoTexto||'';}}
function fillSelect(el,items){el.innerHTML=items.map(x=>`<option>${esc(x)}</option>`).join('')}

let currentPlans=[];
async function loadPlans(){const user=auth.currentUser;if(!user)return;$('plansGrid').innerHTML='<div class="empty">Carregando seus planos...</div>';try{const q=query(collection(db,'planos'),where('uid','==',user.uid));const snap=await getDocs(q);currentPlans=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>{const aa=a.criadoEm?.seconds||0,bb=b.criadoEm?.seconds||0;return bb-aa});renderPlans(currentPlans)}catch(e){console.error(e);$('plansGrid').innerHTML='<div class="empty"><strong>Não foi possível carregar seus planos.</strong><br><small>'+esc(e.message)+'</small></div>'}}
function renderPlans(plans){$('totalPlans').textContent=plans.length;const now=new Date();$('monthPlans').textContent=plans.filter(p=>{const d=p.criadoEm?.toDate?.();return d&&d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()}).length;const term=$('searchPlans').value.toLowerCase();const filtered=plans.filter(p=>(p.titulo+' '+p.turma+' '+p.disciplina).toLowerCase().includes(term));if(!filtered.length){$('plansGrid').innerHTML='<div class="empty"><strong>Você ainda não tem planos salvos.</strong><br>Crie seu primeiro planejamento usando “Novo plano de aula”.</div>';return}$('plansGrid').innerHTML=filtered.map(p=>`<article class="plan-card"><span class="tag">${esc(p.disciplina||'Planejamento')}</span><h3>${esc(p.titulo||'Sem título')}</h3><p>${esc(p.turma||'')} · ${esc(p.data||'')}</p><p>${esc(p.escola||'')}</p><div class="plan-actions"><button class="mini-btn" data-open="${p.id}">Visualizar</button><button class="mini-btn" data-del="${p.id}">Excluir</button></div></article>`).join('');document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>deletePlan(b.dataset.del));document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openPlan(plans.find(p=>p.id===b.dataset.open)))}
$('searchPlans').addEventListener('input',()=>renderPlans(currentPlans));
async function deletePlan(id){if(!confirm('Excluir este plano?'))return;try{await deleteDoc(doc(db,'planos',id));toast('Plano excluído.');loadPlans()}catch(e){toast('Não foi possível excluir: '+e.message,true)}}
function openPlan(p){if(!p)return;const w=window.open('','_blank');w.document.write(`<html><head><title>${esc(p.titulo)}</title><style>body{font:16px Arial;color:#18213c;max-width:850px;margin:50px auto;line-height:1.7}h1{font-size:30px}h2{font-size:16px;color:#5b4be7;border-bottom:1px solid #ddd;padding-bottom:7px;margin-top:28px}.meta{background:#f4f5fb;padding:16px;border-radius:10px}</style></head><body><h1>${esc(p.titulo)}</h1><div class="meta"><b>${esc(p.escola||'')}</b><br>${esc(p.turma||'')} · ${esc(p.disciplina||'')} · ${esc(p.data||'')}</div>${section('Objetivos',p.objetivos)}${section('Habilidades / BNCC',p.bncc)}${section('Conteúdo',p.conteudo)}${section('Metodologia',p.metodologia)}${section('Recursos',p.recursos)}${section('Avaliação',p.avaliacao)}${section('Observações',p.observacoes)}</body></html>`);w.document.close()}
function section(t,v){return `<h2>${t}</h2><p>${esc(v||'—').replace(/\n/g,'<br>')}</p>`}


/* =====================================================
   PAINEL DA PROFESSORA
   Agenda • Turmas • Diário • Avaliações • Materiais •
   Calendário • BNCC • Relatórios
===================================================== */
const teacherPanelLabels={agenda:'Minha agenda',turmas:'Turmas e alunos',diario:'Diário de aula',avaliacoes:'Avaliações e notas',materiais:'Materiais pedagógicos',calendario:'Calendário escolar',bncc:'BNCC e objetivos',relatorios:'Relatórios da rotina'};
const teacherPanelArea=$('teacherPanelArea');
document.querySelectorAll('[data-panel]').forEach(btn=>btn.addEventListener('click',()=>openTeacherPanel(btn.dataset.panel)));
function panelShell(title,subtitle,body){return `<div class="panel-shell"><div class="panel-shell-head"><div><button class="back panel-back" type="button">← Voltar ao painel</button><span class="eyebrow">PAINEL DA PROFESSORA</span><h2>${title}</h2><p class="muted">${subtitle}</p></div></div>${body}</div>`}
function teacherUser(){return auth.currentUser}
function selectedTeacherProfile(){return getTeacherProfile(auth.currentUser?.uid)}
async function saveTeacherItem(collectionName,data,success){const u=teacherUser();if(!u)return toast('Faça login para continuar.',true);if($('demoMode')?.value==='true')return toast('Modo demonstração: este registro não pode ser salvo.',true);try{await addDoc(collection(db,collectionName),{uid:u.uid,...data,criadoEm:serverTimestamp()});toast(success||'Salvo com sucesso.');return true}catch(e){console.error(e);toast('Não foi possível salvar: '+e.message,true);return false}}
async function readTeacherItems(collectionName){const u=teacherUser();if(!u)return [];try{const snap=await getDocs(query(collection(db,collectionName),where('uid','==',u.uid)));return snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.criadoEm?.seconds||0)-(a.criadoEm?.seconds||0))}catch(e){console.error(e);toast('Erro ao carregar '+collectionName+': '+e.message,true);return []}}
function closeTeacherPanel(){teacherPanelArea.classList.add('hidden');teacherPanelArea.innerHTML='';window.scrollTo({top:0,behavior:'smooth'})}
function panelFormRow(fields){return `<div class="panel-form-grid">${fields.join('')}</div>`}
function inputField(id,label,placeholder='',type='text'){return `<label>${label}<input id="${id}" type="${type}" placeholder="${placeholder}"></label>`}
function selectField(id,label,options){return `<label>${label}<select id="${id}">${options.map(x=>`<option>${esc(x)}</option>`).join('')}</select></label>`}
function textField(id,label,placeholder=''){return `<label class="full-field">${label}<textarea id="${id}" placeholder="${placeholder}"></textarea></label>`}
async function openTeacherPanel(panel){
  if(!teacherUser())return toast('Faça login para acessar o painel.',true);
  const profile=await getTeacherProfile(teacherUser().uid); const grades=(profile?.turmas||[]).filter(x=>GRADES.includes(x)); const subjects=(profile?.disciplinas||[]).filter(x=>SUBJECTS.includes(x));
  const gradeOpts=grades.length?grades:GRADES, subjectOpts=subjects.length?subjects:SUBJECTS;
  teacherPanelArea.classList.remove('hidden');
  let body='';
  if(panel==='frequencia') body=panelShell('Frequência','Faça a chamada da turma e registre presença ou falta por aluno.',panelFormRow([inputField('frDate','Data','','date'),selectField('frClass','Turma',gradeOpts)])+`<div id="frStudents" class="attendance-list"><div class="loading-card">Carregando alunos...</div></div><div class="panel-actions"><button id="frSave" class="btn btn-primary">Salvar chamada</button></div><div id="frList" class="panel-list"></div>`);
  if(panel==='ocorrencias') body=panelShell('Ocorrências','Registre ocorrências pedagógicas ou situações que precisam ser acompanhadas.',panelFormRow([inputField('ocDate','Data','','date'),selectField('ocClass','Turma',gradeOpts),inputField('ocStudent','Aluno','Nome do aluno'),selectField('ocType','Tipo',['Pedagógica','Comportamental','Participação','Acompanhamento','Outra']),textField('ocDesc','Descrição','Registre a situação com objetividade e contexto...')])+`<div class="panel-actions"><button id="ocSave" class="btn btn-primary">Registrar ocorrência</button></div><div id="ocList" class="panel-list"></div>`);
  if(panel==='agenda') body=panelShell('Minha agenda','Tarefas, compromissos, reuniões, provas e lembretes em um só lugar.',panelFormRow([inputField('agTitle','Título','Ex.: Reunião pedagógica'),inputField('agDate','Data','','date'),selectField('agType','Tipo',['Tarefa','Reunião','Prova','Entrega','Evento','Lembrete']),textField('agNotes','Observações','Detalhes ou lembretes...')])+`<div class="panel-actions"><button id="agSave" class="btn btn-primary">Adicionar à agenda</button></div><div id="agList" class="panel-list"></div>`);
  if(panel==='turmas') body=panelShell('Turmas e alunos','Suas turmas são definidas pela administração. Aqui você pode registrar alunos para acompanhamento.',`<div class="info-banner">Turmas vinculadas: <b>${esc(gradeOpts.join(' • ')||'Nenhuma')}</b></div>`+panelFormRow([inputField('alName','Nome do aluno','Nome completo'),selectField('alClass','Turma',gradeOpts),textField('alNotes','Observação','Informações pedagógicas gerais...')])+`<div class="panel-actions"><button id="alSave" class="btn btn-primary">Adicionar aluno</button></div><div id="alList" class="panel-list"></div>`);
  if(panel==='diario') body=panelShell('Diário de aula','Registre o que foi trabalhado em cada aula e mantenha um histórico organizado.',panelFormRow([inputField('diDate','Data','','date'),selectField('diClass','Turma',gradeOpts),selectField('diSubject','Disciplina',subjectOpts),textField('diContent','Conteúdo trabalhado','Descreva o conteúdo...'),textField('diNotes','Observações','Participação, encaminhamentos e observações...')])+`<div class="panel-actions"><button id="diSave" class="btn btn-primary">Registrar aula</button></div><div id="diList" class="panel-list"></div>`);
  if(panel==='avaliacoes') body=panelShell('Avaliações e notas','Cadastre avaliações e organize seus instrumentos avaliativos.',panelFormRow([inputField('avName','Avaliação','Ex.: Avaliação de Matemática'),inputField('avDate','Data','','date'),selectField('avClass','Turma',gradeOpts),selectField('avSubject','Disciplina',subjectOpts),inputField('avMax','Valor máximo','10','number'),textField('avNotes','Critérios / observações','Critérios, recuperação ou observações...')])+`<div class="panel-actions"><button id="avSave" class="btn btn-primary">Cadastrar avaliação</button></div><div id="avList" class="panel-list"></div>`);
  if(panel==='materiais') body=panelShell('Materiais pedagógicos','Guarde links, atividades, livros, vídeos e outros recursos usados nas aulas.',panelFormRow([inputField('maTitle','Título','Ex.: Atividade sobre frações'),selectField('maType','Tipo',['Atividade','Vídeo','Livro','Site','Jogo','Arquivo','Outro']),inputField('maLink','Link','https://...','url'),textField('maNotes','Descrição','Como e quando usar este material...')])+`<div class="panel-actions"><button id="maSave" class="btn btn-primary">Salvar material</button></div><div id="maList" class="panel-list"></div>`);
  if(panel==='calendario') body=panelShell('Calendário escolar','Registre provas, reuniões, eventos, feriados e datas importantes.',panelFormRow([inputField('evTitle','Evento','Ex.: Conselho de classe'),inputField('evDate','Data','','date'),selectField('evType','Tipo',['Evento escolar','Reunião','Prova','Feriado','Formação','Outro']),textField('evNotes','Detalhes','Informações do evento...')])+`<div class="panel-actions"><button id="evSave" class="btn btn-primary">Adicionar evento</button></div><div id="evList" class="panel-list"></div>`);
  if(panel==='bncc') body=panelShell('BNCC e objetivos','Crie uma pequena biblioteca pessoal de habilidades e objetivos para reutilizar nos planejamentos.',panelFormRow([inputField('bnCode','Código','Ex.: EF05MA07'),inputField('bnTitle','Habilidade / objetivo','Descrição da habilidade'),selectField('bnArea','Área',subjectOpts),textField('bnNotes','Observações','Como pretende trabalhar esta habilidade...')])+`<div class="panel-actions"><button id="bnSave" class="btn btn-primary">Salvar referência</button></div><div id="bnList" class="panel-list"></div>`);
  if(panel==='relatorios') body=panelShell('Relatórios da rotina','Uma visão rápida dos registros pedagógicos da sua conta.',`<div id="reportsGrid" class="reports-grid"><div class="loading-card">Calculando seus indicadores...</div></div><div class="report-note">Os indicadores são pessoais e usam apenas os registros vinculados ao seu UID do Firebase.</div>`);
  teacherPanelArea.innerHTML=body;
  teacherPanelArea.querySelector('.panel-back')?.addEventListener('click',closeTeacherPanel);
  if(panel==='agenda') await bindAgenda(); if(panel==='frequencia') await bindAttendance(gradeOpts); if(panel==='turmas') await bindStudents(); if(panel==='diario') await bindDiary(); if(panel==='avaliacoes') await bindAssessments(); if(panel==='materiais') await bindMaterials(); if(panel==='calendario') await bindCalendar(); if(panel==='bncc') await bindBncc(); if(panel==='ocorrencias') await bindOccurrences(); if(panel==='relatorios') await bindReports();
  teacherPanelArea.scrollIntoView({behavior:'smooth',block:'start'});
}
function today(){return new Date().toISOString().slice(0,10)}
async function bindAttendance(gradeOpts){
  $('frDate').value=today();
  const students=await readTeacherItems('alunos');
  const list=$('frStudents');
  const selectedClass=$('frClass').value;
  const filtered=students.filter(s=>s.turma===selectedClass);
  if(!filtered.length){list.innerHTML='<div class="empty">Cadastre os alunos em “Turmas e alunos” para fazer a chamada.</div>';}else{list.innerHTML=filtered.map((s,i)=>`<label class="attendance-row"><span><b>${esc(s.nome)}</b><small>${esc(s.turma)}</small></span><select data-att-student="${esc(s.id)}"><option value="presente">Presente</option><option value="falta">Falta</option><option value="justificada">Falta justificada</option></select></label>`).join('');}
  $('frSave').onclick=async()=>{if(!filtered.length)return toast('Não há alunos cadastrados nessa turma.',true);const records=[...list.querySelectorAll('[data-att-student]')];let okCount=0;for(const sel of records){const student=filtered.find(x=>x.id===sel.dataset.attStudent);const ok=await saveTeacherItem('frequencias',{data:$('frDate').value,turma:$('frClass').value,alunoId:student.id,aluno:student.nome,status:sel.value},'');if(ok)okCount++;}if(okCount)toast(`Chamada salva para ${okCount} aluno(s).`);await renderSimpleList('frList','frequencias',r=>`<b>${esc(r.data)} · ${esc(r.turma)} · ${esc(r.aluno)}</b><span>${esc(r.status)}</span>`)};
  $('frClass').onchange=()=>bindAttendance(gradeOpts);
  await renderSimpleList('frList','frequencias',r=>`<b>${esc(r.data)} · ${esc(r.turma)} · ${esc(r.aluno)}</b><span>${esc(r.status)}</span>`);
}
async function bindOccurrences(){
  $('ocDate').value=today();
  $('ocSave').onclick=async()=>{const ok=await saveTeacherItem('ocorrencias',{data:$('ocDate').value,turma:$('ocClass').value,aluno:$('ocStudent').value.trim(),tipo:$('ocType').value,descricao:$('ocDesc').value.trim()},'Ocorrência registrada.');if(ok){$('ocStudent').value='';$('ocDesc').value='';await renderSimpleList('ocList','ocorrencias',r=>`<b>${esc(r.data)} · ${esc(r.aluno||'Turma inteira')}</b><span>${esc(r.turma)} · ${esc(r.tipo)}</span><small>${esc(r.descricao||'')}</small>`)} };
  await renderSimpleList('ocList','ocorrencias',r=>`<b>${esc(r.data)} · ${esc(r.aluno||'Turma inteira')}</b><span>${esc(r.turma)} · ${esc(r.tipo)}</span><small>${esc(r.descricao||'')}</small>`);
}
async function bindAgenda(){ $('agDate').value=today(); $('agSave').onclick=async()=>{const ok=await saveTeacherItem('agenda',{titulo:$('agTitle').value.trim(),data:$('agDate').value,tipo:$('agType').value,observacoes:$('agNotes').value.trim()},'Item adicionado à agenda.');if(ok){$('agTitle').value='';$('agNotes').value='';await renderSimpleList('agList','agenda',r=>`<b>${esc(r.titulo)}</b><span>${esc(r.data)} · ${esc(r.tipo)}</span><small>${esc(r.observacoes||'')}</small>`)} };await renderSimpleList('agList','agenda',r=>`<b>${esc(r.titulo)}</b><span>${esc(r.data)} · ${esc(r.tipo)}</span><small>${esc(r.observacoes||'')}</small>`)}
async function bindStudents(){ $('alSave').onclick=async()=>{const ok=await saveTeacherItem('alunos',{nome:$('alName').value.trim(),turma:$('alClass').value,observacoes:$('alNotes').value.trim()},'Aluno adicionado.');if(ok){$('alName').value='';$('alNotes').value='';await renderSimpleList('alList','alunos',r=>`<b>${esc(r.nome)}</b><span>${esc(r.turma)}</span><small>${esc(r.observacoes||'')}</small>`)} };await renderSimpleList('alList','alunos',r=>`<b>${esc(r.nome)}</b><span>${esc(r.turma)}</span><small>${esc(r.observacoes||'')}</small>`)}
async function bindDiary(){ $('diDate').value=today(); $('diSave').onclick=async()=>{const ok=await saveTeacherItem('diario',{data:$('diDate').value,turma:$('diClass').value,disciplina:$('diSubject').value,conteudo:$('diContent').value.trim(),observacoes:$('diNotes').value.trim()},'Aula registrada no diário.');if(ok){$('diContent').value='';$('diNotes').value='';await renderSimpleList('diList','diario',r=>`<b>${esc(r.data)} · ${esc(r.turma)} · ${esc(r.disciplina)}</b><span>${esc(r.conteudo)}</span><small>${esc(r.observacoes||'')}</small>`)} };await renderSimpleList('diList','diario',r=>`<b>${esc(r.data)} · ${esc(r.turma)} · ${esc(r.disciplina)}</b><span>${esc(r.conteudo)}</span><small>${esc(r.observacoes||'')}</small>`)}
async function bindAssessments(){ $('avDate').value=today(); $('avSave').onclick=async()=>{const ok=await saveTeacherItem('avaliacoes',{nome:$('avName').value.trim(),data:$('avDate').value,turma:$('avClass').value,disciplina:$('avSubject').value,valorMaximo:Number($('avMax').value||10),observacoes:$('avNotes').value.trim()},'Avaliação cadastrada.');if(ok){$('avName').value='';$('avNotes').value='';await renderSimpleList('avList','avaliacoes',r=>`<b>${esc(r.nome)}</b><span>${esc(r.turma)} · ${esc(r.disciplina)} · ${esc(r.data)}</span><small>Valor máximo: ${esc(r.valorMaximo)}</small>`)} };await renderSimpleList('avList','avaliacoes',r=>`<b>${esc(r.nome)}</b><span>${esc(r.turma)} · ${esc(r.disciplina)} · ${esc(r.data)}</span><small>Valor máximo: ${esc(r.valorMaximo)}</small>`)}
async function bindMaterials(){ $('maSave').onclick=async()=>{const ok=await saveTeacherItem('materiais',{titulo:$('maTitle').value.trim(),tipo:$('maType').value,link:$('maLink').value.trim(),observacoes:$('maNotes').value.trim()},'Material salvo.');if(ok){$('maTitle').value='';$('maLink').value='';$('maNotes').value='';await renderSimpleList('maList','materiais',r=>`<b>${esc(r.titulo)}</b><span>${esc(r.tipo)} ${r.link?`· <a href="${esc(r.link)}" target="_blank" rel="noopener">Abrir recurso</a>`:''}</span><small>${esc(r.observacoes||'')}</small>`)} };await renderSimpleList('maList','materiais',r=>`<b>${esc(r.titulo)}</b><span>${esc(r.tipo)} ${r.link?`· <a href="${esc(r.link)}" target="_blank" rel="noopener">Abrir recurso</a>`:''}</span><small>${esc(r.observacoes||'')}</small>`)}
async function bindCalendar(){ $('evDate').value=today(); $('evSave').onclick=async()=>{const ok=await saveTeacherItem('eventos',{titulo:$('evTitle').value.trim(),data:$('evDate').value,tipo:$('evType').value,observacoes:$('evNotes').value.trim()},'Evento adicionado.');if(ok){$('evTitle').value='';$('evNotes').value='';await renderSimpleList('evList','eventos',r=>`<b>${esc(r.titulo)}</b><span>${esc(r.data)} · ${esc(r.tipo)}</span><small>${esc(r.observacoes||'')}</small>`)} };await renderSimpleList('evList','eventos',r=>`<b>${esc(r.titulo)}</b><span>${esc(r.data)} · ${esc(r.tipo)}</span><small>${esc(r.observacoes||'')}</small>`)}
async function bindBncc(){ $('bnSave').onclick=async()=>{const ok=await saveTeacherItem('bncc',{codigo:$('bnCode').value.trim(),titulo:$('bnTitle').value.trim(),area:$('bnArea').value,observacoes:$('bnNotes').value.trim()},'Referência BNCC salva.');if(ok){$('bnCode').value='';$('bnTitle').value='';$('bnNotes').value='';await renderSimpleList('bnList','bncc',r=>`<b>${esc(r.codigo||'Sem código')} · ${esc(r.titulo)}</b><span>${esc(r.area)}</span><small>${esc(r.observacoes||'')}</small>`)} };await renderSimpleList('bnList','bncc',r=>`<b>${esc(r.codigo||'Sem código')} · ${esc(r.titulo)}</b><span>${esc(r.area)}</span><small>${esc(r.observacoes||'')}</small>`)}
async function renderSimpleList(elId,collectionName,renderer){const rows=await readTeacherItems(collectionName);const el=$(elId);if(!rows.length){el.innerHTML='<div class="empty">Nenhum registro ainda. Adicione o primeiro acima.</div>';return}el.innerHTML=rows.slice(0,20).map(r=>`<article class="panel-list-item">${renderer(r)}</article>`).join('')}
async function bindReports(){const names=['planos','agenda','alunos','diario','frequencias','avaliacoes','materiais','eventos','bncc','ocorrencias'];const results=await Promise.all(names.map(readTeacherItems));const map=Object.fromEntries(names.map((n,i)=>[n,results[i].length]));$('reportsGrid').innerHTML=`<article><span>📘</span><b>${map.planos}</b><small>Planos de aula</small></article><article><span>📖</span><b>${map.diario}</b><small>Registros de aula</small></article><article><span>👩‍🎓</span><b>${map.alunos}</b><small>Alunos cadastrados</small></article><article><span>📊</span><b>${map.avaliacoes}</b><small>Avaliações</small></article><article><span>✅</span><b>${map.frequencias}</b><small>Registros de frequência</small></article><article><span>📚</span><b>${map.materiais}</b><small>Materiais</small></article><article><span>🗓️</span><b>${map.agenda+map.eventos}</b><small>Compromissos e eventos</small></article><article><span>🎯</span><b>${map.bncc}</b><small>Referências BNCC</small></article><article><span>📝</span><b>${map.ocorrencias}</b><small>Ocorrências</small></article>`}

$('savePlanBtn').onclick=async()=>{const user=auth.currentUser;if(!user)return toast('Faça login para salvar.',true);if($('demoMode').value==='true')return toast('Modo demonstração: este plano não pode ser salvo.',true);const title=$('pTitle').value.trim();if(!title)return toast('Informe o título do plano.',true);const data={uid:user.uid,titulo:title,data:$('pDate').value,turma:$('pGrade').value,disciplina:$('pSubject').value,escola:$('pSchool').value.trim(),modalidade:$('pMode').value,objetivos:$('pObjectives').value,bncc:$('pBncc').value,conteudo:$('pContent').value,metodologia:$('pMethod').value,recursos:$('pResources').value,avaliacao:$('pAssessment').value,observacoes:$('pNotes').value,criadoEm:serverTimestamp()};try{await addDoc(collection(db,'planos'),data);toast('Plano salvo no seu espaço!');$('demoMode').value='false';show(views.dash);loadPlans()}catch(e){console.error(e);toast('Não foi possível salvar. '+e.message,true)}};

async function openAdminPage(){const u=auth.currentUser;if(!u)return;if(!(await isAdmin(u)))return toast('Acesso administrativo negado.',true);show(views.admin);loadAdminData()}
$('adminBtn').onclick=()=>openAdminPage();
$('adminBackBtn').onclick=()=>{show(views.dash);loadPlans()};
$('adminRefresh').onclick=()=>loadAdminData();
$('adminRefreshRequests').onclick=()=>loadAdminRequests();
let teachers=[];
async function loadAdminData(){if(auth.currentUser?.uid!==ADMIN_UID&&!await isAdmin(auth.currentUser))return;$('adminUidLabel').textContent=auth.currentUser.uid;$('adminTeachersGrid').innerHTML='<div class="empty">Carregando professoras...</div>';try{const snap=await getDocs(collection(db,'professores'));teachers=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.nome||'').localeCompare(b.nome||''));$('adminTeacherCount').textContent=teachers.length;renderTeacherCards(teachers);loadAdminRequests()}catch(e){console.error(e);$('adminTeachersGrid').innerHTML='<div class="empty"><strong>Erro ao carregar professoras.</strong><br><small>'+esc(e.message)+'</small></div>';toast('Erro no Firestore: '+e.message,true)}}
async function loadAdminRequests(){
  if(!auth.currentUser)return;
  try{
    const snap=await getDocs(collection(db,'solicitacoes_professoras'));
    const rows=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.recebidoEm?.seconds||0)-(a.recebidoEm?.seconds||0));
    if(!rows.length){$('adminRequestsGrid').innerHTML='<div class="empty">Nenhum formulário recebido ainda.</div>';return;}
    $('adminRequestsGrid').innerHTML=rows.map(r=>`<article class="request-card"><div class="request-head"><div><h3>${esc(r.nome||'Sem nome')}</h3><p>${esc(r.email||'')} · ${esc(r.whatsapp||'')}</p></div><span class="request-status">${esc(r.status||'pendente')}</span></div><div class="request-grid"><div><b>Escola</b><span>${esc(r.escola||'—')}</span></div><div><b>Local</b><span>${esc([r.cidade,r.estado].filter(Boolean).join(' / ')||'—')}</span></div><div><b>Rede</b><span>${esc(r.redeEnsino||'—')}</span></div><div><b>Modalidade</b><span>${esc(r.modalidade||'—')}</span></div><div><b>Turmas</b><span>${esc((r.turmas||[]).join(', ')||'—')}</span></div><div><b>Disciplinas</b><span>${esc((r.disciplinas||[]).join(', ')||'—')}</span></div><div><b>Cabeçalho</b><span>${esc(HEADER_LABELS[r.cabecalhoTipo]||'Não definido')}</span></div><div><b>Observações</b><span>${esc(r.observacoesAdmin||'—')}</span></div></div><button class="btn btn-outline wide" data-approve-request="${esc(r.uid||r.id)}">Marcar como analisado</button></article>`).join('');
    document.querySelectorAll('[data-approve-request]').forEach(b=>b.onclick=async()=>{try{await setDoc(doc(db,'solicitacoes_professoras',b.dataset.approveRequest),{status:'analisado',analisadoEm:serverTimestamp()},{merge:true});toast('Solicitação marcada como analisada.');loadAdminRequests()}catch(e){toast('Erro: '+e.message,true)}});
  }catch(e){console.error(e);$('adminRequestsGrid').innerHTML='<div class="empty"><strong>Erro ao carregar formulários.</strong><br><small>'+esc(e.message)+'</small></div>';toast('Erro no Firestore: '+e.message,true)}
}

function renderTeacherCards(list){if(!list.length){$('adminTeachersGrid').innerHTML='<div class="empty">Nenhuma professora cadastrada ainda.</div>';return}$('adminTeachersGrid').innerHTML=list.map(t=>`<article class="teacher-card"><div class="teacher-top"><div class="avatar">${esc((t.nome||t.email||'?').slice(0,1).toUpperCase())}</div><div><h3>${esc(t.nome||'Sem nome')}</h3><p>${esc(t.email||'')}</p></div><span class="status ${t.ativo===false?'off':'on'}">${t.ativo===false?'Inativa':'Ativa'}</span></div><div class="teacher-tags">${(t.turmas||[]).map(x=>`<span>${esc(x)}</span>`).join('')||'<span>Nenhuma turma</span>'}${(t.disciplinas||[]).map(x=>`<span>${esc(x)}</span>`).join('')}</div><div class="teacher-meta"><b>${esc(t.escola||'Escola não definida')}</b><span>${esc(t.modalidade||'Regular')} · ${t.acessoGratuito?'Acesso liberado':'Acesso padrão'}</span></div><button class="btn btn-outline wide" data-edit-teacher="${t.id}">Administrar professora</button></article>`).join('');document.querySelectorAll('[data-edit-teacher]').forEach(b=>b.onclick=()=>openTeacherEditor(teachers.find(t=>t.id===b.dataset.editTeacher)))}
$('teacherSearch').addEventListener('input',()=>{const q=$('teacherSearch').value.toLowerCase();renderTeacherCards(teachers.filter(t=>(t.nome+' '+t.email+' '+(t.escola||'')).toLowerCase().includes(q)))});
function openTeacherEditor(t){if(!t)return;$('teacherEditUid').value=t.uid||t.id;$('teacherEditName').value=t.nome||'';$('teacherEditEmail').value=t.email||'';$('teacherEditSchool').value=t.escola||'';$('teacherEditMode').value=t.modalidade||'Regular';$('teacherEditHeaderType').value=t.cabecalhoTipo||'';$('teacherEditHeader').value=HEADER_LABELS[t.cabecalhoTipo]||t.cabecalhoTexto||'';$('teacherEditFree').checked=!!t.acessoGratuito;$('teacherEditActive').checked=t.ativo!==false;document.querySelectorAll('.assign-grade').forEach(c=>c.checked=(t.turmas||[]).includes(c.value));document.querySelectorAll('.assign-subject').forEach(c=>c.checked=(t.disciplinas||[]).includes(c.value));$('teacherModal').classList.remove('hidden')}
$('closeTeacherModal').onclick=()=>$('teacherModal').classList.add('hidden');
document.addEventListener('change',e=>{if(e.target.id==='teacherEditHeaderType'){const v=e.target.value;$('teacherEditHeader').value=HEADER_LABELS[v]||'';}});

$('saveTeacherBtn').onclick=async()=>{const uid=$('teacherEditUid').value.trim();if(!uid)return;const turmas=[...document.querySelectorAll('.assign-grade:checked')].map(c=>c.value);const disciplinas=[...document.querySelectorAll('.assign-subject:checked')].map(c=>c.value);const payload={nome:$('teacherEditName').value.trim(),email:$('teacherEditEmail').value.trim(),escola:$('teacherEditSchool').value.trim(),modalidade:$('teacherEditMode').value,cabecalhoTipo:$('teacherEditHeaderType').value,cabecalhoTexto:HEADER_LABELS[$('teacherEditHeaderType').value]||$('teacherEditHeader').value.trim(),acessoGratuito:$('teacherEditFree').checked,ativo:$('teacherEditActive').checked,turmas,disciplinas,uid,atualizadoEm:serverTimestamp()};try{await setDoc(doc(db,'professores',uid),payload,{merge:true});toast('Dados da professora atualizados.');$('teacherModal').classList.add('hidden');loadAdminData()}catch(e){console.error(e);toast('Não foi possível salvar: '+e.message,true)}};
$('closeAdminTeacherFromView').onclick=()=>{$('teacherModal').classList.add('hidden')};

function friendly(e){return ({'auth/invalid-credential':'E-mail ou senha incorretos.','auth/invalid-email':'E-mail inválido.','auth/user-not-found':'Usuário não encontrado.','auth/wrong-password':'Senha incorreta.','auth/email-already-in-use':'Este e-mail já possui uma conta.','auth/too-many-requests':'Muitas tentativas. Aguarde alguns minutos e tente novamente.','auth/operation-not-allowed':'O método de login ainda não está habilitado no Firebase.','auth/popup-closed-by-user':'A janela do Google foi fechada antes de concluir.','auth/popup-blocked':'O navegador bloqueou a janela do Google. Permita pop-ups para este site.','auth/unauthorized-domain':'Este domínio ainda não está autorizado no Firebase Authentication. Adicione o domínio publicado em Authentication > Settings > Authorized domains.','auth/account-exists-with-different-credential':'Já existe uma conta com este e-mail usando outro método de login. Entre pelo método original ou vincule o Google à conta.','auth/password-does-not-meet-requirements':'A senha não atende aos requisitos definidos no Firebase.','auth/network-request-failed':'Falha de conexão. Verifique sua internet e tente novamente.','auth/internal-error':'O Firebase retornou um erro interno. Tente novamente em alguns segundos.','auth/invalid-api-key':'A chave da configuração do Firebase é inválida. Verifique a configuração do projeto.','auth/app-not-authorized':'Este aplicativo não está autorizado a usar o Firebase Authentication.','auth/user-disabled':'Esta conta foi desativada pelo administrador.'})[e.code]||e.message||'Erro desconhecido.'}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
