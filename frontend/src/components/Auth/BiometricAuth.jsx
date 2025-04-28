import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Container,
  Grid,
  Alert,
  CircularProgress,
  Avatar
} from '@mui/material';
import { 
  Fingerprint, 
  Check, 
  ArrowBack, 
  Error as ErrorIcon 
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/api';

// En un sistema real, esto se integraría con un lector de huellas dactilares
// Para fines de demostración, simularemos la captura con un botón

const BiometricAuth = () => {
  const { loginWithBiometric } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('idle'); // idle, scanning, success, error
  const [error, setError] = useState(null);
  const [trabajador, setTrabajador] = useState(null);

  const simulateFingerprint = async () => {
    // Simulación de la captura de huella dactilar
    setStatus('scanning');
    setError(null);
    
    // Simulamos un retraso para la "captura" de la huella
    setTimeout(async () => {
      try {
        // En una aplicación real, aquí enviaríamos la huella capturada
        // Para la simulación, enviamos una cadena base64 ficticia
        const huellaSimulada = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA";
        
        const response = await authService.loginWithBiometric(huellaSimulada);
        setTrabajador(response);
        setStatus('success');
        
        // Después de mostrar el éxito, redirigir al registro de asistencia
        setTimeout(() => {
          navigate('/asistencias/registrar');
        }, 2000);
      } catch (err) {
        console.error('Error al autenticar con huella:', err);
        setError(
          err.response?.data?.detail || 
          'No se pudo autenticar la huella. Por favor, inténtalo de nuevo.'
        );
        setStatus('error');
      }
    }, 2000);
  };

  const resetState = () => {
    setStatus('idle');
    setError(null);
    setTrabajador(null);
  };

  return (
    <Container component="main" maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Avatar sx={{ m: 1, bgcolor: 'primary.main', width: 56, height: 56 }}>
          <Fingerprint fontSize="large" />
        </Avatar>
        
        <Typography component="h1" variant="h5" sx={{ mb: 2 }}>
          Autenticación Biométrica
        </Typography>
        
        <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
          Utiliza tu huella digital para acceder al sistema de control de asistencias
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ width: '100%', mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Box 
          sx={{ 
            width: '100%', 
            height: 200, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 1,
            mb: 3
          }}
        >
          {status === 'idle' && (
            <Button
              variant="contained"
              size="large"
              startIcon={<Fingerprint />}
              onClick={simulateFingerprint}
            >
              Colocar Huella
            </Button>
          )}
          
          {status === 'scanning' && (
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress size={60} sx={{ mb: 2 }} />
              <Typography>Escaneando huella...</Typography>
            </Box>
          )}
          
          {status === 'success' && (
            <Box sx={{ textAlign: 'center', color: 'success.main' }}>
              <Check sx={{ fontSize: 60, mb: 1 }} />
              <Typography variant="h6">¡Huella reconocida!</Typography>
              {trabajador && (
                <Typography variant="body1" sx={{ mt: 1 }}>
                  Bienvenido(a), {trabajador.nombre}
                </Typography>
              )}
            </Box>
          )}
          
          {status === 'error' && (
            <Box sx={{ textAlign: 'center', color: 'error.main' }}>
              <ErrorIcon sx={{ fontSize: 60, mb: 1 }} />
              <Typography variant="h6">Error de autenticación</Typography>
              <Button 
                variant="outlined" 
                color="primary" 
                onClick={resetState} 
                sx={{ mt: 2 }}
              >
                Intentar de nuevo
              </Button>
            </Box>
          )}
        </Box>
        
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={12} sm={6}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<ArrowBack />}
              component={RouterLink}
              to="/login"
            >
              Volver al login
            </Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button
              fullWidth
              variant="contained"
              component={RouterLink}
              to="/asistencias/registrar"
              disabled={status !== 'success'}
            >
              Registrar Asistencia
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default BiometricAuth;