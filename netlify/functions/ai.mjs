export default async (req) => {
  if (req.httpMethod && req.httpMethod !== 'POST') return new Response('Method Not Allowed',{status:405});
  try {
    const {type='material pedagógico',grade='',subject='',topic='',duration='',context=''} = await req.json();
    const key = process.env.OPENAI_API_KEY;
    if(!key) return Response.json({error:'OPENAI_API_KEY ausente'},{status:503});
    const system = `Você é a PlanejaEdu IA, uma assistente pedagógica brasileira. Crie materiais claros, práticos e editáveis para professores. Considere a etapa de ensino, disciplina, tema, duração e contexto informados. Quando fizer sentido, alinhe objetivos e habilidades à BNCC, mas não invente códigos: se não tiver segurança sobre um código específico, descreva a habilidade em linguagem natural. Responda em português do Brasil. Não use emojis. Evite alegações de que uma habilidade está oficialmente homologada se não houver código fornecido. Para adaptações, priorize acessibilidade, linguagem clara e alternativas de participação.`;
    const user = `Tipo: ${type}\nEtapa/turma: ${grade}\nDisciplina: ${subject}\nTema: ${topic}\nDuração: ${duration}\nContexto: ${context}\n\nProduza um material completo, com títulos e listas quando forem úteis. Para plano de aula, inclua objetivos, habilidades/competências em linguagem natural, recursos, desenvolvimento passo a passo, avaliação e fechamento. Para aula completa, inclua plano, atividade e avaliação. Para sequência, organize por aulas. Para atividade/avaliação, inclua instruções e gabarito quando aplicável.`;
    const response = await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify({model:'gpt-5.6-luna',input:[{role:'system',content:system},{role:'user',content:user}],max_output_tokens:5000})});
    const data = await response.json();
    if(!response.ok) return Response.json({error:data.error?.message||'Erro na OpenAI'},{status:500});
    const text = data.output_text || (data.output||[]).flatMap(x=>x.content||[]).map(x=>x.text||'').join('') || 'Sem resposta.';
    return Response.json({text});
  } catch(e){return Response.json({error:e.message||'Erro interno'},{status:500})}
};
