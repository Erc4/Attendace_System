import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Divider,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Avatar,
  Chip,
  Grid
} from '@mui/material';
import {
  Fingerprint,
  CheckCircleOutline,
  AccessTime,
  ErrorOutline,
  PersonOutline
} from '@mui/icons-material';
import { authService, asistenciaService } from '../../services/api';

const RegistroAsistencia = () => {
  const [status, setStatus] = useState('idle'); // idle, scanning, success, error
  const [error, setError] = useState(null);
  const [registroData, setRegistroData] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Actualizar el reloj cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  const formatoFecha = (fecha) => {
    return new Intl.DateTimeFormat('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(fecha);
  };
  
  const formatoHora = (fecha) => {
    return new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(fecha);
  };
  
  const getChipColor = (estatus) => {
    if (estatus === 'ASISTENCIA') return 'success';
    if (estatus.includes('RETARDO')) return 'warning';
    if (estatus === 'FALTA') return 'error';
    if (estatus === 'SALIDA') return 'info';
    return 'default';
  };
  
  const getChipIcon = (estatus) => {
    if (estatus === 'ASISTENCIA') return <CheckCircleOutline />;
    if (estatus.includes('RETARDO')) return <AccessTime />;
    if (estatus === 'FALTA') return <ErrorOutline />;
    if (estatus === 'SALIDA') return <Fingerprint />;
    return null;
  };
  
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
        
        const response = await authService.registrarAsistenciaBiometrica(huellaSimulada);
        setRegistroData(response);
        setStatus('success');
      } catch (err) {
        console.error('Error al registrar asistencia:', err);
        setError(
          err.response?.data?.detail || 
          'No se pudo registrar la asistencia. Por favor, inténtalo de nuevo.'
        );
        setStatus('error');
      }
    }, 2000);
  };
  
  const resetState = () => {
    setStatus('idle');
    setError(null);
    setRegistroData(null);
  };
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Registro de Asistencia
      </Typography>
      
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            {formatoFecha(currentTime)}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            {formatoHora(currentTime)}
          </Typography>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        <Typography variant="body1" align="center" sx={{ mb: 2 }}>
          Coloca tu huella digital para registrar tu asistencia
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Box 
          sx={{ 
            width: '100%', 
            height: 250, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 1,
            mb: 3,
            backgroundColor: (theme) => 
              status === 'scanning' 
                ? theme.palette.action.hover 
                : theme.palette.background.paper
          }}
        >
          {status === 'idle' && (
            <Button
              variant="contained"
              size="large"
              startIcon={<Fingerprint />}
              onClick={simulateFingerprint}
              sx={{ py: 2, px: 4 }}
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
          
          {status === 'success' && registroData && (
            <Box sx={{ textAlign: 'center', width: '100%', p: 2 }}>
              <Chip
                icon={getChipIcon(registroData.estatus)}
                label={registroData.estatus}
                color={getChipColor(registroData.estatus)}
                sx={{ mb: 2, fontSize: '1.1rem', py: 2, px: 1 }}
              />
              
              <Typography variant="h6" gutterBottom>
                Asistencia registrada correctamente
              </Typography>
              
              <Button 
                variant="outlined" 
                color="primary" 
                onClick={resetState} 
                sx={{ mt: 2 }}
              >
                Nuevo Registro
              </Button>
            </Box>
          )}
          
          {status === 'error' && (
            <Box sx={{ textAlign: 'center', color: 'error.main' }}>
              <ErrorOutline sx={{ fontSize: 60, mb: 1 }} />
              <Typography variant="h6">Error de registro</Typography>
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
      </Paper>
      
      {status === 'success' && registroData && (
        <Card variant="outlined" sx={{ mb: 4 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                    <PersonOutline />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      {registroData.trabajador}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ID: {registroData.id}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                  <Typography variant="subtitle1">
                    Hora de Registro
                  </Typography>
                  <Typography variant="h6">
                    {new Date(registroData.fecha).toLocaleTimeString('es-MX', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true
                    })}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
      
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="body2" color="text.secondary">
          Para cualquier problema con el registro de asistencia, contacte al departamento de recursos humanos.
        </Typography>
      </Box>
    </Box>
  );
};

export default RegistroAsistencia;