import gc
import logging
import warnings
from pathlib import Path
from typing import Optional
import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")

BASE_DIR = Path(__file__).parent.parent
AI_DIR   = Path(__file__).parent

LOG_PATH    = AI_DIR / "logs" / "data_pipeline.log"
OUTPUT_PATH = AI_DIR / "processed_data.parquet"

DATA_SOURCES = {
    "ALL_DATA": BASE_DIR / "ALL_DATA.csv"  / "ALL_DATA.csv",
    "BNB":      BASE_DIR / "BNB_USD_daily_data.csv",
    "ETH_1MIN": BASE_DIR / "ETH_1min.csv"  / "ETH_1min.csv",
    "BTC_1MIN": BASE_DIR / "coinbaseUSD_1-min_data.csv" / "coinbaseUSD_1-min_data.csv",
}
RESAMPLE_INTRADAY_TO_DAILY = True
MAX_ROWS_INTRADAY = 500_000

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOG_PATH, mode="w", encoding="utf-8"),
    ],
)
log = logging.getLogger(__name__)


def load_all_data(path: Path) -> pd.DataFrame:
    log.info(f"[LOAD] ALL_DATA -> {path}")
    df = pd.read_csv(
        path,
        usecols=["Ticker", "Date", "Open", "High", "Low", "Close", "Volume"],
        dtype={"Ticker": "category", "Open": "float32", "High": "float32",
               "Low": "float32", "Close": "float32", "Volume": "float32"},
        parse_dates=["Date"],
    )
    df.columns = df.columns.str.lower()
    log.info(f"  -> {len(df):,} rows ({df['ticker'].nunique()} tickers)")
    return df


def load_bnb_data(path: Path) -> pd.DataFrame:
    log.info(f"[LOAD] BNB -> {path}")
    df = pd.read_csv(
        path,
        usecols=["Date", "Open", "High", "Low", "Close", "Volume"],
        dtype={"Open": "float32", "High": "float32",
               "Low": "float32", "Close": "float32", "Volume": "float32"},
        parse_dates=["Date"],
    )
    df.columns = df.columns.str.lower()
    df["ticker"] = "BNB-USD"
    log.info(f"  -> {len(df):,} rows BNB")
    return df


def load_intraday_data(path: Path, symbol: str, max_rows: Optional[int] = None) -> pd.DataFrame:
    log.info(f"[LOAD] {symbol} (minute) -> {path}")
    usecols = ["Unix Timestamp", "Open", "High", "Low", "Close", "Volume"]
    chunks = []
    rows_read = 0
    chunk_size = 100_000
    for chunk in pd.read_csv(
        path, usecols=usecols,
        dtype={"Unix Timestamp": "int64", "Open": "float32", "High": "float32",
               "Low": "float32", "Close": "float32", "Volume": "float32"},
        chunksize=chunk_size,
    ):
        chunks.append(chunk)
        rows_read += len(chunk)
        if max_rows and rows_read >= max_rows:
            break
    df = pd.concat(chunks, ignore_index=True)
    del chunks
    gc.collect()
    df["date"] = pd.to_datetime(df["Unix Timestamp"], unit="s", utc=True).dt.normalize().dt.tz_localize(None)
    df.drop(columns=["Unix Timestamp"], inplace=True)
    df.columns = df.columns.str.lower()
    df["ticker"] = symbol
    if RESAMPLE_INTRADAY_TO_DAILY:
        df = (
            df.groupby(["ticker", "date"])
            .agg(open=("open", "first"), high=("high", "max"),
                 low=("low", "min"), close=("close", "last"), volume=("volume", "sum"))
            .reset_index()
        )
        for col in ["open", "high", "low", "close", "volume"]:
            df[col] = df[col].astype("float32")
    log.info(f"  -> {len(df):,} daily rows for {symbol}")
    return df


def fuse_sources() -> pd.DataFrame:
    frames = []
    if DATA_SOURCES["ALL_DATA"].exists():
        frames.append(load_all_data(DATA_SOURCES["ALL_DATA"]))
    if DATA_SOURCES["BNB"].exists():
        frames.append(load_bnb_data(DATA_SOURCES["BNB"]))
    if DATA_SOURCES["ETH_1MIN"].exists():
        frames.append(load_intraday_data(DATA_SOURCES["ETH_1MIN"], "ETH-USD", MAX_ROWS_INTRADAY))
    if DATA_SOURCES["BTC_1MIN"].exists():
        frames.append(load_intraday_data(DATA_SOURCES["BTC_1MIN"], "BTC-USD", MAX_ROWS_INTRADAY))
    if not frames:
        raise RuntimeError("No data source found!")
    df = pd.concat(frames, ignore_index=True)
    del frames
    gc.collect()
    df.columns = df.columns.str.lower().str.strip()
    df = df[["ticker", "date", "open", "high", "low", "close", "volume"]]
    log.info(f"[FUSE] Total: {len(df):,} rows | {df['ticker'].nunique()} tickers")
    return df


