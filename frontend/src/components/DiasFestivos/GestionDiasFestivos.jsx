// frontend/src/components/DiasFestivos/GestionDiasFestivos.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  Card,
  CardContent,
  Stack,
  Tooltip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  CalendarMonth as CalendarIcon,
  EventBusy as EventBusyIcon,
  Upload as UploadIcon,
  Today as TodayIcon
} from '@mui/icons-material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { diasFestivosService } from '../../services/api';

dayjs.locale('es');

const GestionDiasFestivos = () => {
  // Estados principales
  const [diasFestivos, setDiasFestivos] = useState([]);
  const [proximosDias, setProximosDias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Estados para filtros
  const [anioFilter, setAnioFilter] = useState(dayjs().year());
  const [mesFilter, setMesFilter] = useState('');
  
  // Estados para diálogos
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogCargarOpen, setDialogCargarOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  
  // Estados para el formulario
  const [fechaSeleccionada, setFechaSeleccionada] = useState(dayjs());
  const [descripcion, setDescripcion] = useState('');
  const [anioCargar, setAnioCargar] = useState(dayjs().year());

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarDiasFestivos();
    cargarProximosDias();
  }, [anioFilter, mesFilter]);

  const cargarDiasFestivos = async () => {
    try {
      setLoading(true);
      const params = {};
      if (anioFilter) params.anio = anioFilter;
      if (mesFilter) params.mes = mesFilter;
      
      const data = await diasFestivosService.getAll(params);
      setDiasFestivos(data || []);
    } catch (err) {
      console.error('Error al cargar días festivos:', err);
      setError('Error al cargar los días festivos');
    } finally {
      setLoading(false);
    }
  };

  const cargarProximosDias = async () => {
    try {
      const data = await diasFestivosService.getProximos(5);
      setProximosDias(data || []);
    } catch (err) {
      console.error('Error al cargar próximos días:', err);
    }
  };

  const handleGuardar = async () => {
    try {
      if (!descripcion.trim()) {
        setError('La descripción es requerida');
        return;
      }
      
      setLoading(true);
      
      const diaFestivoData = {
        fecha: fechaSeleccionada.format('YYYY-MM-DD'),
        descripcion: descripcion.trim()
      };
      
      if (editando) {
        await diasFestivosService.update(editando.id, diaFestivoData);
        setSuccess('Día festivo actualizado correctamente');
      } else {
        await diasFestivosService.create(diaFestivoData);
        setSuccess('Día festivo creado correctamente');
      }
      
      // Recargar datos
      await cargarDiasFestivos();
      await cargarProximosDias();
      
      // Limpiar y cerrar
      handleCerrarDialog();
      
    } catch (err) {
      console.error('Error al guardar día festivo:', err);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Error al guardar el día festivo');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este día festivo?')) {
      return;
    }
    
    try {
      setLoading(true);
      await diasFestivosService.delete(id);
      setSuccess('Día festivo eliminado correctamente');
      await cargarDiasFestivos();
      await cargarProximosDias();
    } catch (err) {
      console.error('Error al eliminar día festivo:', err);
      setError('Error al eliminar el día festivo');
    } finally {
      setLoading(false);
    }
  };

  const handleEditar = (diaFestivo) => {
    setEditando(diaFestivo);
    setFechaSeleccionada(dayjs(diaFestivo.fecha));
    setDescripcion(diaFestivo.descripcion);
    setDialogOpen(true);
  };

  const handleCerrarDialog = () => {
    setDialogOpen(false);
    setEditando(null);
    setFechaSeleccionada(dayjs());
    setDescripcion('');
    setError(null);
  };

  const handleCargarPredeterminados = async () => {
    try {
      setLoading(true);
      const resultado = await diasFestivosService.cargarPredeterminados(anioCargar);
      
      setSuccess(`Se cargaron ${resultado.total_agregados} días festivos para el año ${anioCargar}`);
      
      if (resultado.total_omitidos > 0) {
        console.log('Días omitidos:', resultado.dias_omitidos);
      }
      
      setDialogCargarOpen(false);
      await cargarDiasFestivos();
      await cargarProximosDias();
      
    } catch (err) {
      console.error('Error al cargar días predeterminados:', err);
      setError('Error al cargar los días festivos predeterminados');
    } finally {
      setLoading(false);
    }
  };

  const getDiaSemana = (fecha) => {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dias[dayjs(fecha).day()];
  };

  const getColorChip = (diasRestantes) => {
    if (diasRestantes < 0) return 'default';
    if (diasRestantes === 0) return 'error';
    if (diasRestantes <= 7) return 'warning';
    if (diasRestantes <= 30) return 'info';
    return 'success';
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          Gestión de Días Festivos
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Administra los días no laborales del año
        </Typography>
      </Box>

      {/* Alertas */}
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

      {/* Próximos días festivos */}
      {proximosDias.length > 0 && (
        <Card sx={{ mb: 3, bgcolor: 'background.paper' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <TodayIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Próximos Días Festivos
            </Typography>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {proximosDias.map((dia) => (
                <Chip
                  key={dia.id}
                  label={`${dia.descripcion} - ${dayjs(dia.fecha).format('DD/MM')} (${dia.dias_restantes} días)`}
                  color={getColorChip(dia.dias_restantes)}
                  variant="outlined"
                  icon={<CalendarIcon />}
                />
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Controles y filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Año</InputLabel>
              <Select
                value={anioFilter}
                onChange={(e) => setAnioFilter(e.target.value)}
                label="Año"
              >
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(year => (
                  <MenuItem key={year} value={year}>{year}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Mes</InputLabel>
              <Select
                value={mesFilter}
                onChange={(e) => setMesFilter(e.target.value)}
                label="Mes"
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value={1}>Enero</MenuItem>
                <MenuItem value={2}>Febrero</MenuItem>
                <MenuItem value={3}>Marzo</MenuItem>
                <MenuItem value={4}>Abril</MenuItem>
                <MenuItem value={5}>Mayo</MenuItem>
                <MenuItem value={6}>Junio</MenuItem>
                <MenuItem value={7}>Julio</MenuItem>
                <MenuItem value={8}>Agosto</MenuItem>
                <MenuItem value={9}>Septiembre</MenuItem>
                <MenuItem value={10}>Octubre</MenuItem>
                <MenuItem value={11}>Noviembre</MenuItem>
                <MenuItem value={12}>Diciembre</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6} sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={() => setDialogCargarOpen(true)}
            >
              Cargar Días Oficiales
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
            >
              Nuevo Día Festivo
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabla de días festivos */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Día de la Semana</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : diasFestivos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No hay días festivos registrados
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              diasFestivos.map((dia) => {
                const fecha = dayjs(dia.fecha);
                const hoy = dayjs();
                const yaPaso = fecha.isBefore(hoy, 'day');
                
                return (
                  <TableRow key={dia.id}>
                    <TableCell>
                      {fecha.format('DD/MM/YYYY')}
                    </TableCell>
                    <TableCell>
                      {getDiaSemana(dia.fecha)}
                    </TableCell>
                    <TableCell>{dia.descripcion}</TableCell>
                    <TableCell>
                      <Chip
                        label={yaPaso ? 'Pasado' : 'Próximo'}
                        color={yaPaso ? 'default' : 'success'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Editar">
                        <IconButton
                          size="small"
                          onClick={() => handleEditar(dia)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleEliminar(dia.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Diálogo para crear/editar */}
      <Dialog open={dialogOpen} onClose={handleCerrarDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editando ? 'Editar Día Festivo' : 'Nuevo Día Festivo'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
              <DatePicker
                label="Fecha"
                value={fechaSeleccionada}
                onChange={setFechaSeleccionada}
                format="DD/MM/YYYY"
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true
                  }
                }}
              />
            </LocalizationProvider>
            
            <TextField
              fullWidth
              label="Descripción"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              required
              placeholder="Ej: Día de la Independencia"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCerrarDialog}>Cancelar</Button>
          <Button onClick={handleGuardar} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para cargar días predeterminados */}
      <Dialog open={dialogCargarOpen} onClose={() => setDialogCargarOpen(false)}>
        <DialogTitle>Cargar Días Festivos Oficiales de México</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Se cargarán los días festivos oficiales de México para el año seleccionado.
            Los días que ya existan serán omitidos.
          </Typography>
          
          <FormControl fullWidth>
            <InputLabel>Año</InputLabel>
            <Select
              value={anioCargar}
              onChange={(e) => setAnioCargar(e.target.value)}
              label="Año"
            >
              {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(year => (
                <MenuItem key={year} value={year}>{year}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Alert severity="info" sx={{ mt: 2 }}>
            Se cargarán los siguientes días:
            <ul style={{ marginTop: 8, marginBottom: 0 }}>
              <li>1 de Enero - Año Nuevo</li>
              <li>5 de Febrero - Día de la Constitución</li>
              <li>21 de Marzo - Natalicio de Benito Juárez</li>
              <li>1 de Mayo - Día del Trabajo</li>
              <li>16 de Septiembre - Día de la Independencia</li>
              <li>20 de Noviembre - Revolución Mexicana</li>
              <li>25 de Diciembre - Navidad</li>
            </ul>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogCargarOpen(false)}>Cancelar</Button>
          <Button 
            onClick={handleCargarPredeterminados} 
            variant="contained" 
            disabled={loading}
            startIcon={<UploadIcon />}
          >
            {loading ? <CircularProgress size={20} /> : 'Cargar Días Festivos'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GestionDiasFestivos;