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

// IMPORTANTE: Configurar dayjs para manejar zonas horarias
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.locale('es');

// Configurar la zona horaria local (México)
const TIMEZONE_LOCAL = 'America/Mexico_City';

import { asistenciaService, trabajadorService, horarioService } from '../../services/api';

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
      
      // Cargar trabajadores y asistencias en paralelo
      const [trabajadoresResponse, asistenciasResponse] = await Promise.all([
        trabajadorService.getAll({ estado: true }),
        asistenciaService.getAsistenciasHoy()
      ]);
      
      console.log('👥 Trabajadores cargados:', trabajadoresResponse);
      console.log('📊 Respuesta de asistencias:', asistenciasResponse);
      
      // Validar estructura de datos
      if (!Array.isArray(trabajadoresResponse)) {
        throw new Error('Los datos de trabajadores no son un array válido');
      }
      
      if (!asistenciasResponse || typeof asistenciasResponse !== 'object') {
        throw new Error('Los datos de asistencias no tienen formato válido');
      }
      
      // Actualizar estados
      setTrabajadores(trabajadoresResponse);
      setAsistenciasHoy(asistenciasResponse.registros || []);
      setEstadisticas(asistenciasResponse.estadisticas || {
        total_trabajadores: trabajadoresResponse.length,
        asistencias: 0,
        retardos: 0,
        faltas: 0,
        no_registrados: trabajadoresResponse.length
      });
      
      setError(null);
      console.log('✅ Datos cargados exitosamente');
      
    } catch (err) {
      console.error('❌ Error al cargar datos:', err);
      console.error('❌ Detalles del error:', err.response?.data);
      console.error('❌ Stack:', err.stack);
      
      let errorMessage = 'Error al cargar datos: ';
      
      if (err.response) {
        // Error del servidor
        errorMessage += `${err.response.status} - ${err.response.data?.detail || err.response.statusText}`;
      } else if (err.request) {
        // Error de conexión
        errorMessage += 'No se pudo conectar con el servidor. Verifica que el backend esté funcionando.';
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
      
      // PASO 2: Preparar datos para envío - USAR LOCAL TIME, NO UTC
      const asistenciaData = {
        id_trabajador: selectedTrabajador.id,
        fecha: fechaHoraCompleta.format('YYYY-MM-DDTHH:mm:ss'), // Formato local sin zona horaria
        estatus: 'PENDIENTE' // El backend determinará el estatus correcto
      };
      
      console.log('📤 === DATOS FINALES PARA ENVÍO ===');
      console.log('📤 Objeto completo:', asistenciaData);
      console.log('📤 Fecha final:', asistenciaData.fecha);
      console.log('📤 Trabajador ID:', asistenciaData.id_trabajador);
      
      // PASO 3: Enviar al backend
      console.log('🚀 Enviando al backend...');
      const response = await asistenciaService.create(asistenciaData);
      console.log('✅ Respuesta del backend:', response);
      
      // PASO 4: Verificar que se guardó correctamente
      console.log('🔍 Verificando registro guardado:');
      console.log('  - ID del registro:', response.id);
      console.log('  - Fecha guardada:', response.fecha);
      console.log('  - Estatus asignado:', response.estatus);
      
      // PASO 5: Recargar datos y cerrar diálogo
      await fetchData();
      handleCloseDialog();
      
      console.log('✅ === REGISTRO COMPLETADO EXITOSAMENTE ===');
      
    } catch (err) {
      console.error('❌ === ERROR EN REGISTRO ===');
      console.error('❌ Error completo:', err);
      console.error('❌ Response status:', err.response?.status);
      console.error('❌ Response data:', err.response?.data);
      
      let errorDetail = 'Error desconocido';
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          errorDetail = err.response.data.detail.map(e => `${e.loc?.join('.')}: ${e.msg}`).join(', ');
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
    console.log('🔍 =================================');
    
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
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Total
                  </Typography>
                  <Typography variant="h5">
                    {estadisticas.total_trabajadores}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleIcon color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Asistencias
                  </Typography>
                  <Typography variant="h5">
                    {estadisticas.asistencias}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <WarningIcon color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Retardos
                  </Typography>
                  <Typography variant="h5">
                    {estadisticas.retardos}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ErrorIcon color="error" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Faltas
                  </Typography>
                  <Typography variant="h5">
                    {estadisticas.faltas}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AccessTimeIcon color="info" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    Pendientes
                  </Typography>
                  <Typography variant="h5">
                    {estadisticas.no_registrados}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Acciones principales */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h6" gutterBottom>
              Métodos de Registro
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Registra la asistencia usando el método biométrico o manualmente
            </Typography>
          </Grid>
          <Grid item xs={12} md={4} sx={{ textAlign: 'right' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenDialog}
              sx={{ mr: 2 }}
            >
              Registro Manual
            </Button>
            <Button
              variant="outlined"
              startIcon={<FingerprintIcon />}
              disabled
              title="Función disponible con lector biométrico"
            >
              Lector Biométrico
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Lista de asistencias del día */}
      <Card>
        <CardHeader
          title="Registros del Día"
          subheader={`${asistenciasHoy.length} registros de asistencia`}
          action={
            <Button
              size="small"
              onClick={fetchData}
              disabled={loading}
              startIcon={<RefreshIcon />}
            >
              Actualizar
            </Button>
          }
        />
        <CardContent>
          {asistenciasHoy.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <AccessTimeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No hay registros de asistencia hoy
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Los registros aparecerán aquí conforme los trabajadores marquen su entrada
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenDialog}
              >
                Registrar Primera Asistencia
              </Button>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Trabajador</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Hora</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Departamento</TableCell>
                    <TableCell align="center">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {asistenciasHoy.map((registro) => (
                    <TableRow key={registro.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                            {registro.nombre.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2">
                              {registro.nombre}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {registro.puesto}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatearFecha(registro.hora_registro)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatearHora(registro.hora_registro)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(registro.estatus)}
                          label={registro.estatus}
                          color={getChipColor(registro.estatus)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{registro.departamento}</TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="primary" title="Editar registro">
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" title="Eliminar registro">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
      
      {/* Diálogo para registro manual */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Registro Manual de Asistencia
        </DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
            <Box sx={{ pt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Trabajadores disponibles: {trabajadores.length}</strong>
                    {trabajadores.length === 0 && (
                      <span style={{ color: 'red' }}> - ⚠️ No hay trabajadores cargados</span>
                    )}
                  </Typography>
                  
                  <Autocomplete
                    options={trabajadores}
                    getOptionLabel={(option) => {
                      const nombreCompleto = `${option.nombre} ${option.apellidoPaterno} ${option.apellidoMaterno}`.trim();
                      return `${nombreCompleto} - ${option.rfc}`;
                    }}
                    value={selectedTrabajador}
                    onChange={(event, newValue) => {
                      console.log('🎯 Trabajador seleccionado:', newValue);
                      setSelectedTrabajador(newValue);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Seleccionar Trabajador"
                        placeholder="Buscar por nombre o RFC"
                        fullWidth
                        helperText={
                          trabajadores.length === 0 
                            ? '❌ No hay trabajadores disponibles. Verifica la conexión con el backend.' 
                            : `✅ ${trabajadores.length} trabajadores cargados`
                        }
                        error={trabajadores.length === 0}
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" {...props}>
                        <Avatar sx={{ mr: 2 }}>{option.nombre.charAt(0)}</Avatar>
                        <Box>
                          <Typography variant="subtitle2">
                            {`${option.nombre} ${option.apellidoPaterno} ${option.apellidoMaterno}`.trim()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.rfc} • {option.puesto} • {option.departamento}
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
                      <br />
                      <small><strong>Nota:</strong> El sistema determinará automáticamente si es asistencia, retardo o falta basado en su horario asignado.</small>
                    </Alert>
                  </Grid>
                )}
                
                {/* Debug información en el diálogo */}
                {trabajadores.length === 0 && (
                  <Grid item xs={12}>
                    <Alert severity="warning">
                      <Typography variant="body2">
                        <strong>Debug Info:</strong>
                        <br />• Backend URL: {process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}
                        <br />• Total trabajadores en estado: {trabajadores.length}
                        <br />• Loading: {loading ? 'Sí' : 'No'}
                        <br />• Error: {error || 'Ninguno'}
                      </Typography>
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </Box>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Cancelar
          </Button>
          <Button
            onClick={handleRegistrarAsistencia}
            variant="contained"
            disabled={!selectedTrabajador || loadingRegistro || trabajadores.length === 0}
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