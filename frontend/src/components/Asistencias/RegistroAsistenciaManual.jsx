import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Container,
  Grid,
  Typography,
  Alert,
  CircularProgress,
  Autocomplete,
  TextField,
  Chip,
  Avatar,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle
} from '@mui/material';
import {
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  ErrorOutline as ErrorIcon,
  Fingerprint as FingerprintIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/es';

import { asistenciaService, trabajadorService, horarioService } from '../../services/api';

// IMPORTANTE: Configurar dayjs para manejar zonas horarias
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.locale('es');

// Configurar la zona horaria local - Los Mochis, Sinaloa (MST/MDT)
const TIMEZONE_LOCAL = 'America/Mazatlan';

const RegistroAsistenciaManual = () => {
  const navigate = useNavigate();
  
  // Estados principales
  const [trabajadores, setTrabajadores] = useState([]);
  const [asistenciasHoy, setAsistenciasHoy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para registro manual
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTrabajador, setSelectedTrabajador] = useState(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(dayjs().tz(TIMEZONE_LOCAL));
  const [horaRegistro, setHoraRegistro] = useState(dayjs().tz(TIMEZONE_LOCAL));
  const [loadingRegistro, setLoadingRegistro] = useState(false);
  
  // Estados para estadísticas
  const [estadisticas, setEstadisticas] = useState({
    total_trabajadores: 0,
    asistencias: 0,
    retardos: 0,
    faltas: 0,
    no_registrados: 0
  });
  
  // Cargar datos iniciales
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Cargando datos de asistencias y trabajadores...');
      
      // Primero, intentar cargar trabajadores de forma independiente para debug
      try {
        console.log('📡 Intentando cargar trabajadores...');
        const trabajadoresTest = await trabajadorService.getAll({ estado: true });
        console.log('📊 Respuesta trabajadores (test):', trabajadoresTest);
      } catch (testError) {
        console.error('❌ Error en prueba de trabajadores:', testError);
      }
      
      // Cargar trabajadores y asistencias en paralelo
      const [trabajadoresResponse, asistenciasResponse] = await Promise.all([
        trabajadorService.getAll({ estado: true }),
        asistenciaService.getAsistenciasHoy()
      ]);
      
      console.log('✅ Respuesta trabajadores completa:', trabajadoresResponse);
      console.log('✅ Tipo de respuesta trabajadores:', typeof trabajadoresResponse);
      console.log('✅ Es array?:', Array.isArray(trabajadoresResponse));
      console.log('✅ Trabajadores cargados:', trabajadoresResponse?.length || 0);
      console.log('✅ Asistencias de hoy:', asistenciasResponse.registros?.length || 0);
      
      // La respuesta puede venir como array directo o como objeto con propiedad trabajadores
      const trabajadoresArray = Array.isArray(trabajadoresResponse) 
        ? trabajadoresResponse 
        : (trabajadoresResponse?.trabajadores || []);
      
      console.log('📋 Array final de trabajadores:', trabajadoresArray);
      console.log('📋 Cantidad de trabajadores:', trabajadoresArray.length);
      
      setTrabajadores(trabajadoresArray);
      setAsistenciasHoy(asistenciasResponse.registros || []);
      setEstadisticas(asistenciasResponse.estadisticas || {
        total_trabajadores: 0,
        asistencias: 0,
        retardos: 0,
        faltas: 0,
        no_registrados: 0
      });
      
    } catch (err) {
      console.error('❌ Error al cargar datos:', err);
      console.error('❌ Stack trace:', err.stack);
      
      // Manejar diferentes tipos de error
      let errorMessage = 'Error al cargar los datos. ';
      
      if (err.response) {
        // Error del servidor
        console.error('❌ Response status:', err.response.status);
        console.error('❌ Response data:', err.response.data);
        console.error('❌ Response headers:', err.response.headers);
        
        if (err.response.status === 404) {
          errorMessage += 'Servicio no encontrado. Verifica la conexión con el backend.';
        } else if (err.response.status === 401) {
          errorMessage += 'No autorizado. Por favor inicia sesión nuevamente.';
          navigate('/login');
          return;
        } else if (err.response.status === 500) {
          errorMessage += `Error del servidor: ${err.response.data?.detail || 'Error interno'}`;
        } else {
          errorMessage += err.response.data?.detail || 'Error del servidor.';
        }
      } else if (err.request) {
        // Sin respuesta del servidor
        console.error('❌ Request:', err.request);
        errorMessage += 'No se pudo conectar con el servidor. Verifica que el backend esté funcionando en http://localhost:8000';
      } else {
        // Error de configuración
        errorMessage += err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  // FUNCIÓN CORREGIDA: Combinar fecha y hora correctamente
  const combinarFechaHora = (fecha, hora) => {
    console.log('🔧 Combinando fecha y hora...');
    console.log('📅 Fecha seleccionada:', fecha.format('YYYY-MM-DD'));
    console.log('🕐 Hora seleccionada:', hora.format('HH:mm:ss'));
    
    // MÉTODO 1: Crear una nueva fecha combinando año, mes, día, hora, minuto, segundo
    const fechaHoraCombinada = dayjs()
      .tz(TIMEZONE_LOCAL)
      .year(fecha.year())
      .month(fecha.month())
      .date(fecha.date())
      .hour(hora.hour())
      .minute(hora.minute())
      .second(hora.second())
      .millisecond(0);
    
    console.log('✅ Fecha y hora combinada (método dayjs):', fechaHoraCombinada.format('YYYY-MM-DD HH:mm:ss'));
    console.log('🌍 Zona horaria:', fechaHoraCombinada.format('Z'));
    
    // MÉTODO 2: Usar formato de cadena para mayor precisión
    const fechaString = fecha.format('YYYY-MM-DD');
    const horaString = hora.format('HH:mm:ss');
    const fechaHoraString = `${fechaString} ${horaString}`;
    
    console.log('📝 String combinado:', fechaHoraString);
    
    // Crear objeto dayjs desde string en zona horaria local
    const fechaHoraPrecisa = dayjs.tz(fechaHoraString, 'YYYY-MM-DD HH:mm:ss', TIMEZONE_LOCAL);
    
    console.log('✅ Fecha y hora precisa:', fechaHoraPrecisa.format('YYYY-MM-DD HH:mm:ss'));
    console.log('🌍 UTC:', fechaHoraPrecisa.utc().format('YYYY-MM-DD HH:mm:ss'));
    console.log('📤 ISO String:', fechaHoraPrecisa.toISOString());
    
    return fechaHoraPrecisa;
  };
  
  // FUNCIÓN CORREGIDA: Registrar asistencia manual
  const handleRegistrarAsistencia = async () => {
    if (!selectedTrabajador) {
      setError('Debe seleccionar un trabajador');
      return;
    }
    
    try {
      setLoadingRegistro(true);
      console.log('📝 === INICIANDO REGISTRO DE ASISTENCIA ===');
      console.log('👤 Trabajador seleccionado:', selectedTrabajador);
      console.log('📅 Fecha original:', fechaSeleccionada.format());
      console.log('🕐 Hora original:', horaRegistro.format());
      
      // PASO 1: Combinar fecha y hora correctamente
      const fechaHoraCompleta = combinarFechaHora(fechaSeleccionada, horaRegistro);
      
      // PASO 2: Preparar datos para envío - ENVIAR CON OFFSET DE ZONA HORARIA
      const asistenciaData = {
        id_trabajador: selectedTrabajador.id,
        fecha: fechaHoraCompleta.format(), // Incluir información de zona horaria completa
        estatus: 'PENDIENTE' // El backend determinará el estatus correcto
      };
      
      console.log('📤 Datos a enviar:', asistenciaData);
      console.log('📤 Fecha con offset:', asistenciaData.fecha);
      
      // PASO 3: Enviar al backend
      const response = await asistenciaService.create(asistenciaData);
      
      console.log('✅ Respuesta del servidor:', response);
      
      // PASO 4: Actualizar la interfaz
      setDialogOpen(false);
      setSelectedTrabajador(null);
      setError(null);
      
      // Recargar datos para mostrar el nuevo registro
      await fetchData();
      
      // Mostrar mensaje de éxito temporal
      setError(null);
      setTimeout(() => {
        setError(`✅ Asistencia registrada correctamente para ${selectedTrabajador.nombre} - Estatus: ${response.estatus}`);
      }, 100);
      
      // Limpiar mensaje después de 5 segundos
      setTimeout(() => {
        setError(null);
      }, 5000);
      
    } catch (err) {
      console.error('❌ Error al registrar asistencia:', err);
      
      let errorDetail = '';
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          errorDetail = err.response.data.detail.map(e => `${e.loc.join('.')}: ${e.msg}`).join(', ');
        } else {
          errorDetail = err.response.data.detail;
        }
      } else {
        errorDetail = err.message;
      }
      
      setError(`No se pudo registrar la asistencia: ${errorDetail}`);
    } finally {
      setLoadingRegistro(false);
    }
  };
  
  // Obtener color del chip según estatus
  const getChipColor = (estatus) => {
    if (estatus === 'ASISTENCIA') return 'success';
    if (estatus === 'RETARDO_MENOR') return 'warning';
    if (estatus === 'RETARDO_MAYOR') return 'warning';
    if (estatus === 'FALTA') return 'error';
    if (estatus === 'JUSTIFICADO') return 'info';
    return 'default';
  };
  
  // Obtener icono según estatus
  const getStatusIcon = (estatus) => {
    if (estatus === 'ASISTENCIA') return <CheckCircleIcon />;
    if (estatus === 'RETARDO_MENOR' || estatus === 'RETARDO_MAYOR') return <WarningIcon />;
    if (estatus === 'FALTA') return <ErrorIcon />;
    if (estatus === 'JUSTIFICADO') return <AccessTimeIcon />;
    return <PersonIcon />;
  };
  
  // Abrir diálogo de registro
  const handleOpenDialog = () => {
    const ahora = dayjs().tz(TIMEZONE_LOCAL);
    setDialogOpen(true);
    setFechaSeleccionada(ahora);
    setHoraRegistro(ahora);
    setSelectedTrabajador(null);
    setError(null);
    
    console.log('🔄 Diálogo abierto - Estado inicial:');
    console.log('📅 Fecha inicial:', ahora.format('YYYY-MM-DD HH:mm:ss'));
    console.log('🌍 Zona horaria:', TIMEZONE_LOCAL);
  };
  
  // Cerrar diálogo de registro
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedTrabajador(null);
    const ahora = dayjs().tz(TIMEZONE_LOCAL);
    setFechaSeleccionada(ahora);
    setHoraRegistro(ahora);
    setError(null);
  };
  
  // Función de debug
  const handleDebug = () => {
    console.log('🔍 =================================');
    console.log('🔍 DEBUG REGISTRO ASISTENCIA MANUAL');
    console.log('🔍 =================================');
    console.log('📊 Estado actual del componente:');
    console.log('  - Loading:', loading);
    console.log('  - Error:', error);
    console.log('  - Total trabajadores:', trabajadores.length);
    console.log('  - Asistencias hoy:', asistenciasHoy.length);
    console.log('  - Estadísticas:', estadisticas);
    console.log('🕐 Configuración de zona horaria:');
    console.log('  - Zona horaria local:', TIMEZONE_LOCAL);
    console.log('  - Hora actual local:', dayjs().tz(TIMEZONE_LOCAL).format());
    console.log('  - Hora actual UTC:', dayjs().utc().format());
    console.log('👥 Lista de trabajadores:', trabajadores);
    console.log('📅 Registros del día:', asistenciasHoy);
    console.log('🔧 Servicios importados:');
    console.log('  - asistenciaService:', asistenciaService);
    console.log('  - trabajadorService:', trabajadorService);
    console.log('  - horarioService:', horarioService);
    console.log('🌐 Backend URL:', process.env.REACT_APP_API_URL || 'http://localhost:8000');
    console.log('🔍 =================================');
    
    // Verificar token de autenticación
    const token = localStorage.getItem('token');
    console.log('🔐 Token presente:', !!token);
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('🔐 Token payload:', payload);
        console.log('🔐 Token expiración:', new Date(payload.exp * 1000));
      } catch (e) {
        console.error('🔐 Error al decodificar token:', e);
      }
    }
    
    // Intentar recargar datos
    console.log('🔄 Recargando datos...');
    fetchData();
  };
  
  // Función para formatear horas de manera consistente
  const formatearHora = (fechaHora) => {
    if (!fechaHora) return '--:--:--';
    return dayjs(fechaHora).tz(TIMEZONE_LOCAL).format('HH:mm:ss');
  };
  
  const formatearFecha = (fechaHora) => {
    if (!fechaHora) return '--/--/----';
    return dayjs(fechaHora).tz(TIMEZONE_LOCAL).format('DD/MM/YYYY');
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Cargando sistema de asistencias...</Typography>
      </Box>
    );
  }
  
  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Registro de Asistencias
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Sistema de control de asistencias - {dayjs().tz(TIMEZONE_LOCAL).format('dddd, D [de] MMMM [de] YYYY')}
            </Typography>
          </Box>
          
          {/* Botón de debug */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleDebug}
              startIcon={<RefreshIcon />}
            >
              Debug/Recargar
            </Button>
          </Box>
        </Box>
      </Box>
      
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => setError(null)}
            >
              Cerrar
            </Button>
          }
        >
          <Typography variant="body2">
            {error}
          </Typography>
        </Alert>
      )}
      
      {/* Información de debug */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
        <Typography variant="caption" color="text.secondary">
          <strong>Debug Info:</strong> {trabajadores.length} trabajadores | 
          {asistenciasHoy.length} registros hoy | 
          Zona horaria: {TIMEZONE_LOCAL} | 
          Hora local: {dayjs().tz(TIMEZONE_LOCAL).format('HH:mm:ss')} | 
          Backend: {error ? '❌ Error' : '✅ OK'}
        </Typography>
      </Paper>
      
      {/* Estadísticas del día */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total Trabajadores
              </Typography>
              <Typography variant="h4" component="div">
                {estadisticas.total_trabajadores}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ borderLeft: 4, borderColor: 'success.main' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Asistencias
              </Typography>
              <Typography variant="h4" component="div" color="success.main">
                {estadisticas.asistencias}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ borderLeft: 4, borderColor: 'warning.main' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Retardos
              </Typography>
              <Typography variant="h4" component="div" color="warning.main">
                {estadisticas.retardos}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ borderLeft: 4, borderColor: 'error.main' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Faltas
              </Typography>
              <Typography variant="h4" component="div" color="error.main">
                {estadisticas.faltas}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ borderLeft: 4, borderColor: 'grey.500' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Sin Registro
              </Typography>
              <Typography variant="h4" component="div" color="text.secondary">
                {estadisticas.no_registrados}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Acciones principales */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
          size="large"
        >
          Registrar Asistencia Manual
        </Button>
      </Box>
      
      {/* Tabla de asistencias del día */}
      <Card>
        <CardHeader 
          title="Registros del Día"
          subheader={`Mostrando ${asistenciasHoy.length} registros`}
        />
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Trabajador</TableCell>
                  <TableCell>RFC</TableCell>
                  <TableCell>Departamento</TableCell>
                  <TableCell>Hora Registro</TableCell>
                  <TableCell align="center">Estatus</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {asistenciasHoy.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                        No hay registros de asistencia para hoy
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  asistenciasHoy.map((registro) => (
                    <TableRow key={registro.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                            {registro.nombre ? registro.nombre.charAt(0) : '?'}
                          </Avatar>
                          {registro.nombre || 'Sin nombre'}
                        </Box>
                      </TableCell>
                      <TableCell>{registro.rfc || 'N/A'}</TableCell>
                      <TableCell>{registro.departamento || 'Sin departamento'}</TableCell>
                      <TableCell>{formatearHora(registro.hora_registro)}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={registro.estatus}
                          color={getChipColor(registro.estatus)}
                          icon={getStatusIcon(registro.estatus)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" disabled>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" disabled>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
      
      {/* Diálogo de registro manual */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <FingerprintIcon sx={{ mr: 1 }} />
            Registrar Asistencia Manual
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Autocomplete
                  options={trabajadores}
                  getOptionLabel={(option) => 
                    `${option.nombre} ${option.apellidoPaterno} ${option.apellidoMaterno} - ${option.rfc}`
                  }
                  value={selectedTrabajador}
                  onChange={(event, newValue) => {
                    console.log('👤 Trabajador seleccionado:', newValue);
                    setSelectedTrabajador(newValue);
                  }}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="Buscar Trabajador" 
                      fullWidth
                      placeholder="Escribe para buscar..."
                      helperText={
                        trabajadores.length === 0 
                          ? "❌ No hay trabajadores cargados - Revisar backend" 
                          : `${trabajadores.length} trabajadores disponibles`
                      }
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Avatar sx={{ mr: 2 }}>
                        {option.nombre.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body1">
                          {`${option.nombre} ${option.apellidoPaterno} ${option.apellidoMaterno}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          RFC: {option.rfc} | Depto: {option.departamento}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  noOptionsText={
                    trabajadores.length === 0 
                      ? "❌ No hay trabajadores cargados - Revisar backend" 
                      : "No se encontraron coincidencias"
                  }
                  loading={loading}
                  disabled={trabajadores.length === 0}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Fecha"
                  value={fechaSeleccionada}
                  onChange={(newValue) => {
                    console.log('📅 Nueva fecha seleccionada:', newValue.format('YYYY-MM-DD'));
                    setFechaSeleccionada(newValue);
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      helperText: `Fecha: ${fechaSeleccionada.format('DD/MM/YYYY')}`
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TimePicker
                  label="Hora de Registro"
                  value={horaRegistro}
                  onChange={(newValue) => {
                    console.log('🕐 Nueva hora seleccionada:', newValue.format('HH:mm:ss'));
                    setHoraRegistro(newValue);
                  }}
                  ampm={false}
                  views={['hours', 'minutes', 'seconds']}
                  format="HH:mm:ss"
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      helperText: `Hora: ${horaRegistro.format('HH:mm:ss')}`
                    }
                  }}
                />
              </Grid>
              
              {/* Información de debug en tiempo real */}
              <Grid item xs={12}>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="caption" color="text.secondary">
                    <strong>Vista Previa:</strong><br />
                    Fecha seleccionada: {fechaSeleccionada.format('YYYY-MM-DD')}<br />
                    Hora seleccionada: {horaRegistro.format('HH:mm:ss')}<br />
                    Combinación final: {combinarFechaHora(fechaSeleccionada, horaRegistro).format('YYYY-MM-DD HH:mm:ss')}<br />
                    Zona horaria: {TIMEZONE_LOCAL}
                  </Typography>
                </Paper>
              </Grid>
              
              {selectedTrabajador && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    Se registrará la asistencia de <strong>{selectedTrabajador.nombre}</strong> 
                    para el {fechaSeleccionada.format('DD/MM/YYYY')} a las {horaRegistro.format('HH:mm:ss')}.
                  </Alert>
                </Grid>
              )}
            </Grid>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button 
            onClick={handleRegistrarAsistencia} 
            variant="contained"
            disabled={!selectedTrabajador || loadingRegistro}
            startIcon={loadingRegistro ? <CircularProgress size={20} /> : <CheckCircleIcon />}
          >
            {loadingRegistro ? 'Registrando...' : 'Registrar Asistencia'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default RegistroAsistenciaManual;