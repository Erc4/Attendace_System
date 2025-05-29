import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Fingerprint,
  CloudUpload,
  Check
} from '@mui/icons-material';

const HuellaSimulator = ({ onHuellaCapturada, huellaCaptured = false }) => {
  const [capturing, setCapturing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Simulación de captura automática
  const simulateCapture = () => {
    setCapturing(true);
    
    // Simular tiempo de captura
    setTimeout(() => {
      const huellaSimulada = {
        data: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFYSURBVDiNpZM9SwNBEIafgwQSCxsLwcJCG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG1sLG${Date.now()}`,
        timestamp: new Date().toISOString(),
        quality: Math.floor(Math.random() * 20) + 80, // Calidad entre 80-100
        worker_id: null // Se asignará después
      };
      
      setCapturing(false);
      onHuellaCapturada(huellaSimulada);
    }, 2000);
  };

  // Captura desde archivo de imagen
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const huellaDesdeArchivo = {
          data: e.target.result,
          timestamp: new Date().toISOString(),
          quality: 95, // Asumimos buena calidad para archivos subidos
          filename: file.name,
          worker_id: null
        };
        
        onHuellaCapturada(huellaDesdeArchivo);
        setShowDialog(false);
      };
      reader.readAsDataURL(file);
    }
  };

  // Generar múltiples huellas de prueba
  const generateTestFingerprints = () => {
    const testPatterns = [
      'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlz',
      'R0lGODlhEAAQAMQAAORHHOVSKudfOulrSOp3WOyDZu6QdvCchPGolfO0o/XBs/fNwfjZ0frl3/zy',
      'UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoQABAAAwA0JaQAA3AA/vuUAAA=',
      '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB'
    ];
    
    const randomPattern = testPatterns[Math.floor(Math.random() * testPatterns.length)];
    const huellaGenerada = {
      data: `data:image/png;base64,${randomPattern}${Date.now()}`,
      timestamp: new Date().toISOString(),
      quality: Math.floor(Math.random() * 15) + 85,
      type: 'generated',
      worker_id: null
    };
    
    onHuellaCapturada(huellaGenerada);
  };

  if (huellaCaptured) {
    return (
      <Box sx={{ textAlign: 'center', p: 3 }}>
        <Box sx={{ color: 'success.main', mb: 2 }}>
          <Check sx={{ fontSize: 60 }} />
          <Typography variant="h6">¡Huella capturada correctamente!</Typography>
          <Typography variant="body2" color="text.secondary">
            Calidad: Excelente | Tiempo: {new Date().toLocaleTimeString()}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          onClick={() => onHuellaCapturada(null)}
          sx={{ mt: 2 }}
        >
          Capturar Nueva Huella
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ textAlign: 'center', p: 3 }}>
      {capturing ? (
        <Box>
          <Box sx={{ mb: 2 }}>
            <Fingerprint sx={{ fontSize: 60, color: 'primary.main' }} />
            <Typography variant="h6">Capturando huella...</Typography>
            <Typography variant="body2" color="text.secondary">
              Por favor, mantenga el dedo en el sensor
            </Typography>
          </Box>
          <LinearProgress sx={{ mt: 2, mb: 2 }} />
          <Typography variant="caption">
            Procesando datos biométricos...
          </Typography>
        </Box>
      ) : (
        <Box>
          <Fingerprint sx={{ fontSize: 60, color: 'action.active', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Registro de Huella Digital
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Seleccione un método para registrar la huella del trabajador
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<Fingerprint />}
              onClick={simulateCapture}
              size="large"
            >
              Simular Captura de Huella
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<CloudUpload />}
              onClick={() => setShowDialog(true)}
            >
              Subir Imagen de Huella
            </Button>
            
            <Button
              variant="text"
              onClick={generateTestFingerprints}
              size="small"
            >
              Generar Huella de Prueba
            </Button>
          </Box>
          
          <Alert severity="info" sx={{ mt: 3 }}>
            <strong>Modo Desarrollo:</strong> Esta es una simulación para pruebas. 
            En producción se conectará con el lector biométrico real.
          </Alert>
        </Box>
      )}

      {/* Dialog para subir archivo */}
      <Dialog open={showDialog} onClose={() => setShowDialog(false)}>
        <DialogTitle>Subir Imagen de Huella</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Seleccione una imagen que represente la huella del trabajador.
            Formatos aceptados: PNG, JPG, GIF
          </Typography>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            style={{ width: '100%' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDialog(false)}>Cancelar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HuellaSimulator;