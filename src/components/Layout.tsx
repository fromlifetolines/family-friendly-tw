import React, { type ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

interface LayoutProps {
    children: ReactNode;
    onNavigate: (page: 'home' | 'about') => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, onNavigate }) => {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Header onNavigate={onNavigate} />
            <main style={{ flex: 1 }}>
                {children}
            </main>
            <Footer />
        </div>
    );
};
