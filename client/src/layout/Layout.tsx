import React from 'react';
import Header from './Header';
import Footer from './Footer';
import GlobalErrorHandler from '@/components/ErrorBoundary';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <GlobalErrorHandler>
      <div className="min-h-screen flex flex-col grid-pattern">
        <Header />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
        {/* Wallet modal is handled by the adapter itself */}
      </div>
    </GlobalErrorHandler>
  );
};

export default Layout;
