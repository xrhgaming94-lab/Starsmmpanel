import React from 'react';
import { ShieldExclamationIcon } from './Icons';

const MockModeBanner: React.FC = () => {
    return (
        <div className="bg-amber-500/20 dark:bg-amber-500/20 border-l-4 border-amber-500 dark:border-amber-500 text-amber-700 dark:text-amber-300 p-4 rounded-r-lg mb-6" role="alert">
            <div className="flex">
                <div className="py-1">
                    <ShieldExclamationIcon className="w-6 h-6 mr-4" />
                </div>
                <div>
                    <p className="font-bold">Offline Mode Active</p>
                    <p className="text-sm">You are viewing and editing local data only. Changes will not be saved to the live database or be visible to other users.</p>
                </div>
            </div>
        </div>
    );
};

export default MockModeBanner;