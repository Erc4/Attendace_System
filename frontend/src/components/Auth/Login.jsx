import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Avatar,
  Button,
  CssBaseline,
  TextField,
  Paper,
  Box,
  Grid,
  Typography,
  Link,
  Alert,
  CircularProgress
} from '@mui/material';
import { LockOutlined, Fingerprint } from '@mui/icons-material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../contexts/AuthContext';

// Esquema de validación
const LoginSchema = Yup.object().shape({
  rfc: Yup.string()
    .required('El RFC es requerido')
    .min(12, 'El RFC debe tener al menos 12 caracteres')
    .max(13, 'El RFC debe tener máximo 13 caracteres'),
  password: Yup.string()
    .required('La contraseña es requerida')
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      await login(values.rfc, values.password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Error al iniciar sesión:', err);
      setError(
        err.response?.data?.detail || 
        'Error al iniciar sesión. Por favor, verifica tus credenciales.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Grid container component="main" sx={{ height: '100vh' }}>
      <CssBaseline />
      <Grid
        item
        xs={false}
        sm={4}
        md={7}
        sx={{
          backgroundImage: 'url(https://source.unsplash.com/random?school)',
          backgroundRepeat: 'no-repeat',
          backgroundColor: (t) =>
            t.palette.mode === 'light' ? t.palette.grey[50] : t.palette.grey[900],
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <Grid item xs={12} sm={8} md={5} component={Paper} elevation={6} square>
        <Box
          sx={{
            my: 8,
            mx: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
            <LockOutlined />
          </Avatar>
          <Typography component="h1" variant="h5">
            Iniciar Sesión
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
              {error}
            </Alert>
          )}
          
          <Formik
            initialValues={{ rfc: '', password: '' }}
            validationSchema={LoginSchema}
            onSubmit={handleSubmit}
          >
            {({ errors, touched, isSubmitting }) => (
              <Form noValidate sx={{ mt: 1, width: '100%' }}>
                <Field
                  as={TextField}
                  margin="normal"
                  required
                  fullWidth
                  id="rfc"
                  label="RFC"
                  name="rfc"
                  autoComplete="rfc"
                  autoFocus
                  error={touched.rfc && Boolean(errors.rfc)}
                  helperText={touched.rfc && errors.rfc}
                />
                <Field
                  as={TextField}
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Contraseña"
                  type="password"
                  id="password"
                  autoComplete="current-password"
                  error={touched.password && Boolean(errors.password)}
                  helperText={touched.password && errors.password}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <CircularProgress size={24} /> : 'Iniciar Sesión'}
                </Button>
                
                <Grid container>
                  <Grid item xs>
                    <Link component={RouterLink} to="/forgot-password" variant="body2">
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 4, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    O utiliza la autenticación biométrica
                  </Typography>
                  <Button
                    component={RouterLink}
                    to="/biometric"
                    variant="outlined"
                    startIcon={<Fingerprint />}
                  >
                    Huella Digital
                  </Button>
                </Box>
              </Form>
            )}
          </Formik>
        </Box>
      </Grid>
    </Grid>
  );
};

export default Login;