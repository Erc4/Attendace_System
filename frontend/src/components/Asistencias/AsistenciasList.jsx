import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
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
  Chip,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  FilterList as FilterIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  ErrorOutline as ErrorIcon,
  AccessTime as AccessTimeIcon,
  FileDownload as DownloadIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { asistenciaService, trabajadorService, catalogoService } from '../../services/api';

const AsistenciasList = () => {
  // Estados para la lista de asistencias
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [fechaInicio, setFechaInicio] = useState(dayjs().startOf('month'));
  const [fechaFin, setFechaFin] = useState(dayjs());
  const [estatusFilter, setEstatusFilter] = useState('');
  const [departamentoFilter, setDepartamentoFilter] = useState('');
  
  // Estados para catálogos
  const [departamentos, setDepartamentos] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  
  // Estados para edición
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [asistenciaToEdit, setAsistenciaToEdit] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  
  // Estados para eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [asistenciaToDelete, setAsistenciaToDelete] = useState(null);
  
  // Cargar datos al inicializar
  useEffect(() => {
    fetchAsistencias();
    fetchCatalogos();
  }, [fechaInicio, fechaFin, searchTerm, estatusFilter, departamentoFilter]);
  
  const fetchAsistencias = async () => {
    try {
      setLoading(true);
      const params = {
        fecha_inicio: fechaInicio.format('YYYY-MM-DD'),
        fecha_fin: fechaFin.format('YYYY-MM-DD'),
      };
      
      if (searchTerm) params.search = searchTerm;
      if (estatusFilter) params.estatus = estatusFilter;
      if (departamentoFilter) params.departamento = departamentoFilter;
      
      const data = await asistenciaService.getAll(params);
      setAsistencias(data);
      setError(null);
    } catch (err) {
      console.error('Error al cargar asistencias:', err);
      setError('No se pudieron cargar las asistencias.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchCatalogos = async () => {
    try {
      const [deptosData, trabajadoresData] = await Promise.all([
        catalogoService.getDepartamentos(),
        trabajadorService.getAll({ estado: true })
      ]);
      
      setDepartamentos(deptosData);
      setTrabajadores(trabajadoresData);
    } catch (err) {
      console.error('Error al cargar catálogos:', err);
    }
  };
  
  // Funciones para paginación
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Función para editar asistencia
  const handleEditClick = (asistencia) => {
    setAsistenciaToEdit({
      ...asistencia,
      fecha: dayjs(asistencia.fecha),
      hora: dayjs(asistencia.fecha)
    });
    setEditDialogOpen(true);
  };
  
  const handleEditSave = async () => {
    if (!asistenciaToEdit) return;
    
    try {
      setEditLoading(true);
      
      const updatedData = {
        fecha: asistenciaToEdit.fecha
          .hour(asistenciaToEdit.hora.hour())
          .minute(asistenciaToEdit.hora.minute())
          .toISOString(),
        estatus: asistenciaToEdit.estatus
      };
      
      await asistenciaService.update(asistenciaToEdit.id, updatedData);
      
      // Recargar datos
      await fetchAsistencias();
      
      setEditDialogOpen(false);
      setAsistenciaToEdit(null);
    } catch (err) {
      console.error('Error al actualizar asistencia:', err);
      setError('No se pudo actualizar la asistencia.');
    } finally {
      setEditLoading(false);
    }
  };
  
  // Función para eliminar asistencia
  const handleDeleteClick = (asistencia) => {
    setAsistenciaToDelete(asistencia);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (!asistenciaToDelete) return;
    
    try {
      await asistenciaService.delete(asistenciaToDelete.id);
      
      // Recargar datos
      await fetchAsistencias();
      
      setDeleteDialogOpen(false);
      setAsistenciaToDelete(null);
    } catch (err) {
      console.error('Error al eliminar asistencia:', err);
      setError('No se pudo eliminar la asistencia.');
    }
  };
  
  // Obtener color del chip según estatus
  const getChipColor = (estatus) => {
    if (estatus === 'ASISTENCIA') return 'success';
    if (estatus.includes('RETARDO')) return 'warning';
    if (estatus === 'FALTA') return 'error';
    if (estatus === 'JUSTIFICADO') return 'info';
    return 'default';
  };
  
  // Obtener icono según estatus
  const getStatusIcon = (estatus) => {
    if (estatus === 'ASISTENCIA') return <CheckCircleIcon />;
    if (estatus.includes('RETARDO')) return <WarningIcon />;
    if (estatus === 'FALTA') return <ErrorIcon />;
    if (estatus === 'JUSTIFICADO') return <AccessTimeIcon />;
    return <AccessTimeIcon />;
  };
  
  // Encontrar trabajador por ID
  const findTrabajador = (id) => {
    return trabajadores.find(t => t.id === id) || {};
  };
  
  // Obtener asistencias paginadas
  const paginatedAsistencias = asistencias.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );
  
  const estatusOptions = [
    'ASISTENCIA',
    'RETARDO_MENOR',
    'RETARDO_MAYOR', 
    'FALTA',
    'JUSTIFICADO'
  ];
  
  return (
    <Container>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Gestión de Asistencias
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Administra y consulta los registros de asistencia de los trabajadores
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Filtros */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Filtros de Búsqueda
        </Typography>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Buscar trabajador"
                variant="outlined"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                placeholder="Nombre o RFC"
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <DatePicker
                label="Fecha Inicio"
                value={fechaInicio}
                onChange={(newValue) => setFechaInicio(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <DatePicker
                label="Fecha Fin"
                value={fechaFin}
                onChange={(newValue) => setFechaFin(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={estatusFilter || "Todos"} // Valor por defecto
                  onChange={(e) => setEstatusFilter(e.target.value)}
                  label="Estado"
                >
                  <MenuItem value="Todos">Todos</MenuItem>
                  {estatusOptions.map((estatus) => (
                    <MenuItem key={estatus} value={estatus}>
                      {estatus}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Departamento</InputLabel>
                <Select
                  value={departamentoFilter || "Todos"} // Valor por defecto
                  onChange={(e) => setDepartamentoFilter(e.target.value)}
                  label="Departamento"
                >
                  <MenuItem value="Todos">Todos los departamentos</MenuItem>
                  {departamentos.map((dept) => (
                    <MenuItem key={dept.id} value={dept.id}>
                      {dept.descripcion}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={1}>
              <Button
                fullWidth
                variant="contained"
                component={RouterLink}
                to="/asistencias/registro"
                startIcon={<AddIcon />}
                sx={{ height: '56px' }}
              >
                Nuevo
              </Button>
            </Grid>
          </Grid>
        </LocalizationProvider>
      </Paper>
      
      {/* Estadísticas rápidas */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {asistencias.length}
              </Typography>
              <Typography variant="body2">Total Registros</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {asistencias.filter(a => a.estatus === 'ASISTENCIA').length}
              </Typography>
              <Typography variant="body2">Asistencias</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {asistencias.filter(a => a.estatus.includes('RETARDO')).length}
              </Typography>
              <Typography variant="body2">Retardos</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error.main">
                {asistencias.filter(a => a.estatus === 'FALTA').length}
              </Typography>
              <Typography variant="body2">Faltas</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Tabla de asistencias */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : asistencias.length === 0 ? (
        <Card sx={{ mt: 4, p: 3, textAlign: 'center' }}>
          <AccessTimeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No se encontraron registros de asistencia
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
            Ajusta los filtros de búsqueda o registra nuevas asistencias
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            component={RouterLink}
            to="/asistencias/registro"
          >
            Registrar Primera Asistencia
          </Button>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="tabla de asistencias">
            <TableHead>
              <TableRow>
                <TableCell>Trabajador</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Hora</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Departamento</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedAsistencias.map((asistencia) => {
                const trabajador = findTrabajador(asistencia.id_trabajador);
                return (
                  <TableRow key={asistencia.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                          {trabajador.nombre?.charAt(0) || 'U'}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">
                            {trabajador.nombre ? 
                              `${trabajador.nombre} ${trabajador.apellidoPaterno} ${trabajador.apellidoMaterno}` :
                              `Trabajador ID: ${asistencia.id_trabajador}`
                            }
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {trabajador.rfc || 'RFC no disponible'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {dayjs(asistencia.fecha).format('DD/MM/YYYY')}
                    </TableCell>
                    <TableCell>
                      {dayjs(asistencia.fecha).format('HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(asistencia.estatus)}
                        label={asistencia.estatus}
                        color={getChipColor(asistencia.estatus)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{trabajador.departamento || 'N/A'}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleEditClick(asistencia)}
                        title="Editar registro"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteClick(asistencia)}
                        title="Eliminar registro"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={asistencias.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Filas por página"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          />
        </TableContainer>
      )}
      
      {/* Diálogo de edición */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Registro de Asistencia</DialogTitle>
        <DialogContent>
          {asistenciaToEdit && (
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
              <Box sx={{ pt: 2 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>
                      Trabajador: {(() => {
                        const trabajador = findTrabajador(asistenciaToEdit.id_trabajador);
                        return trabajador.nombre ? 
                          `${trabajador.nombre} ${trabajador.apellidoPaterno} ${trabajador.apellidoMaterno}` :
                          `ID: ${asistenciaToEdit.id_trabajador}`;
                      })()}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <DatePicker
                      label="Fecha"
                      value={asistenciaToEdit.fecha}
                      onChange={(newValue) => setAsistenciaToEdit({
                        ...asistenciaToEdit,
                        fecha: newValue
                      })}
                      slotProps={{
                        textField: { fullWidth: true }
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TimePicker
                      label="Hora"
                      value={asistenciaToEdit.hora}
                      onChange={(newValue) => setAsistenciaToEdit({
                        ...asistenciaToEdit,
                        hora: newValue
                      })}
                      ampm={false}
                      slotProps={{
                        textField: { fullWidth: true }
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Estado</InputLabel>
                      <Select
                        value={asistenciaToEdit.estatus}
                        onChange={(e) => setAsistenciaToEdit({
                          ...asistenciaToEdit,
                          estatus: e.target.value
                        })}
                        label="Estado"
                      >
                        {estatusOptions.map((estatus) => (
                          <MenuItem key={estatus} value={estatus}>
                            {estatus}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>
            </LocalizationProvider>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
          <Button
            onClick={handleEditSave}
            variant="contained"
            disabled={editLoading}
            startIcon={editLoading ? <CircularProgress size={20} /> : <EditIcon />}
          >
            {editLoading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo de confirmación de eliminación */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>¿Eliminar registro de asistencia?</DialogTitle>
        <DialogContent>
          {asistenciaToDelete && (
            <Typography>
              ¿Estás seguro de que deseas eliminar el registro de asistencia del{' '}
              {dayjs(asistenciaToDelete.fecha).format('DD/MM/YYYY [a las] HH:mm')}?
              <br />
              <strong>Esta acción no se puede deshacer.</strong>
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AsistenciasList;