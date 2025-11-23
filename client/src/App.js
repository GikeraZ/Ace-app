import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import EmployeeDashboard from './components/EmployeeDashboard';
import AdminDashboard from './components/AdminDashboard';
import './App.css';

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is already logged in
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('userData');
        
        if (token && userData) {
            setUser(JSON.parse(userData));
        }
        setLoading(false);
    }, []);

    const handleLogin = (userData, token) => {
        setUser(userData);
        localStorage.setItem('token', token);
        localStorage.setItem('userData', JSON.stringify(userData));
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
    };

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    if (!user) {
        return <Login onLogin={handleLogin} />;
    }

    return (
        <div className="App">
            {user.role === 'employee' ? (
                <EmployeeDashboard user={user} onLogout={handleLogout} />
            ) : (
                <AdminDashboard user={user} onLogout={handleLogout} />
            )}
        </div>
    );
}

export default App;