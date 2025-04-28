import React, { createContext, useState, useEffect } from 'react';
import { authService } from '../services/api';
import {jwtDecode} from 'jwt-decode';

export const AuthContext = createContext({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    login: () => {},
    loginWithBiometric: () => {},
    logout: () => {},
});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    //Verificar si hay un token almacenado al cargar la aplicación
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
                // Token válido, obtener datos del usuario
                const userData = localStorage.getItem('user');
                if (userData) {
                setUser(JSON.parse(userData));
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
            // Obtener información del usuario del token
            const decodedToken = jwtDecode(response.access_token);
            
            // En un sistema real, probablemente obtendríamos más datos del usuario haciendo una llamada adicional
            // a un endpoint que devuelva información completa del usuario autenticado
            const userData = {
            id: decodedToken.sub,
            // Otros datos que podrían incluirse en el token
            };
            
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
        }
        setIsLoading(false);
        return response;
        } catch (error) {
        setIsLoading(false);
        throw error;
        }
    };

    // Función para iniciar sesión con huella biométrica
    const loginWithBiometric = async (huellaBase64) => {
        try {
        setIsLoading(true);
        const response = await authService.loginWithBiometric(huellaBase64);
        // Esta es solo una autenticación biométrica, no establece necesariamente una sesión web
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