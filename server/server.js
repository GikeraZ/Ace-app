const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const axios = require('axios');
const path = require('path'); // Add this for serving static files

const app = express();
app.use(cors());
app.use(express.json());

require('dotenv').config();

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'business_management'
});

// M-Pesa Configuration
const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY;
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET;
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE;
const MPESA_PASSKEY = process.env.MPESA_PASSKEY;

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET;

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.sendStatus(401);
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Get M-Pesa access token
const getMpesaAccessToken = async () => {
    const authString = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
    
    try {
        const response = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
            headers: {
                'Authorization': `Basic ${authString}`,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data.access_token;
    } catch (error) {
        console.error('Error getting M-Pesa access token:', error);
        throw error;
    }
};

// Generate timestamp and password for M-Pesa
const generateMpesaPassword = () => {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');
    return { password, timestamp };
};

// Send M-Pesa payment request
app.post('/api/mpesa/stk-push', authenticateToken, async (req, res) => {
    try {
        const { customer_number, amount, transaction_id } = req.body;
        const employee_id = req.user.id;

        // Validate input
        if (!customer_number || !amount || !transaction_id) {
            return res.status(400).json({ message: 'Customer number, amount, and transaction ID are required' });
        }

        // Format phone number (corrected logic)
        let formattedNumber = customer_number.trim();
        if (formattedNumber.startsWith('0')) {
            formattedNumber = '254' + formattedNumber.substring(1);
        } else if (formattedNumber.startsWith('+')) {
            formattedNumber = formattedNumber.substring(1);
        } else if (formattedNumber.startsWith('254')) {
            // Already in correct format
        } else {
            // Assume it's in 07... format without leading 0
            formattedNumber = '254' + formattedNumber;
        }

        // Validate phone number format (should be 12 digits starting with 254)
        if (!/^\d{12}$/.test(formattedNumber) || !formattedNumber.startsWith('254')) {
            return res.status(400).json({ message: 'Invalid phone number format. Use format: 07XXXXXXXX or +2547XXXXXXXX' });
        }

        // Get access token
        const accessToken = await getMpesaAccessToken();
        const { password, timestamp } = generateMpesaPassword();

        // Prepare STK Push request
        const stkPushUrl = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
        
        const stkPushData = {
            BusinessShortCode: MPESA_SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.round(parseFloat(amount)),
            PartyA: formattedNumber,
            PartyB: MPESA_SHORTCODE,
            PhoneNumber: formattedNumber,
            CallBackURL: `https://yourdomain.com/api/mpesa/callback/${transaction_id}`, // Updated callback URL
            AccountReference: `Order-${transaction_id}`,
            TransactionDesc: 'Snack Center Payment'
        };

        // Send STK Push request
        const response = await axios.post(stkPushUrl, stkPushData, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        // Update transaction status in database
        const updateQuery = 'UPDATE snack_center_records SET payment_status = "Pending", transaction_id = ? WHERE id = ?';
        db.query(updateQuery, [response.data.CheckoutRequestID, transaction_id], (err, result) => {
            if (err) {
                console.error('Error updating transaction status:', err);
            }
        });

        res.json({
            message: 'Payment request sent successfully',
            response: response.data,
            transaction_id: transaction_id
        });

    } catch (error) {
        console.error('Error sending M-Pesa payment request:', error);
        res.status(500).json({ 
            message: 'Error processing payment request',
            error: error.response?.data || error.message
        });
    }
});

// M-Pesa callback endpoint
app.post('/api/mpesa/callback/:transaction_id', (req, res) => {
    const { transaction_id } = req.params;
    const callbackData = req.body.Body.stkCallback;

    // Process the payment result
    const result = {
        merchant_request_id: callbackData.MerchantRequestID,
        checkout_request_id: callbackData.CheckoutRequestID,
        result_code: callbackData.ResultCode,
        result_desc: callbackData.ResultDesc,
        amount: callbackData.CallbackMetadata?.Item?.find(item => item.Name === 'Amount')?.Value,
        mpesa_receipt: callbackData.CallbackMetadata?.Item?.find(item => item.Name === 'MpesaReceiptNumber')?.Value,
        transaction_date: callbackData.CallbackMetadata?.Item?.find(item => item.Name === 'TransactionDate')?.Value,
        phone_number: callbackData.CallbackMetadata?.Item?.find(item => item.Name === 'PhoneNumber')?.Value
    };

    // Update database with payment result
    if (callbackData.ResultCode === 0) {
        // Payment successful
        const updateQuery = 'UPDATE snack_center_records SET payment_status = "Completed", transaction_id = ? WHERE transaction_id = ?';
        db.query(updateQuery, [result.mpesa_receipt, transaction_id], (err, result) => {
            if (err) {
                console.error('Error updating payment success:', err);
            }
        });
    } else {
        // Payment failed
        const updateQuery = 'UPDATE snack_center_records SET payment_status = "Failed" WHERE transaction_id = ?';
        db.query(updateQuery, [transaction_id], (err, result) => {
            if (err) {
                console.error('Error updating payment failure:', err);
            }
        });
    }

    res.status(200).json({ Result: 'Success' });
});

// Get available snacks
app.get('/api/snacks', authenticateToken, (req, res) => {
    const query = 'SELECT * FROM snacks_inventory WHERE is_active = TRUE ORDER BY name';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching snacks:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Create new snack center transaction
app.post('/api/snack-center', authenticateToken, (req, res) => {
    const { customer_number, items, total_amount, payment_method = 'M-Pesa' } = req.body;
    const employee_id = req.user.id;
    const date_recorded = new Date().toISOString().split('T')[0];
    
    // Validate items and update inventory
    const itemsJson = JSON.stringify(items);
    
    const query = 'INSERT INTO snack_center_records (customer_number, total_amount, items_json, payment_method, date_recorded, employee_id) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(query, [customer_number, total_amount, itemsJson, payment_method, date_recorded, employee_id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Update inventory quantities
        items.forEach(item => {
            const updateQuery = 'UPDATE snacks_inventory SET quantity_available = quantity_available - ? WHERE name = ?';
            db.query(updateQuery, [item.quantity, item.name], (err) => {
                if (err) console.error('Inventory update error:', err);
            });
        });
        
        res.json({ 
            message: 'Transaction created successfully', 
            id: result.insertId,
            transaction_id: `TXN${result.insertId.toString().padStart(6, '0')}`
        });
    });
});

// Send payment request to customer
app.post('/api/snack-center/:id/send-payment-request', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const transactionQuery = 'SELECT * FROM snack_center_records WHERE id = ?';
    
    db.query(transactionQuery, [id], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (results.length === 0) {
            return res.status(404).json({ message: 'Transaction not found' });
        }
        
        const transaction = results[0];
        
        try {
            const response = await axios.post(`${req.protocol}://${req.get('host')}/api/mpesa/stk-push`, {
                customer_number: transaction.customer_number,
                amount: transaction.total_amount,
                transaction_id: id
            }, {
                headers: {
                    'Authorization': req.headers.authorization,
                    'Content-Type': 'application/json'
                }
            });
            
            res.json(response.data);
        } catch (error) {
            res.status(500).json({ 
                message: 'Error sending payment request',
                error: error.message 
            });
        }
    });
});

