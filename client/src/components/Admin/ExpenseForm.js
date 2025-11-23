import React, { useState } from 'react';
import axios from 'axios';

const ExpenseForm = ({ businesses, onExpenseAdded }) => {
    const [formData, setFormData] = useState({
        business_id: '',
        description: '',
        amount: '',
        date_expense: new Date().toISOString().split('T')[0]
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const API_BASE_URL = 'http://localhost:5000/api';
    const token = localStorage.getItem('token');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const response = await axios.post(`${API_BASE_URL}/expenses`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            setMessage('Expense added successfully!');
            setFormData({
                business_id: '',
                description: '',
                amount: '',
                date_expense: new Date().toISOString().split('T')[0]
            });
            onExpenseAdded(); // Refresh dashboard data
        } catch (error) {
            setMessage('Error adding expense: ' + error.response?.data?.error || error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="expense-form-container">
            <h3>Add New Expense</h3>
            <form onSubmit={handleSubmit} className="expense-form">
                <div className="form-group">
                    <label>Business:</label>
                    <select
                        value={formData.business_id}
                        onChange={(e) => setFormData({...formData, business_id: e.target.value})}
                        required
                    >
                        <option value="">Select Business</option>
                        {businesses.map(business => (
                            <option key={business.id} value={business.id}>
                                {business.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Description:</label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        required
                        placeholder="Enter expense description"
                    />
                </div>

                <div className="form-group">
                    <label>Amount:</label>
                    <input
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Date:</label>
                    <input
                        type="date"
                        value={formData.date_expense}
                        onChange={(e) => setFormData({...formData, date_expense: e.target.value})}
                        required
                    />
                </div>

                <button type="submit" disabled={loading}>
                    {loading ? 'Adding...' : 'Add Expense'}
                </button>
            </form>
            
            {message && <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
                {message}
            </div>}
        </div>
    );
};

export default ExpenseForm;