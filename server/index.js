const express = require('express');
const axios = require('axios');
const taLib = require('ta-lib');
const cors = require('cors');

const app = express();
const PORT = 5000;
const API_KEY = '44a581c951b5413993d4b61ebbbef567';

app.use(cors());

const currencyPairs = [
  'EUR/USD', 'USD/JPY', 'GBP/USD', 'USD/CHF',
  'AUD/USD', 'USD/CAD', 'NZD/USD'
];

async function fetchData(symbol, interval = '5min') {
  const url = `https://api.twelvedata.com/time_series`;
  const params = {
    symbol,
    interval,
    outputsize: 100,
    apikey: API_KEY
  };

  try {
    const response = await axios.get(url, { params });
    const values = response.data.values;

    if (!values || values.length < 50) {
      console.warn(`⚠️ Not enough data for ${symbol} (received: ${values ? values.length : 0})`);
      return null;
    }

    const ohlc = values.reverse().map(item => ({
      time: item.datetime,
      open: parseFloat(item.open),
      high: parseFloat(item.high),
      low: parseFloat(item.low),
      close: parseFloat(item.close),
    }));

    return ohlc;
  } catch (err) {
    console.error(`❌ Error fetching data for ${symbol}:`, err.message);
    return null;
  }
}

// Generate signal
function generateSignal(symbol, rsi, sma20, sma50, candles) {
  const lastRSI = rsi[rsi.length - 1];
  const lastSMA20 = sma20[sma20.length - 1];
  const lastSMA50 = sma50[sma50.length - 1];
  const timeUTC = candles[candles.length - 1].time;
  const time = new Date(timeUTC).toLocaleString(); // Convert to local time

  let signal = 'Neutral';
  let reason = [];
  let confidence = 0;

  if (lastRSI > 70) {
    signal = 'Put (Sell)';
    reason.push('RSI > 70');
    confidence = 65;
  } else if (lastRSI < 30) {
    signal = 'Call (Buy)';
    reason.push('RSI < 30');
    confidence = 75;
  }

  if (lastSMA20 > lastSMA50) {
    signal = 'Call (Buy)';
    reason.push('SMA20 > SMA50');
    confidence = Math.max(confidence, 80);
  } else if (lastSMA20 < lastSMA50) {
    signal = 'Put (Sell)';
    reason.push('SMA20 < SMA50');
    confidence = Math.max(confidence, 70);
  }

  return {
    time,       // Local time
    timeUTC,    // UTC for reference
    pair: symbol,
    signal,
    reason: reason.join(', '),
    confidence
  };
}

// API endpoint
app.get('/api/signals', async (req, res) => {
  try {
    const promises = currencyPairs.map(async (pair) => {
      const data = await fetchData(pair);
      if (!data) return null;

      const closePrices = data.map(d => d.close);
      const rsi = taLib.RSI(closePrices, 14);
      const sma20 = taLib.SMA(closePrices, 20);
      const sma50 = taLib.SMA(closePrices, 50);

      if (rsi.length && sma20.length && sma50.length) {
        return generateSignal(pair, rsi, sma20, sma50, data);
      }

      return null;
    });

    const results = (await Promise.all(promises)).filter(Boolean);
    results.sort((a, b) => b.confidence - a.confidence);

    res.json({
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      generatedAt: new Date().toISOString(),
      data: results
    });
  } catch (err) {
    console.error("❌ Error generating signals:", err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`🟢 Server running at http://localhost:${PORT}`);
});
