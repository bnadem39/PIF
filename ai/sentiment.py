"""
Analyse de sentiment des actualités financières (cahier §3.4.3).

  POST /api/ai/sentiment   texte (titre + corps) -> score entre -1 et +1, libellé et termes détectés

Méthode : lexique financier français et anglais (racines), avec gestion de la négation et des intensifieurs.
Elle est déterministe et explicable : chaque terme retenu est renvoyé avec sa polarité, ce qui permet de montrer
pourquoi un article est jugé positif ou négatif (cahier §3.6). Elle ne comprend ni l'ironie ni le contexte fin ;
un LLM peut la compléter quand il est disponible.
"""
import re
import unicodedata
from typing import List

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/ai", tags=["sentiment"])

# Racines sans accents ; poids 2 pour les termes forts
POSITIVE = {
    # français
    "hauss": 1, "progress": 1, "croissan": 1, "benefic": 1, "rebond": 1, "solide": 1, "amelior": 1,
    "dividend": 1, "gain": 1, "envol": 2, "grimp": 1, "surperform": 2, "optimis": 1, "relevement": 1,
    "excedent": 1, "rentab": 1, "expansion": 1, "reprise": 1, "robuste": 1, "favorabl": 1, "accelere": 1,
    "succes": 1, "renforc": 1, "stabilis": 1, "confian": 1, "positi": 1, "profit": 1, "record": 1,
    "embellie": 1, "dynamis": 1, "essor": 2, "flamb": 1, "redress": 1, "resilien": 1, "rehauss": 1,
    # anglais
    "rise": 1, "rising": 1, "rose": 1, "surge": 2, "soar": 2, "rally": 1, "jump": 1, "growth": 1,
    "beat": 1, "strong": 1, "upgrade": 2, "improv": 1, "recover": 1, "rebound": 1, "bullish": 2,
    "outperform": 2, "expand": 1, "boost": 1, "upbeat": 1,
}
NEGATIVE = {
    # français
    "baiss": 1, "chute": 2, "recul": 1, "perte": 1, "deficit": 1, "crise": 2, "faillit": 2, "defaut": 2,
    "effondr": 2, "degrad": 1, "inflation": 1, "ralentiss": 1, "recession": 2, "risque": 1, "incertitud": 1,
    "tension": 1, "sanction": 1, "greve": 1, "chomage": 1, "endett": 1, "penurie": 1, "contraction": 1,
    "plong": 2, "declin": 1, "alerte": 1, "fraude": 2, "litig": 1, "devaluat": 1, "depreciat": 1,
    "volatil": 1, "panique": 2, "krach": 2, "suspension": 1, "avertiss": 1, "menace": 1, "pessimis": 1,
    "negati": 1, "abaiss": 1, "degringol": 2, "deterior": 1, "insolvab": 2, "impaye": 1, "creances douteuses": 2,
    "deceva": 1, "repli": 1, "fragil": 1, "craign": 1, "crain": 1, "inquiet": 1,
    # anglais
    "loss": 1, "fall": 1, "fell": 1, "drop": 1, "declin": 1, "plunge": 2, "slump": 2, "crash": 2,
    "crisis": 2, "default": 2, "bankrupt": 2, "downgrade": 2, "weak": 1, "recession": 2, "uncertain": 1,
    "fear": 1, "bearish": 2, "selloff": 2, "sell-off": 2, "layoff": 1, "miss": 1, "lawsuit": 1, "warn": 1,
    "debt": 1,
}
NEGATORS = {"ne", "pas", "plus", "sans", "aucun", "aucune", "jamais", "ni", "not", "no", "never", "without"}
INTENSIFIERS = {"forte": 1.5, "fort": 1.5, "fortement": 1.5, "nettement": 1.5, "tres": 1.3, "massivement": 1.5, "sharply": 1.5,
                "strongly": 1.5, "significativement": 1.3, "brutalement": 1.5, "legerement": 0.5, "slightly": 0.5}
NEUTRAL_BAND = 0.15


def _normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text.lower())
    return "".join(c for c in text if not unicodedata.combining(c))


def _match(token: str, lexicon: dict):
    for stem, weight in lexicon.items():
        if " " not in stem and token.startswith(stem):
            return stem, weight
    return None


def analyze(text: str) -> dict:
    norm = _normalize(text)
    tokens = re.findall(r"[a-z][a-z\-']*", norm)
    pos = neg = 0.0
    terms: List[dict] = []

    # Expressions de plusieurs mots
    for lexicon, sign in ((POSITIVE, 1), (NEGATIVE, -1)):
        for stem, weight in lexicon.items():
            if " " in stem and stem in norm:
                if sign > 0:
                    pos += weight
                else:
                    neg += weight
                terms.append({"term": stem, "polarity": sign * weight, "negated": False})

    for i, tok in enumerate(tokens):
        hit_pos = _match(tok, POSITIVE)
        hit_neg = _match(tok, NEGATIVE) if not hit_pos else None
        if not hit_pos and not hit_neg:
            continue
        weight = (hit_pos or hit_neg)[1]
        sign = 1 if hit_pos else -1
        window = tokens[max(0, i - 3):i]
        negated = any(w in NEGATORS for w in window)
        # Intensifieur avant le terme (« forte hausse ») ou juste après (« chute fortement »)
        for w in window + tokens[i + 1:i + 2]:
            weight *= INTENSIFIERS.get(w, 1.0)
        if negated:
            sign = -sign
        if sign > 0:
            pos += weight
        else:
            neg += weight
        terms.append({"term": tok, "polarity": round(sign * weight, 2), "negated": negated})

    total = pos + neg
    score = 0.0 if total == 0 else (pos - neg) / total
    # Peu de termes = conviction plus faible
    score *= min(1.0, total / 3.0)
    label = "POSITIVE" if score > NEUTRAL_BAND else "NEGATIVE" if score < -NEUTRAL_BAND else "NEUTRAL"
    return {"score": round(score, 3), "label": label, "positive": round(pos, 2), "negative": round(neg, 2),
            "terms": terms[:30], "method": "lexique financier FR/EN avec négation"}


class SentimentRequest(BaseModel):
    text: str = Field(..., min_length=3, max_length=8000)


@router.post("/sentiment")
def sentiment(req: SentimentRequest):
    return analyze(req.text)
