import React, { useEffect, useState } from 'react';
import axios from 'axios';

const SignalDisplay = () => {
    const [signals, setSignals] = useState([]);
    const [fetchTime, setFetchTime] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(true); // Track initial loading

    useEffect(() => {
        const fetchSignals = async () => {
            setIsRefreshing(true);
            try {
                const response = await axios.get('http://localhost:5000/api/signals');
                const newData = response.data.data || [];

                setSignals((prevSignals) => {
                    const updated = [...prevSignals];

                    newData.forEach((newSignal) => {
                        const existingIndex = updated.findIndex(s => s.pair === newSignal.pair);
                        if (existingIndex !== -1) {
                            updated[existingIndex] = newSignal; // update if exists
                        } else {
                            updated.push(newSignal); // add if new
                        }
                    });

                    return updated;
                });

                // Format the fetch time for display
                const timeString = new Date().toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    hour12: true,
                });

                setFetchTime(timeString);
            } catch (error) {
                console.error("Error fetching signals:", error);
            } finally {
                setIsRefreshing(false);
                setIsLoading(false); 
            }
        };

        fetchSignals();

        const interval = setInterval(fetchSignals, 30000); 
        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ padding: '20px' }}>
            <h1 style={{ textAlign: 'center' }}>Forex Signal Dashboard</h1>
            <p style={{ textAlign: 'center', fontStyle: 'italic' }}>
                Last updated: {fetchTime}
            </p>

            {/* Loading state */}
            {isLoading ? (
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <span style={{ fontStyle: 'italic', color: 'gray' }}>Loading signals...</span>
                </div>
            ) : (
                <table border="1" cellPadding="10" style={{ width: '100%', textAlign: 'center', marginTop: '20px' }}>
                    <thead>
                        <tr>
                            <th>Time (Candle)</th>
                            <th>Currency Pair</th>
                            <th>Signal</th>
                            <th>Reason</th>
                            <th>Confidence</th>
                        </tr>
                    </thead>
                    <tbody>
                        {signals.length > 0 ? (
                            signals.map((s, index) => (
                                <tr key={index}>
                                    <td>
                                        {new Date(s.timeUTC.replace(" ", "T")).toLocaleString('en-IN', {
                                            timeZone: 'Asia/Kolkata',
                                            hour12: true,
                                        })}
                                    </td>
                                    <td>{s.pair}</td>
                                    <td>{s.signal}</td>
                                    <td>{s.reason}</td>
                                    <td>{s.confidence}%</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5">No signal data available</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}

            {isRefreshing && (
                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                    <span style={{ fontStyle: 'italic', color: 'gray' }}>Updating...</span>
                </div>
            )}
        </div>
    );
};

export default SignalDisplay;
