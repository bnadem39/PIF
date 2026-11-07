import React from 'react';
import BaseTradingChart from '../TradingChart';

/**
 * Arena Trading Chart: Lightweight Charts with tick interpolation & multi-asset overlay.
 * Controls Play/Pause directly on the chart interface.
 */
export default function ArenaTradingChart(props) {
  return <BaseTradingChart {...props} hidePlayPause={false} />;
}


