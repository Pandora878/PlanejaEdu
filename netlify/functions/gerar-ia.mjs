export default async (request) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido.' }), { status: 405, headers: { 'content-type': 'application/json' } });
  }
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY não configurada no Netlify.' }), { status: 503, headers: { 'content-type': 'application/json' } });
  }
  try {
    const body = await request.json();
    const prompt = String(body.prompt || '').trim();
    if (!prompt) return new Response(JSON.stringify({ error: 'Informe o que deseja criar.' }), { status: 400, headers: { 'content-type': 'application/json' } });

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: [
          { role: 'system', content: 'Você é a IA pedagógica do PlanejaEdu. Ajude professores brasileiros a criar materiais educacionais claros, inclusivos, práticos e alinhados à BNCC quando fizer sentido. Não invente códigos BNCC: se não houver certeza, escreva que o código deve ser conferido. Responda em português do Brasil e organize o material com títulos e listas.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7
      })
    });
    const data = await response.json();
    if (!response.ok) return new Response(JSON.stringify({ error: data?.error?.message || 'Falha na OpenAI.' }), { status: response.status, headers: { 'content-type': 'application/json' } });
    const text = data.output_text || (data.output || []).flatMap(x => x.content || []).map(x => x.text || '').join('\n').trim();
    return new Response(JSON.stringify({ text }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Erro inesperado.' }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
};
