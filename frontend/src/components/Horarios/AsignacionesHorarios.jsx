import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  TablePagination,
  TextField,
  Typography,
  Alert,
  Stack,
  Autocomplete
} from '@mui/material';
import {
  ArrowBack,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CalendarToday
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { horarioService, trabajadorService } from '../../services/api';

const AsignacionesHorarios = () => {
  const navigate = useNavigate();
  
  // Estados principales
  const [asignaciones, setAsignaciones] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Estados para el diálogo de nueva asignación
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogLoading, setSuggestionLoading] = useState(false);
  const [selectedTrabajador, setSelectedTrabajador] = useState(null);
  const [selectedHorario, setSelectedHorario] = useState('');
  const [fechaInicio, setFechaInicio] = useState(dayjs());
  
  // Estados para eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [asignacionToDelete, setAsignacionToDelete] = useState(null);
  
  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('🔄 Cargando datos de asignaciones...');
        
        const [asignacionesData, trabajadoresData, horariosData] = await Promise.all([
          horarioService.getAsignacionHorarios(),
          trabajadorService.getAll({ estado: true }), // Solo trabajadores activos
          horarioService.getAll()
        ]);
        
        console.log('📊 Datos cargados:', {
          asignaciones: asignacionesData,
          trabajadores: trabajadoresData,
          horarios: horariosData
        });
        
        setAsignaciones(asignacionesData || []);
        setTrabajadores(trabajadoresData || []);
        setHorarios(horariosData || []);
        setError(null);
      } catch (err) {
        console.error('❌ Error al cargar datos:', err);
        setError('No se pudieron cargar los datos. Verifica la conexión con el servidor.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Funciones para paginación
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Funciones para el diálogo de nueva asignación
  const handleOpenDialog = () => {
    setSelectedTrabajador(null);
    setSelectedHorario('');
    setFechaInicio(dayjs());
    setDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedTrabajador(null);
    setSelectedHorario('');
  };
  
  const handleCreateAsignacion = async () => {
    if (!selectedTrabajador || !selectedHorario || !fechaInicio) {
      return;
    }
    
    try {
      setSuggestionLoading(true);
      console.log('🔄 Creando nueva asignación...');
      
      const asignacionData = {
        id_trabajador: selectedTrabajador.id,
        id_horario: parseInt(selectedHorario),
        fehcaInicio: fechaInicio.toISOString() // Nota: El campo tiene el typo "fehcaInicio" en el backend
      };
      
      console.log('📤 Datos de asignación:', asignacionData);
      
      const response = await horarioService.createAsignacionHorario(asignacionData);
      console.log('✅ Asignación creada:', response);
      
      // Recargar las asignaciones
      const updatedAsignaciones = await horarioService.getAsignacionHorarios();
      setAsignaciones(updatedAsignaciones || []);
      
      handleCloseDialog();
    } catch (err) {
      console.error('❌ Error al crear asignación:', err);
      setError('No se pudo crear la asignación. Verifica que los datos sean correctos.');
    } finally {
      setSuggestionLoading(false);
    }
  };
  
  // Funciones para eliminación
  const handleDeleteClick = (asignacion) => {
    setAsignacionToDelete(asignacion);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    try {
      await horarioService.deleteAsignacionHorario(asignacionToDelete.id);
      setAsignaciones(asignaciones.filter(a => a.id !== asignacionToDelete.id));
      setDeleteDialogOpen(false);
      setAsignacionToDelete(null);
    } catch (err) {
      console.error('❌ Error al eliminar asignación:', err);
      setError('No se pudo eliminar la asignación.');
    }
  };
  
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setAsignacionToDelete(null);
  };
  
  // Funciones helper
  const getTrabajadorNombre = (trabajadorId) => {
    const trabajador = trabajadores.find(t => t.id === trabajadorId);
    return trabajador 
      ? `${trabajador.nombre} ${trabajador.apellidoPaterno} ${trabajador.apellidoMaterno}`
      : `ID: ${trabajadorId}`;
  };
  
  const getHorarioDescripcion = (horarioId) => {
    const horario = horarios.find(h => h.id === horarioId);
    return horario ? horario.descripcion : `ID: ${horarioId}`;
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return dayjs(dateString).format('DD/MM/YYYY');
  };
  
  // Obtener asignaciones paginadas
  const paginatedAsignaciones = asignaciones.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );
  
  return (
    <Box sx={{ px: 2, py: 1 }}>
      {/* Header */}
      <Box sx={{ mb: 3, px: 2 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/horarios')}
          sx={{ mb: 2 }}
        >
          Volver a horarios
        </Button>
        
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          Asignaciones de Horarios
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gestiona qué horario tiene asignado cada trabajador
        </Typography>
      </Box>
      
      {error && (
        <Box sx={{ px: 2, mb: 3 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}
      
      {/* Acciones principales */}
      <Box sx={{ px: 2, mb: 3 }}>
        <Paper elevation={1} sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Asignaciones Activas ({asignaciones.length})
            </Typography>
            
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpenDialog}
            >
              Nueva Asignación
            </Button>
          </Stack>
        </Paper>
      </Box>
      
      {/* Contenido principal */}
      <Box sx={{ px: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Cargando asignaciones...</Typography>
          </Box>
        ) : asignaciones.length === 0 ? (
          <Card sx={{ textAlign: 'center', py: 6 }}>
            <CardContent>
              <AssignmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No hay asignaciones de horarios
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Crea la primera asignación para asociar trabajadores con sus horarios
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleOpenDialog}
              >
                Crear Primera Asignación
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Paper elevation={1}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Trabajador</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Horario Asignado</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Fecha de Inicio</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedAsignaciones.map((asignacion, index) => (
                    <TableRow 
                      key={asignacion.id}
                      sx={{ 
                        '&:hover': { bgcolor: 'action.hover' },
                        bgcolor: index % 2 === 0 ? 'transparent' : 'grey.25'
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {getTrabajadorNombre(asignacion.id_trabajador)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ID: {asignacion.id_trabajador}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <ScheduleIcon sx={{ mr: 1, color: 'primary.main' }} />
                          <Box>
                            <Typography variant="body2">
                              {getHorarioDescripcion(asignacion.id_horario)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ID: {asignacion.id_horario}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CalendarToday sx={{ mr: 1, color: 'text.secondary', fontSize: 'small' }} />
                          <Typography variant="body2">
                            {formatDate(asignacion.fehcaInicio)}
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteClick(asignacion)}
                          title="Eliminar asignación"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Paginación */}
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={asignaciones.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Filas por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
              sx={{ borderTop: 1, borderColor: 'divider' }}
            />
          </Paper>
        )}
      </Box>
      
      {/* Diálogo para nueva asignación */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Nueva Asignación de Horario</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Autocomplete
                  value={selectedTrabajador}
                  onChange={(event, newValue) => setSelectedTrabajador(newValue)}
                  options={trabajadores}
                  getOptionLabel={(option) => 
                    `${option.nombre} ${option.apellidoPaterno} ${option.apellidoMaterno} (${option.rfc})`
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Seleccionar Trabajador"
                      required
                      fullWidth
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <PersonIcon sx={{ mr: 2, color: 'text.secondary' }} />
                      <Box>
                        <Typography>
                          {`${option.nombre} ${option.apellidoPaterno} ${option.apellidoMaterno}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.rfc} - {option.puesto}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Horario</InputLabel>
                  <Select
                    value={selectedHorario}
                    label="Horario"
                    onChange={(e) => setSelectedHorario(e.target.value)}
                  >
                    {horarios.map((horario) => (
                      <MenuItem key={horario.id} value={horario.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                          <ScheduleIcon sx={{ mr: 1, color: 'primary.main' }} />
                          <Box>
                            <Typography>{horario.descripcion}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {`${horario.lunesEntrada?.substring(0, 5)} - ${horario.lunesSalida?.substring(0, 5)}`}
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
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
                        required: true
                      }
                    }}
                  />
                </LocalizationProvider>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancelar
          </Button>
          <Button 
            onClick={handleCreateAsignacion}
            variant="contained"
            disabled={!selectedTrabajador || !selectedHorario || dialogLoading}
            startIcon={dialogLoading ? <CircularProgress size={20} /> : <AddIcon />}
          >
            {dialogLoading ? 'Creando...' : 'Crear Asignación'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo de confirmación para eliminar */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel} maxWidth="sm" fullWidth>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          {asignacionToDelete && (
            <Typography>
              ¿Estás seguro de que deseas eliminar la asignación de horario para{' '}
              <strong>{getTrabajadorNombre(asignacionToDelete.id_trabajador)}</strong>?
              <br /><br />
              Esta acción no se puede deshacer.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleDeleteCancel} color="inherit">
            Cancelar
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" autoFocus>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AsignacionesHorarios;