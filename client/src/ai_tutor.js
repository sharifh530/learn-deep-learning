import { queryDojoKnowledge } from './dojo_knowledge.js';

/**
 * NeuroQuest: Sensei Tensor (AI Tutor) Client
 * Direct integration with Google Gemini API, Google Cloud Agent Platform,
 * and built-in Offline Dojo Knowledge Engine.
 */

const SYSTEM_INSTRUCTION = `You are Sensei Tensor 🥋🧠, an inspiring, playful, and brilliant Deep Learning tutor inside the "NeuroQuest" learning studio.
Your student already knows basic Python (loops, functions, lists) and is learning Deep Learning concepts.
Rules for your answers:
1. Make explanations intuitive and playful using physical metaphors (cooking recipes, coffee making, roller coasters, flashlights, detective lenses).
2. Avoid unnecessary heavy mathematical jargon unless requested; focus on intuition first, code second, math last.
3. Keep answers concise, formatted with clear markdown, bullet points, and code snippets when helpful.
4. Always encourage the student, celebrate their progress, and award playful honorary titles (e.g., 'Tensor Cadet', 'Gradient Surfer').`;

export class AITutorService {
  constructor() {
    this.apiKey = localStorage.getItem('neuroquest_gemini_key') || '';
    this.model = localStorage.getItem('neuroquest_gemini_model') || 'gemini-3.8-flash';
    this.providerType = localStorage.getItem('neuroquest_provider_type') || 'gemini'; // 'gemini' | 'custom_agent'
    this.customAgentUrl = localStorage.getItem('neuroquest_custom_agent_url') || '';
  }

  isOfflineMode() {
    return !this.hasApiKey() && this.providerType !== 'custom_agent';
  }

  getModeBadge() {
    if (this.providerType === 'custom_agent' && this.customAgentUrl) {
      return '☁️ Custom Agent';
    }
    if (this.hasApiKey()) {
      return `⚡ ${this.model} (Cloud)`;
    }
    return '🥋 Sensei Tensor (Offline Dojo)';
  }

  setApiKey(key) {
    this.apiKey = key.trim();
    localStorage.setItem('neuroquest_gemini_key', this.apiKey);
  }

  getApiKey() {
    return this.apiKey;
  }

  hasApiKey() {
    return Boolean(this.apiKey && this.apiKey.length > 5);
  }

  setModel(model) {
    this.model = model.trim().replace(/^models\//, '');
    localStorage.setItem('neuroquest_gemini_model', this.model);
  }

  setProvider(provider, customUrl = '') {
    this.providerType = provider;
    this.customAgentUrl = customUrl.trim();
    localStorage.setItem('neuroquest_provider_type', provider);
    localStorage.setItem('neuroquest_custom_agent_url', this.customAgentUrl);
  }

  async listAvailableModels() {
    if (!this.hasApiKey()) return [];
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      if (!data.models || !Array.isArray(data.models)) return [];

      return data.models
        .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
        .map(m => {
          const cleanId = m.name.replace(/^models\//, '');
          return {
            id: cleanId,
            displayName: m.displayName || cleanId,
            description: m.description || ''
          };
        });
    } catch (err) {
      console.warn("Could not fetch models list:", err);
      return [];
    }
  }

  async ask(userPrompt, questContext = null) {
    // If using custom Google Cloud Agent URL
    if (this.providerType === 'custom_agent' && this.customAgentUrl) {
      return this.askCustomAgent(userPrompt, questContext);
    }

    if (!this.hasApiKey()) {
      return this.getMockResponse(userPrompt, questContext);
    }

    const contextPrefix = questContext 
      ? `[Current Quest Context: "${questContext.title}" (${questContext.tag})]\n\n` 
      : '';

    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: `${SYSTEM_INSTRUCTION}\n\n${contextPrefix}Student Query: ${userPrompt}` }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000
      }
    };

    const cleanModel = this.model.replace(/^models\//, '');

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${this.apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const rawMsg = errData?.error?.message || `API error (${res.status}): ${res.statusText}`;

        // 1. Specifically detect Google Cloud blocked API error
        if (rawMsg.includes('generativelanguage.googleapis.com') || rawMsg.includes('blocked')) {
          return `⚠️ **Google Cloud Project Configuration Required**\n\nYour API key is active, but Google Cloud blocked requests to **Generative Language API** for this GCP project.\n\n### 🔧 How to fix this in 30 seconds:\n1. **Enable the API:** Open [Google Cloud Console: Generative Language API](https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com) and click the blue **"Enable"** button for your project.\n2. **Check Key Restrictions:** In [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials), click your API key. Under **API restrictions**, choose **"Don't restrict key"** or ensure **"Generative Language API"** is checked.\n3. **Alternative (Instant Free Key):** If you prefer a 1-click key without GCP project setup, generate a free API key at [Google AI Studio](https://aistudio.google.com/app/apikey).`;
        }

        // 2. Specifically detect Model Not Found / Not Supported error
        if (rawMsg.includes('is not found') || rawMsg.includes('Call ModelService.ListModels')) {
          const available = await this.listAvailableModels();
          if (available.length > 0) {
            const modelList = available.map(m => `- \`${m.id}\` (${m.displayName})`).join('\n');
            return `⚠️ **Model \`${cleanModel}\` is not available on your API key.**\n\nHere are the models your key has access to:\n${modelList}\n\n👉 **Quick Fix:** Click **Settings ⚙️** and select one of the available models above (e.g., \`${available[0].id}\`), or click **"Detect Available Models"**!`;
          }
          return `⚠️ **Model \`${cleanModel}\` is not found for this API key.**\n\nTry selecting \`gemini-2.0-flash\` or \`gemini-3.5-flash-lite\` in **Settings ⚙️**.`;
        }

        throw new Error(rawMsg);
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty response returned from Google API.");
      return text;
    } catch (err) {
      console.warn("Cloud Tutor Error, falling back to Offline Dojo Knowledge:", err);
      const fallback = queryDojoKnowledge(userPrompt, questContext);
      return `💡 *Note: Cloud API unavailable (${err.message}). Showing Sensei Tensor Offline Dojo response:*\n\n---\n\n${fallback}`;
    }
  }

  async askCustomAgent(userPrompt, questContext) {
    try {
      const headers = { "Content-Type": "application/json" };
      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
        headers["x-goog-api-key"] = this.apiKey;
      }

      const payload = {
        query: userPrompt,
        context: questContext ? questContext.title : "Deep Learning",
        systemInstruction: SYSTEM_INSTRUCTION
      };

      const res = await fetch(this.customAgentUrl, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Agent Endpoint error (${res.status}): ${res.statusText}`);
      }

      const data = await res.json();
      return data.reply || data.output || data.text || JSON.stringify(data);
    } catch (err) {
      console.warn("Custom Agent Error, falling back to Offline Dojo Knowledge:", err);
      const fallback = queryDojoKnowledge(userPrompt, questContext);
      return `💡 *Note: Custom Agent unavailable (${err.message}). Showing Sensei Tensor Offline Dojo response:*\n\n---\n\n${fallback}`;
    }
  }

  getMockResponse(userPrompt, questContext) {
    return queryDojoKnowledge(userPrompt, questContext);
  }
}
