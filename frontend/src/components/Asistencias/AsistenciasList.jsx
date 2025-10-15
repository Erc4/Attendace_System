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
  FileDownload as DownloadIcon,
  Refresh as RefreshIcon
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
  const [trabajadoresMap, setTrabajadoresMap] = useState({});
  
  // Estados para edición
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [asistenciaToEdit, setAsistenciaToEdit] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  
  // Estados para eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [asistenciaToDelete, setAsistenciaToDelete] = useState(null);
  
  // Cargar catálogos al inicializar
  useEffect(() => {
    fetchCatalogos();
  }, []);
  
  // Cargar asistencias cuando cambien los filtros
  useEffect(() => {
    fetchAsistencias();
  }, [fechaInicio, fechaFin, estatusFilter, departamentoFilter]);
  
  const fetchCatalogos = async () => {
    try {
      const [deptosData, trabajadoresData] = await Promise.all([
        catalogoService.getDepartamentos(),
        trabajadorService.getAll({ estado: true })
      ]);
      
      setDepartamentos(deptosData);
      
      // Manejar respuesta de trabajadores (puede venir como array o como objeto)
      const trabajadoresArray = Array.isArray(trabajadoresData) 
        ? trabajadoresData 
        : (trabajadoresData?.trabajadores || []);
      
      setTrabajadores(trabajadoresArray);
      
      // Crear mapa de trabajadores para búsqueda rápida
      const map = {};
      trabajadoresArray.forEach(t => {
        map[t.id] = t;
      });
      setTrabajadoresMap(map);
    } catch (err) {
      console.error('Error al cargar catálogos:', err);
    }
  };
  
  const fetchAsistencias = async () => {
    try {
      setLoading(true);
      
      // Construir parámetros correctos para el backend
      const params = {
        fecha_inicio: fechaInicio.format('YYYY-MM-DD'),
        fecha_fin: fechaFin.format('YYYY-MM-DD'),
      };
      
      // Solo agregar filtros si tienen valor
      if (estatusFilter && estatusFilter !== '') {
        params.estatus = estatusFilter;
      }
      
      console.log('📤 Parámetros de búsqueda:', params);
      
      const data = await asistenciaService.getAll(params);
      console.log('📥 Asistencias recibidas:', data);
      
      // Agrupar registros por trabajador y fecha
      const registrosAgrupados = {};
      
      data.forEach(asistencia => {
        const fecha = dayjs(asistencia.fecha).format('YYYY-MM-DD');
        const key = `${asistencia.id_trabajador}-${fecha}`;
        
        if (!registrosAgrupados[key]) {
          registrosAgrupados[key] = {
            trabajadorId: asistencia.id_trabajador,
            fecha: fecha,
            registros: []
          };
        }
        
        registrosAgrupados[key].registros.push(asistencia);
      });
      
      // Procesar cada grupo para obtener solo entrada y salida
      const asistenciasProcesadas = [];
      
      Object.values(registrosAgrupados).forEach(grupo => {
        // Ordenar registros por hora
        grupo.registros.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        
        // Buscar primer registro que no sea SALIDA (entrada)
        const entrada = grupo.registros.find(r => r.estatus !== 'SALIDA');
        
        // Buscar último registro que sea SALIDA
        const salida = grupo.registros.reverse().find(r => r.estatus === 'SALIDA');
        
        // Agregar entrada si existe
        if (entrada) {
          asistenciasProcesadas.push({
            ...entrada,
            tipo_registro: 'ENTRADA'
          });
        }
        
        // Agregar salida si existe y es diferente de la entrada
        if (salida && (!entrada || salida.id !== entrada.id)) {
          asistenciasProcesadas.push({
            ...salida,
            tipo_registro: 'SALIDA'
          });
        }
      });
      
      // Ordenar por fecha descendente
      asistenciasProcesadas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      
      // Aplicar filtros adicionales
      let asistenciasFiltradas = asistenciasProcesadas;
      
      // Filtro por nombre de trabajador
      if (searchTerm) {
        asistenciasFiltradas = asistenciasFiltradas.filter(asistencia => {
          const trabajador = trabajadoresMap[asistencia.id_trabajador];
          if (!trabajador) return false;
          
          const nombreCompleto = `${trabajador.nombre} ${trabajador.apellidoPaterno} ${trabajador.apellidoMaterno}`.toLowerCase();
          const rfc = trabajador.rfc?.toLowerCase() || '';
          const termino = searchTerm.toLowerCase();
          
          return nombreCompleto.includes(termino) || rfc.includes(termino);
        });
      }
      
      // Filtro por departamento
      if (departamentoFilter && departamentoFilter !== '') {
        asistenciasFiltradas = asistenciasFiltradas.filter(asistencia => {
          const trabajador = trabajadoresMap[asistencia.id_trabajador];
          return trabajador && trabajador.departamento == departamentoFilter;
        });
      }
      
      setAsistencias(asistenciasFiltradas);
      setError(null);
    } catch (err) {
      console.error('❌ Error al cargar asistencias:', err);
      setError('No se pudieron cargar las asistencias.');
    } finally {
      setLoading(false);
    }
  };
  
  // Función para búsqueda manual
  const handleSearchClick = () => {
    fetchAsistencias();
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
    if (estatus === 'SALIDA') return 'info';
    if (estatus.includes('RETARDO')) return 'warning';
    if (estatus === 'FALTA') return 'error';
    if (estatus === 'JUSTIFICADO') return 'info';
    return 'default';
  };
  
  // Obtener icono según estatus
  const getStatusIcon = (estatus) => {
    if (estatus === 'ASISTENCIA') return <CheckCircleIcon />;
    if (estatus === 'SALIDA') return <AccessTimeIcon />;
    if (estatus.includes('RETARDO')) return <WarningIcon />;
    if (estatus === 'FALTA') return <ErrorIcon />;
    if (estatus === 'JUSTIFICADO') return <AccessTimeIcon />;
    return <AccessTimeIcon />;
  };
  
  // Encontrar trabajador por ID
  const findTrabajador = (id) => {
    return trabajadoresMap[id] || {};
  };
  
  // Obtener asistencias paginadas
  const paginatedAsistencias = asistencias.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );
  
  const estatusOptions = [
    { value: 'ASISTENCIA', label: 'Asistencia' },
    { value: 'RETARDO_MENOR', label: 'Retardo Menor' },
    { value: 'RETARDO_MAYOR', label: 'Retardo Mayor' },
    { value: 'FALTA', label: 'Falta' },
    { value: 'SALIDA', label: 'Salida' },
    { value: 'JUSTIFICADO', label: 'Justificado' }
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
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {/* Filtros */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Filtros de Búsqueda
        </Typography>
        
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Buscar por nombre"
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
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchClick();
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <DatePicker
                label="Fecha Inicio"
                value={fechaInicio}
                onChange={(newValue) => setFechaInicio(newValue)}
                slotProps={{ 
                  textField: { 
                    fullWidth: true,
                    variant: 'outlined'
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
                    fullWidth: true,
                    variant: 'outlined'
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={estatusFilter}
                  onChange={(e) => setEstatusFilter(e.target.value)}
                  label="Estado"
                  displayEmpty
                  renderValue={(selected) => {
                    if (!selected || selected === '') {
                      return <em>Todos</em>;
                    }
                    return estatusOptions.find(opt => opt.value === selected)?.label || selected;
                  }}
                  sx={{ minHeight: '56px' }}
                >
                  <MenuItem value="">
                    <em>Todos los estados</em>
                  </MenuItem>
                  {estatusOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Departamento</InputLabel>
                <Select
                  value={departamentoFilter}
                  onChange={(e) => setDepartamentoFilter(e.target.value)}
                  label="Departamento"
                  displayEmpty
                  renderValue={(selected) => {
                    if (!selected || selected === '') {
                      return <em>Todos</em>;
                    }
                    return departamentos.find(d => d.id == selected)?.descripcion || 'Todos';
                  }}
                  sx={{ minHeight: '56px' }}
                >
                  <MenuItem value="">
                    <em>Todos los departamentos</em>
                  </MenuItem>
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
                onClick={handleSearchClick}
                startIcon={<RefreshIcon />}
                sx={{ height: '56px' }}
              >
                Buscar
              </Button>
            </Grid>
          </Grid>
        </LocalizationProvider>
        
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {asistencias.length} registros encontrados
          </Typography>
          <Button
            variant="contained"
            component={RouterLink}
            to="/asistencias/registro"
            startIcon={<AddIcon />}
          >
            Nuevo Registro
          </Button>
        </Box>
      </Paper>
      
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
                <TableCell>Tipo</TableCell>
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
                              `${trabajador.nombre} ${trabajador.apellidoPaterno} ${trabajador.apellidoMaterno}` 
                              : 'Trabajador Desconocido'
                            }
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            RFC: {trabajador.rfc || 'N/A'}
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
                        label={asistencia.tipo_registro || (asistencia.estatus === 'SALIDA' ? 'SALIDA' : 'ENTRADA')}
                        size="small"
                        color={asistencia.tipo_registro === 'SALIDA' || asistencia.estatus === 'SALIDA' ? 'info' : 'success'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={asistencia.estatus}
                        color={getChipColor(asistencia.estatus)}
                        icon={getStatusIcon(asistencia.estatus)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {trabajador.departamento ? 
                        departamentos.find(d => d.id === trabajador.departamento)?.descripcion || 'N/A'
                        : 'N/A'
                      }
                    </TableCell>
                    <TableCell align="right">
                      <IconButton 
                        size="small" 
                        onClick={() => handleEditClick(asistencia)}
                        title="Editar"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleDeleteClick(asistencia)}
                        color="error"
                        title="Eliminar"
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
            labelRowsPerPage="Registros por página:"
          />
        </TableContainer>
      )}
      
      {/* Diálogo de edición */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Registro de Asistencia</DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <DatePicker
                  label="Fecha"
                  value={asistenciaToEdit?.fecha}
                  onChange={(newValue) => 
                    setAsistenciaToEdit({...asistenciaToEdit, fecha: newValue})
                  }
                  slotProps={{ 
                    textField: { 
                      fullWidth: true,
                      variant: 'outlined'
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TimePicker
                  label="Hora"
                  value={asistenciaToEdit?.hora}
                  onChange={(newValue) => 
                    setAsistenciaToEdit({...asistenciaToEdit, hora: newValue})
                  }
                  ampm={false}
                  views={['hours', 'minutes', 'seconds']}
                  format="HH:mm:ss"
                  slotProps={{ 
                    textField: { 
                      fullWidth: true,
                      variant: 'outlined'
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Estado</InputLabel>
                  <Select
                    value={asistenciaToEdit?.estatus || ''}
                    onChange={(e) => 
                      setAsistenciaToEdit({...asistenciaToEdit, estatus: e.target.value})
                    }
                    label="Estado"
                  >
                    {estatusOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
          <Button 
            onClick={handleEditSave} 
            variant="contained" 
            disabled={editLoading}
            startIcon={editLoading ? <CircularProgress size={20} /> : null}
          >
            {editLoading ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo de confirmación de eliminación */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          ¿Estás seguro de que deseas eliminar este registro de asistencia?
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