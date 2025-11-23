import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SnackCenterForm = ({ onBack }) => {
    const [snacks, setSnacks] = useState([]);
    const [cart, setCart] = useState([]);
    const [customerNumber, setCustomerNumber] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('M-Pesa');
    const [paymentStatus, setPaymentStatus] = useState('idle'); // idle, pending, success, failed
    const [transactionId, setTransactionId] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isLoadingSnacks, setIsLoadingSnacks] = useState(true);

    const API_BASE_URL = 'http://localhost:5000/api';
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchSnacks();
    }, []);

    const fetchSnacks = async () => {
        setIsLoadingSnacks(true);
        setMessage('');
        
        try {
            const response = await axios.get(`${API_BASE_URL}/snacks`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            // Convert price strings to numbers
            const snacksWithNumbers = response.data.map(snack => ({
                ...snack,
                price: parseFloat(snack.price) || 0,
                quantity_available: parseInt(snack.quantity_available) || 0
            }));
            
            setSnacks(snacksWithNumbers);
        } catch (error) {
            console.error('Error fetching snacks:', error);
            setMessage(`Error loading snacks: ${error.response?.data?.error || error.message}`);
        } finally {
            setIsLoadingSnacks(false);
        }
    };

    const addToCart = (snack) => {
        const existingItem = cart.find(item => item.name === snack.name);
        if (existingItem) {
            setCart(cart.map(item => 
                item.name === snack.name 
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            setCart([...cart, { ...snack, quantity: 1 }]);
        }
    };

    const removeFromCart = (snackName) => {
        setCart(cart.filter(item => item.name !== snackName));
    };

    const updateQuantity = (snackName, newQuantity) => {
        if (newQuantity <= 0) {
            removeFromCart(snackName);
            return;
        }
        setCart(cart.map(item => 
            item.name === snackName 
                ? { ...item, quantity: newQuantity }
                : item
        ));
    };

    const getTotalAmount = () => {
        return cart.reduce((total, item) => total + (parseFloat(item.price) * item.quantity), 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!customerNumber) {
            setMessage('Please enter customer number');
            return;
        }

        if (cart.length === 0) {
            setMessage('Please add items to cart');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            // Create transaction first
            const transactionResponse = await axios.post(`${API_BASE_URL}/snack-center`, {
                customer_number: customerNumber,
                items: cart,
                total_amount: getTotalAmount(),
                payment_method: paymentMethod
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const transactionId = transactionResponse.data.id;

            if (paymentMethod === 'M-Pesa') {
                // Send M-Pesa payment request
                const paymentResponse = await axios.post(
                    `${API_BASE_URL}/snack-center/${transactionId}/send-payment-request`,
                    {},
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                setPaymentStatus('pending');
                setMessage('Payment request sent to customer. Please wait for confirmation...');
                
                // Check payment status periodically
                checkPaymentStatus(transactionId);
            } else {
                setPaymentStatus('success');
                setMessage('Transaction completed successfully!');
                setTransactionId(transactionResponse.data.transaction_id);
            }

        } catch (error) {
            setPaymentStatus('failed');
            setMessage('Error processing transaction: ' + error.response?.data?.message || error.message);
        } finally {
            setLoading(false);
        }
    };

    const checkPaymentStatus = async (transactionId) => {
        // In a real application, you would poll for payment status
        // For demo, we'll simulate successful payment after 5 seconds
        setTimeout(() => {
            setPaymentStatus('success');
            setMessage('Payment received successfully!');
        }, 5000);
    };

    const resetForm = () => {
        setCart([]);
        setCustomerNumber('');
        setPaymentMethod('M-Pesa');
        setPaymentStatus('idle');
        setMessage('');
    };

    const formatPhoneNumber = (number) => {
        if (number.startsWith('0')) {
            return '+254' + number.substring(1);
        }
        return number;
    };

    return (
        <div className="form-wrapper">
            <button onClick={onBack} className="back-btn">← Back to Business Selection</button>
            
            <h2>Snack Center Sales</h2>

            {paymentStatus === 'pending' && (
                <div className="payment-pending-section">
                    <h3>Payment Request Sent</h3>
                    <div className="payment-details">
                        <p><strong>Customer:</strong> {formatPhoneNumber(customerNumber)}</p>
                        <p><strong>Amount:</strong> KSH {getTotalAmount().toFixed(2)}</p>
                        <p><strong>Status:</strong> Waiting for customer confirmation...</p>
                    </div>
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                        <p>Please wait for customer to confirm payment on their phone</p>
                    </div>
                </div>
            )}

            {paymentStatus === 'success' && (
                <div className="payment-success-section">
                    <h3>✅ Payment Successful!</h3>
                    <div className="payment-details">
                        <p><strong>Transaction ID:</strong> {transactionId || 'N/A'}</p>
                        <p><strong>Amount Paid:</strong> KSH {getTotalAmount().toFixed(2)}</p>
                        <p><strong>Customer:</strong> {formatPhoneNumber(customerNumber)}</p>
                    </div>
                    <button onClick={resetForm} className="btn-primary">
                        New Transaction
                    </button>
                </div>
            )}

            {paymentStatus === 'idle' && (
                <form onSubmit={handleSubmit} className="snack-form">
                    {/* Customer Information */}
                    <div className="form-group">
                        <label>Customer Phone Number:</label>
                        <input
                            type="tel"
                            value={customerNumber}
                            onChange={(e) => setCustomerNumber(e.target.value)}
                            placeholder="e.g., 0712345678"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Payment Method:</label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            required
                        >
                            <option value="M-Pesa">M-Pesa</option>
                            <option value="Cash">Cash</option>
                            <option value="Card">Card</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    {/* Available Snacks Section */}
                    <div className="available-snacks-section">
                        <h3>Available Snacks</h3>
                        
                        {isLoadingSnacks ? (
                            <div className="loading-spinner">
                                <div className="spinner"></div>
                                <p>Loading snacks...</p>
                            </div>
                        ) : snacks.length === 0 ? (
                            <div className="no-snacks-message">
                                No snacks available. Please add snacks to inventory.
                            </div>
                        ) : (
                            <div className="snacks-grid">
                                {snacks.map(snack => (
                                    <div key={snack.id} className="snack-item">
                                        <div className="snack-info">
                                            <h4>{snack.name}</h4>
                                            <p>KSH {(typeof snack.price === 'number' ? snack.price : parseFloat(snack.price) || 0).toFixed(2)}</p>
                                            <p>Available: {typeof snack.quantity_available === 'number' ? snack.quantity_available : parseInt(snack.quantity_available) || 0}</p>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => addToCart(snack)}
                                            className="add-to-cart-btn"
                                            disabled={typeof snack.quantity_available === 'number' ? snack.quantity_available <= 0 : parseInt(snack.quantity_available) <= 0}
                                        >
                                            Add to Cart
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Shopping Cart */}
                    {cart.length > 0 && (
                        <div className="cart-section">
                            <h3>Shopping Cart</h3>
                            <div className="cart-items">
                                {cart.map((item, index) => (
                                    <div key={index} className="cart-item">
                                        <span className="item-name">{item.name}</span>
                                        <div className="quantity-controls">
                                            <button 
                                                type="button" 
                                                onClick={() => updateQuantity(item.name, item.quantity - 1)}
                                                className="quantity-btn"
                                            >
                                                -
                                            </button>
                                            <span className="quantity">{item.quantity}</span>
                                            <button 
                                                type="button" 
                                                onClick={() => updateQuantity(item.name, item.quantity + 1)}
                                                className="quantity-btn"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <span className="item-price">
                                            KSH {((typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0) * item.quantity).toFixed(2)}
                                        </span>
                                        <button 
                                            type="button" 
                                            onClick={() => removeFromCart(item.name)}
                                            className="remove-btn"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="cart-total">
                                <strong>Total: KSH {getTotalAmount().toFixed(2)}</strong>
                            </div>
                        </div>
                    )}

                    <button type="submit" disabled={loading}>
                        {loading ? 'Processing...' : 'Send Payment Request'}
                    </button>
                </form>
            )}

            {message && paymentStatus !== 'success' && (
                <div className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
                    {message}
                </div>
            )}
        </div>
    );
};

export default SnackCenterForm;