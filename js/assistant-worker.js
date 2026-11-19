/* The model runs in this Worker. Prompts and SPREAD data never go to an app server. */
let engine;

async function loadEngine(modelId) {
  if (!self.navigator.gpu) throw new Error('WebGPU non è disponibile in questo browser.');
  // This is pinned for reproducibility; deployments can host this and model weights locally.
  const { CreateMLCEngine } = await import('https://esm.run/@mlc-ai/web-llm@0.2.80');
  engine = await CreateMLCEngine(modelId, {
    initProgressCallback: (report) => self.postMessage({ type: 'progress', text: report.text })
  });
}

self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'init') {
      await loadEngine(data.modelId);
      self.postMessage({ type: 'ready' });
      return;
    }
    if (data.type === 'chat') {
      if (!engine) throw new Error('Il modello non è stato ancora caricato.');
      const response = await engine.chat.completions.create({
        messages: data.messages,
        temperature: 0.1,
        max_tokens: 700,
        response_format: { type: 'json_object' }
      });
      self.postMessage({ type: 'answer', content: response.choices[0].message.content });
    }
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
