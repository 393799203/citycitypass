import api from './index';

const AI_BASE = '/ai';

export const aiApi = {
  async analyzeImage(image: File): Promise<any> {
    const formData = new FormData();
    formData.append('image', image);

    const response = await api.post(`${AI_BASE}/image/analyze`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  async analyzeImageUrl(imageUrl: string): Promise<any> {
    const response = await api.post(`${AI_BASE}/image/analyze-url`, {
      imageUrl,
    });

    return response.data;
  },

  async addDocument(content: string, metadata?: Record<string, any>): Promise<any> {
    const response = await api.post(`${AI_BASE}/rag/add`, {
      content,
      metadata,
    });

    return response.data;
  },

  async deleteDocument(id: string): Promise<any> {
    const response = await api.delete(`${AI_BASE}/rag/delete/${id}`);
    return response.data;
  },

  async queryDocuments(query: string, topK?: number): Promise<any> {
    const response = await api.post(`${AI_BASE}/rag/search`, {
      query,
      topK: topK || 3,
      mode: 'keyword',
    });

    return response.data;
  },

  async queryDocumentsHybrid(query: string, topK?: number, filters?: Record<string, any>): Promise<any> {
    const response = await api.post(`${AI_BASE}/rag/search`, {
      query,
      topK: topK || 3,
      filters,
      mode: 'hybrid',
    });

    return response.data;
  },

  async queryDocumentsVector(query: string, topK?: number, filters?: Record<string, any>): Promise<any> {
    const response = await api.post(`${AI_BASE}/rag/search`, {
      query,
      topK: topK || 3,
      filters,
      mode: 'vector',
    });
    return response.data;
  },

  async updateDocumentEmbedding(id: string): Promise<any> {
    const response = await api.post(`${AI_BASE}/rag/update-embedding/${id}`);
    return response.data;
  },

  async getDocumentCount(): Promise<any> {
    const response = await api.get(`${AI_BASE}/rag/stats`);
    return response.data;
  },

  async clearDocuments(): Promise<any> {
    const response = await api.delete(`${AI_BASE}/rag/clear`);
    return response.data;
  },

  async healthCheck(): Promise<any> {
    const response = await api.get(`${AI_BASE}/health`);
    return response.data;
  },

  async chat(prompt: string, history?: Array<{role: string; content: string}>): Promise<any> {
    const response = await api.post(`${AI_BASE}/chat`, { prompt, history });
    return response.data;
  },

  async callAI(prompt: string): Promise<string> {
    try {
      const response = await api.post(`${AI_BASE}/chat`, { prompt });
      const data = response.data;
      if (data.success && data.data?.content) {
        return data.data.content;
      }
      throw new Error('AI call failed');
    } catch (error) {
      console.error('callAI error:', error);
      throw error;
    }
  },

  async parseAIResponse<T>(prompt: string): Promise<T | null> {
    try {
      const response = await api.post(`${AI_BASE}/chat`, { prompt });
      const data = response.data;
      if (data.success && data.data?.content) {
        let content = data.data.content.trim();

        const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          content = codeBlockMatch[1].trim();
        }

        const jsonMatch = content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (jsonMatch) {
          content = jsonMatch[1].trim();
        }

        return JSON.parse(content) as T;
      }
      return null;
    } catch (error) {
      console.error('parseAIResponse error:', error);
      return null;
    }
  },
};
