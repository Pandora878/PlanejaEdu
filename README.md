# PlanejaEdu — versão com Painel da Professora

## Painel incluído
- Minha agenda: tarefas, reuniões, provas, entregas e lembretes.
- Turmas e alunos: turmas vinculadas pela administração e cadastro pessoal de alunos.
- Diário de aula: data, turma, disciplina, conteúdo e observações.
- Frequência: chamada por turma e por aluno, com presente/falta/justificada.
- Avaliações e notas: cadastro de instrumentos avaliativos e valor máximo.
- Materiais pedagógicos: atividades, vídeos, livros, sites, jogos e links.
- Calendário escolar: eventos, reuniões, provas, feriados e formações.
- BNCC e objetivos: biblioteca pessoal de códigos, habilidades e objetivos.
- Ocorrências: registros pedagógicos/comportamentais por aluno.
- Relatórios: contagem dos principais registros da rotina.

## Segurança
Os dados do painel usam o UID do Firebase. O Firestore permite que cada professora leia e grave apenas os próprios registros; o administrador principal e administradores autorizados podem consultar os dados quando necessário.

## Demonstração
O modo demonstração continua sem permissão para salvar planos ou registros do painel.

## Firestore
As novas coleções usadas pelo painel são: `agenda`, `alunos`, `diario`, `frequencias`, `avaliacoes`, `materiais`, `eventos`, `bncc` e `ocorrencias`.

## Base da pesquisa de funcionalidades
A estrutura foi ampliada com base em recursos recorrentes encontrados em plataformas e materiais de apoio ao professor: planejamento, diário, frequência, avaliações/notas, calendário, materiais, ocorrências, acompanhamento e relatórios.
