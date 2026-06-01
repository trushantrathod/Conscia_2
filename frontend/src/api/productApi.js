import apiClient from './axiosConfig';

export const productApi = {
  getProducts: async (params = {}) => {
    const { data } = await apiClient.get('/products', { params });
    return data;
  },
  
  getProductById: async (id) => {
    const { data } = await apiClient.get(`/products/${id}`);
    return data;
  },
};