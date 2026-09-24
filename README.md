# PlanejaEdu — versão corrigida

Esta versão mantém o painel da professora e o cadastro visual inspirado no modelo enviado, com o cabeçalho como única parte configurável.

## Correções principais
- Login por e-mail/senha continua independente da consulta ao Firestore.
- Cadastro por e-mail cria o usuário no Firebase Authentication primeiro.
- Google entra pelo Firebase Authentication sem exigir uma leitura prévia do perfil para concluir a autenticação.
- Erros do Firestore agora aparecem no aviso da tela com a mensagem retornada pelo Firebase.
- A verificação do administrador usa o UID principal `BDmAQWzHytWVucAsuy4JiCOlIgB2`.
- A regra da coleção `/admin/{uid}` evita avaliação recursiva.
- O painel de configuração da professora foi redesenhado em 4 etapas: Dados pessoais, Turmas e disciplinas, Cabeçalho e Finalização.
- O Pix continua opcional e nunca é requisito para criar ou usar a conta.
- O modo demonstração não grava planos.

## Firebase
Publique o conteúdo de `firestore.rules` no Cloud Firestore > Regras.

No Firebase Authentication > Sign-in method, deixe **E-mail/senha** habilitado. Para o botão Google, habilite também **Google**.

Em Authentication > Settings > Authorized domains, adicione o domínio publicado, por exemplo:
- `planejaeducacao.netlify.app`
- o novo domínio que estiver sendo usado

Se aparecer `auth/too-many-requests`, aguarde o bloqueio temporário do Firebase terminar antes de testar novamente.

## Admin
UID principal configurado no código:
`BDmAQWzHytWVucAsuy4JiCOlIgB2`

A coleção `admin` pode conter o mesmo UID com:
`role: "admin"`

## Chave Pix
Altere `PIX_KEY` em `app.js` somente se quiser exibir uma chave real. O bloco é opcional.
