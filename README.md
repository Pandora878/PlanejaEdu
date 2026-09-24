# PlanejaEdu AI

Projeto estático pronto para Netlify, inspirado em padrões de UX de plataformas de IA educacional: landing page, login, criação de conta, dashboard, biblioteca, turmas, calendário, configurações e gerador de materiais com IA.

## IA no Netlify
1. Netlify → Project configuration → Environment variables.
2. Crie `OPENAI_API_KEY` com a nova chave secreta.
3. Garanta que a variável esteja disponível para Functions.
4. Faça novo deploy.

A chave **não** fica no HTML/JS público. A função `netlify/functions/gerar-ia.mjs` lê `process.env.OPENAI_API_KEY` e chama a API da OpenAI.

## Observação
O login, cadastro, foto e preferências desta versão usam armazenamento local para protótipo. Para produção, conecte autenticação real (Firebase/Auth0/etc.) e banco de dados. O botão Google está preparado como ponto de integração OAuth.
