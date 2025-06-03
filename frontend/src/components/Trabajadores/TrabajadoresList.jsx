import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Fingerprint as FingerprintIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { trabajadorService, catalogoService } from '../../services/api';

const TrabajadoresList = () => {
  // Estados para la lista de trabajadores
  const [trabajadores, setTrabajadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Estados para la búsqueda y filtrado
  const [searchTerm, setSearchTerm] = useState('');
  const [departamentoFilter, setDepartamentoFilter] = useState('');
  const [departamentos, setDepartamentos] = useState([]);
  
  // Estado para el diálogo de confirmación de eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [trabajadorToDelete, setTrabajadorToDelete] = useState(null);
  
  // Cargar los trabajadores al iniciar el componente
  useEffect(() => {
    const fetchTrabajadores = async () => {
      try {
        setLoading(true);
        console.log('Intentando cargar trabajadores...'); // Debug
        
        const params = {};
        if (searchTerm) params.nombre = searchTerm;
        if (departamentoFilter) params.departamento = departamentoFilter;
        
        console.log('Parámetros de búsqueda:', params); // Debug
        
        const data = await trabajadorService.getAll(params);
        console.log('Datos recibidos:', data); // Debug
        
        setTrabajadores(data);
        setError(null); // Limpiar errores previos
      } catch (err) {
        console.error('Error completo:', err); // Debug más detallado
        console.error('Error response:', err.response); // Debug
        console.error('Error message:', err.message); // Debug
        
        let errorMessage = 'No se pudieron cargar los trabajadores.';
        
        if (err.response) {
          // El servidor respondió con un código de error
          errorMessage = `Error del servidor: ${err.response.status} - ${err.response.data?.detail || err.response.statusText}`;
        } else if (err.request) {
          // La solicitud se realizó pero no hubo respuesta
          errorMessage = 'No se pudo conectar con el servidor. Verifica que el backend esté funcionando.';
        } else {
          // Error en la configuración de la solicitud
          errorMessage = `Error de configuración: ${err.message}`;
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrabajadores();
  }, [searchTerm, departamentoFilter]);
  
  // Cargar los departamentos para el filtro
  useEffect(() => {
    const fetchDepartamentos = async () => {
      try {
        const data = await catalogoService.getDepartamentos();
        setDepartamentos(data);
      } catch (err) {
        console.error('Error al cargar departamentos:', err);
      }
    };
    
    fetchDepartamentos();
  }, []);
  
  // Funciones para la paginación
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Funciones para la búsqueda
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };
  
  const handleDepartamentoFilterChange = (event) => {
    setDepartamentoFilter(event.target.value);
  };
  
  // Funciones para el manejo de eliminación
  const handleDeleteClick = (trabajador) => {
    setTrabajadorToDelete(trabajador);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    try {
      await trabajadorService.delete(trabajadorToDelete.id);
      
      // Actualizar la lista de trabajadores
      setTrabajadores(trabajadores.filter(t => t.id !== trabajadorToDelete.id));
      
      setDeleteDialogOpen(false);
      setTrabajadorToDelete(null);
    } catch (err) {
      console.error('Error al eliminar trabajador:', err);
      setError('No se pudo eliminar el trabajador. Inténtalo de nuevo más tarde.');
    }
  };
  
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setTrabajadorToDelete(null);
  };
  
  // Obtener trabajadores paginados
  const paginatedTrabajadores = trabajadores.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );
  
  return (
    <Box sx={{ px: { xs: 1, sm: 2, md: 3 }, py: 2 }}>
      {/* Header Section - Más compacto */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          Trabajadores
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Administra la información de los trabajadores del sistema
        </Typography>
      </Box>
      
      {/* Filtros y Búsqueda - Layout optimizado */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Stack spacing={2}>
          {/* Primera fila: Búsqueda y filtro */}
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={5}>
              <TextField
                fullWidth
                size="small"
                label="Buscar por nombre o RFC"
                variant="outlined"
                value={searchTerm}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={4} md={3}>
              <TextField
                select
                fullWidth
                size="small"
                label="Departamento"
                value={departamentoFilter}
                onChange={handleDepartamentoFilterChange}
                SelectProps={{
                  native: true,
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <FilterIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              >
                <option value="">Todos los departamentos</option>
                {departamentos.map((departamento) => (
                  <option key={departamento.id} value={departamento.id}>
                    {departamento.descripcion}
                  </option>
                ))}
              </TextField>
            </Grid>
            
            <Grid item xs={12} sm={2} md={4} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                component={RouterLink}
                to="/trabajadores/nuevo"
                sx={{ minWidth: { xs: '100%', sm: 'auto' } }}
              >
                Nuevo Trabajador
              </Button>
            </Grid>
          </Grid>
          
          {/* Estadísticas rápidas */}
          {!loading && trabajadores.length > 0 && (
            <Box sx={{ display: 'flex', gap: 2, pt: 1 }}>
              <Chip 
                label={`Total: ${trabajadores.length}`} 
                color="default" 
                size="small" 
              />
              <Chip 
                label={`Activos: ${trabajadores.filter(t => t.estado).length}`} 
                color="success" 
                size="small" 
              />
              <Chip 
                label={`Inactivos: ${trabajadores.filter(t => !t.estado).length}`} 
                color="default" 
                size="small" 
              />
            </Box>
          )}
        </Stack>
      </Paper>
      
      {/* Contenido Principal */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Cargando trabajadores...</Typography>
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : trabajadores.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <CardContent>
            <FingerprintIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No se encontraron trabajadores
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {searchTerm || departamentoFilter 
                ? 'Intenta con otros criterios de búsqueda' 
                : 'Aún no hay trabajadores registrados en el sistema'
              }
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              component={RouterLink}
              to="/trabajadores/nuevo"
            >
              Agregar Primer Trabajador
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Paper elevation={1}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>Nombre Completo</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>RFC</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Departamento</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Puesto</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Estado</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedTrabajadores.map((trabajador, index) => (
                  <TableRow 
                    key={trabajador.id}
                    sx={{ 
                      '&:hover': { bgcolor: 'action.hover' },
                      bgcolor: index % 2 === 0 ? 'transparent' : 'grey.25'
                    }}
                  >
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {`${trabajador.nombre} ${trabajador.apellidoPaterno} ${trabajador.apellidoMaterno}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {trabajador.id}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {trabajador.rfc}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {trabajador.departamento}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {trabajador.puesto}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={trabajador.estado ? 'Activo' : 'Inactivo'} 
                        color={trabajador.estado ? 'success' : 'default'}
                        size="small"
                        variant={trabajador.estado ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        <IconButton
                          component={RouterLink}
                          to={`/trabajadores/${trabajador.id}`}
                          size="small"
                          color="primary"
                          title="Ver detalles"
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          component={RouterLink}
                          to={`/trabajadores/${trabajador.id}/editar`}
                          size="small"
                          color="primary"
                          title="Editar"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteClick(trabajador)}
                          title="Eliminar"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Paginación */}
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={trabajadores.length}
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
      
      {/* Diálogo de confirmación para eliminar trabajador */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          Confirmar eliminación
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {trabajadorToDelete && (
              <>
                ¿Estás seguro de que deseas eliminar al trabajador{' '}
                <strong>
                  {`${trabajadorToDelete.nombre} ${trabajadorToDelete.apellidoPaterno} ${trabajadorToDelete.apellidoMaterno}`}
                </strong>?
                <br /><br />
                Esta acción marcará al trabajador como inactivo y no podrá deshacerse.
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleDeleteCancel} color="inherit">
            Cancelar
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            autoFocus
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TrabajadoresList;