# PlanejaEdu — Sistema completo de Planos de Aula

## Tecnologias
- HTML5
- CSS3
- JavaScript ES Modules
- Firebase Authentication
- Firebase Firestore

## Cabeçalhos
O sistema usa os três arquivos enviados:
- `assets/cabecalho-creche.png` — opção Creche
- `assets/cabecalho-escola.png` — Escola Municipal Professora Irmã Blandina CISZ
- `assets/cabecalho-integral.png` — Educação em Tempo Integral

A opção Integral utiliza o cabeçalho do documento INTEGRAL enviado, com:
SECRETARIA MUNICIPAL DE EDUCAÇÃO DE LAJEADO GRANDE-SC
EDUCAÇÃO EM TEMPO INTEGRAL
Endereço: RUA VITÓRIA 155- CENTRO- Lajeado Grande- SC
Email: educacaointegrallajeadogrande@gmail.com

## Como configurar Firebase
1. Crie/abra um projeto no Firebase.
2. Ative Authentication > Email/Password.
3. Crie o Firestore Database.
4. Copie a configuração Web para `firebase-config.js`.
5. Publique em Firebase Hosting, Netlify, Vercel ou outro servidor HTTPS.

## Coleções
O sistema grava os planos em `planos`.
Campos principais:
instituicao, etapa, turma, disciplina, professor, data, duracao, unidade,
tema, objeto, habilidades, objetivoGeral, objetivosEspecificos, conteudos,
metodologia, desenvolvimento, recursos, atividades, avaliacao, inclusao, referencias.

## Regras iniciais recomendadas do Firestore
Use regras que permitam ao usuário autenticado ler/criar seus próprios planos. Para produção, ajuste as regras à estrutura de usuários da sua escola.

Exemplo de base:
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /planos/{planId} {
      allow read, create, update, delete: if request.auth != null
        && (resource == null || resource.data.uid == request.auth.uid);
    }
  }
}

> Antes de publicar, valide as regras no Firebase Rules Playground. O sistema não inclui credenciais reais do seu projeto.


## Cabeçalhos — versão fiel aos arquivos enviados
Os PNGs usados na prévia e na impressão foram gerados diretamente da página dos DOCX enviados, preservando o layout visual do cabeçalho em vez de recriar o texto por HTML.
Os DOCX originais também ficam em `assets/fonte-cabecalho-*.docx`.


## Firebase configurado
O projeto já está configurado para o Firebase `planejaeducaaaa`.
No Firebase, ative:
- Authentication > Email/Password
- Firestore Database

Depois, publique o projeto em um servidor HTTPS.
