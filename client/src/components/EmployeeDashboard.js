import React, { useState } from 'react';
import FarmForm from './businessForms/FarmForm';
import PoolForm from './businessForms/PoolForm';
import PSStationForm from './businessForms/PSStationForm';
import SnackCenterForm from './businessForms/SnackCenterForm';

const EmployeeDashboard = ({ user, onLogout }) => {
    const [selectedBusiness, setSelectedBusiness] = useState('');
    const [showForm, setShowForm] = useState(false);

    const businesses = [
        { id: 'farm', name: 'Farm', component: FarmForm },
        { id: 'pool', name: 'Pool', component: PoolForm },
        { id: 'ps-station', name: 'PS Station', component: PSStationForm },
        { id: 'snack-center', name: 'Snack Center', component: SnackCenterForm }
    ];

    const handleBusinessSelect = (businessId) => {
        setSelectedBusiness(businessId);
        setShowForm(true);
    };

    const handleBack = () => {
        setShowForm(false);
        setSelectedBusiness('');
    };

    const FormComponent = showForm && businesses.find(b => b.id === selectedBusiness)?.component;

    return (
        <div className="employee-dashboard">
            <header className="dashboard-header">
                <h1>Employee Dashboard</h1>
                <div className="user-info">
                    <span>Welcome, {user.username}</span>
                    <button onClick={onLogout} className="logout-btn">Logout</button>
                </div>
            </header>

            {!showForm ? (
                <div className="business-selection">
                    <h2>Select Your Business</h2>
                    <div className="business-grid">
                        {businesses.map(business => (
                            <div 
                                key={business.id}
                                className="business-card"
                                onClick={() => handleBusinessSelect(business.id)}
                            >
                                <h3>{business.name}</h3>
                                <p>Click to submit records</p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="form-container">
                    <button onClick={handleBack} className="back-btn">← Back to Business Selection</button>
                    <h2>{businesses.find(b => b.id === selectedBusiness)?.name} Records</h2>
                    <FormComponent onBack={handleBack} />
                </div>
            )}
        </div>
    );
};

export default EmployeeDashboard;