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
  DialogTitle
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Fingerprint as FingerprintIcon
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
    <Container maxWidth={false}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Trabajadores
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Administra la información de los trabajadores del sistema
        </Typography>
      </Box>
      
      <Paper sx={{ p: 2, mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="Buscar por nombre o RFC"
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
          
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              select
              fullWidth
              label="Departamento"
              value={departamentoFilter}
              onChange={handleDepartamentoFilterChange}
              SelectProps={{
                native: true,
              }}
            >
              <option value="">Todos</option>
              {departamentos.map((departamento) => (
                <option key={departamento.id} value={departamento.id}>
                  {departamento.descripcion}
                </option>
              ))}
            </TextField>
          </Grid>
          
          <Grid item xs={12} sm={12} md={5} sx={{ textAlign: 'right' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              component={RouterLink}
              to="/trabajadores/nuevo"
              sx={{ mt: { xs: 2, md: 0 } }}
            >
              Nuevo Trabajador
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mt: 4 }}>
          {error}
        </Alert>
      ) : trabajadores.length === 0 ? (
        <Card sx={{ mt: 4, p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No se encontraron trabajadores
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Intenta con otros criterios de búsqueda o añade nuevos trabajadores
          </Typography>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="tabla de trabajadores">
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>RFC</TableCell>
                <TableCell>Departamento</TableCell>
                <TableCell>Puesto</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedTrabajadores.map((trabajador) => (
                <TableRow key={trabajador.id}>
                  <TableCell>
                    {`${trabajador.nombre} ${trabajador.apellidoPaterno} ${trabajador.apellidoMaterno}`}
                  </TableCell>
                  <TableCell>{trabajador.rfc}</TableCell>
                  <TableCell>{trabajador.departamento}</TableCell>
                  <TableCell>{trabajador.puesto}</TableCell>
                  <TableCell>
                    <Chip 
                      label={trabajador.estado ? 'Activo' : 'Inactivo'} 
                      color={trabajador.estado ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      component={RouterLink}
                      to={`/trabajadores/${trabajador.id}`}
                      size="small"
                      color="primary"
                      sx={{ mr: 1 }}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      component={RouterLink}
                      to={`/trabajadores/${trabajador.id}/editar`}
                      size="small"
                      color="primary"
                      sx={{ mr: 1 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteClick(trabajador)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={trabajadores.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="Filas por página"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          />
        </TableContainer>
      )}
      
      {/* Diálogo de confirmación para eliminar trabajador */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"¿Eliminar trabajador?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {trabajadorToDelete && (
              <>
                Estás a punto de eliminar al trabajador: 
                <strong>
                  {` ${trabajadorToDelete.nombre} ${trabajadorToDelete.apellidoPaterno} ${trabajadorToDelete.apellidoMaterno}`}
                </strong>.
                <br />
                Esta acción no puede deshacerse.
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
    </Container>
  );
};

export default TrabajadoresList;