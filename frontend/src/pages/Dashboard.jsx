import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  People as PeopleIcon,
  AccessTime as AccessTimeIcon,
  AssignmentLate as AssignmentLateIcon,
  EventBusy as EventBusyIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
  Fingerprint as FingerprintIcon,
  CalendarToday as CalendarTodayIcon
} from '@mui/icons-material';
import { asistenciaService } from '../services/api';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

const Dashboard = () => {
  const [asistenciasHoy, setAsistenciasHoy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Obtener asistencias del día actual
  useEffect(() => {
    const fetchAsistenciasHoy = async () => {
      try {
        setLoading(true);
        const data = await asistenciaService.getAsistenciasHoy();
        setAsistenciasHoy(data);
      } catch (err) {
        console.error('Error al obtener asistencias:', err);
        setError('No se pudieron cargar las asistencias de hoy. Inténtalo de nuevo más tarde.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAsistenciasHoy();
  }, []);
  
  // Datos para el gráfico circular
  const getChartData = () => {
    if (!asistenciasHoy) return null;
    
    const { asistencias, retardos, faltas, no_registrados } = asistenciasHoy.estadisticas;
    
    return {
      labels: ['Asistencias', 'Retardos', 'Faltas', 'No Registrados'],
      datasets: [
        {
          data: [asistencias, retardos, faltas, no_registrados],
          backgroundColor: [
            '#4caf50', // verde - asistencias
            '#ff9800', // naranja - retardos
            '#f44336', // rojo - faltas
            '#9e9e9e', // gris - no registrados
          ],
          borderWidth: 1,
        },
      ],
    };
  };
  
  // Opciones del gráfico
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };
  
  // Obtener el estado del chip según el estatus
  const getChipProps = (estatus) => {
    if (estatus === 'ASISTENCIA') return { label: 'Asistencia', color: 'success' };
    if (estatus.includes('RETARDO')) return { label: 'Retardo', color: 'warning' };
    if (estatus === 'FALTA') return { label: 'Falta', color: 'error' };
    if (estatus === 'JUSTIFICADO') return { label: 'Justificado', color: 'info' };
    return { label: 'No Registrado', color: 'default' };
  };
  
  return (
    <Box marginTop={3}>
      <Typography variant="h5" gutterBottom>
        Dashboard
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mt: 4 }}>
          {error}
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {/* Tarjetas de estadísticas */}
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Trabajadores
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                    <PeopleIcon />
                  </Avatar>
                  <Typography variant="h4">
                    {asistenciasHoy?.total_trabajadores || 0}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Asistencias
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                    <AssignmentTurnedInIcon />
                  </Avatar>
                  <Typography variant="h4">
                    {asistenciasHoy?.estadisticas?.asistencias || 0}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Retardos
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                    <AccessTimeIcon />
                  </Avatar>
                  <Typography variant="h4">
                    {asistenciasHoy?.estadisticas?.retardos || 0}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Faltas
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: 'error.main', mr: 2 }}>
                    <EventBusyIcon />
                  </Avatar>
                  <Typography variant="h4">
                    {asistenciasHoy?.estadisticas?.faltas || 0}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Gráfico de asistencias */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: 300 }}>
              <Typography variant="h6" gutterBottom>
                Resumen de Asistencias
              </Typography>
              <Box sx={{ height: 220 }}>
                {getChartData() && (
                  <Doughnut data={getChartData()} options={chartOptions} />
                )}
              </Box>
            </Paper>
          </Grid>
          
          {/* Porcentaje de asistencia */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: 300, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" gutterBottom>
                Acciones Rápidas
              </Typography>
              
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
                <Button 
                  variant="contained" 
                  startIcon={<FingerprintIcon />}
                  component={RouterLink}
                  to="/asistencias/registrar"
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  Registrar Asistencia
                </Button>
                
                <Button 
                  variant="outlined"
                  startIcon={<AssignmentLateIcon />}
                  component={RouterLink}
                  to="/justificaciones"
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  Gestionar Justificaciones
                </Button>
                
                <Button 
                  variant="outlined"
                  startIcon={<CalendarTodayIcon />}
                  component={RouterLink}
                  to="/reportes/asistencias-mensuales"
                  fullWidth
                >
                  Ver Reportes Mensuales
                </Button>
              </Box>
            </Paper>
          </Grid>
          
          {/* Lista de registros recientes */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Registros de Hoy ({new Date().toLocaleDateString()})
              </Typography>
              
              <Divider sx={{ mb: 2 }} />
              
              {asistenciasHoy && asistenciasHoy.registros && asistenciasHoy.registros.length > 0 ? (
                <List>
                  {asistenciasHoy.registros.slice(0, 5).map((registro) => {
                    const chipProps = getChipProps(registro.estatus);
                    
                    return (
                      <ListItem key={registro.id} divider>
                        <ListItemAvatar>
                          <Avatar>
                            {chipProps.color === 'success' ? <AssignmentTurnedInIcon /> :
                             chipProps.color === 'warning' ? <AccessTimeIcon /> :
                             chipProps.color === 'error' ? <EventBusyIcon /> :
                             <PeopleIcon />}
                          </Avatar>
                        </ListItemAvatar>
                        
                        <ListItemText
                          primary={registro.nombre}
                          secondary={`${registro.departamento} - ${registro.puesto}`}
                        />
                        
                        <Chip
                          label={chipProps.label}
                          color={chipProps.color}
                          size="small"
                          sx={{ mr: 2 }}
                        />
                        
                        {registro.hora_registro && (
                          <Typography variant="body2" color="text.secondary">
                            {new Date(registro.hora_registro).toLocaleTimeString()}
                          </Typography>
                        )}
                      </ListItem>
                    );
                  })}
                </List>
              ) : (
                <Typography variant="body1" align="center" sx={{ py: 4 }}>
                  No hay registros de asistencia para hoy
                </Typography>
              )}
              
              <CardActions sx={{ justifyContent: 'flex-end' }}>
                <Button 
                  size="small" 
                  component={RouterLink}
                  to="/reportes/asistencias-diarias"
                >
                  Ver Todos
                </Button>
              </CardActions>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default Dashboard;