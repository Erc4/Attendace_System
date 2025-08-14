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
  


const handleGenerarPDF = async () => {
  if (!reporteData || !reporteData.trabajadores.length) {
    setError('No hay datos para generar el PDF');
    return;
  }
  
  const pdf = new jsPDF('p', 'mm', 'letter');
  const pageHeight = pdf.internal.pageSize.height;
  const pageWidth = pdf.internal.pageSize.width;
  
  // Texto legal de SEP
  const textoLegalSEP = `De conformidad con el Reglamento de las Condiciones Generales de Trabajo del Personal de la Secretaría de Educación Pública, que establece: "La falta del trabajador a sus labores, que no se justifique por medio de licencia legalmente concedida, lo priva del derecho de reclamar el salario correspondiente a la jornada o jornadas de trabajo no desempeñadas" y en virtud de su(s) falta(s) injustificada(s) relacionada(s) en el anverso de este formato, en la(s) plaza(s) asignada(s) para desempeñar sus labores, se le descontará el sueldo correspondiente por no haberlo devengado. Es importante mencionar que cuenta usted con tres días hábiles después de recibir este documento para hacer cualquier aclaración y/o justificación ante la Oficina de Recursos Humanos. Se le exhorta para que cumpla con las obligaciones y responsabilidades que el marco jurídico y normativo establecen, con el propósito de no afectar su desarrollo en la institución, ni demeritar el servicio público que ésta ofrece, de lo contrario se procederá al artículo 71 f (2), y al artículo 76, del reglamento de las condiciones generales del trabajo del personal de la secretaría de educación pública.`;
  
  // Función auxiliar para agregar texto largo con saltos de línea automáticos
  const agregarTextoLargo = (texto, x, y, maxWidth, fontSize = 8, color = [100, 100, 100]) => {
    pdf.setFontSize(fontSize);
    pdf.setTextColor(...color);
    pdf.setFont(undefined, 'normal');
    
    const lines = pdf.splitTextToSize(texto, maxWidth);
    let currentY = y;
    
    lines.forEach(line => {
      pdf.text(line, x, currentY);
      currentY += fontSize * 0.5; // Espaciado entre líneas
    });
    
    return currentY; // Retorna la posición Y final
  };
  
  // Función auxiliar para agregar cabecera
    const agregarEncabezado = (numeroPagina, totalPaginas) => {
    // Resetear colores
    pdf.setDrawColor(0, 0, 0);
    pdf.setTextColor(0, 0, 0);
    pdf.setFillColor(255, 255, 255);
    
    let yPosition = 15;
    
    // SECCIÓN IZQUIERDA - Logo o texto personalizable
    if (reporteConfig.mostrarLogo && reporteConfig.logo) {
      try {
        pdf.addImage(reporteConfig.logo, 'PNG', 15, 10, 25, 25);
      } catch (err) {
        // Si falla la imagen, poner texto
        pdf.setFontSize(9);
        pdf.setFont(undefined, 'bold');
        pdf.text('SEP', 15, yPosition);
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(7);
        pdf.text('Secretaría de', 15, yPosition + 4);
        pdf.text('Educación Pública', 15, yPosition + 8);
      }
    } else {
      // Texto por defecto si no hay logo
      pdf.setFontSize(9);
      pdf.setFont(undefined, 'bold');
      pdf.text('SEP', 15, yPosition);
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(7);
      pdf.text('Secretaría de', 15, yPosition + 4);
      pdf.text('Educación Pública', 15, yPosition + 8);
    }
    
    // SECCIÓN CENTRAL - Información de la institución
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(reporteConfig.nombreEmpresa, pageWidth / 2, yPosition, { align: 'center' });
    
    pdf.setFontSize(8);
    pdf.setFont(undefined, 'normal');
    pdf.text(reporteConfig.direccion, pageWidth / 2, yPosition + 5, { align: 'center' });
    pdf.text(`${reporteConfig.ciudad}`, pageWidth / 2, yPosition + 9, { align: 'center' });
    
    // SECCIÓN DERECHA - Folio y fecha
    pdf.setFontSize(8);
    pdf.setFont(undefined, 'normal');
    pdf.text(`Folio: ${String(numeroPagina).padStart(4, '0')}`, pageWidth - 15, yPosition, { align: 'right' });
    pdf.text(`Fecha: ${dayjs().format('DD/MM/YYYY')}`, pageWidth - 15, yPosition + 4, { align: 'right' });
    pdf.text(`Hora: ${dayjs().format('HH:mm')}`, pageWidth - 15, yPosition + 8, { align: 'right' });
    
    // Línea divisoria
    yPosition = 38;
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.line(15, yPosition, pageWidth - 15, yPosition);
    
    return yPosition + 5;
  };
  
  // Función auxiliar para agregar pie de página
     const agregarPiePagina = (numeroPagina, totalPaginas) => {
    pdf.setTextColor(100, 100, 100);
    pdf.setFontSize(7);
    
    // Línea divisoria
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);
    
    // Información del pie
    pdf.text(
      `Página ${numeroPagina} de ${totalPaginas}`, 
      15, 
      pageHeight - 10
    );
    
    pdf.text(
      'Documento generado por el Sistema de Control de Asistencia', 
      pageWidth / 2, 
      pageHeight - 10, 
      { align: 'center' }
    );
    
    pdf.text(
      `${dayjs().format('DD/MM/YYYY HH:mm')}`, 
      pageWidth - 15, 
      pageHeight - 10, 
      { align: 'right' }
    );
  };
  
  // Función auxiliar para agregar sección de firmas mejorada
    const agregarSeccionFirmas = (nombreTrabajador) => {
    const firmaY = pageHeight - 50;
    
    // Resetear colores
    pdf.setDrawColor(0, 0, 0);
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'normal');
    
    // Dos columnas para firmas
    const columnaAncho = (pageWidth - 80) / 2;
    const columna1X = 40;  // Firma del trabajador
    const columna2X = columna1X + columnaAncho + 20;  // Firma del director
    
    // Líneas para firma
    pdf.setLineWidth(0.5);
    pdf.line(columna1X, firmaY, columna1X + columnaAncho, firmaY);
    pdf.line(columna2X, firmaY, columna2X + columnaAncho, firmaY);
    
    // Firma del trabajador
    pdf.setFont(undefined, 'bold');
    pdf.text('RECIBÍ', columna1X + columnaAncho / 2, firmaY + 5, { align: 'center' });
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(8);
    pdf.text(nombreTrabajador || 'Nombre del Trabajador', columna1X + columnaAncho / 2, firmaY + 9, { align: 'center' });
    pdf.text('Trabajador/Interesado', columna1X + columnaAncho / 2, firmaY + 13, { align: 'center' });
    
    // Firma del Director
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'bold');
    pdf.text('AUTORIZA', columna2X + columnaAncho / 2, firmaY + 5, { align: 'center' });
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(8);
    pdf.text(reporteConfig.firmaDirector || 'Nombre del Director', columna2X + columnaAncho / 2, firmaY + 9, { align: 'center' });
    pdf.text('Director del Plantel', columna2X + columnaAncho / 2, firmaY + 13, { align: 'center' });
  };
  
  // Calcular total de páginas
  const totalPaginas = reporteData.trabajadores.length;
  
  // Generar páginas para cada trabajador
  for (let i = 0; i < reporteData.trabajadores.length; i++) {
    const trabajador = reporteData.trabajadores[i];
    
    if (i > 0) {
      pdf.addPage();
    }
    
    // Resetear colores
    pdf.setDrawColor(0, 0, 0);
    pdf.setTextColor(0, 0, 0);
    pdf.setFillColor(255, 255, 255);
    
    // Agregar encabezado
    let yPosition = agregarEncabezado(i + 1, totalPaginas);
    
    // Título del reporte
    yPosition += 5;
    pdf.setFontSize(11);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('NOTIFICACIÓN DE RETARDOS Y FALTAS', pageWidth / 2, yPosition, { align: 'center' });
    
    // Período
    yPosition += 6;
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'normal');
    pdf.text(
      `Período: ${dayjs(reporteData.fecha_inicio).format('DD/MM/YYYY')} al ${dayjs(reporteData.fecha_fin).format('DD/MM/YYYY')}`, 
      pageWidth / 2, 
      yPosition, 
      { align: 'center' }
    );
    
    // Información del trabajador
    yPosition += 8;
    pdf.setFillColor(250, 250, 250);
    pdf.rect(15, yPosition - 4, pageWidth - 30, 22, 'F');
    
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('DATOS DEL TRABAJADOR:', 20, yPosition);
    
    yPosition += 5;
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(8);
    pdf.text(`Nombre: ${trabajador.nombre}`, 20, yPosition);
    pdf.text(`RFC: ${trabajador.rfc}`, 120, yPosition);
    
    yPosition += 5;
    pdf.text(`Departamento: ${trabajador.departamento}`, 20, yPosition);
    pdf.text(`Puesto: ${trabajador.puesto}`, 120, yPosition);
    
    // Resumen de estadísticas
    yPosition += 12;
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(9);
    pdf.text('RESUMEN:', 20, yPosition);
    
    yPosition += 6;
    const stats = trabajador.estadisticas;
    
    // Tabla simple de resumen
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(8);
    
    // Encabezados
    pdf.setFillColor(240, 240, 240);
    pdf.rect(20, yPosition - 3, 35, 6, 'F');
    pdf.rect(55, yPosition - 3, 35, 6, 'F');
    pdf.rect(90, yPosition - 3, 35, 6, 'F');
    pdf.rect(125, yPosition - 3, 35, 6, 'F');
    pdf.rect(160, yPosition - 3, 35, 6, 'F');
    
    pdf.text('Días Laborables', 37.5, yPosition, { align: 'center' });
    pdf.text('Asistencias', 72.5, yPosition, { align: 'center' });
    pdf.text('Retardos', 107.5, yPosition, { align: 'center' });
    pdf.text('Faltas', 142.5, yPosition, { align: 'center' });
    pdf.text('% Asistencia', 177.5, yPosition, { align: 'center' });
    
    // Valores
    yPosition += 6;
    pdf.setFont(undefined, 'bold');
    pdf.text(stats.dias_laborables.toString(), 37.5, yPosition, { align: 'center' });
    pdf.text(stats.asistencias.toString(), 72.5, yPosition, { align: 'center' });
    pdf.text(stats.retardos.toString(), 107.5, yPosition, { align: 'center' });
    pdf.text(stats.faltas.toString(), 142.5, yPosition, { align: 'center' });
    pdf.text(`${stats.porcentaje_asistencia.toFixed(1)}%`, 177.5, yPosition, { align: 'center' });
    
    // Detalle diario
    yPosition += 10;
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(9);
    pdf.text('DETALLE DE INCIDENCIAS:', 20, yPosition);
    
    yPosition += 6;
    
    // Tabla de detalles
    const registros = trabajador.registros_diarios || [];
    const itemsPerPage = 9; // Ajustado para dejar espacio al texto legal
    let currentItem = 0;
    
    // Encabezados de tabla
    pdf.setFillColor(200, 200, 200);
    pdf.rect(15, yPosition - 3, pageWidth - 30, 6, 'F');
    pdf.setTextColor(0, 0, 0);
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(7);
    pdf.text('Fecha', 18, yPosition);
    pdf.text('Día', 40, yPosition);
    pdf.text('Entrada', 60, yPosition);
    pdf.text('Salida', 80, yPosition);
    pdf.text('Estatus', 100, yPosition);
    pdf.text('Justificación', 130, yPosition);
    
    pdf.setTextColor(0, 0, 0);
    yPosition += 5;
    
    // Filas de la tabla (MOSTRAR TODOS LOS REGISTROS)
    pdf.setFont(undefined, 'normal');
    registros.forEach((registro) => {
      if (currentItem < itemsPerPage) {
        const fecha = dayjs(registro.fecha);
        
        // Alternar color de fondo para mejor legibilidad
        if (currentItem % 2 === 0) {
          pdf.setFillColor(250, 250, 250);
          pdf.rect(15, yPosition - 3, pageWidth - 30, 5, 'F');
        }
        
        pdf.setFontSize(6);
        pdf.setTextColor(0, 0, 0);
        pdf.text(fecha.format('DD/MM/YY'), 18, yPosition);
        pdf.text(fecha.format('ddd'), 40, yPosition);
        pdf.text(registro.hora_entrada || '--:--', 60, yPosition);
        pdf.text(registro.hora_salida || '--:--', 80, yPosition);
        
        // Color del estatus según el tipo
        if (registro.estatus === 'ASISTENCIA') {
          pdf.setTextColor(0, 100, 0); // Verde para asistencias
        } else if (registro.estatus.includes('RETARDO')) {
          pdf.setTextColor(200, 100, 0); // Naranja para retardos
        } else if (registro.estatus === 'FALTA') {
          pdf.setTextColor(200, 0, 0); // Rojo para faltas
        } else {
          pdf.setTextColor(0, 0, 0); // Negro por defecto
        }
        
        // Texto del estatus (abreviado si es necesario)
        let estatusTexto = registro.estatus;
        if (estatusTexto === 'ASISTENCIA') estatusTexto = 'ASIST.';
        else if (estatusTexto === 'RETARDO MENOR') estatusTexto = 'RET. MEN.';
        else if (estatusTexto === 'RETARDO MAYOR') estatusTexto = 'RET. MAY.';
        
        pdf.text(estatusTexto, 100, yPosition);
        pdf.setTextColor(0, 0, 0); // Resetear color
        
        // Columna de justificación
        if (registro.justificacion || registro.observaciones) {
          pdf.setFontSize(6);
          // Si hay justificación, mostrarla
          let textoJustificacion = registro.justificacion || registro.observaciones || '';
          // Limitar el texto a 40 caracteres
          if (textoJustificacion.length > 40) {
            textoJustificacion = textoJustificacion.substring(0, 37) + '...';
          }
          pdf.text(textoJustificacion, 130, yPosition);
        } else if (registro.estatus === 'FALTA' || registro.estatus.includes('RETARDO')) {
          // Si es falta o retardo sin justificación, mostrar línea para llenar
          pdf.setLineWidth(0.2);
          pdf.line(130, yPosition, 195, yPosition);
        }
        
        yPosition += 5;
        currentItem++;
      }
    });
        // Agregar texto legal de SEP
    yPosition += 10;
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.line(20, yPosition, pageWidth - 20, yPosition);
    
    yPosition += 5;
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(50, 50, 50);
    pdf.text('AVISO IMPORTANTE:', 20, yPosition);
    
    yPosition += 5;
    // Agregar el texto legal con formato justificado
    agregarTextoLargo(textoLegalSEP, 20, yPosition, pageWidth - 40, 7, [80, 80, 80]);
    
    // Agregar sección de firmas
    if (reporteConfig.mostrarFirmas) {
      agregarSeccionFirmas(trabajador.nombre);
    }
    
    // Agregar pie de página
    agregarPiePagina(i + 1, totalPaginas);
  }
  
  // Guardar PDF
  pdf.save(`Notificacion_Retardos_Faltas_${dayjs().format('YYYYMMDD_HHmm')}.pdf`);
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