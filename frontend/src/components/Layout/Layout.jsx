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
          width: { sm: `calc(100% - ${isAuthenticated && sidebarOpen ? drawerWidth : 0}px)` },
          ml: { sm: isAuthenticated && sidebarOpen ? `${drawerWidth}px` : 0 },
          transition: (theme) => theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Toolbar /> {/* Este Toolbar es para mantener el espacio del Header fijo */}
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
        <Footer />
      </Box>
    </Box>
  );
};

export default Layout;