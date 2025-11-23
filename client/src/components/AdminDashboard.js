import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BusinessSummary from './Admin/BusinessSummary.js';
import ExpenseForm from './Admin/ExpenseForm.js';
const AdminDashboard = ({ user, onLogout }) => {
    const [records, setRecords] = useState([]);
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showExpenseForm, setShowExpenseForm] = useState(false);

    const API_BASE_URL = 'http://localhost:5000/api';
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchDashboardData();
        fetchBusinesses();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/admin/dashboard`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setRecords(response.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBusinesses = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/businesses`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setBusinesses(response.data);
        } catch (error) {
            console.error('Error fetching businesses:', error);
        }
    };

    const calculateProfit = () => {
        const incomeByBusiness = {};
        const expensesByBusiness = {};

        records.forEach(record => {
            if (record.type === 'income') {
                incomeByBusiness[record.business] = (incomeByBusiness[record.business] || 0) + parseFloat(record.amount);
            } else {
                expensesByBusiness[record.business] = (expensesByBusiness[record.business] || 0) + parseFloat(record.amount);
            }
        });

        const profitByBusiness = {};
        Object.keys(incomeByBusiness).forEach(business => {
            const income = incomeByBusiness[business] || 0;
            const expenses = expensesByBusiness[business] || 0;
            profitByBusiness[business] = income - expenses;
        });

        return { incomeByBusiness, expensesByBusiness, profitByBusiness };
    };

    const { incomeByBusiness, expensesByBusiness, profitByBusiness } = calculateProfit();

    if (loading) {
        return <div className="loading">Loading dashboard...</div>;
    }

    return (
        <div className="admin-dashboard">
            <header className="dashboard-header">
                <h1>Admin Dashboard</h1>
                <div className="user-info">
                    <span>Welcome, {user.username}</span>
                    <button onClick={onLogout} className="logout-btn">Logout</button>
                </div>
            </header>

            <div className="dashboard-content">
                <div className="dashboard-stats">
                    <div className="stat-card">
                        <h3>Total Income</h3>
                        <p className="stat-value">${Object.values(incomeByBusiness).reduce((sum, val) => sum + val, 0).toFixed(2)}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Total Expenses</h3>
                        <p className="stat-value">${Object.values(expensesByBusiness).reduce((sum, val) => sum + val, 0).toFixed(2)}</p>
                    </div>
                    <div className="stat-card">
                        <h3>Total Profit</h3>
                        <p className="stat-value">${Object.values(profitByBusiness).reduce((sum, val) => sum + val, 0).toFixed(2)}</p>
                    </div>
                </div>

                <div className="dashboard-actions">
                    <button 
                        onClick={() => setShowExpenseForm(!showExpenseForm)}
                        className="btn-primary"
                    >
                        {showExpenseForm ? 'Hide Expense Form' : 'Add Expense'}
                    </button>
                </div>

                {showExpenseForm && (
                    <ExpenseForm 
                        businesses={businesses}
                        onExpenseAdded={fetchDashboardData}
                    />
                )}

                <div className="business-summaries">
                    {Object.keys(incomeByBusiness).map(business => (
                        <BusinessSummary
                            key={business}
                            business={business}
                            income={incomeByBusiness[business] || 0}
                            expenses={expensesByBusiness[business] || 0}
                            profit={profitByBusiness[business] || 0}
                            records={records.filter(r => r.business === business)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;