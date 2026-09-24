# PlanejaEdu — versão com Administração de Professoras

## O que foi acrescentado
- Área **Administrar professoras** exclusiva para administradores.
- Cadastro/listagem das professoras vindas do Firestore em `professores`.
- Busca por nome, e-mail ou escola.
- Edição individual de cada professora.
- Vinculação de **turmas**.
- Vinculação de **disciplinas**.
- Definição de **escola/instituição**.
- Definição de **Regular / Integral**.
- Definição do tipo de cabeçalho:
  - Creche — apenas cabeçalho
  - Escola — cabeçalho ESCOLA PROJETO
  - Escola — cabeçalho ESCOLA PROJETO INTEGRAL
- Campo para colocar o **texto exato do cabeçalho**.
- Ativar/desativar conta.
- Liberar acesso sem pagamento.
- As turmas e disciplinas configuradas pelo administrador passam a aparecer no formulário da professora.
- Cada plano continua vinculado ao UID da professora.
- A consulta de planos não exige índice composto do Firestore: os registros são ordenados no navegador.

## Administrador principal
UID configurado:
`BDmAQWzHytWVucAsuy4JiCOlIgB2`

## Estrutura do professor
Coleção `professores`, documento com ID igual ao UID:

```text
uid
nome
email
escola
modalidade
cabecalhoTipo
cabecalhoTexto
turmas: []
disciplinas: []
ativo: true/false
acessoGratuito: true/false
criadoEm
atualizadoEm
```

## Publicação
1. Substitua os arquivos do site pelo conteúdo deste ZIP.
2. Publique no Netlify.
3. No Firebase Authentication, habilite E-mail/Senha e, se quiser, Google.
4. No Firestore, publique `firestore.rules`.
5. Faça login com a conta administradora. O botão **Área Admin** aparecerá automaticamente.

## Segurança
A interface não é a segurança. A autorização real é feita pelas regras do Firestore. O administrador principal é identificado pelo UID acima; administradores adicionais podem ser registrados em `/admin/UID` pelo administrador principal.


### Criar conta com Google
A tela **Criar conta** agora possui o botão **Criar conta com Google**. Ele usa o Google Provider do Firebase Authentication e cria automaticamente o documento da professora em `professores/{UID}` na primeira entrada.

No Firebase, ative **Authentication > Sign-in method > Google** e confira se o domínio publicado está em **Authorized domains**. O Firebase documenta o uso de `GoogleAuthProvider` com `signInWithPopup` para Web.


## Cadastro profissional e Pix opcional

Após criar a conta por e-mail ou Google, a professora é direcionada para um formulário profissional. O formulário registra escola, rede de ensino, cidade/estado, modalidade, função, turmas, disciplinas, cabeçalho e observações.

Os dados são gravados em `professores/{UID}` e uma cópia da solicitação fica em `solicitacoes_professoras/{UID}` para a Área Admin.

O Pix é **opcional**: a contribuição não bloqueia cadastro, login, criação de planos ou acesso à plataforma. Para configurar a chave, altere `PIX_KEY` no início de `app.js`.

Depois de publicar, atualize as regras do Firestore usando o arquivo `firestore.rules`.
