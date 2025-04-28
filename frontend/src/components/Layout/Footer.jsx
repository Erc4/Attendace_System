import React from 'react';
import { Box, Container, Typography, Divider } from '@mui/material';

const Footer = () => {
  const year = new Date().getFullYear();
  
  return (
    <Box 
      component="footer" 
      sx={{ 
        py: 3, 
        mt: 'auto',
        backgroundColor: (theme) => theme.palette.grey[100]
      }}
    >
      <Divider />
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', my: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Sistema de Control de Asistencias © {year}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Desarrollado con FastAPI y React
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;