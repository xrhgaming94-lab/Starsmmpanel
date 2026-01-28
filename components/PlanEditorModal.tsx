
import React, { useState, useEffect } from 'react';
import { ServicePackage, ServiceInputType, Category, ServiceType } from '../types';
import { XMarkIcon, HeartIcon, UsersIcon, EyeIcon, RocketLaunchIcon, VideoCameraIcon, ArrowTrendingUpIcon, UserPlusIcon, PlayCircleIcon, ClockIcon, ShareIcon } from './Icons';
import { SERVICE_TYPES_ORDER } from '../constants';

interface PlanEditorModalProps {
    plan: ServicePackage | null;
    categories: Category[];
    onClose: () => void;
    onSave: (plan: ServicePackage) => void;
}

const icons = {
    HeartIcon, UsersIcon, EyeIcon, RocketLaunchIcon, VideoCameraIcon, ArrowTrendingUpIcon, UserPlusIcon, PlayCircleIcon, ShareIcon
};

type IconName = keyof typeof icons;

interface FormDataState {
    id: string; title: string; description: string; rate: string; ratePerQuantity: string; unitName: string;
    inputType: ServiceInputType; minQuantity: string; maxQuantity: string; categoryId: string; serviceType: ServiceType;
    // Speed Fields
    minCompletionTime: string;
    maxCompletionTime: string;
    // Limited Fields
    isLimitedOffer: boolean;
    expiryDate: string;
    totalLimit: string;
    dailyLimit: string;
    userDailyLimit: string;
    cooldownMinutes: string;
}

