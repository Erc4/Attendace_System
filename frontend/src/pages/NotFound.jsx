import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Container, Typography } from '@mui/material';
import { Home as HomeIcon } from '@mui/icons-material';

const NotFound = () => {
  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          textAlign: 'center',
        }}
      >
        <Typography variant="h1" component="h1" gutterBottom>
          404
        </Typography>
        <Typography variant="h4" component="h2" gutterBottom>
          Página no encontrada
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Lo sentimos, no pudimos encontrar la página que estás buscando.
        </Typography>
        <Button
          variant="contained"
          component={RouterLink}
          to="/"
          startIcon={<HomeIcon />}
          sx={{ mt: 3 }}
        >
          Volver al inicio
        </Button>
      </Box>
    </Container>
  );
};

export default NotFound;