import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'https://chhehlospvoyagbrsrgx.supabase.co/functions/v1', // Cambia esta URL según tu backend
  timeout: 10000, // opcional, por ejemplo 10 segundos
  headers: {
    'Content-Type': 'application/json',
    // Puedes agregar Authorization si tienes token:
    //'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
  },
});

export default axiosInstance;
