import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface RouterContextType {
    path: string;
    navigate: (to: string) => void;
}

const RouterContext = createContext<RouterContextType | null>(null);

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Helper to get clean path from hash
    const getHashPath = () => {
        const hash = window.location.hash;
        // Default to '/' if no hash exists or it is just '#'
        if (!hash || hash === '#') return '/';
        // Remove the '#' character
        return hash.slice(1);
    };

    const [path, setPath] = useState(getHashPath());

    const handleHashChange = useCallback(() => {
        setPath(getHashPath());
    }, []);

    useEffect(() => {
        // Listen for hash changes (e.g., user clicking back button or manual URL change)
        window.addEventListener('hashchange', handleHashChange);
        return () => {
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, [handleHashChange]);

    const navigate = (to: string) => {
        window.location.hash = to;
    };

    return (
        <RouterContext.Provider value={{ path, navigate }}>
            {children}
        </RouterContext.Provider>
    );
};

export const useNav = () => {
    const context = useContext(RouterContext);
    if (!context) {
        throw new Error('useNav must be used within a RouterProvider');
    }
    return context;
};