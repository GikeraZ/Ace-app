import React, { useState } from 'react';
import axios from 'axios';

const PoolForm = ({ onBack }) => {
    const [formData, setFormData] = useState({
        amount_collected: '',
        date_recorded: new Date().toISOString().split('T')[0]
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
            const response = await axios.post(`${API_BASE_URL}/pool`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            setMessage('Pool record submitted successfully!');
            setFormData({
                amount_collected: '',
                date_recorded: new Date().toISOString().split('T')[0]
            });
        } catch (error) {
            setMessage('Error submitting record: ' + error.response?.data?.error || error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="form-wrapper">
            <form onSubmit={handleSubmit} className="business-form">
                <div className="form-group">
                    <label>Amount Collected:</label>
                    <input
                        type="number"
                        step="0.01"
                        value={formData.amount_collected}
                        onChange={(e) => setFormData({...formData, amount_collected: e.target.value})}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Date:</label>
                    <input
                        type="date"
                        value={formData.date_recorded}
                        onChange={(e) => setFormData({...formData, date_recorded: e.target.value})}
                        required
                    />
                </div>

                <button type="submit" disabled={loading}>
                    {loading ? 'Submitting...' : 'Submit Record'}
                </button>
            </form>
            
            {message && <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
                {message}
            </div>}
        </div>
    );
};

export default PoolForm;