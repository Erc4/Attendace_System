import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Avatar,
  Autocomplete,
  TextField,
  Divider
} from '@mui/material';
import {
  ArrowBack,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { horarioService } from '../../services/api';

// Utilidades para horarios (temporal hasta actualizar api.js)
const horarioUtils = {
  // Formatear tiempo para mostrar
  formatTime: (timeString) => {
    if (!timeString) return '--:--';
    return timeString.substring(0, 5);
  },

  // Calcular duración entre dos horarios
  calcularDuracion: (entrada, salida) => {
    if (!entrada || !salida) return null;
    
    const [horaEntrada, minutoEntrada] = entrada.split(':').map(Number);
    const [horaSalida, minutoSalida] = salida.split(':').map(Number);
    
    const minutosEntrada = horaEntrada * 60 + minutoEntrada;
    const minutosSalida = horaSalida * 60 + minutoSalida;
    
    if (minutosSalida <= minutosEntrada) return null;
    
    const duracionMinutos = minutosSalida - minutosEntrada;
    const horas = Math.floor(duracionMinutos / 60);
    const minutos = duracionMinutos % 60;
    
    return {
      horas,
      minutos,
      totalMinutos: duracionMinutos,
      formatoTexto: `${horas}h ${minutos}m`
    };
  }
};

const TrabajadoresSinHorario = () => {
  const navigate = useNavigate();
  
  // Estados principales
  const [trabajadores, setTrabajadores] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para asignación masiva
  const [asignacionDialogOpen, setAsignacionDialogOpen] = useState(false);
  const [selectedTrabajadores, setSelectedTrabajadores] = useState([]);
  const [selectedHorario, setSelectedHorario] = useState(null);
  const [fechaInicio, setFechaInicio] = useState(dayjs());
  const [loadingAsignacion, setLoadingAsignacion] = useState(false);
  
  // Estados para asignación individual
  const [asignacionIndividualOpen, setAsignacionIndividualOpen] = useState(false);
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState(null);
  
  // Cargar datos iniciales
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      const [trabajadoresData, horariosData] = await Promise.all([
        horarioService.getTrabajadoresSinHorario(),
        horarioService.getAll()
      ]);
      
      setTrabajadores(trabajadoresData.trabajadores || []);
      setHorarios(horariosData || []);
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError('No se pudieron cargar los datos. Inténtalo de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  };
  
  // Manejar selección de trabajadores
  const handleToggleSeleccion = (trabajadorId) => {
    setSelectedTrabajadores(prev => {
      if (prev.includes(trabajadorId)) {
        return prev.filter(id => id !== trabajadorId);
      } else {
        return [...prev, trabajadorId];
      }
    });
  };
  
  // Seleccionar todos los trabajadores
  const handleSeleccionarTodos = () => {
    if (selectedTrabajadores.length === trabajadores.length) {
      setSelectedTrabajadores([]);
    } else {
      setSelectedTrabajadores(trabajadores.map(t => t.id));
    }
  };
  
  // Abrir diálogo de asignación masiva
  const handleOpenAsignacionMasiva = () => {
    if (selectedTrabajadores.length === 0) {
      setError('Selecciona al menos un trabajador para asignar horario.');
      return;
    }
    setAsignacionDialogOpen(true);
  };
  
  // Cerrar diálogo de asignación masiva
  const handleCloseAsignacionMasiva = () => {
    setAsignacionDialogOpen(false);
    setSelectedHorario(null);
    setFechaInicio(dayjs());
  };
  
  // Abrir asignación individual
  const handleOpenAsignacionIndividual = (trabajador) => {
    setTrabajadorSeleccionado(trabajador);
    setAsignacionIndividualOpen(true);
  };
  
  // Cerrar asignación individual
  const handleCloseAsignacionIndividual = () => {
    setAsignacionIndividualOpen(false);
    setTrabajadorSeleccionado(null);
    setSelectedHorario(null);
    setFechaInicio(dayjs());
  };
  
  // Asignar horario a trabajadores seleccionados
  const handleAsignarHorario = async (esIndividual = false) => {
    if (!selectedHorario) return;
    
    const trabajadoresAAsignar = esIndividual 
      ? [trabajadorSeleccionado.id]
      : selectedTrabajadores;
    
    try {
      setLoadingAsignacion(true);
      
      // Asignar a cada trabajador seleccionado
      const promesas = trabajadoresAAsignar.map(trabajadorId =>
        horarioService.asignarTrabajador(selectedHorario.id, {
          id_trabajador: trabajadorId,
          fehcaInicio: fechaInicio.toISOString()
        })
      );
      
      await Promise.all(promesas);
      
      // Recargar datos
      await fetchData();
      
      // Limpiar selecciones
      setSelectedTrabajadores([]);
      
      // Cerrar diálogos
      if (esIndividual) {
        handleCloseAsignacionIndividual();
      } else {
        handleCloseAsignacionMasiva();
      }
      
      setError(null);
      
    } catch (err) {
      console.error('Error al asignar horario:', err);
      setError('No se pudo asignar el horario. Inténtalo de nuevo.');
    } finally {
      setLoadingAsignacion(false);
    }
  };
  
  // Agrupar trabajadores por departamento
  const trabajadoresPorDepartamento = trabajadores.reduce((acc, trabajador) => {
    const dept = trabajador.departamento || 'Sin departamento';
    if (!acc[dept]) {
      acc[dept] = [];
    }
    acc[dept].push(trabajador);
    return acc;
  }, {});
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Cargando trabajadores sin horario...</Typography>
      </Box>
    );
  }
  
  return (
    <Container>
      <Box sx={{ mb: 4 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/horarios')}
          sx={{ mb: 2 }}
        >
          Volver a horarios
        </Button>
        
        <Typography variant="h4" gutterBottom>
          Trabajadores Sin Horario
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          {trabajadores.length} trabajador{trabajadores.length !== 1 ? 'es' : ''} sin horario asignado
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Estadísticas y acciones */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <WarningIcon color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Sin Horario
                  </Typography>
                  <Typography variant="h5">
                    {trabajadores.length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleIcon color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Seleccionados
                  </Typography>
                  <Typography variant="h5">
                    {selectedTrabajadores.length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ScheduleIcon color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Horarios Disponibles
                  </Typography>
                  <Typography variant="h5">
                    {horarios.length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon color="info" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Departamentos
                  </Typography>
                  <Typography variant="h5">
                    {Object.keys(trabajadoresPorDepartamento).length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Acciones principales */}
      <Paper sx={{ p: 2, mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                onClick={handleSeleccionarTodos}
                disabled={trabajadores.length === 0}
              >
                {selectedTrabajadores.length === trabajadores.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
              </Button>
              
              <Chip
                label={`${selectedTrabajadores.length} seleccionados`}
                color={selectedTrabajadores.length > 0 ? 'primary' : 'default'}
                variant={selectedTrabajadores.length > 0 ? 'filled' : 'outlined'}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6} sx={{ textAlign: 'right' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AssignmentIcon />}
              onClick={handleOpenAsignacionMasiva}
              disabled={selectedTrabajadores.length === 0}
            >
              Asignar Horario a Seleccionados
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {trabajadores.length === 0 ? (
        <Card sx={{ textAlign: 'center', p: 4 }}>
          <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            ¡Excelente!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Todos los trabajadores activos tienen un horario asignado.
          </Typography>
          <Button
            variant="contained"
            component={RouterLink}
            to="/horarios"
            startIcon={<ScheduleIcon />}
          >
            Ver Todos los Horarios
          </Button>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {Object.entries(trabajadoresPorDepartamento).map(([departamento, trabajadoresDept]) => (
            <Grid item xs={12} key={departamento}>
              <Card>
                <CardHeader
                  title={departamento}
                  subheader={`${trabajadoresDept.length} trabajador${trabajadoresDept.length !== 1 ? 'es' : ''}`}
                />
                <CardContent>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox">
                            <input
                              type="checkbox"
                              checked={trabajadoresDept.every(t => selectedTrabajadores.includes(t.id))}
                              onChange={() => {
                                const todosSeleccionados = trabajadoresDept.every(t => selectedTrabajadores.includes(t.id));
                                if (todosSeleccionados) {
                                  // Deseleccionar todos del departamento
                                  setSelectedTrabajadores(prev => 
                                    prev.filter(id => !trabajadoresDept.find(t => t.id === id))
                                  );
                                } else {
                                  // Seleccionar todos del departamento
                                  const idsDepth = trabajadoresDept.map(t => t.id);
                                  setSelectedTrabajadores(prev => [...new Set([...prev, ...idsDepth])]);
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>Trabajador</TableCell>
                          <TableCell>RFC</TableCell>
                          <TableCell>Puesto</TableCell>
                          <TableCell align="center">Estado</TableCell>
                          <TableCell align="center">Acciones</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {trabajadoresDept.map((trabajador) => (
                          <TableRow key={trabajador.id} hover>
                            <TableCell padding="checkbox">
                              <input
                                type="checkbox"
                                checked={selectedTrabajadores.includes(trabajador.id)}
                                onChange={() => handleToggleSeleccion(trabajador.id)}
                              />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Avatar sx={{ mr: 2, bgcolor: 'warning.main' }}>
                                  {trabajador.nombre.charAt(0)}
                                </Avatar>
                                <Box>
                                  <Typography variant="subtitle2">
                                    {trabajador.nombre}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    ID: {trabajador.id}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>{trabajador.rfc}</TableCell>
                            <TableCell>{trabajador.puesto}</TableCell>
                            <TableCell align="center">
                              <Chip
                                icon={<WarningIcon />}
                                label="Sin Horario"
                                color="warning"
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleOpenAsignacionIndividual(trabajador)}
                                title="Asignar horario"
                              >
                                <ScheduleIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* Diálogo para asignación masiva */}
      <Dialog open={asignacionDialogOpen} onClose={handleCloseAsignacionMasiva} maxWidth="sm" fullWidth>
        <DialogTitle>
          Asignar Horario a Trabajadores Seleccionados
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Se asignará el horario seleccionado a {selectedTrabajadores.length} trabajador{selectedTrabajadores.length !== 1 ? 'es' : ''}
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Autocomplete
                  options={horarios}
                  getOptionLabel={(option) => `${option.descripcion} (${horarioUtils.formatTime(option.lunesEntrada)} - ${horarioUtils.formatTime(option.lunesSalida)})`}
                  value={selectedHorario}
                  onChange={(event, newValue) => setSelectedHorario(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Seleccionar Horario"
                      placeholder="Buscar horario por descripción"
                      fullWidth
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <ScheduleIcon sx={{ mr: 2, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="subtitle2">
                          {option.descripcion}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {horarioUtils.formatTime(option.lunesEntrada)} - {horarioUtils.formatTime(option.lunesSalida)} • 
                          {horarioUtils.calcularDuracion(option.lunesEntrada, option.lunesSalida)?.formatoTexto || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                />
              </Grid>
              
              <Grid item xs={12}>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                  <DatePicker
                    label="Fecha de Inicio"
                    value={fechaInicio}
                    onChange={(newValue) => setFechaInicio(newValue)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        helperText: 'Fecha desde la cual aplicará este horario'
                      }
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              
              {selectedHorario && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    Se asignará el horario "{selectedHorario.descripcion}" a {selectedTrabajadores.length} trabajador{selectedTrabajadores.length !== 1 ? 'es' : ''} 
                    a partir del {fechaInicio.format('DD/MM/YYYY')}.
                  </Alert>
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAsignacionMasiva}>
            Cancelar
          </Button>
          <Button
            onClick={() => handleAsignarHorario(false)}
            variant="contained"
            disabled={!selectedHorario || loadingAsignacion}
            startIcon={loadingAsignacion ? <CircularProgress size={20} /> : <AssignmentIcon />}
          >
            {loadingAsignacion ? 'Asignando...' : `Asignar a ${selectedTrabajadores.length} trabajador${selectedTrabajadores.length !== 1 ? 'es' : ''}`}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo para asignación individual */}
      <Dialog open={asignacionIndividualOpen} onClose={handleCloseAsignacionIndividual} maxWidth="sm" fullWidth>
        <DialogTitle>
          Asignar Horario
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              {trabajadorSeleccionado && (
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                      {trabajadorSeleccionado.nombre.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1">
                        {trabajadorSeleccionado.nombre}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {trabajadorSeleccionado.rfc} • {trabajadorSeleccionado.puesto} • {trabajadorSeleccionado.departamento}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              )}
              
              <Grid item xs={12}>
                <Autocomplete
                  options={horarios}
                  getOptionLabel={(option) => `${option.descripcion} (${horarioUtils.formatTime(option.lunesEntrada)} - ${horarioUtils.formatTime(option.lunesSalida)})`}
                  value={selectedHorario}
                  onChange={(event, newValue) => setSelectedHorario(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Seleccionar Horario"
                      placeholder="Buscar horario por descripción"
                      fullWidth
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <ScheduleIcon sx={{ mr: 2, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="subtitle2">
                          {option.descripcion}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {horarioUtils.formatTime(option.lunesEntrada)} - {horarioUtils.formatTime(option.lunesSalida)} • 
                          {horarioUtils.calcularDuracion(option.lunesEntrada, option.lunesSalida)?.formatoTexto || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                />
              </Grid>
              
              <Grid item xs={12}>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                  <DatePicker
                    label="Fecha de Inicio"
                    value={fechaInicio}
                    onChange={(newValue) => setFechaInicio(newValue)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        helperText: 'Fecha desde la cual aplicará este horario'
                      }
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              
              {selectedHorario && trabajadorSeleccionado && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    Se asignará el horario "{selectedHorario.descripcion}" a {trabajadorSeleccionado.nombre} 
                    a partir del {fechaInicio.format('DD/MM/YYYY')}.
                  </Alert>
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAsignacionIndividual}>
            Cancelar
          </Button>
          <Button
            onClick={() => handleAsignarHorario(true)}
            variant="contained"
            disabled={!selectedHorario || loadingAsignacion}
            startIcon={loadingAsignacion ? <CircularProgress size={20} /> : <ScheduleIcon />}
          >
            {loadingAsignacion ? 'Asignando...' : 'Asignar Horario'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TrabajadoresSinHorario;