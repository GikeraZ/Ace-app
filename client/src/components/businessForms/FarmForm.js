import React, { useState } from 'react';
import axios from 'axios';

const FarmForm = ({ onBack }) => {
    const [formData, setFormData] = useState({
        product: '',
        quantity: '',
        price: '',
        date_sold: new Date().toISOString().split('T')[0]
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
            const response = await axios.post(`${API_BASE_URL}/farm`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            setMessage('Farm record submitted successfully!');
            setFormData({
                product: '',
                quantity: '',
                price: '',
                date_sold: new Date().toISOString().split('T')[0]
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
                    <label>Product:</label>
                    <select
                        value={formData.product}
                        onChange={(e) => setFormData({...formData, product: e.target.value})}
                        required
                    >
                        <option value="">Select Product</option>
                        <option value="Eggs">Eggs</option>
                        <option value="Chicks">Chicks</option>
                        <option value="Hen">Hen</option>
                        <option value="Cock">Cock</option>
                        <option value="Chicken Meat">Chicken Meat</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Quantity (optional):</label>
                    <input
                        type="number"
                        value={formData.quantity}
                        onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                        min="0"
                    />
                </div>

                <div className="form-group">
                    <label>Price:</label>
                    <input
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Date Sold:</label>
                    <input
                        type="date"
                        value={formData.date_sold}
                        onChange={(e) => setFormData({...formData, date_sold: e.target.value})}
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

export default FarmForm;