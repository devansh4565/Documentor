// frontend/src/api/axiosConfig.js
import axios from 'axios';
import { auth } from '../firebase'; // Adjust path to your firebase.js if needed

// Create a new Axios instance
const axiosInstance = axios.create({
    baseURL: process.env.REACT_APP_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'https://documentor-backend-btiq.onrender.com',
});

// Create a request interceptor
axiosInstance.interceptors.request.use(
    async (config) => {
        const user = auth.currentUser;
        if (user) {
            const token = await user.getIdToken();
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default axiosInstance;