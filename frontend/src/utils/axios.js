import axios from 'axios';

const baseURL = 'http://127.0.0.1:8000';

const axiosInstance = axios.create({
    baseURL: baseURL,
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json'
    }
});

axiosInstance.interceptors.request.use(
    config => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

axiosInstance.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;

        // If the error status is 401 and there is no originalRequest._retry flag,
        // it means the token has expired and we need to refresh it
        if (error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refresh_token');
                const response = await axios.post(`${baseURL}/api/auth/refresh/`, {
                    refresh: refreshToken
                });

                const { access } = response.data;

                localStorage.setItem('access_token', access);

                // Retry the original request with the new token
                originalRequest.headers['Authorization'] = `Bearer ${access}`;
                return axios(originalRequest);
            } catch (error) {
                // If refresh token fails, redirect to login
                localStorage.clear();
                window.location.href = '/login';
                return Promise.reject(error);
            }
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;