const PlanEditorModal: React.FC<PlanEditorModalProps> = ({ plan, categories, onClose, onSave }) => {
    const [formData, setFormData] = useState<FormDataState>({
        id: '', title: '', description: '', rate: '', ratePerQuantity: '1000', unitName: '',
        inputType: 'link', minQuantity: '10', maxQuantity: '1000000', categoryId: '', serviceType: 'Other',
        minCompletionTime: '', maxCompletionTime: '',
        isLimitedOffer: false,
        expiryDate: '',
        totalLimit: '0',
        dailyLimit: '0',
        userDailyLimit: '0',
        cooldownMinutes: '0'
    });
    const [selectedIcon, setSelectedIcon] = useState<IconName>('HeartIcon');
    // Helper state for cooldown unit
    const [cooldownValue, setCooldownValue] = useState('0');
    const [cooldownUnit, setCooldownUnit] = useState<'minutes'|'hours'|'days'>('minutes');
    
    useEffect(() => {
        if (plan) {
            const { icon, price, expiryDate, ...editableData } = plan;
            
            // Format Date for Input
            let formattedDate = '';
            if (expiryDate) {
                const d = new Date(expiryDate);
                formattedDate = d.toISOString().split('T')[0];
            }

            // Convert cooldown minutes to appropriate unit for display
            const mins = plan.cooldownMinutes || 0;
            let displayVal = mins.toString();
            let displayUnit: 'minutes'|'hours'|'days' = 'minutes';

            if (mins > 0 && mins % 1440 === 0) {
                displayVal = (mins / 1440).toString();
                displayUnit = 'days';
            } else if (mins > 0 && mins % 60 === 0) {
                displayVal = (mins / 60).toString();
                displayUnit = 'hours';
            }

            setCooldownValue(displayVal);
            setCooldownUnit(displayUnit);

            setFormData({
                ...editableData,
                rate: String(editableData.rate),
                ratePerQuantity: String(editableData.ratePerQuantity),
                minQuantity: String(editableData.minQuantity),
                maxQuantity: String(editableData.maxQuantity),
                serviceType: plan.serviceType || 'Other',
                minCompletionTime: plan.minCompletionTime || '',
                maxCompletionTime: plan.maxCompletionTime || '',
                isLimitedOffer: !!plan.isLimitedOffer,
                expiryDate: formattedDate,
                totalLimit: String(plan.totalLimit || 0),
                dailyLimit: String(plan.dailyLimit || 0),
                userDailyLimit: String(plan.userDailyLimit || 0),
                cooldownMinutes: String(mins),
            });
            const iconName = Object.entries(icons).find(([, component]) => component === icon)?.[0] as IconName | undefined;
            if (iconName) setSelectedIcon(iconName);
        } else {
            // New Plan Default
            setFormData(prev => ({
                ...prev,
                categoryId: categories.length > 0 ? categories[0].id : '', 
                serviceType: 'Followers' // Default to first logical type
            }));
        }
    }, [plan, categories]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleModeChange = (isLimited: boolean) => {
        setFormData(prev => ({ ...prev, isLimitedOffer: isLimited }));
    };

    // Calculate total minutes whenever val or unit changes
    useEffect(() => {
        const val = Number(cooldownValue);
        let minutes = 0;
        if (cooldownUnit === 'days') minutes = val * 1440;
        else if (cooldownUnit === 'hours') minutes = val * 60;
        else minutes = val;
        
        setFormData(prev => ({ ...prev, cooldownMinutes: String(minutes) }));
    }, [cooldownValue, cooldownUnit]);

    const handleSave = () => {
        const ratePerQuantityNum = Number(formData.ratePerQuantity);
        if (!ratePerQuantityNum || ratePerQuantityNum <= 0) {
            alert("'Per Quantity' must be greater than 0.");
            return;
        }
        
        const finalId = formData.id.trim() || (plan?.id || `new-${Date.now()}`);
        const rateNum = Number(formData.rate) || 0;
        const minQuantityNum = Number(formData.minQuantity) || 0;
        const startingPrice = (minQuantityNum / ratePerQuantityNum * rateNum).toFixed(2);
        
        const newPlan: ServicePackage = {
            id: finalId,
            title: formData.title,
            description: formData.description,
            rate: rateNum,
            ratePerQuantity: ratePerQuantityNum,
            unitName: formData.unitName,
            inputType: formData.inputType,
            minQuantity: minQuantityNum,
            maxQuantity: Number(formData.maxQuantity) || 0,
            categoryId: formData.categoryId,
            serviceType: formData.serviceType,
            icon: icons[selectedIcon],
            price: `Starting at ₹${startingPrice}`,
            
            minCompletionTime: formData.minCompletionTime,
            maxCompletionTime: formData.maxCompletionTime,

            // Limited Fields
            isLimitedOffer: formData.isLimitedOffer,
            expiryDate: formData.isLimitedOffer && formData.expiryDate ? new Date(formData.expiryDate) : null,
            totalLimit: formData.isLimitedOffer ? Number(formData.totalLimit) : 0,
            dailyLimit: formData.isLimitedOffer ? Number(formData.dailyLimit) : 0,
            userDailyLimit: formData.isLimitedOffer ? Number(formData.userDailyLimit) : 0,
            cooldownMinutes: formData.isLimitedOffer ? Number(formData.cooldownMinutes) : 0,
            currentOrdersCount: plan?.currentOrdersCount || 0,
        };
        onSave(newPlan);
    };

    return (
        <div className="fixed inset-0 bg-gray-900/50 dark:bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-base-100 rounded-xl shadow-lg w-full max-w-lg border border-gray-200 dark:border-base-300">
                <div className="p-4 border-b border-gray-200 dark:border-base-300 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-text-primary">{plan ? 'Edit Plan' : 'New Plan'}</h3>
                    <button onClick={onClose} className="text-gray-500 dark:text-text-secondary hover:text-gray-900 dark:hover:text-text-primary">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Toggle Buttons */}
                <div className="p-4 flex gap-2">
                    <button 
                        onClick={() => handleModeChange(false)}
                        className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${!formData.isLimitedOffer ? 'bg-primary text-white shadow-lg' : 'bg-gray-200 dark:bg-base-300 text-gray-500'}`}
                    >
                        Standard Plan
                    </button>
                    <button 
                        onClick={() => handleModeChange(true)}
                        className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${formData.isLimitedOffer ? 'bg-warning text-black shadow-lg' : 'bg-gray-200 dark:bg-base-300 text-gray-500'}`}
                    >
                        Limited Offer Plan
                    </button>
                </div>

                <div className="px-5 pb-5 space-y-3 max-h-[60vh] overflow-y-auto">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-3">
                        <InputField 
                            label="Service ID"
                            name="id" 
                            value={formData.id} 
                            onChange={handleChange} 
                            placeholder="Auto"
                            disabled={!!plan} 
                        />
                        <div className="col-span-1">
                            <label className="block text-xs font-medium text-gray-500 dark:text-text-secondary mb-1">Select Icon</label>
                            <div className="grid grid-cols-4 gap-2 bg-gray-100 dark:bg-base-200 p-2 rounded-lg border border-gray-300 dark:border-base-300 max-h-32 overflow-y-auto">
                                {Object.entries(icons).map(([name, IconComponent]) => (
                                    <button
                                        key={name}
                                        onClick={() => setSelectedIcon(name as IconName)}
                                        className={`p-2 rounded-md flex items-center justify-center transition-all aspect-square ${selectedIcon === name ? 'bg-primary text-white shadow-md scale-105' : 'text-gray-500 hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'}`}
                                        title={name}
                                        type="button"
                                    >
                                        <IconComponent className="w-5 h-5" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <InputField label="Title" name="title" value={formData.title} onChange={handleChange} />
                    <textarea name="description" value={formData.description} onChange={handleChange} rows={2} className="w-full bg-gray-100 dark:bg-base-200 border border-gray-300 dark:border-base-300 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-text-primary outline-none focus:border-primary" placeholder="Description"/>
                    
                    {/* Completion Time (New) */}
                    <div className="grid grid-cols-2 gap-3">
                        <InputField label="Min Time (e.g. 1h)" name="minCompletionTime" value={formData.minCompletionTime} onChange={handleChange} placeholder="e.g. 1 Hour" />
                        <InputField label="Max Time (e.g. 24h)" name="maxCompletionTime" value={formData.maxCompletionTime} onChange={handleChange} placeholder="e.g. 24 Hours" />
                    </div>

                    {/* Pricing & Logic */}
                    <div className="grid grid-cols-2 gap-3">
                        <InputField label="Rate (₹)" name="rate" type="number" value={formData.rate} onChange={handleChange} />
                        <InputField label="Per (Qty)" name="ratePerQuantity" type="number" value={formData.ratePerQuantity} onChange={handleChange} placeholder="1000" />
                    </div>
                     <div className="grid grid-cols-2 gap-3">
                         <SelectField label="Category" name="categoryId" value={formData.categoryId} onChange={handleChange} options={categories.map(c => ({value: c.id, label: c.name}))} />
                         <SelectField 
                            label="Type" 
                            name="serviceType" 
                            value={formData.serviceType} 
                            onChange={handleChange} 
                            options={SERVICE_TYPES_ORDER.map(t => ({value: t, label: `${t} Services`}))} 
                         />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                         <InputField label="Unit Name" name="unitName" value={formData.unitName} onChange={handleChange} placeholder="follower"/>
                        <SelectField label="Input Type" name="inputType" value={formData.inputType} onChange={handleChange} options={[{value: 'link', label: 'Post Link'}, {value: 'username', label: 'Username'}]} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <InputField label="Min Qty" name="minQuantity" type="number" value={formData.minQuantity} onChange={handleChange} />
                        <InputField label="Max Qty" name="maxQuantity" type="number" value={formData.maxQuantity} onChange={handleChange} />
                    </div>

                    {/* Limited Offer Specific Fields */}
                    {formData.isLimitedOffer && (
                        <div className="bg-warning/10 border border-warning/30 p-3 rounded-lg mt-2 space-y-3 animate-fade-in">
                            <div className="flex items-center gap-2 mb-1">
                                <ClockIcon className="w-4 h-4 text-warning" />
                                <span className="text-xs font-bold text-warning uppercase">Limited Offer Constraints</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-text-secondary mb-1">Expiry Date</label>
                                    <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} className="w-full bg-base-100 border border-white/10 rounded-lg px-2 py-2 text-xs text-white" />
                                </div>
                                <InputField label="Total Global Limit" name="totalLimit" type="number" value={formData.totalLimit} onChange={handleChange} placeholder="0 = Unlimited" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <InputField label="Global Daily Limit" name="dailyLimit" type="number" value={formData.dailyLimit} onChange={handleChange} placeholder="0 = Unlimited" />
                                <InputField label="User Daily Limit" name="userDailyLimit" type="number" value={formData.userDailyLimit} onChange={handleChange} placeholder="0 = Unlimited" />
                            </div>

                            {/* Enhanced Cooldown Input with Unit Selector */}
                            <div className="bg-white/5 p-2 rounded-lg border border-white/10">
                                <label className="block text-xs font-medium text-gray-500 dark:text-text-secondary mb-1">Cooldown / Reset Timer</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="number" 
                                        value={cooldownValue} 
                                        onChange={(e) => setCooldownValue(e.target.value)} 
                                        className="w-2/3 bg-base-100 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-warning" 
                                    />
                                    <select 
                                        value={cooldownUnit} 
                                        onChange={(e) => setCooldownUnit(e.target.value as any)} 
                                        className="w-1/3 bg-base-100 border border-white/10 rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-warning"
                                    >
                                        <option value="minutes">Minutes</option>
                                        <option value="hours">Hours</option>
                                        <option value="days">Days</option>
                                    </select>
                                </div>
                                <p className="text-[9px] text-gray-400 mt-1">Calculated: {formData.cooldownMinutes} minutes. (e.g. 1 Day = 1440m)</p>
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4 bg-gray-50 dark:bg-base-300/20 rounded-b-xl">
                    <button onClick={handleSave} className="w-full py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-colors duration-300 text-sm uppercase tracking-wide">
                        {formData.isLimitedOffer ? 'Save Limited Offer' : 'Save Standard Plan'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const InputField: React.FC<{label: string, name: string, value: any, onChange: (e: any) => void, type?: string, placeholder?: string, disabled?: boolean}> = ({ label, name, value, onChange, type = 'text', placeholder, disabled }) => (
    <div><label className="block text-xs font-medium text-gray-500 dark:text-text-secondary mb-1">{label}</label><input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} className={`w-full bg-gray-100 dark:bg-base-200 border border-gray-300 dark:border-base-300 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-text-primary outline-none focus:border-primary ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} /></div>
);
const SelectField: React.FC<{label: string, name: string, value: any, onChange: (e: any) => void, options: {value: string, label: string}[]}> = ({label, name, value, onChange, options}) => (
    <div><label className="block text-xs font-medium text-gray-500 dark:text-text-secondary mb-1">{label}</label><select name={name} value={value} onChange={onChange} className="w-full bg-gray-100 dark:bg-base-200 border border-gray-300 dark:border-base-300 rounded-lg px-3 py-2 text-xs text-gray-900 dark:text-text-primary outline-none focus:border-primary">
        {options.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
    </select></div>
);

export default PlanEditorModal;
