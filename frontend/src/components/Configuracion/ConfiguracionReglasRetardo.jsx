// frontend/src/components/Configuracion/ConfiguracionReglasRetardo.jsx
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
  Card,
  CardContent,
  Stack,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import { reglasRetardoService } from '../../services/api';

const ConfiguracionReglasRetardo = () => {
  // Estados principales
  const [reglas, setReglas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Estados para el diálogo
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  
  // Estados del formulario
  const [descripcion, setDescripcion] = useState('');
  const [minutosMin, setMinutosMin] = useState('');
  const [minutosMax, setMinutosMax] = useState('');
  
  // Cargar reglas al montar el componente
  useEffect(() => {
    cargarReglas();
  }, []);

  const cargarReglas = async () => {
    try {
      setLoading(true);
      const data = await reglasRetardoService.getAll();
      // Ordenar por minutosMin
      const reglasOrdenadas = (data || []).sort((a, b) => a.minutosMin - b.minutosMin);
      setReglas(reglasOrdenadas);
    } catch (err) {
      console.error('Error al cargar reglas:', err);
      setError('Error al cargar las reglas de retardo');
    } finally {
      setLoading(false);
    }
  };

  const validarRegla = () => {
    // Validaciones básicas
    if (!descripcion.trim()) {
      setError('La descripción es requerida');
      return false;
    }
    
    const min = parseInt(minutosMin);
    const max = parseInt(minutosMax);
    
    if (isNaN(min) || isNaN(max)) {
      setError('Los minutos deben ser números válidos');
      return false;
    }
    
    if (min < 0 || max < 0) {
      setError('Los minutos no pueden ser negativos');
      return false;
    }
    
    if (min >= max) {
      setError('El minuto mínimo debe ser menor que el máximo');
      return false;
    }
    
    // Verificar traslapes con otras reglas (excluyendo la que se está editando)
    const reglasParaVerificar = editando 
      ? reglas.filter(r => r.id !== editando.id)
      : reglas;
    
    for (const regla of reglasParaVerificar) {
      // Verificar si hay traslape
      if (
        (min >= regla.minutosMin && min <= regla.minutosMax) ||
        (max >= regla.minutosMin && max <= regla.minutosMax) ||
        (min <= regla.minutosMin && max >= regla.minutosMax)
      ) {
        setError(`La regla se traslapa con "${regla.descripcion}" (${regla.minutosMin}-${regla.minutosMax} min)`);
        return false;
      }
    }
    
    return true;
  };

  const handleGuardar = async () => {
    try {
      if (!validarRegla()) {
        return;
      }
      
      setLoading(true);
      
      const reglaData = {
        descripcion: descripcion.trim(),
        minutosMin: parseInt(minutosMin),
        minutosMax: parseInt(minutosMax)
      };
      
      if (editando) {
        await reglasRetardoService.update(editando.id, reglaData);
        setSuccess('Regla actualizada correctamente');
      } else {
        await reglasRetardoService.create(reglaData);
        setSuccess('Regla creada correctamente');
      }
      
      await cargarReglas();
      handleCerrarDialog();
      
    } catch (err) {
      console.error('Error al guardar regla:', err);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Error al guardar la regla de retardo');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta regla de retardo?')) {
      return;
    }
    
    try {
      setLoading(true);
      await reglasRetardoService.delete(id);
      setSuccess('Regla eliminada correctamente');
      await cargarReglas();
    } catch (err) {
      console.error('Error al eliminar regla:', err);
      setError('Error al eliminar la regla de retardo');
    } finally {
      setLoading(false);
    }
  };

  const handleEditar = (regla) => {
    setEditando(regla);
    setDescripcion(regla.descripcion);
    setMinutosMin(regla.minutosMin.toString());
    setMinutosMax(regla.minutosMax.toString());
    setDialogOpen(true);
  };

  const handleCerrarDialog = () => {
    setDialogOpen(false);
    setEditando(null);
    setDescripcion('');
    setMinutosMin('');
    setMinutosMax('');
    setError(null);
  };

  const getColorByTipo = (descripcion) => {
    const desc = descripcion.toLowerCase();
    if (desc.includes('menor') || desc.includes('leve')) return 'warning';
    if (desc.includes('mayor') || desc.includes('grave')) return 'error';
    if (desc.includes('falta')) return 'error';
    return 'default';
  };

  const getIconByTipo = (descripcion) => {
    const desc = descripcion.toLowerCase();
    if (desc.includes('falta')) return <CloseIcon />;
    if (desc.includes('mayor') || desc.includes('grave')) return <WarningIcon />;
    return <AccessTimeIcon />;
  };

  // Función para cargar reglas predeterminadas
  const cargarReglasPredeterminadas = async () => {
    if (!window.confirm('¿Desea cargar las reglas predeterminadas? Esto eliminará las reglas existentes.')) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Eliminar reglas existentes
      for (const regla of reglas) {
        await reglasRetardoService.delete(regla.id);
      }
      
      // Crear reglas predeterminadas
      const reglasPredeterminadas = [
        { descripcion: 'Tolerancia', minutosMin: 0, minutosMax: 10 },
        { descripcion: 'Retardo Menor', minutosMin: 11, minutosMax: 20 },
        { descripcion: 'Retardo Mayor', minutosMin: 21, minutosMax: 30 },
        { descripcion: 'Falta por Retardo', minutosMin: 31, minutosMax: 999 }
      ];
      
      for (const regla of reglasPredeterminadas) {
        await reglasRetardoService.create(regla);
      }
      
      setSuccess('Reglas predeterminadas cargadas correctamente');
      await cargarReglas();
      
    } catch (err) {
      console.error('Error al cargar reglas predeterminadas:', err);
      setError('Error al cargar las reglas predeterminadas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          Configuración de Reglas de Retardo
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Define los rangos de minutos para clasificar retardos y faltas
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

      {/* Información sobre las reglas */}
      <Card sx={{ mb: 3, bgcolor: 'info.lighter' }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <InfoIcon color="info" />
            <Box>
              <Typography variant="subtitle1" fontWeight="medium">
                ¿Cómo funcionan las reglas de retardo?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Las reglas definen cómo se clasifican las llegadas tardías según los minutos después de la hora de entrada programada.
                Por ejemplo: 0-10 minutos = Tolerancia, 11-20 minutos = Retardo Menor, etc.
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Botones de acción */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Nueva Regla
        </Button>
        {reglas.length === 0 && (
          <Button
            variant="outlined"
            startIcon={<ScheduleIcon />}
            onClick={cargarReglasPredeterminadas}
          >
            Cargar Reglas Predeterminadas
          </Button>
        )}
      </Stack>

      {/* Visualización de línea de tiempo */}
      {reglas.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Línea de Tiempo de Reglas
          </Typography>
          <Box sx={{ mt: 2, mb: 2 }}>
            {reglas.map((regla, index) => (
              <Box key={regla.id} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Chip
                  icon={getIconByTipo(regla.descripcion)}
                  label={`${regla.minutosMin}-${regla.minutosMax} min`}
                  color={getColorByTipo(regla.descripcion)}
                  variant="outlined"
                  sx={{ mr: 2, minWidth: 120 }}
                />
                <Typography variant="body2">
                  {regla.descripcion}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* Tabla de reglas */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Descripción</TableCell>
              <TableCell align="center">Minuto Inicial</TableCell>
              <TableCell align="center">Minuto Final</TableCell>
              <TableCell align="center">Rango</TableCell>
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
            ) : reglas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No hay reglas configuradas. Crea una nueva regla o carga las predeterminadas.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              reglas.map((regla) => (
                <TableRow key={regla.id}>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {getIconByTipo(regla.descripcion)}
                      <Typography>{regla.descripcion}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell align="center">
                    {regla.minutosMin} min
                  </TableCell>
                  <TableCell align="center">
                    {regla.minutosMax === 999 ? '∞' : `${regla.minutosMax} min`}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={`${regla.minutosMax - regla.minutosMin + 1} minutos`}
                      size="small"
                      color={getColorByTipo(regla.descripcion)}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Editar">
                      <IconButton
                        size="small"
                        onClick={() => handleEditar(regla)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleEliminar(regla.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Notas importantes */}
      <Alert severity="warning" sx={{ mt: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Consideraciones importantes:
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText 
              primary="• Las reglas no deben traslaparse entre sí"
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="• Se recomienda cubrir todos los rangos de tiempo posibles"
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="• Los cambios en las reglas solo afectarán a futuros registros"
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="• Para faltas por retardo, use un valor máximo alto (ej: 999)"
            />
          </ListItem>
        </List>
      </Alert>

      {/* Diálogo para crear/editar */}
      <Dialog open={dialogOpen} onClose={handleCerrarDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editando ? 'Editar Regla de Retardo' : 'Nueva Regla de Retardo'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Descripción"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              required
              placeholder="Ej: Retardo Menor"
              helperText="Nombre descriptivo para esta regla"
            />
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Minutos Mínimos"
                  type="number"
                  value={minutosMin}
                  onChange={(e) => setMinutosMin(e.target.value)}
                  required
                  InputProps={{ inputProps: { min: 0 } }}
                  helperText="Desde cuántos minutos aplica"
                />
              </Grid>
              
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Minutos Máximos"
                  type="number"
                  value={minutosMax}
                  onChange={(e) => setMinutosMax(e.target.value)}
                  required
                  InputProps={{ inputProps: { min: 0 } }}
                  helperText="Hasta cuántos minutos aplica"
                />
              </Grid>
            </Grid>
            
            {minutosMin && minutosMax && parseInt(minutosMin) < parseInt(minutosMax) && (
              <Alert severity="info">
                Esta regla aplicará para llegadas entre {minutosMin} y {minutosMax} minutos después de la hora de entrada.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCerrarDialog}>Cancelar</Button>
          <Button onClick={handleGuardar} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConfiguracionReglasRetardo;