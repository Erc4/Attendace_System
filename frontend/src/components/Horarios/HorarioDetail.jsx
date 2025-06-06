import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Alert,
  Autocomplete,
  TextField,
  Avatar,
  ListItemAvatar
} from '@mui/material';
import {
  ArrowBack,
  Edit as EditIcon,
  PersonAdd as PersonAddIcon,
  Schedule as ScheduleIcon,
  AccessTime as AccessTimeIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { horarioService, trabajadorService } from '../../services/api';

// Utilidades para horarios
const horarioUtils = {
  formatTime: (timeString) => {
    if (!timeString) return '--:--';
    return timeString.substring(0, 5);
  },
  
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
    
    return `${horas}h ${minutos}m`;
  }
};

const HorarioDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Estados principales
  const [horarioData, setHorarioData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para asignación de trabajadores
  const [asignacionDialogOpen, setAsignacionDialogOpen] = useState(false);
  const [trabajadoresDisponibles, setTrabajadoresDisponibles] = useState([]);
  const [selectedTrabajador, setSelectedTrabajador] = useState(null);
  const [fechaInicio, setFechaInicio] = useState(dayjs());
  const [loadingAsignacion, setLoadingAsignacion] = useState(false);
  
  // Cargar datos del horario
  useEffect(() => {
    fetchHorarioData();
  }, [id]);
  
  const fetchHorarioData = async () => {
    try {
      setLoading(true);
      const data = await horarioService.getById(id);
      setHorarioData(data);
    } catch (err) {
      console.error('Error al cargar horario:', err);
      setError('No se pudieron cargar los datos del horario.');
    } finally {
      setLoading(false);
    }
  };
  
  // Cargar trabajadores disponibles para asignación
  const fetchTrabajadoresDisponibles = async () => {
    try {
      const [allTrabajadores, sinHorario] = await Promise.all([
        trabajadorService.getAll({ estado: true }),
        horarioService.getTrabajadoresSinHorario()
      ]);
      
      // Combinar trabajadores sin horario con los que ya tienen otros horarios
      const disponibles = [
        ...sinHorario.trabajadores,
        ...allTrabajadores.filter(t => 
          t.id_horario && 
          t.id_horario !== parseInt(id) &&
          !sinHorario.trabajadores.find(s => s.id === t.id)
        )
      ];
      
      setTrabajadoresDisponibles(disponibles);
    } catch (err) {
      console.error('Error al cargar trabajadores:', err);
    }
  };
  
  // Abrir diálogo de asignación
  const handleOpenAsignacion = () => {
    fetchTrabajadoresDisponibles();
    setAsignacionDialogOpen(true);
  };
  
  // Cerrar diálogo de asignación
  const handleCloseAsignacion = () => {
    setAsignacionDialogOpen(false);
    setSelectedTrabajador(null);
    setFechaInicio(dayjs());
  };
  
  // Asignar trabajador al horario
  const handleAsignarTrabajador = async () => {
    if (!selectedTrabajador) return;
    
    try {
      setLoadingAsignacion(true);
      
      await horarioService.asignarTrabajador(id, {
        id_trabajador: selectedTrabajador.id,
        fehcaInicio: fechaInicio.toISOString()
      });
      
      // Recargar datos
      await fetchHorarioData();
      handleCloseAsignacion();
      
    } catch (err) {
      console.error('Error al asignar trabajador:', err);
      setError('No se pudo asignar el trabajador al horario.');
    } finally {
      setLoadingAsignacion(false);
    }
  };
  
  // Formatear tiempo para mostrar
  const formatTime = (timeString) => {
    if (!timeString) return '--:--';
    return timeString.substring(0, 5);
  };
  
  // Calcular duración de jornada
  const calcularDuracion = (entrada, salida) => {
    if (!entrada || !salida) return null;
    
    const [horaEntrada, minutoEntrada] = entrada.split(':').map(Number);
    const [horaSalida, minutoSalida] = salida.split(':').map(Number);
    
    const minutosEntrada = horaEntrada * 60 + minutoEntrada;
    const minutosSalida = horaSalida * 60 + minutoSalida;
    
    if (minutosSalida <= minutosEntrada) return null;
    
    const duracionMinutos = minutosSalida - minutosEntrada;
    const horas = Math.floor(duracionMinutos / 60);
    const minutos = duracionMinutos % 60;
    
    return `${horas}h ${minutos}m`;
  };
  
  // Obtener color del chip según duración
  const getDuracionColor = (entrada, salida) => {
    const duracion = calcularDuracion(entrada, salida);
    if (!duracion) return 'default';
    
    const [horas] = duracion.split('h').map(Number);
    if (horas < 6) return 'warning';
    if (horas > 8) return 'info';
    return 'success';
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Cargando datos del horario...</Typography>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }}>
          {error}
        </Alert>
        <Button
          sx={{ mt: 2 }}
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/horarios')}
        >
          Volver a horarios
        </Button>
      </Container>
    );
  }
  
  if (!horarioData) {
    return (
      <Container>
        <Alert severity="warning" sx={{ mt: 4 }}>
          No se encontró información del horario
        </Alert>
        <Button
          sx={{ mt: 2 }}
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/horarios')}
        >
          Volver a horarios
        </Button>
      </Container>
    );
  }
  
  const { horario, trabajadores_asignados, total_trabajadores, asignaciones_historicas } = horarioData;
  
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
        
        <Grid container alignItems="center" spacing={2}>
          <Grid item xs>
            <Typography variant="h4" gutterBottom>
              {horario.descripcion}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Horario ID: {horario.id} • {total_trabajadores} trabajador{total_trabajadores !== 1 ? 'es' : ''} asignado{total_trabajadores !== 1 ? 's' : ''}
            </Typography>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              startIcon={<PersonAddIcon />}
              onClick={handleOpenAsignacion}
              sx={{ mr: 1 }}
            >
              Asignar Trabajador
            </Button>
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              component={RouterLink}
              to={`/horarios/${id}/editar`}
            >
              Editar
            </Button>
          </Grid>
        </Grid>
      </Box>
      
      <Grid container spacing={3}>
        {/* Información del horario */}
        <Grid item xs={12}>
          <Card>
            <CardHeader 
              title="Horarios de Trabajo"
              avatar={<ScheduleIcon color="primary" />}
            />
            <CardContent>
              <Grid container spacing={2}>
                {[
                  { dia: 'Lunes', entrada: horario.lunesEntrada, salida: horario.lunesSalida },
                  { dia: 'Martes', entrada: horario.martesEntrada, salida: horario.martesSalida },
                  { dia: 'Miércoles', entrada: horario.miercolesEntrada, salida: horario.miercolesSalida },
                  { dia: 'Jueves', entrada: horario.juevesEntrada, salida: horario.juevesSalida },
                  { dia: 'Viernes', entrada: horario.viernesEntrada, salida: horario.viernesSalida }
                ].map((diaInfo) => (
                  <Grid item xs={12} sm={6} md={4} lg={2.4} key={diaInfo.dia}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        {diaInfo.dia}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                        <AccessTimeIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {formatTime(diaInfo.entrada)} - {formatTime(diaInfo.salida)}
                        </Typography>
                      </Box>
                      <Chip
                        label={calcularDuracion(diaInfo.entrada, diaInfo.salida) || 'N/A'}
                        size="small"
                        color={getDuracionColor(diaInfo.entrada, diaInfo.salida)}
                        variant="outlined"
                      />
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Trabajadores asignados */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader
              title={`Trabajadores Asignados (${total_trabajadores})`}
              avatar={<PeopleIcon color="primary" />}
              action={
                <Button
                  size="small"
                  startIcon={<PersonAddIcon />}
                  onClick={handleOpenAsignacion}
                >
                  Asignar
                </Button>
              }
            />
            <CardContent>
              {trabajadores_asignados.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <PeopleIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No hay trabajadores asignados
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Asigna trabajadores a este horario para comenzar a gestionar sus asistencias
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<PersonAddIcon />}
                    onClick={handleOpenAsignacion}
                  >
                    Asignar Primer Trabajador
                  </Button>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Trabajador</TableCell>
                        <TableCell>RFC</TableCell>
                        <TableCell>Puesto</TableCell>
                        <TableCell>Departamento</TableCell>
                        <TableCell align="center">Estado</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {trabajadores_asignados.map((trabajador) => (
                        <TableRow key={trabajador.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                                {trabajador.nombre.charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle2">
                                  {`${trabajador.nombre} ${trabajador.apellidoPaterno} ${trabajador.apellidoMaterno}`}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  ID: {trabajador.id}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>{trabajador.rfc}</TableCell>
                          <TableCell>{trabajador.puesto}</TableCell>
                          <TableCell>{trabajador.departamento || 'N/A'}</TableCell>
                          <TableCell align="center">
                            <Chip
                              icon={<CheckCircleIcon />}
                              label="Activo"
                              color="success"
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        {/* Historial de asignaciones */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader
              title="Historial de Asignaciones"
              avatar={<AssignmentIcon color="primary" />}
            />
            <CardContent>
              {asignaciones_historicas.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center">
                  No hay historial de asignaciones
                </Typography>
              ) : (
                <List dense>
                  {asignaciones_historicas.slice(0, 10).map((asignacion, index) => (
                    <React.Fragment key={asignacion.id}>
                      <ListItem alignItems="flex-start">
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'secondary.main' }}>
                            {asignacion.trabajador.nombre.charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={asignacion.trabajador.nombre}
                          secondary={
                            <>
                              <Typography variant="caption" color="text.secondary">
                                {asignacion.trabajador.puesto}
                              </Typography>
                              <br />
                              <Typography variant="caption" color="text.secondary">
                                Asignado: {format(new Date(asignacion.fecha_inicio), 'dd/MM/yyyy', { locale: es })}
                              </Typography>
                            </>
                          }
                        />
                      </ListItem>
                      {index < Math.min(asignaciones_historicas.length - 1, 9) && <Divider variant="inset" component="li" />}
                    </React.Fragment>
                  ))}
                  {asignaciones_historicas.length > 10 && (
                    <ListItem>
                      <ListItemText
                        primary={
                          <Typography variant="caption" color="primary" align="center">
                            Y {asignaciones_historicas.length - 10} asignaciones más...
                          </Typography>
                        }
                      />
                    </ListItem>
                  )}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Diálogo para asignar trabajador */}
      <Dialog open={asignacionDialogOpen} onClose={handleCloseAsignacion} maxWidth="sm" fullWidth>
        <DialogTitle>
          Asignar Trabajador al Horario
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Autocomplete
                  options={trabajadoresDisponibles}
                  getOptionLabel={(option) => `${option.nombre} - ${option.rfc} (${option.puesto})`}
                  value={selectedTrabajador}
                  onChange={(event, newValue) => setSelectedTrabajador(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Seleccionar Trabajador"
                      placeholder="Buscar por nombre, RFC o puesto"
                      fullWidth
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Avatar sx={{ mr: 2 }}>{option.nombre.charAt(0)}</Avatar>
                      <Box>
                        <Typography variant="subtitle2">
                          {option.nombre}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.rfc} • {option.puesto} • {option.departamento}
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
              
              {selectedTrabajador && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    Se asignará el horario "{horario.descripcion}" a {selectedTrabajador.nombre} 
                    a partir del {fechaInicio.format('DD/MM/YYYY')}.
                  </Alert>
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAsignacion}>
            Cancelar
          </Button>
          <Button
            onClick={handleAsignarTrabajador}
            variant="contained"
            disabled={!selectedTrabajador || loadingAsignacion}
            startIcon={loadingAsignacion ? <CircularProgress size={20} /> : <PersonAddIcon />}
          >
            {loadingAsignacion ? 'Asignando...' : 'Asignar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default HorarioDetail;