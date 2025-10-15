import React, { createContext, useState, useEffect } from 'react';
import { authService, trabajadorService } from '../services/api';
import {jwtDecode} from 'jwt-decode';
import axios from 'axios';

export const AuthContext = createContext({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    login: () => {},
    loginWithBiometric: () => {},
    logout: () => {},
    refreshUser: () => {},
});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Función para obtener datos completos del usuario
    const fetchUserData = async (token) => {
        try {
            const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
            const response = await axios.get(`${API_URL}/me`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error al obtener datos del usuario:', error);
            return null;
        }
    };

    // Verificar si hay un token almacenado al cargar la aplicación
    useEffect(() => {
        const checkToken = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    // Verificar que el token no haya expirado
                    const decodedToken = jwtDecode(token);
                    const currentTime = Date.now() / 1000;
                    
                    if (decodedToken.exp < currentTime) {
                        // Token expirado
                        authService.logout();
                        setUser(null);
                    } else {
                        // Token válido, obtener datos completos del usuario
                        const userData = await fetchUserData(token);
                        if (userData) {
                            localStorage.setItem('user', JSON.stringify(userData));
                            setUser(userData);
                        } else {
                            // Si no se pudieron obtener los datos, cerrar sesión
                            authService.logout();
                            setUser(null);
                        }
                    }
                } catch (error) {
                    console.error('Error al decodificar el token:', error);
                    authService.logout();
                    setUser(null);
                }
            }
            setIsLoading(false);
        };

        checkToken();
    }, []);

    // Función para iniciar sesión
    const login = async (rfc, password) => {
        try {
            setIsLoading(true);
            const response = await authService.login(rfc, password);
            if (response.access_token) {
                // Obtener datos completos del usuario desde el backend
                const userData = await fetchUserData(response.access_token);
                
                if (userData) {
                    localStorage.setItem('user', JSON.stringify(userData));
                    setUser(userData);
                } else {
                    throw new Error('No se pudieron obtener los datos del usuario');
                }
            }
            setIsLoading(false);
            return response;
        } catch (error) {
            setIsLoading(false);
            throw error;
        }
    };

    // Función para refrescar los datos del usuario
    const refreshUser = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            const userData = await fetchUserData(token);
            if (userData) {
                localStorage.setItem('user', JSON.stringify(userData));
                setUser(userData);
            }
        }
    };

    // Función para iniciar sesión con huella biométrica
    const loginWithBiometric = async (huellaBase64) => {
        try {
            setIsLoading(true);
            const response = await authService.loginWithBiometric(huellaBase64);
            setIsLoading(false);
            return response;
        } catch (error) {
            setIsLoading(false);
            throw error;
        }
    };

    // Función para cerrar sesión
    const logout = () => {
        authService.logout();
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                loginWithBiometric,
                logout,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = React.useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
};