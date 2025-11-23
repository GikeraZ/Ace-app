import React, { useState } from 'react';

const BusinessSummary = ({ business, income, expenses, profit, records }) => {
    const [showDetails, setShowDetails] = useState(false);

    const incomeRecords = records.filter(r => r.type === 'income');
    const expenseRecords = records.filter(r => r.type === 'expense');

    return (
        <div className="business-summary">
            <div className="summary-header" onClick={() => setShowDetails(!showDetails)}>
                <h3>{business}</h3>
                <div className="summary-stats">
                    <span className="income">Income: ${income.toFixed(2)}</span>
                    <span className="expenses">Expenses: ${expenses.toFixed(2)}</span>
                    <span className={`profit ${profit >= 0 ? 'positive' : 'negative'}`}>
                        Profit: ${profit.toFixed(2)}
                    </span>
                </div>
                <span className="toggle">{showDetails ? '▲' : '▼'}</span>
            </div>

            {showDetails && (
                <div className="detailed-records">
                    <div className="records-section">
                        <h4>Income Records</h4>
                        {incomeRecords.length > 0 ? (
                            <table className="records-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {incomeRecords.map(record => (
                                        <tr key={record.id}>
                                            <td>{record.date}</td>
                                            <td>${parseFloat(record.amount).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p>No income records found</p>
                        )}
                    </div>

                    <div className="records-section">
                        <h4>Expense Records</h4>
                        {expenseRecords.length > 0 ? (
                            <table className="records-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Description</th>
                                        <th>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {expenseRecords.map(record => (
                                        <tr key={record.id}>
                                            <td>{record.date}</td>
                                            <td>{record.description}</td>
                                            <td>${parseFloat(record.amount).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p>No expense records found</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BusinessSummary;