def sanitize(df: pd.DataFrame) -> pd.DataFrame:
    n0 = len(df)
    log.info(f"[SANIT] Start: {n0:,} rows")
    df.dropna(subset=["ticker", "date", "open", "high", "low", "close"], inplace=True)
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df.dropna(subset=["date"], inplace=True)
    for col in ["open", "high", "low", "close", "volume"]:
        df[col] = pd.to_numeric(df[col], errors="coerce").astype("float32")
    df.dropna(subset=["open", "high", "low", "close"], inplace=True)
    mask_pos = (df["open"] > 0) & (df["high"] > 0) & (df["low"] > 0) & (df["close"] > 0)
    df = df[mask_pos]
    # Validate: High >= max(Open,Close) AND Low <= min(Open,Close)
    valid_ohlc = (
        (df["high"] >= df[["open", "close"]].max(axis=1)) &
        (df["low"]  <= df[["open", "close"]].min(axis=1))
    )
    df = df[valid_ohlc]
    df.sort_values(["ticker", "date"], inplace=True)
    df.drop_duplicates(subset=["ticker", "date"], keep="last", inplace=True)
    df["_pct"] = df.groupby("ticker")["close"].pct_change().abs()
    df = df[df["_pct"] <= 0.99]
    df.drop(columns=["_pct"], inplace=True)
    df.reset_index(drop=True, inplace=True)
    log.info(f"[SANIT] Done: {len(df):,} rows kept ({len(df)/n0:.1%})")
    return df


def _rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain  = delta.clip(lower=0)
    loss  = (-delta).clip(lower=0)
    avg_g = gain.ewm(alpha=1/period, min_periods=period, adjust=False).mean()
    avg_l = loss.ewm(alpha=1/period, min_periods=period, adjust=False).mean()
    rs    = avg_g / (avg_l + 1e-9)
    return (100 - 100 / (1 + rs)).astype("float32")


