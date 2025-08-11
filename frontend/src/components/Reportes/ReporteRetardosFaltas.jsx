import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Stack
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  Print as PrintIcon,
  Settings as SettingsIcon,
  CalendarMonth as CalendarIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Image as ImageIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { reporteService, trabajadorService, catalogoService } from '../../services/api';

const ReporteRetardosFaltas = () => {
  // Estados para filtros
  const [fechaInicio, setFechaInicio] = useState(dayjs().startOf('month'));
  const [fechaFin, setFechaFin] = useState(dayjs().endOf('month'));
  const [departamentoId, setDepartamentoId] = useState('');
  const [trabajadorId, setTrabajadorId] = useState('');
  
  // Estados para datos
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reporteData, setReporteData] = useState(null);
  const [departamentos, setDepartamentos] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  
  // Estados para configuración del reporte
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [reporteConfig, setReporteConfig] = useState({
    nombreEmpresa: localStorage.getItem('reporteNombreEmpresa') || 'Mi Empresa S.A. de C.V.',
    direccion: localStorage.getItem('reporteDireccion') || 'Calle Principal #123, Col. Centro',
    ciudad: localStorage.getItem('reporteCiudad') || 'Los Mochis, Sinaloa',
    telefono: localStorage.getItem('reporteTelefono') || 'Tel: (668) 123-4567',
    logo: localStorage.getItem('reporteLogo') || null,
    mostrarLogo: localStorage.getItem('reporteMostrarLogo') === 'true',
    mostrarFirmas: localStorage.getItem('reporteMostrarFirmas') === 'true',
    firmaDirector: localStorage.getItem('reporteFirmaDirector') || 'Director General',
    firmaRH: localStorage.getItem('reporteFirmaRH') || 'Recursos Humanos',
    colorPrimario: localStorage.getItem('reporteColorPrimario') || '#1976d2',
    colorSecundario: localStorage.getItem('reporteColorSecundario') || '#f50057'
  });
  
  // Referencias para el reporte
  const reporteRef = useRef(null);
  
  // Cargar catálogos al iniciar
  useEffect(() => {
    fetchCatalogos();
  }, []);
  
  const fetchCatalogos = async () => {
    try {
      const [deptos, trabajadoresData] = await Promise.all([
        catalogoService.getDepartamentos(),
        trabajadorService.getAll({ estado: true })
      ]);
      
      setDepartamentos(deptos);
      
      // Manejar respuesta de trabajadores
      const trabajadoresArray = Array.isArray(trabajadoresData) 
        ? trabajadoresData 
        : (trabajadoresData?.trabajadores || []);
      
      setTrabajadores(trabajadoresArray);
    } catch (err) {
      console.error('Error al cargar catálogos:', err);
    }
  };
  
  // Generar reporte
  const handleGenerarReporte = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        fecha_inicio: fechaInicio.format('YYYY-MM-DD'),
        fecha_fin: fechaFin.format('YYYY-MM-DD')
      };
      
      if (departamentoId) params.departamento_id = departamentoId;
      
      // Obtener datos del reporte
      const data = await reporteService.getReporteRetardosFaltas(params);
      
      // Si se seleccionó un trabajador específico, filtrar
      let dataFiltrada = data;
      if (trabajadorId) {
        dataFiltrada = {
          ...data,
          trabajadores: data.trabajadores.filter(t => t.id == trabajadorId)
        };
      }
      
      setReporteData(dataFiltrada);
    } catch (err) {
      console.error('Error al generar reporte:', err);
      setError('No se pudo generar el reporte');
    } finally {
      setLoading(false);
    }
  };
  
  // Guardar configuración
  const handleGuardarConfig = () => {
    // Guardar en localStorage
    Object.keys(reporteConfig).forEach(key => {
      localStorage.setItem(`reporte${key.charAt(0).toUpperCase() + key.slice(1)}`, 
        typeof reporteConfig[key] === 'boolean' ? reporteConfig[key].toString() : reporteConfig[key]
      );
    });
    
    setConfigDialogOpen(false);
  };
  
  // Manejar carga de logo
  const handleLogoChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReporteConfig({
          ...reporteConfig,
          logo: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Generar PDF
  const handleGenerarPDF = async () => {
    if (!reporteData || !reporteData.trabajadores.length) {
      setError('No hay datos para generar el PDF');
      return;
    }
    
    const pdf = new jsPDF('p', 'mm', 'letter');
    const pageHeight = pdf.internal.pageSize.height;
    const pageWidth = pdf.internal.pageSize.width;
    
    for (let i = 0; i < reporteData.trabajadores.length; i++) {
      const trabajador = reporteData.trabajadores[i];
      
      if (i > 0) {
        pdf.addPage();
      }
      
      // Encabezado con membrete
      let yPosition = 20;
      
      // Logo si está configurado
      if (reporteConfig.mostrarLogo && reporteConfig.logo) {
        try {
          pdf.addImage(reporteConfig.logo, 'PNG', 15, 10, 30, 30);
        } catch (err) {
          console.error('Error al agregar logo:', err);
        }
      }
      
      // Información de la empresa
      pdf.setFontSize(16);
      pdf.setFont(undefined, 'bold');
      pdf.text(reporteConfig.nombreEmpresa, pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 6;
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.text(reporteConfig.direccion, pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 5;
      pdf.text(`${reporteConfig.ciudad} - ${reporteConfig.telefono}`, pageWidth / 2, yPosition, { align: 'center' });
      
      // Línea divisoria
      yPosition += 10;
      pdf.setDrawColor(parseInt(reporteConfig.colorPrimario.slice(1, 3), 16),
                       parseInt(reporteConfig.colorPrimario.slice(3, 5), 16),
                       parseInt(reporteConfig.colorPrimario.slice(5, 7), 16));
      pdf.setLineWidth(0.5);
      pdf.line(15, yPosition, pageWidth - 15, yPosition);
      
      // Título del reporte
      yPosition += 15;
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.text('REPORTE DE RETARDOS Y FALTAS', pageWidth / 2, yPosition, { align: 'center' });
      
      // Período
      yPosition += 8;
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.text(`Período: ${dayjs(reporteData.fecha_inicio).format('DD/MM/YYYY')} al ${dayjs(reporteData.fecha_fin).format('DD/MM/YYYY')}`, 
        pageWidth / 2, yPosition, { align: 'center' });
      
      // Información del trabajador
      yPosition += 15;
      pdf.setFillColor(245, 245, 245);
      pdf.rect(15, yPosition - 5, pageWidth - 30, 25, 'F');
      
      pdf.setFontSize(11);
      pdf.setFont(undefined, 'bold');
      pdf.text('DATOS DEL TRABAJADOR', 20, yPosition);
      
      yPosition += 7;
      pdf.setFont(undefined, 'normal');
      pdf.text(`Nombre: ${trabajador.nombre}`, 20, yPosition);
      
      yPosition += 6;
      pdf.text(`RFC: ${trabajador.rfc}`, 20, yPosition);
      pdf.text(`Departamento: ${trabajador.departamento}`, 100, yPosition - 6);
      pdf.text(`Puesto: ${trabajador.puesto}`, 100, yPosition);
      
      // Resumen de estadísticas
      yPosition += 20;
      pdf.setFont(undefined, 'bold');
      pdf.text('RESUMEN DEL PERÍODO', 20, yPosition);
      
      yPosition += 10;
      
      // Cuadros de estadísticas
      const stats = trabajador.estadisticas;
      const boxWidth = 40;
      const boxHeight = 20;
      const startX = (pageWidth - (4 * boxWidth + 30)) / 2;
      
      // Días laborables
      pdf.setFillColor(240, 240, 240);
      pdf.rect(startX, yPosition, boxWidth, boxHeight, 'F');
      pdf.setFont(undefined, 'normal');
      pdf.text('Días Lab.', startX + boxWidth/2, yPosition + 7, { align: 'center' });
      pdf.setFont(undefined, 'bold');
      pdf.text(stats.dias_laborables.toString(), startX + boxWidth/2, yPosition + 14, { align: 'center' });
      
      // Asistencias
      pdf.setFillColor(220, 255, 220);
      pdf.rect(startX + boxWidth + 10, yPosition, boxWidth, boxHeight, 'F');
      pdf.setFont(undefined, 'normal');
      pdf.text('Asistencias', startX + boxWidth + 10 + boxWidth/2, yPosition + 7, { align: 'center' });
      pdf.setFont(undefined, 'bold');
      pdf.text(stats.asistencias.toString(), startX + boxWidth + 10 + boxWidth/2, yPosition + 14, { align: 'center' });
      
      // Retardos
      pdf.setFillColor(255, 255, 220);
      pdf.rect(startX + 2*(boxWidth + 10), yPosition, boxWidth, boxHeight, 'F');
      pdf.setFont(undefined, 'normal');
      pdf.text('Retardos', startX + 2*(boxWidth + 10) + boxWidth/2, yPosition + 7, { align: 'center' });
      pdf.setFont(undefined, 'bold');
      pdf.text(stats.retardos.toString(), startX + 2*(boxWidth + 10) + boxWidth/2, yPosition + 14, { align: 'center' });
      
      // Faltas
      pdf.setFillColor(255, 220, 220);
      pdf.rect(startX + 3*(boxWidth + 10), yPosition, boxWidth, boxHeight, 'F');
      pdf.setFont(undefined, 'normal');
      pdf.text('Faltas', startX + 3*(boxWidth + 10) + boxWidth/2, yPosition + 7, { align: 'center' });
      pdf.setFont(undefined, 'bold');
      pdf.text(stats.faltas.toString(), startX + 3*(boxWidth + 10) + boxWidth/2, yPosition + 14, { align: 'center' });
      
      // Detalle diario
      yPosition += 35;
      pdf.setFont(undefined, 'bold');
      pdf.text('DETALLE DIARIO', 20, yPosition);
      
      yPosition += 10;
      
      // Tabla de detalles
      const registros = trabajador.registros_diarios || [];
      const itemsPerPage = 15;
      let currentItem = 0;
      
      // Encabezados de tabla
      pdf.setFillColor(parseInt(reporteConfig.colorPrimario.slice(1, 3), 16),
                       parseInt(reporteConfig.colorPrimario.slice(3, 5), 16),
                       parseInt(reporteConfig.colorPrimario.slice(5, 7), 16));
      pdf.rect(15, yPosition, pageWidth - 30, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont(undefined, 'bold');
      pdf.text('Fecha', 20, yPosition + 5);
      pdf.text('Día', 50, yPosition + 5);
      pdf.text('Hora Entrada', 80, yPosition + 5);
      pdf.text('Hora Salida', 120, yPosition + 5);
      pdf.text('Estatus', 160, yPosition + 5);
      
      pdf.setTextColor(0, 0, 0);
      yPosition += 10;
      
      // Filas de la tabla
      registros.forEach((registro, index) => {
        if (currentItem >= itemsPerPage) return;
        
        const fecha = dayjs(registro.fecha);
        const fillColor = index % 2 === 0 ? 250 : 255;
        
        pdf.setFillColor(fillColor, fillColor, fillColor);
        pdf.rect(15, yPosition - 5, pageWidth - 30, 8, 'F');
        
        pdf.setFont(undefined, 'normal');
        pdf.text(fecha.format('DD/MM/YYYY'), 20, yPosition);
        pdf.text(fecha.format('dddd'), 50, yPosition);
        pdf.text(registro.hora_entrada || '--:--', 80, yPosition);
        pdf.text(registro.hora_salida || '--:--', 120, yPosition);
        
        // Color del estatus
        let statusColor = [0, 0, 0];
        if (registro.estatus === 'ASISTENCIA') statusColor = [0, 128, 0];
        else if (registro.estatus.includes('RETARDO')) statusColor = [255, 140, 0];
        else if (registro.estatus === 'FALTA') statusColor = [255, 0, 0];
        
        pdf.setTextColor(...statusColor);
        pdf.text(registro.estatus, 160, yPosition);
        pdf.setTextColor(0, 0, 0);
        
        yPosition += 8;
        currentItem++;
      });
      
      // Firmas si están configuradas
      if (reporteConfig.mostrarFirmas) {
        const firmaY = pageHeight - 40;
        
        // Líneas para firma
        pdf.line(40, firmaY, 90, firmaY);
        pdf.line(pageWidth - 90, firmaY, pageWidth - 40, firmaY);
        
        // Nombres
        pdf.setFontSize(10);
        pdf.text(reporteConfig.firmaRH, 65, firmaY + 5, { align: 'center' });
        pdf.text(reporteConfig.firmaDirector, pageWidth - 65, firmaY + 5, { align: 'center' });
      }
      
      // Pie de página
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text(`Página ${i + 1} de ${reporteData.trabajadores.length}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      pdf.text(`Generado el ${dayjs().format('DD/MM/YYYY HH:mm')}`, pageWidth - 15, pageHeight - 10, { align: 'right' });
    }
    
    // Guardar PDF
    pdf.save(`Reporte_Retardos_Faltas_${dayjs().format('YYYYMMDD')}.pdf`);
  };
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Reporte de Retardos y Faltas
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Genera reportes detallados de retardos y faltas por trabajador
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {/* Filtros */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Filtros del Reporte
              </Typography>
            </Grid>
            
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="Fecha Inicio"
                  value={fechaInicio}
                  onChange={setFechaInicio}
                  slotProps={{ 
                    textField: { 
                      fullWidth: true,
                      variant: 'outlined'
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="Fecha Fin"
                  value={fechaFin}
                  onChange={setFechaFin}
                  slotProps={{ 
                    textField: { 
                      fullWidth: true,
                      variant: 'outlined'
                    }
                  }}
                />
              </Grid>
            </LocalizationProvider>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Departamento</InputLabel>
                <Select
                  value={departamentoId}
                  onChange={(e) => setDepartamentoId(e.target.value)}
                  label="Departamento"
                >
                  <MenuItem value="">Todos</MenuItem>
                  {departamentos.map(dept => (
                    <MenuItem key={dept.id} value={dept.id}>
                      {dept.descripcion}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Trabajador</InputLabel>
                <Select
                  value={trabajadorId}
                  onChange={(e) => setTrabajadorId(e.target.value)}
                  label="Trabajador"
                >
                  <MenuItem value="">Todos</MenuItem>
                  {trabajadores
                    .filter(t => !departamentoId || t.departamento == departamentoId)
                    .map(t => (
                      <MenuItem key={t.id} value={t.id}>
                        {`${t.nombre} ${t.apellidoPaterno} ${t.apellidoMaterno}`}
                      </MenuItem>
                    ))
                  }
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  startIcon={<CalendarIcon />}
                  onClick={handleGenerarReporte}
                  disabled={loading}
                >
                  {loading ? 'Generando...' : 'Generar Reporte'}
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<SettingsIcon />}
                  onClick={() => setConfigDialogOpen(true)}
                >
                  Configurar Formato
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      
      {/* Vista previa del reporte */}
      {reporteData && reporteData.trabajadores.length > 0 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Vista Previa del Reporte
              </Typography>
              <Button
                variant="contained"
                color="error"
                startIcon={<PdfIcon />}
                onClick={handleGenerarPDF}
              >
                Generar PDF
              </Button>
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            {/* Resumen general */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle1" gutterBottom>
                Resumen General
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Período:
                  </Typography>
                  <Typography variant="body1">
                    {dayjs(reporteData.fecha_inicio).format('DD/MM/YYYY')} - {dayjs(reporteData.fecha_fin).format('DD/MM/YYYY')}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Total Trabajadores:
                  </Typography>
                  <Typography variant="body1">
                    {reporteData.trabajadores.length}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Total Retardos:
                  </Typography>
                  <Typography variant="body1" color="warning.main">
                    {reporteData.trabajadores.reduce((sum, t) => sum + t.estadisticas.retardos, 0)}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color="text.secondary">
                    Total Faltas:
                  </Typography>
                  <Typography variant="body1" color="error">
                    {reporteData.trabajadores.reduce((sum, t) => sum + t.estadisticas.faltas, 0)}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
            
            {/* Lista de trabajadores */}
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Trabajador</TableCell>
                    <TableCell>Departamento</TableCell>
                    <TableCell align="center">Días Lab.</TableCell>
                    <TableCell align="center">Asistencias</TableCell>
                    <TableCell align="center">Retardos</TableCell>
                    <TableCell align="center">Faltas</TableCell>
                    <TableCell align="center">% Asistencia</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reporteData.trabajadores.map((trabajador) => (
                    <TableRow key={trabajador.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                            {trabajador.nombre.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2">
                              {trabajador.nombre}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              RFC: {trabajador.rfc}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{trabajador.departamento}</TableCell>
                      <TableCell align="center">{trabajador.estadisticas.dias_laborables}</TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={trabajador.estadisticas.asistencias} 
                          color="success" 
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={trabajador.estadisticas.retardos} 
                          color="warning" 
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={trabajador.estadisticas.faltas} 
                          color="error" 
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography 
                          variant="body2" 
                          color={trabajador.estadisticas.porcentaje_asistencia >= 90 ? 'success.main' : 'error.main'}
                        >
                          {trabajador.estadisticas.porcentaje_asistencia.toFixed(1)}%
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
      
      {/* Diálogo de configuración */}
      <Dialog 
        open={configDialogOpen} 
        onClose={() => setConfigDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Configurar Formato del Reporte
            <IconButton onClick={() => setConfigDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Información de la Empresa
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nombre de la Empresa"
                value={reporteConfig.nombreEmpresa}
                onChange={(e) => setReporteConfig({...reporteConfig, nombreEmpresa: e.target.value})}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Teléfono"
                value={reporteConfig.telefono}
                onChange={(e) => setReporteConfig({...reporteConfig, telefono: e.target.value})}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Dirección"
                value={reporteConfig.direccion}
                onChange={(e) => setReporteConfig({...reporteConfig, direccion: e.target.value})}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Ciudad"
                value={reporteConfig.ciudad}
                onChange={(e) => setReporteConfig({...reporteConfig, ciudad: e.target.value})}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Box>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<ImageIcon />}
                  fullWidth
                >
                  Cargar Logo
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleLogoChange}
                  />
                </Button>
                {reporteConfig.logo && (
                  <Box sx={{ mt: 1, textAlign: 'center' }}>
                    <img 
                      src={reporteConfig.logo} 
                      alt="Logo" 
                      style={{ maxHeight: 50 }}
                    />
                  </Box>
                )}
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Divider />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Opciones de Visualización
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Mostrar Logo</InputLabel>
                <Select
                  value={reporteConfig.mostrarLogo}
                  onChange={(e) => setReporteConfig({...reporteConfig, mostrarLogo: e.target.value === 'true'})}
                  label="Mostrar Logo"
                >
                  <MenuItem value="true">Sí</MenuItem>
                  <MenuItem value="false">No</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Mostrar Firmas</InputLabel>
                <Select
                  value={reporteConfig.mostrarFirmas}
                  onChange={(e) => setReporteConfig({...reporteConfig, mostrarFirmas: e.target.value === 'true'})}
                  label="Mostrar Firmas"
                >
                  <MenuItem value="true">Sí</MenuItem>
                  <MenuItem value="false">No</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {reporteConfig.mostrarFirmas && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Nombre del Director"
                    value={reporteConfig.firmaDirector}
                    onChange={(e) => setReporteConfig({...reporteConfig, firmaDirector: e.target.value})}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Nombre de RH"
                    value={reporteConfig.firmaRH}
                    onChange={(e) => setReporteConfig({...reporteConfig, firmaRH: e.target.value})}
                  />
                </Grid>
              </>
            )}
            
            <Grid item xs={12}>
              <Divider />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Colores del Reporte
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Color Primario"
                type="color"
                value={reporteConfig.colorPrimario}
                onChange={(e) => setReporteConfig({...reporteConfig, colorPrimario: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Color Secundario"
                type="color"
                value={reporteConfig.colorSecundario}
                onChange={(e) => setReporteConfig({...reporteConfig, colorSecundario: e.target.value})}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleGuardarConfig}>
            Guardar Configuración
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ReporteRetardosFaltas;