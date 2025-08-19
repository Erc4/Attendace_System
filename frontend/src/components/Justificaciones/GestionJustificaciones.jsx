import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
  Alert,
  Tooltip,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Description as DescriptionIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  CalendarMonth as CalendarIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { reporteService, trabajadorService, catalogoService } from '../../services/api';

const GestionJustificaciones = () => {
  // Estados para las pestañas
  const [tabValue, setTabValue] = useState(0);
  
  // Estados para reglas de justificación
  const [reglasJustificacion, setReglasJustificacion] = useState([]);
  const [nuevaRegla, setNuevaRegla] = useState('');
  const [dialogReglaOpen, setDialogReglaOpen] = useState(false);
  const [reglaEditando, setReglaEditando] = useState(null);
  
  // Estados para asignación de justificaciones
  const [trabajadores, setTrabajadores] = useState([]);
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState('');
  const [fechaJustificacion, setFechaJustificacion] = useState(dayjs());
  const [reglaSeleccionada, setReglaSeleccionada] = useState('');
  const [dialogAsignacionOpen, setDialogAsignacionOpen] = useState(false);
  
  // Estados para lista de justificaciones
  const [justificaciones, setJustificaciones] = useState([]);
  const [filtroTrabajador, setFiltroTrabajador] = useState('');
  const [filtroFechaInicio, setFiltroFechaInicio] = useState(dayjs().startOf('month'));
  const [filtroFechaFin, setFiltroFechaFin] = useState(dayjs().endOf('month'));
  
  // Estados generales
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  useEffect(() => {
    if (tabValue === 2) {
      cargarJustificaciones();
    }
  }, [tabValue, filtroTrabajador, filtroFechaInicio, filtroFechaFin]);

  const cargarDatosIniciales = async () => {
    try {
      setLoading(true);
      
      // Cargar reglas de justificación
      const reglasData = await catalogoService.getReglasJustificacion();
      setReglasJustificacion(reglasData || []);
      
      // Cargar trabajadores
      const trabajadoresData = await trabajadorService.getAll({ estado: true });
      const trabajadoresArray = Array.isArray(trabajadoresData) 
        ? trabajadoresData 
        : (trabajadoresData?.trabajadores || []);
      setTrabajadores(trabajadoresArray);
      
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar los datos iniciales');
    } finally {
      setLoading(false);
    }
  };

  const cargarJustificaciones = async () => {
    try {
      setLoading(true);
      
      const params = {
        fecha_inicio: filtroFechaInicio.format('YYYY-MM-DD'),
        fecha_fin: filtroFechaFin.format('YYYY-MM-DD')
      };
      
      if (filtroTrabajador) {
        params.trabajador_id = filtroTrabajador;
      }
      
      // Llamar al endpoint para obtener justificaciones
      const justificacionesData = await reporteService.getJustificaciones(params);
      setJustificaciones(justificacionesData || []);
      
    } catch (err) {
      console.error('Error al cargar justificaciones:', err);
      setError('Error al cargar las justificaciones');
    } finally {
      setLoading(false);
    }
  };

  // FUNCIONES PARA REGLAS DE JUSTIFICACIÓN
  const handleGuardarRegla = async () => {
    try {
      if (!nuevaRegla.trim()) {
        setError('La descripción de la regla es requerida');
        return;
      }
      
      setLoading(true);
      
      if (reglaEditando) {
        // Actualizar regla existente
        await catalogoService.updateReglaJustificacion(reglaEditando.id, {
          descripcion: nuevaRegla
        });
        setSuccess('Regla actualizada correctamente');
      } else {
        // Crear nueva regla
        await catalogoService.createReglaJustificacion({
          descripcion: nuevaRegla
        });
        setSuccess('Regla creada correctamente');
      }
      
      // Recargar reglas
      await cargarDatosIniciales();
      
      // Limpiar y cerrar
      setNuevaRegla('');
      setReglaEditando(null);
      setDialogReglaOpen(false);
      
    } catch (err) {
      console.error('Error al guardar regla:', err);
      setError('Error al guardar la regla de justificación');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarRegla = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta regla de justificación?')) {
      return;
    }
    
    try {
      setLoading(true);
      await catalogoService.deleteReglaJustificacion(id);
      setSuccess('Regla eliminada correctamente');
      await cargarDatosIniciales();
    } catch (err) {
      console.error('Error al eliminar regla:', err);
      setError('Error al eliminar la regla. Puede que esté en uso.');
    } finally {
      setLoading(false);
    }
  };

  // FUNCIONES PARA ASIGNACIÓN DE JUSTIFICACIONES
  const handleAsignarJustificacion = async () => {
    try {
      if (!trabajadorSeleccionado || !fechaJustificacion || !reglaSeleccionada) {
        setError('Todos los campos son requeridos');
        return;
      }
      
      setLoading(true);
      
      // Crear justificación
      await reporteService.createJustificacion({
        id_trabajador: trabajadorSeleccionado,
        fecha: fechaJustificacion.format('YYYY-MM-DD'),
        id_descripcion: reglaSeleccionada
      });
      
      setSuccess('Justificación asignada correctamente');
      
      // Limpiar y cerrar
      setTrabajadorSeleccionado('');
      setFechaJustificacion(dayjs());
      setReglaSeleccionada('');
      setDialogAsignacionOpen(false);
      
      // Recargar justificaciones si estamos en esa pestaña
      if (tabValue === 2) {
        await cargarJustificaciones();
      }
      
    } catch (err) {
      console.error('Error al asignar justificación:', err);
      setError('Error al asignar la justificación');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarJustificacion = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta justificación?')) {
      return;
    }
    
    try {
      setLoading(true);
      await reporteService.deleteJustificacion(id);
      setSuccess('Justificación eliminada correctamente');
      await cargarJustificaciones();
    } catch (err) {
      console.error('Error al eliminar justificación:', err);
      setError('Error al eliminar la justificación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Gestión de Justificaciones
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Administra las reglas de justificación y asigna justificaciones a las incidencias
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Paper sx={{ width: '100%' }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Reglas de Justificación" icon={<DescriptionIcon />} />
          <Tab label="Asignar Justificación" icon={<AssignmentIcon />} />
          <Tab label="Justificaciones Asignadas" icon={<CheckCircleIcon />} />
        </Tabs>

        {/* TAB 1: REGLAS DE JUSTIFICACIÓN */}
        {tabValue === 0 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6">Catálogo de Reglas</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setNuevaRegla('');
                  setReglaEditando(null);
                  setDialogReglaOpen(true);
                }}
              >
                Nueva Regla
              </Button>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Descripción</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reglasJustificacion.map((regla) => (
                    <TableRow key={regla.id}>
                      <TableCell>{regla.id}</TableCell>
                      <TableCell>{regla.descripcion}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setNuevaRegla(regla.descripcion);
                            setReglaEditando(regla);
                            setDialogReglaOpen(true);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleEliminarRegla(regla.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* TAB 2: ASIGNAR JUSTIFICACIÓN */}
        {tabValue === 1 && (
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Alert severity="info" icon={<InfoIcon />}>
                  Asigna una justificación a las faltas o retardos de un trabajador en una fecha específica
                </Alert>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Nueva Justificación
                    </Typography>
                    
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Trabajador</InputLabel>
                      <Select
                        value={trabajadorSeleccionado}
                        onChange={(e) => setTrabajadorSeleccionado(e.target.value)}
                        label="Trabajador"
                      >
                        {trabajadores.map(t => (
                          <MenuItem key={t.id} value={t.id}>
                            {`${t.nombre} ${t.apellidoPaterno} ${t.apellidoMaterno}`}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                      <DatePicker
                        label="Fecha a Justificar"
                        value={fechaJustificacion}
                        onChange={setFechaJustificacion}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            sx: { mb: 2 }
                          }
                        }}
                      />
                    </LocalizationProvider>

                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Tipo de Justificación</InputLabel>
                      <Select
                        value={reglaSeleccionada}
                        onChange={(e) => setReglaSeleccionada(e.target.value)}
                        label="Tipo de Justificación"
                      >
                        {reglasJustificacion.map(regla => (
                          <MenuItem key={regla.id} value={regla.id}>
                            {regla.descripcion}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Button
                      variant="contained"
                      fullWidth
                      onClick={handleAsignarJustificacion}
                      disabled={loading || !trabajadorSeleccionado || !reglaSeleccionada}
                    >
                      Asignar Justificación
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={8}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Justificaciones Recientes
                    </Typography>
                    <List>
                      {justificaciones.slice(0, 5).map((just, index) => (
                        <ListItem key={index} divider>
                          <ListItemText
                            primary={just.trabajador_nombre}
                            secondary={`${dayjs(just.fecha).format('DD/MM/YYYY')} - ${just.descripcion}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* TAB 3: JUSTIFICACIONES ASIGNADAS */}
        {tabValue === 2 && (
          <Box sx={{ p: 3 }}>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Filtrar por Trabajador</InputLabel>
                  <Select
                    value={filtroTrabajador}
                    onChange={(e) => setFiltroTrabajador(e.target.value)}
                    label="Filtrar por Trabajador"
                  >
                    <MenuItem value="">Todos</MenuItem>
                    {trabajadores.map(t => (
                      <MenuItem key={t.id} value={t.id}>
                        {`${t.nombre} ${t.apellidoPaterno} ${t.apellidoMaterno}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
                <Grid item xs={12} md={3}>
                  <DatePicker
                    label="Fecha Inicio"
                    value={filtroFechaInicio}
                    onChange={setFiltroFechaInicio}
                    slotProps={{
                      textField: { fullWidth: true }
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <DatePicker
                    label="Fecha Fin"
                    value={filtroFechaFin}
                    onChange={setFiltroFechaFin}
                    slotProps={{
                      textField: { fullWidth: true }
                    }}
                  />
                </Grid>
              </LocalizationProvider>
            </Grid>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Trabajador</TableCell>
                    <TableCell>Justificación</TableCell>
                    <TableCell align="center">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {justificaciones.map((just) => (
                    <TableRow key={just.id}>
                      <TableCell>
                        {dayjs(just.fecha).format('DD/MM/YYYY')}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                          {just.trabajador_nombre}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={just.descripcion}
                          color="primary"
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleEliminarJustificacion(just.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>

      {/* DIÁLOGO PARA REGLAS */}
      <Dialog open={dialogReglaOpen} onClose={() => setDialogReglaOpen(false)}>
        <DialogTitle>
          {reglaEditando ? 'Editar Regla' : 'Nueva Regla de Justificación'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Descripción"
            fullWidth
            variant="outlined"
            value={nuevaRegla}
            onChange={(e) => setNuevaRegla(e.target.value)}
            helperText="Ej: Incapacidad médica IMSS, Comisión oficial, etc."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogReglaOpen(false)}>Cancelar</Button>
          <Button onClick={handleGuardarRegla} variant="contained">
            {reglaEditando ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default GestionJustificaciones;