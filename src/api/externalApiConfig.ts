import axios from 'axios';

const externalApiInstance = axios.create({
  baseURL: 'https://api.scalehubs.es',
  timeout: 30000, // 30 segundos para APIs externas
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para añadir el header de autorización en cada petición
externalApiInstance.interceptors.request.use(
  (config) => {
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (anonKey) {
      config.headers['Authorization'] = `Bearer ${anonKey}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default externalApiInstance;
