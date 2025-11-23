import React, { useState } from 'react';
import axios from 'axios';

const Login = ({ onLogin }) => {
    const [credentials, setCredentials] = useState({
        username: '',
        password: ''
    });
    const [signupData, setSignupData] = useState({
        username: '',
        password: '',
        confirmPassword: ''
    });
    const [isSignupMode, setIsSignupMode] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const API_BASE_URL = 'http://localhost:5000/api';

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await axios.post(`${API_BASE_URL}/login`, credentials);
            const { token, user } = response.data;
            
            onLogin(user, token);
        } catch (error) {
            setError(error.response?.data?.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // Validate passwords match
        if (signupData.password !== signupData.confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        // Validate password strength (optional)
        if (signupData.password.length < 6) {
            setError('Password must be at least 6 characters long');
            setIsLoading(false);
            return;
        }

        try {
            // Hash password on backend (this will be handled by backend)
            const response = await axios.post(`${API_BASE_URL}/register`, {
                username: signupData.username,
                password: signupData.password,
                role: 'employee'  // Default role for signup
            });

            // After successful signup, automatically log in
            const loginResponse = await axios.post(`${API_BASE_URL}/login`, {
                username: signupData.username,
                password: signupData.password
            });

            const { token, user } = loginResponse.data;
            onLogin(user, token);
        } catch (error) {
            setError(error.response?.data?.message || 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-form">
                <h2>Business Management System</h2>
                
                {isSignupMode ? (
                    // SIGN UP FORM
                    <form onSubmit={handleSignup}>
                        <div className="form-group">
                            <input
                                type="text"
                                placeholder="Choose Username"
                                value={signupData.username}
                                onChange={(e) => setSignupData({...signupData, username: e.target.value})}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <input
                                type="password"
                                placeholder="Choose Password"
                                value={signupData.password}
                                onChange={(e) => setSignupData({...signupData, password: e.target.value})}
                                required
                                minLength="6"
                            />
                        </div>
                        <div className="form-group">
                            <input
                                type="password"
                                placeholder="Confirm Password"
                                value={signupData.confirmPassword}
                                onChange={(e) => setSignupData({...signupData, confirmPassword: e.target.value})}
                                required
                                minLength="6"
                            />
                        </div>
                        <button type="submit" disabled={isLoading}>
                            {isLoading ? 'Creating Account...' : 'Sign Up'}
                        </button>
                        <div className="switch-mode">
                            <p>Already have an account? <button 
                                type="button" 
                                onClick={() => setIsSignupMode(false)}
                                className="switch-btn"
                            >
                                Login
                            </button></p>
                        </div>
                    </form>
                ) : (
                    // LOGIN FORM
                    <form onSubmit={handleLogin}>
                        <div className="form-group">
                            <input
                                type="text"
                                placeholder="Username"
                                value={credentials.username}
                                onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <input
                                type="password"
                                placeholder="Password"
                                value={credentials.password}
                                onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                                required
                            />
                        </div>
                        <button type="submit" disabled={isLoading}>
                            {isLoading ? 'Logging in...' : 'Login'}
                        </button>
                        <div className="switch-mode">
                            <p>Don't have an account? <button 
                                type="button" 
                                onClick={() => setIsSignupMode(true)}
                                className="switch-btn"
                            >
                                Sign Up
                            </button></p>
                        </div>
                    </form>
                )}
                
                {error && <div className="error">{error}</div>}
            </div>
        </div>
    );
};

export default Login;