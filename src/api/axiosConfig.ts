import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:3000/api', // Cambia esta URL según tu backend
  timeout: 10000, // opcional, por ejemplo 10 segundos
  headers: {
    'Content-Type': 'application/json',
    // Puedes agregar Authorization si tienes token:
    // 'Authorization': `Bearer ${token}`
  },
});

export default axiosInstance;
