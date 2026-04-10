import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api/ai',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const aiApi = {
  async analyzeImage(image: File): Promise<any> {
    const formData = new FormData();
    formData.append('image', image);

    const response = await apiClient.post('/image/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  async analyzeImageUrl(imageUrl: string): Promise<any> {
    const response = await apiClient.post('/image/analyze-url', {
      imageUrl,
    });

    return response.data;
  },

  async addDocument(content: string, metadata?: Record<string, any>): Promise<any> {
    const response = await apiClient.post('/rag/add', {
      content,
      metadata,
    });

    return response.data;
  },

  async deleteDocument(id: string): Promise<any> {
    const response = await apiClient.delete(`/rag/delete/${id}`);
    return response.data;
  },

  async queryDocuments(query: string, topK?: number): Promise<any> {
    const response = await apiClient.post('/rag/search', {
      query,
      topK: topK || 3,
      mode: 'keyword',
    });

    return response.data;
  },

  async queryDocumentsHybrid(query: string, topK?: number, filters?: Record<string, any>): Promise<any> {
    const response = await apiClient.post('/rag/search', {
      query,
      topK: topK || 5,
      filters,
      mode: 'hybrid',
    });

    return response.data;
  },

  async getDocumentCount(): Promise<any> {
    const response = await apiClient.get('/rag/stats');
    return response.data;
  },

  async clearDocuments(): Promise<any> {
    const response = await apiClient.delete('/rag/clear');
    return response.data;
  },

  async healthCheck(): Promise<any> {
    const response = await apiClient.get('/health');
    return response.data;
  },

  async chat(messages: any[], context: string[] = [], structured: boolean = false): Promise<any> {
    const response = await apiClient.post('/chat', {
      messages,
      context,
      structured,
    });
    return response.data;
  },

  async callAI(prompt: string): Promise<string> {
    try {
      const response = await apiClient.post('/chat', {
        messages: [{ role: 'user', content: prompt }],
        context: [],
        structured: false,
      });
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
      const response = await apiClient.post('/chat', {
        messages: [{ role: 'user', content: prompt }],
        context: [],
        structured: true,
      });
      const data = response.data;
      if (data.success && data.data?.content) {
        const content = data.data.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as T;
        }
      }
      return null;
    } catch (error) {
      console.error('parseAIResponse error:', error);
      return null;
    }
  },
};