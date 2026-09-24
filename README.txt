PLANEJAEDU — VERSÃO INSPIRADA EM PLATAFORMAS MODERNAS DE IA PARA PROFESSORES

Esta versão foi criada com identidade própria para o PlanejaEdu, inspirada na organização de plataformas de planejamento pedagógico com IA: página inicial focada na criação, biblioteca de ferramentas, planos, avaliações, turmas e assistente de IA.

1) LOGIN
- E-mail e senha via Firebase Authentication.
- Entrar/criar conta com Google.
- Toda conta criada recebe papel de professora.
- Somente ADMIN_EMAILS no index.html recebe administração.
- Professoras nunca recebem o menu administrativo.

2) IA REAL
A pasta netlify/functions contém ai.mjs. Ela usa a OpenAI Responses API no servidor, sem expor a chave no navegador.

No Netlify:
Site configuration > Environment variables > adicionar:
OPENAI_API_KEY = SUA_CHAVE

Depois publique novamente.

3) FIREBASE
Já foi mantida a configuração Firebase do projeto PlanejaEdu existente.
No Firebase Authentication, ative:
- E-mail/senha
- Google
E adicione seu domínio Netlify em Authentication > Settings > Authorized domains.

4) O QUE FOI ADICIONADO
- Página de login primeiro.
- Criar conta.
- Google.
- Área de professora sem acesso ao ADM.
- Centro de IA.
- Gerador de plano de aula, aula completa, sequência, atividade, avaliação, adaptação, projeto etc.
- Chatbot pedagógico.
- Planejamentos salvos localmente.
- Turmas com etapa, turno, escola e alunos.
- Chamada automática baseada na lista de alunos.
- Perfil, foto e modo escuro.
- Interface responsiva.

5) OBSERVAÇÃO
O site é inspirado em padrões e funcionalidades públicas observadas em plataformas de IA educacional, mas usa marca, textos, estrutura visual e implementação próprias do PlanejaEdu. Não foram copiados logotipos, imagens proprietárias ou código do site de referência.
