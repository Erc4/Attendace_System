import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Fab,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  AccessTime as AccessTimeIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { horarioService } from '../../services/api';

// Utilidades para horarios
const horarioUtils = {
  formatTime: (timeString) => {
    if (!timeString) return '--:--';
    return timeString.substring(0, 5);
  },
  
  calcularDuracion: (entrada, salida) => {
    if (!entrada || !salida) return '--';
    
    const [horaEntrada, minutoEntrada] = entrada.split(':').map(Number);
    const [horaSalida, minutoSalida] = salida.split(':').map(Number);
    
    const minutosEntrada = horaEntrada * 60 + minutoEntrada;
    const minutosSalida = horaSalida * 60 + minutoSalida;
    
    const duracionMinutos = minutosSalida - minutosEntrada;
    const horas = Math.floor(duracionMinutos / 60);
    const minutos = duracionMinutos % 60;
    
    return `${horas}h ${minutos}m`;
  }
};

const HorariosList = () => {
  const navigate = useNavigate();
  
  // Estados para la lista de horarios
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Estados para búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para estadísticas
  const [resumen, setResumen] = useState(null);
  const [loadingResumen, setLoadingResumen] = useState(true);
  
  // Estado para el diálogo de confirmación de eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [horarioToDelete, setHorarioToDelete] = useState(null);
  
  // Cargar los horarios al iniciar el componente
  useEffect(() => {
    fetchHorarios();
    fetchResumen();
  }, [searchTerm]);
  
  const fetchHorarios = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.descripcion = searchTerm;
      
      const data = await horarioService.getAll(params);
      setHorarios(data);
      setError(null);
    } catch (err) {
      console.error('Error al cargar horarios:', err);
      setError('No se pudieron cargar los horarios. Inténtalo de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchResumen = async () => {
    try {
      setLoadingResumen(true);
      const data = await horarioService.getResumen();
      setResumen(data);
    } catch (err) {
      console.error('Error al cargar resumen:', err);
    } finally {
      setLoadingResumen(false);
    }
  };
  
  // Funciones para la paginación
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Función para la búsqueda
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };
  
  // Funciones para el manejo de eliminación
  const handleDeleteClick = (horario) => {
    setHorarioToDelete(horario);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    try {
      await horarioService.delete(horarioToDelete.id);
      setHorarios(horarios.filter(h => h.id !== horarioToDelete.id));
      setDeleteDialogOpen(false);
      setHorarioToDelete(null);
      
      // Actualizar resumen
      fetchResumen();
    } catch (err) {
      console.error('Error al eliminar horario:', err);
      setError(
        err.response?.data?.detail || 
        'No se pudo eliminar el horario. Puede que tenga trabajadores asignados.'
      );
    }
  };
  
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setHorarioToDelete(null);
  };
  
  // Función para formatear tiempo
  const formatTime = (timeString) => {
    if (!timeString) return '--:--';
    return timeString.substring(0, 5); // Obtener solo HH:MM
  };
  
  // Función para calcular duración de jornada
  const calcularDuracionJornada = (entrada, salida) => {
    if (!entrada || !salida) return '--';
    
    const [horaEntrada, minutoEntrada] = entrada.split(':').map(Number);
    const [horaSalida, minutoSalida] = salida.split(':').map(Number);
    
    const minutosEntrada = horaEntrada * 60 + minutoEntrada;
    const minutosSalida = horaSalida * 60 + minutoSalida;
    
    const duracionMinutos = minutosSalida - minutosEntrada;
    const horas = Math.floor(duracionMinutos / 60);
    const minutos = duracionMinutos % 60;
    
    return `${horas}h ${minutos}m`;
  };
  
  // Obtener horarios paginados
  const paginatedHorarios = horarios.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );
  
  return (
    <Container>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Gestión de Horarios
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Administra los horarios laborales y asigna trabajadores
        </Typography>
      </Box>
      
      {/* Tarjetas de resumen */}
      {!loadingResumen && resumen && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <ScheduleIcon color="primary" sx={{ mr: 2 }} />
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Total Horarios
                    </Typography>
                    <Typography variant="h5">
                      {resumen.total_horarios}
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
                  <PeopleIcon color="success" sx={{ mr: 2 }} />
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Con Horario
                    </Typography>
                    <Typography variant="h5">
                      {resumen.trabajadores_con_horario}
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
                  <PeopleIcon color="warning" sx={{ mr: 2 }} />
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Sin Horario
                    </Typography>
                    <Typography variant="h5">
                      {resumen.trabajadores_sin_horario}
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
                  <AssignmentIcon color="info" sx={{ mr: 2 }} />
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Asignaciones
                    </Typography>
                    <Typography variant="h5">
                      {resumen.trabajadores_con_horario}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
      
      {/* Barra de búsqueda y acciones */}
      <Paper sx={{ p: 2, mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Buscar horarios"
              variant="outlined"
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={6} sx={{ textAlign: 'right' }}>
            <Button
              variant="outlined"
              startIcon={<PeopleIcon />}
              component={RouterLink}
              to="/horarios/trabajadores-sin-horario"
              sx={{ mr: 2 }}
            >
              Sin Horario
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              component={RouterLink}
              to="/horarios/nuevo"
            >
              Nuevo Horario
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : horarios.length === 0 ? (
        <Card sx={{ mt: 4, p: 3, textAlign: 'center' }}>
          <ScheduleIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No se encontraron horarios
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
            {searchTerm 
              ? 'Intenta con otros criterios de búsqueda' 
              : 'Comienza creando tu primer horario laboral'
            }
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            component={RouterLink}
            to="/horarios/nuevo"
          >
            Crear Primer Horario
          </Button>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="tabla de horarios">
            <TableHead>
              <TableRow>
                <TableCell>Descripción</TableCell>
                <TableCell align="center">Lunes</TableCell>
                <TableCell align="center">Martes</TableCell>
                <TableCell align="center">Miércoles</TableCell>
                <TableCell align="center">Jueves</TableCell>
                <TableCell align="center">Viernes</TableCell>
                <TableCell align="center">Duración</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedHorarios.map((horario) => (
                <TableRow key={horario.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {horario.descripcion}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {horario.id}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {formatTime(horario.lunesEntrada)} - {formatTime(horario.lunesSalida)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {formatTime(horario.martesEntrada)} - {formatTime(horario.martesSalida)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {formatTime(horario.miercolesEntrada)} - {formatTime(horario.miercolesSalida)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {formatTime(horario.juevesEntrada)} - {formatTime(horario.juevesSalida)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {formatTime(horario.viernesEntrada)} - {formatTime(horario.viernesSalida)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={calcularDuracionJornada(horario.lunesEntrada, horario.lunesSalida)}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Ver detalles">
                      <IconButton
                        component={RouterLink}
                        to={`/horarios/${horario.id}`}
                        size="small"
                        color="primary"
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton
                        component={RouterLink}
                        to={`/horarios/${horario.id}/editar`}
                        size="small"
                        color="primary"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteClick(horario)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={horarios.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Filas por página"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          />
        </TableContainer>
      )}
      
      {/* Diálogo de confirmación para eliminar horario */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          ¿Eliminar horario?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {horarioToDelete && (
              <>
                Estás a punto de eliminar el horario: 
                <strong> {horarioToDelete.descripcion}</strong>.
                <br /><br />
                Esta acción no puede deshacerse y solo es posible si no hay trabajadores asignados a este horario.
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancelar
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Botón flotante para acceso rápido */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        component={RouterLink}
        to="/horarios/nuevo"
      >
        <AddIcon />
      </Fab>
    </Container>
  );
};

export default HorariosList;