def compute_features(df: pd.DataFrame) -> pd.DataFrame:
    log.info("[FEAT] Computing technical indicators...")
    frames = []
    for ticker, grp in df.groupby("ticker", observed=True):
        grp = grp.sort_values("date").copy()
        c   = grp["close"].astype("float64")
        h   = grp["high"].astype("float64")
        l   = grp["low"].astype("float64")

        # Moving Averages
        grp["sma_20"]       = c.rolling(20, min_periods=1).mean().astype("float32")
        grp["sma_50"]       = c.rolling(50, min_periods=1).mean().astype("float32")

        # Bollinger Bands (upper, lower, bandwidth, %b)
        std_20 = c.rolling(20, min_periods=1).std().fillna(0)
        bb_upper = grp["sma_20"] + 2.0 * std_20
        bb_lower = grp["sma_20"] - 2.0 * std_20
        grp["bb_upper"]     = bb_upper.astype("float32")
        grp["bb_lower"]     = bb_lower.astype("float32")
        grp["bb_width"]     = ((bb_upper - bb_lower) / (grp["sma_20"].astype("float64") + 1e-9)).astype("float32")
        grp["bb_pct"]       = ((c - bb_lower) / (bb_upper - bb_lower + 1e-9)).clip(0.0, 1.0).astype("float32")

        # RSI (14)
        grp["rsi_14"]       = _rsi(c, 14)

        # MACD
        ema12               = c.ewm(span=12, adjust=False).mean()
        ema26               = c.ewm(span=26, adjust=False).mean()
        macd                = ema12 - ema26
        grp["macd"]         = macd.astype("float32")
        grp["macd_signal"]  = macd.ewm(span=9, adjust=False).mean().astype("float32")
        grp["macd_hist"]    = (grp["macd"] - grp["macd_signal"]).astype("float32")

        # ATR (Average True Range - 14)
        prev_c = c.shift(1).fillna(c)
        tr1 = h - l
        tr2 = (h - prev_c).abs()
        tr3 = (l - prev_c).abs()
        tr  = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr_14_raw = tr.rolling(14, min_periods=1).mean()
        grp["atr_raw"]      = atr_14_raw.astype("float32")
        grp["atr_14"]       = (atr_14_raw / (c + 1e-9)).astype("float32")

        # Returns & Lagged Returns (T-1, T-2, T-3)
        log_ret             = np.log(c / c.shift(1).replace(0, np.nan)).fillna(0)
        grp["volatility_30d"]  = (log_ret.rolling(30, min_periods=5).std().fillna(0) * np.sqrt(252) * 100).astype("float32")
        grp["log_return_1d"]   = log_ret.astype("float32")
        grp["lag_return_1"]    = log_ret.shift(1).fillna(0).astype("float32")
        grp["lag_return_2"]    = log_ret.shift(2).fillna(0).astype("float32")
        grp["lag_return_3"]    = log_ret.shift(3).fillna(0).astype("float32")

        # Volume & price action metrics
        grp["price_to_sma20"]  = (c / (grp["sma_20"].astype("float64") + 1e-9)).astype("float32")
        grp["candle_range_pct"] = ((h - l) / (l + 1e-9) * 100).astype("float32")
        vol_m = grp["volume"].rolling(20, min_periods=1).mean()
        vol_s = grp["volume"].rolling(20, min_periods=1).std().replace(0, 1).fillna(1)
        grp["volume_zscore"]   = ((grp["volume"] - vol_m) / vol_s).astype("float32")

        # Rendements cumulés sur 5/10/20 séances (strictement rétrospectifs : close actuel vs close N jours avant)
        grp["cum_return_5d"]  = (c / c.shift(5).replace(0, np.nan) - 1).fillna(0).astype("float32")
        grp["cum_return_10d"] = (c / c.shift(10).replace(0, np.nan) - 1).fillna(0).astype("float32")
        grp["cum_return_20d"] = (c / c.shift(20).replace(0, np.nan) - 1).fillna(0).astype("float32")

        # Ratio de volatilité court terme (5j) / moyen terme (30j, déjà calculée ci-dessus)
        vol_5d = (log_ret.rolling(5, min_periods=2).std().fillna(0) * np.sqrt(252) * 100)
        grp["volatility_ratio_5_30"] = (vol_5d / (grp["volatility_30d"].astype("float64") + 1e-9)).astype("float32")

        # Distance au plus haut / plus bas sur 52 semaines (~252 séances), fenêtre glissante se terminant à la séance actuelle
        roll_high_252 = h.rolling(252, min_periods=20).max()
        roll_low_252  = l.rolling(252, min_periods=20).min()
        grp["dist_to_52w_high"] = ((c - roll_high_252) / (roll_high_252 + 1e-9)).astype("float32")
        grp["dist_to_52w_low"]  = ((c - roll_low_252) / (roll_low_252 + 1e-9)).astype("float32")

        # Volume relatif court terme (5j) / moyen terme (20j, moyenne déjà calculée ci-dessus)
        vol_ma5 = grp["volume"].rolling(5, min_periods=1).mean()
        grp["relative_volume_5_20"] = (vol_ma5 / (vol_m + 1e-9)).astype("float32")

        # Proxy de momentum (RSI/MACD), faute de flux d'actualités réel disponible à l'entraînement
        if "momentum_proxy_score" in grp.columns and grp["momentum_proxy_score"].notna().any():
            grp["momentum_proxy_score"] = grp["momentum_proxy_score"].clip(-1.0, 1.0).astype("float32")
        else:
            norm_rsi = (grp["rsi_14"] - 50.0) / 25.0
            norm_macd = grp["macd_hist"] / (c * 0.01 + 1e-9)
            grp["momentum_proxy_score"] = np.tanh(0.6 * norm_rsi + 0.4 * norm_macd).astype("float32")

        frames.append(grp)
    out = pd.concat(frames, ignore_index=True)
    del frames

    # Rendement relatif au marché : rendement du jour du ticker moins la moyenne de TOUS les tickers
    # à la MÊME date (coupe transversale du même jour, aucune donnée d'un autre jour n'est utilisée)
    market_avg_return = out.groupby("date")["log_return_1d"].transform("mean")
    out["relative_to_market_return"] = (out["log_return_1d"] - market_avg_return).astype("float32")

    gc.collect()
    return out


