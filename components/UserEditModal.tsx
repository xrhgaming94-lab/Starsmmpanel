
import React, { useState } from 'react';
import { User, UserRole, UserStatus } from '../types';
import { XMarkIcon } from './Icons';

interface UserEditModalProps {
    user: User;
    onClose: () => void;
    onSave: (userId: string, updatedData: Partial<User>, balanceAdjustment: number, adjustmentReason: string) => void;
}

const UserEditModal: React.FC<UserEditModalProps> = ({ user, onClose, onSave }) => {
    const [role, setRole] = useState<UserRole>(user.role);
    const [status, setStatus] = useState<UserStatus>(user.status);
    const [balanceAdjustment, setBalanceAdjustment] = useState<number | ''>('');
    const [adjustmentReason, setAdjustmentReason] = useState('');

    const handleSave = () => {
        const updatedData: Partial<User> = {};
        if (role !== user.role) updatedData.role = role;
        if (status !== user.status) updatedData.status = status;

        const adjustmentAmount = Number(balanceAdjustment) || 0;

        if (adjustmentAmount !== 0 && !adjustmentReason.trim()) {
            alert('Please provide a reason for the balance adjustment.');
            return;
        }
        
        onSave(user.id, updatedData, adjustmentAmount, adjustmentReason);
        onClose();
    };
    
    return (
        <div className="fixed inset-0 bg-gray-900/50 dark:bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-base-100 rounded-xl shadow-lg w-full max-w-md border border-gray-200 dark:border-base-300">
                <div className="p-4 border-b border-gray-200 dark:border-base-300 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-text-primary">Edit User</h3>
                    <button onClick={onClose} className="text-gray-500 dark:text-text-secondary hover:text-gray-900 dark:hover:text-text-primary">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <div className="flex items-center gap-3">
                         <img src={user.avatarUrl} alt="User Avatar" className="w-12 h-12 rounded-full" />
                         <div>
                            <p className="font-bold text-gray-900 dark:text-text-primary text-sm">{user.name}</p>
                            <p className="text-xs text-gray-500 dark:text-text-secondary">{user.email}</p>
                         </div>
                    </div>
                    <div className="border-t border-white/10 pt-3">
                        <h4 className="text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider">Account Settings</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <SelectField label="Role" value={role} onChange={(e) => setRole(e.target.value as UserRole)} options={[{value: 'user', label: 'User'}, {value: 'admin', label: 'Admin'}]} />
                            <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value as UserStatus)} options={[{value: 'Active', label: 'Active'}, {value: 'Suspended', label: 'Suspended'}]} />
                        </div>
                    </div>
                     <div className="border-t border-white/10 pt-3">
                         <h4 className="text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider">Wallet Adjustment</h4>
                         <p className="text-[10px] text-slate-500 mb-2">Current Balance: ₹{user.walletBalance.toFixed(2)}</p>
                         <div className="grid grid-cols-3 gap-3">
                             <div className="col-span-1">
                                <InputField label="Amount (₹)" type="number" value={balanceAdjustment} onChange={(e) => setBalanceAdjustment(e.target.value)} />
                            </div>
                             <div className="col-span-2">
                                 <InputField label="Reason" value={adjustmentReason} onChange={(e) => setAdjustmentReason(e.target.value)} placeholder="Reason..."/>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-base-300/20 rounded-b-xl">
                    <button onClick={handleSave} className="w-full py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-colors duration-300 text-sm">Save Changes</button>
                </div>
            </div>
        </div>
    );
};

const InputField: React.FC<{label: string, value: any, onChange: (e: any) => void, type?: string, placeholder?: string}> = ({ label, value, onChange, type = 'text', placeholder }) => (
    <div><label className="block text-xs font-medium text-gray-500 dark:text-text-secondary mb-1">{label}</label><input type={type} value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-gray-100 dark:bg-base-200 border border-gray-300 dark:border-base-300 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-text-primary" /></div>
);

const SelectField: React.FC<{label: string, value: any, onChange: (e: any) => void, options: {value: string, label: string}[]}> = ({label, value, onChange, options}) => (
    <div><label className="block text-xs font-medium text-gray-500 dark:text-text-secondary mb-1">{label}</label><select value={value} onChange={onChange} className="w-full bg-gray-100 dark:bg-base-200 border border-gray-300 dark:border-base-300 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-text-primary">
        {options.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
    </select></div>
);

export default UserEditModal;
