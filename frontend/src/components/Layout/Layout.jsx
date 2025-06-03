import React, { useState } from 'react';
import { Box, Toolbar, CssBaseline } from '@mui/material';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { useAuth } from '../../contexts/AuthContext';

const drawerWidth = 240;

const Layout = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      <Header onToggleSidebar={handleToggleSidebar} />
      {isAuthenticated && <Sidebar open={sidebarOpen} />}
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { 
            sm: isAuthenticated && sidebarOpen 
              ? `calc(100% - ${drawerWidth}px)` 
              : '100%' 
          },
          ml: { 
            sm: isAuthenticated && sidebarOpen 
              ? `${drawerWidth}px` 
              : 0 
          },
          transition: (theme) => theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen,
          }),
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          p:0, // Elimina padding extra
          m:0,
        }}
      >
        <Toolbar /> {/* Espacio para el Header fijo */}
        
        {/* Contenido principal sin padding extra */}
        <Box sx={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          p:0,
          m:0,
          overflow: 'hidden', // Previene scroll horizontal
        }}>
          {children}
        </Box>
        
        <Footer />
      </Box>
    </Box>
  );
};

export default Layout;  