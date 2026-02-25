import React from 'react';
import Navbar from '../navbar/Navbar';
import Sidebar from '../sidebar/Sidebar';
import { useResponsive } from '../../contexts/ResponsiveContext';

const Layout = ({ children }) => {
  const { isMobile } = useResponsive();

  const mainStyle = {
    marginLeft: isMobile ? 0 : '250px',
    marginTop: '56px',
    padding: isMobile ? '1rem' : '2rem',
    minHeight: 'calc(100vh - 56px)'
  };

  return (
    <div>
      <Navbar />
      <div className="d-flex">
        <Sidebar />
        <main className="flex-grow-1" style={mainStyle}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
