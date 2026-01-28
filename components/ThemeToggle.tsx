
import React from 'react';
import { SunIcon, MoonIcon } from './Icons';

interface ThemeToggleProps {
    theme: string;
    onToggle: () => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onToggle }) => {
    return (
        <button
            onClick={onToggle}
            className="p-2 rounded-full text-gray-500 dark:text-text-secondary hover:bg-gray-200 dark:hover:bg-base-300/50 transition-colors"
            aria-label="Toggle theme"
        >
            {theme === 'dark' ? (
                <SunIcon className="w-5 h-5 text-yellow-400" />
            ) : (
                <MoonIcon className="w-5 h-5 text-gray-700" />
            )}
        </button>
    );
};

export default ThemeToggle;