// User registration
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, role = 'employee' } = req.body;
        
        // Validate input
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        // Check if username already exists
        const checkQuery = 'SELECT * FROM users WHERE username = ?';
        db.query(checkQuery, [username], async (err, results) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (results.length > 0) {
                return res.status(400).json({ message: 'Username already exists' });
            }

            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert new user
            const insertQuery = 'INSERT INTO users (username, password, role) VALUES (?, ?, ?)';
            db.query(insertQuery, [username, hashedPassword, role], (err, result) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                // Return success message
                res.json({ 
                    message: 'User created successfully',
                    userId: result.insertId 
                });
            });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// User login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const query = 'SELECT * FROM users WHERE username = ?';
        db.query(query, [username], async (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            
            if (results.length === 0) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            
            const user = results[0];
            const isValidPassword = await bcrypt.compare(password, user.password);
            
            if (!isValidPassword) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            
            const token = jwt.sign(
                { id: user.id, username: user.username, role: user.role },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            
            res.json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role
                }
            });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get businesses
app.get('/api/businesses', authenticateToken, (req, res) => {
    const query = 'SELECT * FROM businesses';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Farm record submission
app.post('/api/farm', authenticateToken, (req, res) => {
    const { product, quantity, price, date_sold } = req.body;
    const employee_id = req.user.id;
    
    const query = 'INSERT INTO farm_records (product, quantity, price, date_sold, employee_id) VALUES (?, ?, ?, ?, ?)';
    db.query(query, [product, quantity, price, date_sold, employee_id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Farm record added successfully', id: result.insertId });
    });
});

// Pool record submission
app.post('/api/pool', authenticateToken, (req, res) => {
    const { amount_collected, date_recorded } = req.body;
    const employee_id = req.user.id;
    
    const query = 'INSERT INTO pool_records (amount_collected, date_recorded, employee_id) VALUES (?, ?, ?)';
    db.query(query, [amount_collected, date_recorded, employee_id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Pool record added successfully', id: result.insertId });
    });
});

// PS Station record submission
app.post('/api/ps-station', authenticateToken, (req, res) => {
    const { total_amount, date_recorded } = req.body;
    const employee_id = req.user.id;
    
    const query = 'INSERT INTO ps_station_records (total_amount, date_recorded, employee_id) VALUES (?, ?, ?)';
    db.query(query, [total_amount, date_recorded, employee_id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'PS Station record added successfully', id: result.insertId });
    });
});

// Get all records for admin dashboard
app.get('/api/admin/dashboard', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    
    const query = `
        SELECT 
            'Farm' as business, id, price as amount, date_sold as date, 'income' as type FROM farm_records
        UNION ALL
        SELECT 
            'Pool' as business, id, amount_collected as amount, date_recorded as date, 'income' as type FROM pool_records
        UNION ALL
        SELECT 
            'PS Station' as business, id, total_amount as amount, date_recorded as date, 'income' as type FROM ps_station_records
        UNION ALL
        SELECT 
            'Snack Center' as business, id, total_earned as amount, date_recorded as date, 'income' as type FROM snack_center_records
        UNION ALL
        SELECT 
            b.name as business, e.id, e.amount as amount, e.date_expense as date, 'expense' as type 
        FROM expenses e 
        JOIN businesses b ON e.business_id = b.id
        ORDER BY date DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Add expense
app.post('/api/expenses', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    
    const { business_id, description, amount, date_expense } = req.body;
    
    const query = 'INSERT INTO expenses (business_id, description, amount, date_expense) VALUES (?, ?, ?, ?)';
    db.query(query, [business_id, description, amount, date_expense], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Expense added successfully', id: result.insertId });
    });
});

// Test database connection
app.get('/api/test-db', (req, res) => {
    db.query('SELECT 1', (err, results) => {
        if (err) {
            return res.status(500).json({ 
                error: 'Database connection failed',
                details: err.message 
            });
        }
        res.json({ 
            success: true, 
            message: 'Database connected successfully' 
        });
    });
});

// Serve static files from React build folder in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'client/build')));
    
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
    });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});