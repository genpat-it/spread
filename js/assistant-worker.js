/* The model runs in this Worker. Prompts and SPREAD data never go to an app server. */
let engine;

async function loadEngine(modelId) {
  if (!self.navigator.gpu) throw new Error('WebGPU non è disponibile in questo browser.');
  const adapter = await self.navigator.gpu.requestAdapter();
  if (!adapter) throw new Error('Nessun adattatore WebGPU disponibile.');
  const compatibleModelId = adapter.features.has('shader-f16')
    ? modelId
    : modelId.replace('-q4f16_1-MLC', '-q4f32_1-MLC');
  // This is pinned for reproducibility; deployments can host this and model weights locally.
  const { CreateMLCEngine } = await import('https://esm.run/@mlc-ai/web-llm@0.2.80');
  engine = await CreateMLCEngine(compatibleModelId, {
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
      self.postMessage({ type: 'answer', requestId: data.requestId, request: data.request, content: response.choices[0].message.content });
    }
  } catch (error) {
    self.postMessage({ type: 'error', requestId: data.requestId, message: error instanceof Error ? error.message : String(error) });
  }
};
