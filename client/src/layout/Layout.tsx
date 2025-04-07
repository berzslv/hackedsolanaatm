import React from 'react';
import Header from './Header';
import Footer from './Footer';
import { WalletModal } from '@/components/ui/wallet-modal';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col grid-pattern">
      <Header />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
      <WalletModal />
    </div>
  );
};

export default Layout;
