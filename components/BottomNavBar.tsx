

import React from 'react';
import { HomeIcon, ShoppingBagIcon, UserCircleIcon, ClipboardDocumentListIcon, ClockIcon } from './Icons';
import { User } from '../types';
// FIX: Import useNav for navigation
import { useNav } from '../routing';

// FIX: Separated tab types. NavTab is for UI state, ActiveTab includes special cases like 'admin'.
type NavTab = 'home' | 'orders' | 'history' | 'profile';
type ActiveTab = NavTab | 'admin';

interface BottomNavBarProps {
    user: User;
    // FIX: activeTab now only accepts NavTab values.
    activeTab: NavTab;
    // FIX: setActiveTab now only accepts a function that takes NavTab values.
    setActiveTab: (tab: NavTab) => void;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ user, activeTab, setActiveTab }) => {
    // FIX: Get navigate function from routing hook.
    const { navigate } = useNav();
    const navItems = [
        { id: 'home', label: 'Home', icon: HomeIcon },
        { id: 'orders', label: 'Orders', icon: ShoppingBagIcon },
        { id: 'history', label: 'History', icon: ClockIcon },
        { id: 'profile', label: 'Profile', icon: UserCircleIcon },
    ];

    if (user.role === 'admin') {
        navItems.push({ id: 'admin', label: 'Admin', icon: ClipboardDocumentListIcon });
    }


    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-base-100/80 backdrop-blur-md border-t border-gray-200 dark:border-base-300 z-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-around h-16">
                    {navItems.map((item) => {
                        const isActive = activeTab === item.id;
                        const Icon = item.icon;
                        // FIX: Added a click handler to differentiate between state change and navigation.
                        const handleClick = () => {
                            if (item.id === 'admin') {
                                navigate('/admin');
                            } else {
                                setActiveTab(item.id as NavTab);
                            }
                        };
                        return (
                            <button
                                key={item.id}
                                onClick={handleClick}
                                className={`flex flex-col items-center justify-center w-full text-xs font-medium transition-colors ${
                                    isActive ? 'text-primary' : 'text-gray-500 dark:text-text-secondary hover:text-gray-900 dark:hover:text-text-primary'
                                }`}
                            >
                                <Icon className="w-6 h-6 mb-1" solid={isActive} />
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default BottomNavBar;
