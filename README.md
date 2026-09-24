# PlanejaEdu — versão completa

## O que foi melhorado
- Interface profissional e responsiva.
- Área "Meus planos de aula" exclusiva para cada conta.
- Planos salvos pelo UID do Firebase.
- Busca por título, turma e disciplina.
- Visualização do plano em formato de documento.
- Exclusão de planos.
- Criação de planos com identificação, objetivos, BNCC, conteúdo, metodologia, recursos, avaliação e observações.
- Área Admin protegida pelo UID principal e pela coleção `/admin/{UID}`.
- Tratamento visível de erros do Firestore.
- Modo demonstração sem salvar planos reais.

## Seu administrador principal
UID:
BDmAQWzHytWVucAsuy4JiCOlIgB2

## Firebase
1. Firebase Console → Authentication → Sign-in method:
   habilite E-mail/senha e, se quiser, Google.
2. Authentication → Settings → Authorized domains:
   adicione seu domínio Netlify.
3. Firestore Database → Rules:
   copie o conteúdo de `firestore.rules` e publique.
4. Faça login com a conta principal.
5. O sistema reconhece automaticamente o UID acima como administrador principal.
6. Para outro administrador, crie `/admin/UID` com:
   role: "admin"
   O botão "Área Admin" aparece somente para administradores.

## Netlify
Publique a pasta/ZIP como site estático. Não é necessário Node para esta versão.