def create_target(df: pd.DataFrame, horizon: int = 5, atr_multiplier: float = 1.5) -> pd.DataFrame:
    """
    Classification en 3 classes basée sur la volatilité réelle (ATR) :
      +1 : Hausse franche (Close_{T+5} > Close_T + 1.5 * ATR_T)
      -1 : Baisse franche (Close_{T+5} < Close_T - 1.5 * ATR_T)
       0 : Neutre / Bruit (Prix dans le corridor [Close_T - 1.5*ATR_T, Close_T + 1.5*ATR_T])
    """
    log.info(f"[TARGET] 3-Classes Dynamique ATR : horizon={horizon}d, seuil={atr_multiplier}x ATR")
    frames = []
    for ticker, grp in df.groupby("ticker", observed=True):
        grp = grp.sort_values("date").copy()
        c = grp["close"].astype("float64")
        future = c.shift(-horizon)

        if "atr_raw" in grp.columns:
            atr = grp["atr_raw"].astype("float64")
        else:
            atr = grp["atr_14"].astype("float64") * c

        upper_bound = c + (atr_multiplier * atr)
        lower_bound = c - (atr_multiplier * atr)

        target = np.zeros(len(grp), dtype=np.int8)
        target[future > upper_bound] = 1   # Achat (+1)
        target[future < lower_bound] = -1  # Vente (-1)
        # Reste 0 : Neutre / Bruit

        grp["target_direction"] = target
        grp = grp.iloc[:-horizon] if len(grp) > horizon else grp.iloc[0:0]
        frames.append(grp)

    out = pd.concat(frames, ignore_index=True)
    del frames
    gc.collect()

    dist = out["target_direction"].value_counts(normalize=True).to_dict()
    log.info(f"[TARGET] Distribution 3-Classes : +1 (Achat)={dist.get(1, 0):.1%} | 0 (Neutre)={dist.get(0, 0):.1%} | -1 (Vente)={dist.get(-1, 0):.1%}")
    return out


def run_pipeline(output_path: Path = OUTPUT_PATH) -> pd.DataFrame:
    log.info("=" * 60)
    log.info("PIF AI DATA PIPELINE - START")
    log.info("=" * 60)
    df = fuse_sources()
    df = sanitize(df)
    df = compute_features(df)
    df = create_target(df)
    n0 = len(df)
    df.dropna(subset=["sma_20", "rsi_14", "macd", "target_direction"], inplace=True)
    log.info(f"[FINAL] After NaN drop: {len(df):,} rows (removed {n0 - len(df):,})")
    df.reset_index(drop=True, inplace=True)
    df.to_parquet(output_path, index=False, compression="lz4", engine="pyarrow")
    mem = df.memory_usage(deep=True).sum() / 1024**2
    log.info(f"[SAVE] -> {output_path} ({len(df):,} rows, {df.shape[1]} cols, {mem:.1f}MB)")
    gc.collect()
    log.info("PIPELINE COMPLETED")
    return df


def load_processed(path: Path = OUTPUT_PATH) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}. Run run_pipeline() first.")
    return pd.read_parquet(path, engine="pyarrow")


# Moyenne de marché précalculée par date (build_market_return.py), utilisée à l'inférence à un seul
# ticker pour corriger relative_to_market_return (voir apply_relative_to_market_return ci-dessous).
MARKET_RETURN_PATH = AI_DIR / "models" / "market_return_by_date.csv"
_market_return_cache: Optional[dict] = None


def load_market_return_lookup() -> dict:
    """Charge ai/models/market_return_by_date.csv en dict {date (AAAA-MM-JJ): moyenne de marché}."""
    global _market_return_cache
    if _market_return_cache is None:
        if MARKET_RETURN_PATH.exists():
            table = pd.read_csv(MARKET_RETURN_PATH, dtype={"date": str})
            _market_return_cache = dict(zip(table["date"], table["market_avg_return_1d"]))
        else:
            log.warning(f"[MARKET] Fichier introuvable : {MARKET_RETURN_PATH}. Exécutez build_market_return.py.")
            _market_return_cache = {}
    return _market_return_cache


def apply_relative_to_market_return(df: pd.DataFrame) -> pd.DataFrame:
    """
    Recalcule relative_to_market_return à partir de la moyenne de marché précalculée par date.

    À l'entraînement (compute_features sur tous les tickers), cette variable compare le rendement du
    ticker à la moyenne réelle de TOUS les tickers à la même date. À l'inférence sur un seul ticker,
    compute_features() ne voit pas cette coupe transversale et retombe à 0.0 (le ticker comparé à
    lui-même). Cette fonction corrige la colonne après coup, sans toucher à compute_features() ni au
    modèle. Si une date est absente du fichier précalculé, replie sur 0.0 et logue un avertissement.
    """
    lookup = load_market_return_lookup()
    date_str = (
        df["date"].dt.strftime("%Y-%m-%d")
        if np.issubdtype(df["date"].dtype, np.datetime64)
        else df["date"].astype(str)
    )

    missing_dates = sorted(set(date_str) - set(lookup.keys()))
    if missing_dates:
        log.warning(
            f"[MARKET] Moyenne de marché absente pour {len(missing_dates)} date(s) "
            f"(ex. {missing_dates[:3]}) -> repli sur 0.0 pour relative_to_market_return."
        )

    market_avg = date_str.map(lookup).fillna(0.0).astype("float64")
    df["relative_to_market_return"] = (df["log_return_1d"].astype("float64") - market_avg).astype("float32")
    return df


if __name__ == "__main__":
    df = run_pipeline()
    print(df.head())
    print(f"Shape: {df.shape}")
