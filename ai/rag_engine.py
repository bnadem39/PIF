"""
????????????????????????????????????????????????????????????????????????????????
?               RAG ENGINE ? Pipeline de Recherche Documentaire               ?
?  Bale III ? LCR ? Banque Islamique ? Murabaha ? Mudaraba ? Charia           ?
?  Embeddings: all-MiniLM-L6-v2 ? Vector Store: ChromaDB / FAISS             ?
????????????????????????????????????????????????????????????????????????????????
"""

import gc
import hashlib
import json
import logging
import os
import re
from pathlib import Path
from typing import List, Dict, Optional
import numpy as np

# Embeddings
from sentence_transformers import SentenceTransformer

# Vector DB ? on essaie ChromaDB d abord, FAISS en fallback
try:
    import chromadb
    from chromadb.config import Settings
    USE_CHROMADB = True
except ImportError:
    USE_CHROMADB = False
    import faiss

AI_DIR    = Path(__file__).parent
RAG_DIR   = AI_DIR / "rag_docs"
VDB_DIR   = AI_DIR / "chroma_db"
LOGS_DIR  = AI_DIR / "logs"
RAG_DIR.mkdir(exist_ok=True)
VDB_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOGS_DIR / "rag_engine.log", mode="w", encoding="utf-8"),
    ],
)
log = logging.getLogger(__name__)

EMBEDDING_MODEL = "all-MiniLM-L6-v2"
CHUNK_SIZE      = 500   # fragments de 500 caractères
CHUNK_OVERLAP   = 50    # chevauchement de 50 caractères
TOP_K_RESULTS   = 5     # nb extraits retournes par requete


# ????????????????????????????????????????????????????????????????????????????
#  CORPUS DOCUMENTAIRE ? Textes reglementaires embarques
# ????????????????????????????????????????????????????????????????????????????
# Ces textes sont integres directement dans le code pour garantir la disponibilite
# hors-ligne. Ils peuvent etre etendus avec de vrais PDFs.

REFERENCE_DOCUMENTS = [
    {
        "id":     "baselIII_lcr",
        "title":  "Bale III - Ratio de Liquidite a Court Terme (LCR)",
        "source": "BCBS Basel III Framework",
        "domain": "banking_islamic",
        "tags":   ["bale3", "liquidite", "lcr", "banque_conventionnelle"],
        "text": """
Bale III ? Ratio de Liquidite a Court Terme (LCR)

Le Comite de Bale sur le controle bancaire (BCBS) a introduit le LCR (Liquidity Coverage Ratio)
dans le cadre de Bale III pour renforcer la resilience des banques a court terme.

Definition : LCR = Actifs liquides de haute qualite (HQLA) / Sorties nettes de tresorerie sur 30 jours >= 100%

Actifs HQLA de Niveau 1 (sans decote) :
- Reserves de banque centrale (billet de banque, pieces)
- Titres souverains ou garantis par l Etat avec 0% ponderation de risque
- Reserves excedentaires deposees aupres de la banque centrale

Actifs HQLA de Niveau 2A (decote de 15%) :
- Titres souverains/garantis avec ponderation de risque 20%
- Obligations d entreprises de haute qualite (AA- et plus)
- Obligations s?curis?es (covered bonds) de haute qualite

Actifs HQLA de Niveau 2B (decote 25-50%) :
- Actions incluses dans les principaux indices
- Obligations d entreprises de qualite A+ a BBB-
- RMBS de qualite superieure

Sorties de tresorerie :
- Retraits de depots de detail : 3-10% selon la stabilite
- Retrait de depots wholesale non garantis : 25-100%
- Engagements hors-bilan et lignes de credit confirmees

Le LCR est entre en vigueur progressivement depuis 2015 et est obligatoire a 100% depuis 2019.

Implications pour la gestion du risque :
Une banque dont le LCR est inferieur a 100% doit immediatement renforcer son coussin de liquidite.
Les stress tests doivent simuler un scenario combine : retrait massif des depots + fermeture des marches.
        """,
    },
    {
        "id":     "baselIII_nsfr",
        "title":  "Bale III - Ratio de Financement Stable Net (NSFR)",
        "source": "BCBS Basel III Framework",
        "domain": "banking_islamic",
        "tags":   ["bale3", "financement", "nsfr", "banque_conventionnelle"],
        "text": """
Bale III ? Ratio de Financement Stable Net (NSFR)

Le NSFR (Net Stable Funding Ratio) mesure la stabilite structurelle du bilan a un horizon d un an.

Definition : NSFR = Financement Stable Disponible (ASF) / Financement Stable Requis (RSF) >= 100%

Financement Stable Disponible (ASF) :
- Fonds propres Tier 1 et Tier 2 : ponderation 100%
- Emprunts a long terme (> 1 an) : ponderation 100%
- Depots de detail stables : ponderation 95%
- Depots de retail moins stables : ponderation 90%
- Depots institutionnels (1-6 mois) : ponderation 50%
- Financement a court terme (<6 mois) : ponderation 0-50%

Financement Stable Requis (RSF) :
- Credits hypothecaires de haute qualite (> 1 an) : 65%
- Credits corporates (> 1 an) : 65%
- Credits a la clientele de detail (> 1 an) : 85%
- HQLA Niveau 1 : 0-5%
- HQLA Niveau 2 : 15-50%
- Actifs hors-bilan (lignes de credit) : 5-10%

Entree en vigueur : 1er janvier 2018

Implications pratiques :
Les banques doivent allonger la maturite de leur passif et diversifier leurs sources de financement.
Une dependance excessive au financement a court terme (repo, commercial paper) fragilise le NSFR.
        """,
    },
    {
        "id":     "baselIII_capital",
        "title":  "Bale III - Ratios de Fonds Propres et Coussins de Capital",
        "source": "BCBS Basel III Framework",
        "domain": "banking_islamic",
        "tags":   ["bale3", "capital", "tier1", "tier2", "banque_conventionnelle"],
        "text": """
Bale III ? Exigences de Fonds Propres

Structure des fonds propres reglementaires :

Tier 1 (CET1 ? Common Equity Tier 1) :
- Actions ordinaires et primes d emission
- Benefices non distribues et reserves
- Autres elements du resultat global accumule (AOCI)
Exigence minimale CET1 : 4.5% des RWA (Risk-Weighted Assets)

Additional Tier 1 (AT1) :
- Instruments absorbers de pertes (obligations convertibles contingentes)
Exigence AT1 : 1.5% des RWA

Tier 2 :
- Instruments de dette subordonnee (maturite > 5 ans)
- Provisions generales
Exigence T2 : 2% des RWA

Coussins de conservation :
- Coussin de conservation du capital : 2.5% CET1 supplementaire
- Coussin contracyclique : 0-2.5% selon le cycle economique

Ratio de levier (Leverage Ratio) :
- Tier 1 / Exposition totale >= 3%
- Objectif : limiter l effet de levier excessif independamment de la ponderation des risques

Ratio de solvabilite global : CET1 + AT1 + T2 >= 8% des RWA
Avec coussin de conservation : >= 10.5%
        """,
    },
    {
        "id":     "islamic_murabaha",
        "title":  "Banque Islamique - Contrat Murabaha et Risques Associes",
        "source": "AAOIFI & Islamic Finance Standards",
        "tags":   ["banque_islamique", "murabaha", "charia", "risque"],
        "text": """
Banque Islamique ? Contrat Murabaha

Definition :
Le Murabaha est un contrat de vente a cout-plus-profit (cost-plus-profit) dans lequel la banque
achete un actif pour le compte du client, puis le lui revend a un prix majore d une marge connue.

Mecanisme :
1. Le client identifie l actif qu il souhaite acquerir (voiture, bien immobilier, matiere premiere)
2. La banque achete l actif aupres du fournisseur
3. La banque revend l actif au client a un prix = cout + marge + frais
4. Le client rembourse en versements echelonnes (sans interets ? taux d interet interdit en Islam)

Caracteristiques cles :
- Le profit de la banque est fixe des le debut du contrat (pas de taux variable)
- La banque assume brievement le risque de propriete (risque de possession)
- Largement utilise pour le financement a court terme et les achats de commodites

Risques specifiques au Murabaha :
1. Risque de contrepartie : le client peut refuser l actif apres achat par la banque
2. Risque de marche : fluctuation de prix de l actif entre achat et revente
3. Risque de conformite charia (Sharia Compliance Risk) : validation par le Sharia Supervisory Board (SSB)
4. Risque de concentration : sur-exposition a un seul type d actif
5. Risque operationnel : complexite juridique des doubles transferts de propriete

Traitement reglementaire (IFSB/AAOIFI) :
- Le risque de credit est calcule sur le montant de creances Murabaha
- Les pond?rations de risque sont alignees sur Bale III mais avec des ajustements pour le risque charia
- Divulgation obligatoire des fatwas approuvant les produits

Difference avec la banque conventionnelle :
- Pas d interet (riba interdit) : profit fixe et transparent
- La banque prend possession physique ou constructive de l actif
- Validation Sharia obligatoire pour chaque nouveau produit
        """,
    },
    {
        "id":     "islamic_mudaraba",
        "title":  "Banque Islamique - Contrat Mudaraba et Partage Profits/Pertes",
        "source": "AAOIFI & Islamic Finance Standards",
        "tags":   ["banque_islamique", "mudaraba", "partage_profits", "charia", "risque"],
        "text": """
Banque Islamique ? Contrat Mudaraba (Partage des Profits et des Pertes)

Definition :
Le Mudaraba est un partenariat entre un fournisseur de capital (rab al-mal = la banque ou investisseur)
et un entrepreneur (mudarib = gestionnaire) ou des profits sont partages selon une cle convenue.

Structure :
- Rab al-mal : apporte 100% du capital financier
- Mudarib : apporte son expertise, son temps et sa gestion
- Profits : partages selon un ratio pre-defini (ex: 60/40 ou 70/30)
- Pertes : supportees UNIQUEMENT par le rab al-mal (sauf negligence grave du mudarib)

Types :
1. Mudaraba simple : pour un projet specifique
2. Mudaraba continue : les profits reinvestis dans d autres projets

Utilisation typique :
- Depots bancaires islamiques (Savings Account)
- Fonds d investissement islamiques
- Financement de projets agricoles ou commerciaux

Risques specifiques au Mudaraba :
1. Risque de perte en capital (rab al-mal supporte tout) : risque principal
2. Risque d asymetrie d information (moral hazard) : difficulte a surveiller le mudarib
3. Risque de conformite charia : le mudarib ne peut pas investir dans des secteurs haram
4. Risque de sortie : liquidite limitee (investissement bloque jusqu a echeance)
5. Risque de dilution : nouveaux investisseurs peuvent modifier la cle de partage

Evaluation du risque (IFSB Standard 1) :
- Pour les depots Mudaraba : ponderation de risque specifique selon la qualite du sous-jacent
- Inclusion dans les Profit Sharing Investment Accounts (PSIA) soumis a des regles speciales
- Le risque de retrait (IAH ? Investment Account Holders) doit etre gere par des reserves (PER/IRR)

Reserves de regularisation islamiques :
- PER (Profit Equalization Reserve) : lisse les rendements payes aux deposants
- IRR (Investment Risk Reserve) : coussin contre les pertes d investissement
        """,
    },
    {
        "id":     "islamic_risk_management",
        "title":  "Gestion des Risques en Banque Islamique ? Vue Generale",
        "source": "IFSB Standards & AAOIFI Governance Standards",
        "tags":   ["banque_islamique", "gestion_risque", "ifsb", "aaoifi"],
        "text": """
Gestion des Risques en Banque Islamique

Specificites par rapport aux banques conventionnelles :

1. RISQUE CHARIA (Sharia Non-Compliance Risk) :
   - Risque qu une transaction soit jugee non-conforme a posteriori
   - Consequence : annulation du contrat, manque a gagner, atteinte a la reputation
   - Mitigation : Sharia Supervisory Board (SSB) independant, revisions periodiques

2. RISQUE D EQUITE (Equity Investment Risk) :
   - Lies aux contrats Musharaka et Mudaraba (participation en capital)
   - La banque partage les pertes ? risque de perte en capital plus eleve
   - Mitigation : diversification, limites d exposition par secteur

3. RISQUE DE TAUX DE RENDEMENT (Rate of Return Risk) :
   - Equivalent du risque de taux d interet pour les banques islamiques
   - Si le taux de rendement des actifs baisse, les deposants peuvent partir
   - Mitigation : utilisation de benchmarks (LIBOR/SOFR comme reference, non comme taux)

4. RISQUE DE DEPLACEMENT COMMERCIAL :
   - Pression a distribuer des rendements competitifs meme si les profits sont faibles
   - Consequence : sacrifice des profits actionnaires pour retenir les deposants IAH
   - Instrument de gestion : PER (Profit Equalization Reserve)

5. RISQUE DE LIQUIDITE SPECIFIQUE :
   - Marche monetaire islamique moins developpe
   - Instruments de refinancement limites (pas de prise en pension standard)
   - Solutions : Commodity Murabaha (Tawarruq), Sukuk liquides

Cadre reglementaire :
- IFSB-1 : Principes directeurs de gestion des risques pour les IIFS
- IFSB-15 : Capital adequacy pour les IIFS expositions au Sukuk, Securitisation et REIT
- AAOIFI : Standards comptables et d audit pour institutions financieres islamiques

Comparaison risque conventionnel vs islamique :
| Risque           | Banque Classique      | Banque Islamique          |
|------------------|-----------------------|---------------------------|
| Credit           | Interet + principal   | Profit + remboursement    |
| Marche           | Taux d interet        | Taux de rendement         |
| Liquidite        | LCR/NSFR Bale III     | LCR adapte IFSB           |
| Operationnel     | Processus IT/humain   | + Compliance Charia       |
| Reputation       | Ethique generale      | Conformite charia pub.    |
        """,
    },
    {
        "id":     "stress_testing",
        "title":  "Stress Testing et Scenarios de Crise Bancaire",
        "source": "EBA & BCBS Stress Testing Guidelines",
        "tags":   ["stress_test", "scenario", "risque", "banque_conventionnelle"],
        "text": """
Stress Testing Bancaire ? Methodologie et Scenarios

Definition :
Le stress testing evalue la resilience d une banque face a des scenarios economiques adverses.
Il s agit d un outil fondamental de gestion des risques et d exigence reglementaire (Pilier 2 Bale III).

Types de stress tests :
1. Tests de sensibilite : impact d un seul facteur de risque (choc de taux +200bp)
2. Tests de scenario : combinaison coherente de chocs sur plusieurs facteurs
3. Tests inverses (reverse stress test) : identifer les scenarios causant la faillite

Scenarios types utilises par la BCE/EBA :
Scenario Adverse :
- PIB : -4% sur 2 ans
- Chomage : +4 points de pourcentage
- Immobilier residentiel : -21%
- Actions : -30%
- Spreads credit souverains : +100-300bp selon pays

Scenario Extreme :
- Crise de liquidite : tarissement total des marches de financement
- Retrait massif de depots (bank run) : 20-30% en 1 semaine
- Defaut d un grand souverain europeen

Methodologie de calcul de l impact :
1. Capital Impact = Provisions supplementaires sur expositions credit
2. Income Impact = Reduction des revenus nets d interet (choc de taux)
3. Market Risk Impact = Pertes MTM sur portefeuille trading

Reporting reglementaire :
- ICAAP (Internal Capital Adequacy Assessment Process) ? annuel
- ILAAP (Internal Liquidity Adequacy Assessment Process) ? annuel
- EU-wide Stress Test EBA ? biennal pour les grandes banques
        """,
    },
]


# ????????????????????????????????????????????????????????????????????????????
#  TEXT CHUNKING
# ????????????????????????????????????????????????????????????????????????????

def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """Decoupe un texte en chunks avec chevauchement."""
    text = re.sub(r'\s+', ' ', text.strip())
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        # Essayer de couper sur un espace pour ne pas couper les mots
        if end < len(text):
            last_space = text.rfind(' ', start, end)
            if last_space > start:
                end = last_space
        chunks.append(text[start:end].strip())
        start = end - overlap if end - overlap > start else end
    return [c for c in chunks if len(c) > 20]
def load_documents_from_folder(folder_path: Path = RAG_DIR) -> List[Dict]:
    """Charge automatiquement les documents (.txt, .md, .pdf) du dossier rag_docs."""
    loaded_docs = []
    if not folder_path.exists():
        return loaded_docs

    for file_path in sorted(folder_path.glob("*.*")):
        if file_path.suffix.lower() not in [".txt", ".md", ".pdf"]:
            continue

        text_content = ""
        if file_path.suffix.lower() in [".txt", ".md"]:
            try:
                text_content = file_path.read_text(encoding="utf-8", errors="replace")
            except Exception as e:
                log.warning(f"[RAG_DOCS] Erreur lecture {file_path.name}: {e}")
                continue
        elif file_path.suffix.lower() == ".pdf":
            try:
                import pypdf
                reader = pypdf.PdfReader(str(file_path))
                text_content = "\n".join([page.extract_text() or "" for page in reader.pages])
            except ImportError:
                log.warning(f"[RAG_DOCS] pypdf non installe, PDF {file_path.name} ignore")
                continue
            except Exception as e:
                log.warning(f"[RAG_DOCS] Erreur lecture PDF {file_path.name}: {e}")
                continue

        if not text_content.strip():
            continue

        # Extraction des metadonnees
        doc_id = file_path.stem
        title = file_path.stem.replace("_", " ").title()
        source = f"rag_docs/{file_path.name}"
        tags = []
        domain = None

        # Fichiers explicitement segmentés par mission
        MARKET_DOCS = {
            "bct_politique_monetaire_tmm",
            "bct_rapport_stabilite_financiere",
            "bvmt_conjoncture_marche_financier",
            "macro_economie_internationale_inflation",
        }
        BANKING_ISLAMIC_DOCS = {
            "basel3_capital_adequacy",
            "basel3_lcr_liquidity",
            "basel3_market_risk_frtb",
            "basel3_nsfr_funding",
            "ifsb_risk_management_framework",
            "islamic_finance_mudaraba",
            "islamic_finance_murabaha",
            "islamic_finance_musharaka_sukuk",
            "stress_testing_methodology",
        }

        stem_lower = file_path.stem.lower()

        # 1. Classification stricte et prioritaire par mission
        if stem_lower in MARKET_DOCS:
            domain = "market"
        elif stem_lower in BANKING_ISLAMIC_DOCS:
            domain = "banking_islamic"

        # 2. Parser les en-tetes types "# Source: ...", "# Tags: ...", "# Domain: ..."
        for line in text_content.splitlines()[:20]:
            clean_l = line.strip().lstrip("#").strip()
            if clean_l.lower().startswith("source:"):
                source = clean_l.split(":", 1)[1].strip()
            elif clean_l.lower().startswith("tags:"):
                tags = [t.strip() for t in clean_l.split(":", 1)[1].split(",") if t.strip()]
            elif clean_l.lower().startswith("domain:") and not domain:
                raw_dom = clean_l.split(":", 1)[1].strip().lower()
                if "market" in raw_dom and "banking" not in raw_dom:
                    domain = "market"
                elif "islamic" in raw_dom or "banking" in raw_dom:
                    domain = "banking_islamic"

        # 3. Fallback si toujours indéterminé
        if not domain:
            if any(k in stem_lower for k in ["bct", "bvmt", "inflation", "macro", "trading"]):
                domain = "market"
            else:
                domain = "banking_islamic"

        if not tags:
            if "basel" in stem_lower or "bale" in stem_lower:
                tags.extend(["bale3", "banque_conventionnelle"])
            if "islamic" in stem_lower or "ifsb" in stem_lower or "murabaha" in stem_lower or "mudaraba" in stem_lower:
                tags.extend(["banque_islamique", "charia"])
            if "stress" in stem_lower:
                tags.extend(["stress_test", "risque"])
            if domain == "market":
                tags.extend(["market", "macro", "trading"])

        loaded_docs.append({
            "id": doc_id,
            "title": title,
            "source": source,
            "tags": tags,
            "domain": domain,
            "text": text_content,
        })
        log.info(f"[RAG_DOCS] Charge document : {file_path.name} (domaine={domain}, {len(text_content)} car.)")

    return loaded_docs


def prepare_documents(docs: List[Dict]) -> List[Dict]:
    """Decoupe tous les documents en chunks annotés avec domaine."""
    prepared = []
    for doc in docs:
        chunks = chunk_text(doc["text"])
        domain = doc.get("domain", "banking_islamic")
        for i, chunk in enumerate(chunks):
            prepared.append({
                "id":      f"{doc['id']}_chunk_{i}",
                "text":    chunk,
                "title":   doc["title"],
                "source":  doc["source"],
                "tags":    doc["tags"],
                "domain":  domain,
                "doc_id":  doc["id"],
                "chunk_n": i,
            })
    log.info(f"[PREP] {len(prepared)} chunks prepares depuis {len(docs)} documents")
    return prepared


# ????????????????????????????????????????????????????????????????????????????
#  EMBEDDING ENGINE
# ????????????????????????????????????????????????????????????????????????????

class EmbeddingEngine:
    """Gestionnaire d embeddings avec all-MiniLM-L6-v2 (leger et rapide)."""

    def __init__(self, model_name: str = EMBEDDING_MODEL):
        log.info(f"[EMBED] Chargement du modele : {model_name}")
        self.model = SentenceTransformer(model_name, device="cpu")
        self.dim = self.model.get_sentence_embedding_dimension()
        log.info(f"[EMBED] Modele charge. Dimension : {self.dim}")

    def encode(self, texts: List[str], batch_size: int = 32) -> np.ndarray:
        """Encode une liste de textes en vecteurs float32."""
        embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=len(texts) > 50,
            normalize_embeddings=True,  # cosine similarity
            convert_to_numpy=True,
        )
        return embeddings.astype("float32")

    def encode_query(self, query: str) -> np.ndarray:
        """Encode une seule requete."""
        return self.encode([query])[0]


# ????????????????????????????????????????????????????????????????????????????
#  VECTOR STORE ? ChromaDB ou FAISS
# ????????????????????????????????????????????????????????????????????????????

class VectorStore:
    """
    Abstraction du vector store.
    Utilise ChromaDB si disponible, sinon FAISS + metadata JSON.
    """

    def __init__(self, embed_engine: EmbeddingEngine, persist_dir: Path = VDB_DIR):
        self.engine     = embed_engine
        self.persist_dir = persist_dir
        self._chunks    = []
        self._metadata  = []
        self._index     = None  # FAISS index
        self._chroma_col = None  # ChromaDB collection

        if USE_CHROMADB:
            log.info("[VDB] Backend : ChromaDB")
            self._client = chromadb.PersistentClient(
                path=str(persist_dir),
                settings=Settings(anonymized_telemetry=False),
            )
            self._chroma_col = self._client.get_or_create_collection(
                name="pif_rag",
                metadata={"hnsw:space": "cosine"},
            )
        else:
            log.info("[VDB] Backend : FAISS (in-memory)")
            self._faiss_meta_path = persist_dir / "faiss_metadata.json"

    def index_documents(self, chunks: List[Dict]):
        """Indexe tous les chunks dans le vector store avec métadonnées de segmentation."""
        log.info(f"[VDB] Indexation de {len(chunks)} chunks...")
        texts = [c["text"] for c in chunks]
        embeddings = self.engine.encode(texts)

        if USE_CHROMADB:
            ids = [c["id"] for c in chunks]
            metadatas = [
                {
                    "title": c["title"],
                    "source": c["source"],
                    "domain": c.get("domain", "banking_islamic"),
                    "tags": ",".join(c["tags"]),
                    "doc_id": c["doc_id"],
                    "chunk_n": str(c["chunk_n"]),
                }
                for c in chunks
            ]
            # Upsert par batch
            batch = 100
            for i in range(0, len(chunks), batch):
                self._chroma_col.upsert(
                    ids=ids[i:i+batch],
                    embeddings=embeddings[i:i+batch].tolist(),
                    documents=texts[i:i+batch],
                    metadatas=metadatas[i:i+batch],
                )
        else:
            # FAISS
            self._chunks   = chunks
            self._embeddings = embeddings
            dim = self.engine.dim
            self._index = faiss.IndexFlatIP(dim)  # Inner Product = cosine si normalise
            self._index.add(embeddings)
            # Sauvegarder metadata
            with open(self._faiss_meta_path, "w", encoding="utf-8") as f:
                json.dump(chunks, f, ensure_ascii=False, indent=2)
            faiss.write_index(self._index, str(self.persist_dir / "faiss.index"))

        log.info(f"[VDB] {len(chunks)} chunks indexes avec succes")
        gc.collect()

    def search(
        self,
        query: str,
        top_k: int = TOP_K_RESULTS,
        filter_tags: Optional[List[str]] = None,
        domain_filter: Optional[str] = None,
    ) -> List[Dict]:
        """
        Recherche sémantique dans la base vectorielle avec filtrage par domaine et tags.
        Supporte where={"domain": domain_filter} dans ChromaDB.
        """
        q_vec = self.engine.encode_query(query)

        if USE_CHROMADB:
            where_clause = None
            if domain_filter:
                where_clause = {"domain": domain_filter}

            results = self._chroma_col.query(
                query_embeddings=[q_vec.tolist()],
                n_results=min(max(top_k * 4, 10), max(1, self._chroma_col.count())),
                where=where_clause,
                include=["documents", "metadatas", "distances"],
            )
            hits = []
            if results and results.get("documents") and len(results["documents"]) > 0:
                for doc, meta, dist in zip(
                    results["documents"][0],
                    results["metadatas"][0],
                    results["distances"][0],
                ):
                    meta_domain = meta.get("domain", "")
                    if domain_filter and meta_domain != domain_filter:
                        continue
                    tags = meta.get("tags", "").split(",")
                    if filter_tags and not any(t in tags for t in filter_tags):
                        continue
                    hits.append({
                        "text":    doc,
                        "title":   meta.get("title"),
                        "source":  meta.get("source"),
                        "domain":  meta_domain,
                        "tags":    tags,
                        "score":   1.0 - float(dist),  # distance cosine -> similarite
                    })
                    if len(hits) >= top_k:
                        break
        else:
            if self._index is None:
                self._load_faiss()
            q_vec_2d = q_vec.reshape(1, -1)
            scores, indices = self._index.search(q_vec_2d, top_k * 4)
            hits = []
            for score, idx in zip(scores[0], indices[0]):
                if idx < 0:
                    continue
                chunk = self._chunks[idx]
                chunk_domain = chunk.get("domain", "")
                if domain_filter and chunk_domain != domain_filter:
                    continue
                tags = chunk.get("tags", [])
                if filter_tags and not any(t in tags for t in filter_tags):
                    continue
                hits.append({
                    "text":   chunk["text"],
                    "title":  chunk["title"],
                    "source": chunk["source"],
                    "domain": chunk_domain,
                    "tags":   tags,
                    "score":  float(score),
                })
                if len(hits) >= top_k:
                    break

        return hits

    def _load_faiss(self):
        idx_path  = self.persist_dir / "faiss.index"
        meta_path = self._faiss_meta_path
        if idx_path.exists() and meta_path.exists():
            self._index = faiss.read_index(str(idx_path))
            with open(meta_path, encoding="utf-8") as f:
                self._chunks = json.load(f)
            log.info(f"[VDB] Index FAISS charge : {self._index.ntotal} vecteurs")
        else:
            raise FileNotFoundError("Index FAISS non trouve. Executez build_index() d abord.")


# ????????????????????????????????????????????????????????????????????????????
#  RAG ENGINE ? Interface principale
# ????????????????????????????????????????????????????????????????????????????

class RAGEngine:
    """
    Moteur RAG complet et segmenté :
    - Indexation automatique des corpus 'market' et 'banking_islamic'
    - Recherche sémantique avec filtrage strict par domaine
    - Formatage du contexte pour injection ciblée dans FinGPT
    """

    def __init__(self):
        self.embed_engine = EmbeddingEngine(EMBEDDING_MODEL)
        self.vector_store = VectorStore(self.embed_engine)
        self._indexed     = False

    def build_index(self, documents: Optional[List[Dict]] = None):
        """Construit et persiste l index vectoriel."""
        if documents is None:
            folder_docs = load_documents_from_folder(RAG_DIR)
            if folder_docs:
                log.info(f"[RAG] {len(folder_docs)} documents charges depuis {RAG_DIR}")
                existing_ids = {d["id"] for d in folder_docs}
                combined = folder_docs + [d for d in REFERENCE_DOCUMENTS if d["id"] not in existing_ids]
                documents = combined
            else:
                documents = REFERENCE_DOCUMENTS

        chunks = prepare_documents(documents)
        self.vector_store.index_documents(chunks)
        self._indexed = True
        log.info("[RAG] Index construit et pret avec segmentation par domaine")

    def _ensure_index(self):
        if not self._indexed:
            if USE_CHROMADB:
                count = self.vector_store._chroma_col.count()
                if count > 0:
                    self._indexed = True
                    log.info(f"[RAG] Index existant charge ({count} chunks)")
                    return
            self.build_index()

    def retrieve(
        self,
        query: str,
        top_k: int = TOP_K_RESULTS,
        bank_type: str = "all",  # "conventional", "islamic", "market", ou "all"
        domain_filter: Optional[str] = None,
    ) -> List[Dict]:
        """
        Recupere les extraits les plus pertinents selon la requete.
        bank_type et domain_filter permettent une sélection documentaire ciblée.
        """
        self._ensure_index()

        # Résolution du domain_filter si non explicitement fourni
        if not domain_filter:
            if bank_type in ["market", "trading"]:
                domain_filter = "market"
            elif bank_type in ["islamic", "banking_islamic", "stress_test"]:
                domain_filter = "banking_islamic"

        filter_tags = None
        if bank_type == "conventional":
            filter_tags = ["banque_conventionnelle", "bale3"]
        elif bank_type == "islamic":
            filter_tags = ["banque_islamique", "charia"]

        results = self.vector_store.search(
            query,
            top_k=top_k,
            filter_tags=filter_tags,
            domain_filter=domain_filter,
        )
        log.info(f"[RAG] Requete : '{query[:60]}...' (domaine={domain_filter}) ? {len(results)} resultats")
        return results

    def retrieve_market(self, query: str, top_k: int = TOP_K_RESULTS) -> List[Dict]:
        """
        Récupération strictement ciblée sur le domaine Marché & Trading (BCT, TMM, BVMT, Macro).
        Exclut catégoriquement la finance islamique et les normes prudentielles hors-sujet.
        """
        return self.retrieve(query, top_k=top_k, domain_filter="market")

    def retrieve_banking_islamic(self, query: str, top_k: int = TOP_K_RESULTS, bank_type: str = "islamic") -> List[Dict]:
        """
        Récupération dédiée aux normes bancaires, stress-testing et finance islamique (Bâle III, IFSB, AAOIFI).
        """
        return self.retrieve(query, top_k=top_k, bank_type=bank_type, domain_filter="banking_islamic")

    def format_context(self, results: List[Dict], max_chars: int = 3000) -> str:
        """Formate les resultats RAG pour injection dans le prompt LLM."""
        if not results:
            return "Aucun extrait reglementaire ou documentaire pertinent trouve."

        context_parts = ["=== EXTRAITS DOCUMENTAIRES PERTINENTS ===\n"]
        total_chars = 0

        for i, r in enumerate(results, 1):
            dom_str = f" [Domaine: {r.get('domain', 'N/A')}]" if r.get('domain') else ""
            header = f"[{i}] {r['title']} (Source: {r['source']}){dom_str} — Score: {r['score']:.3f}\n"
            body   = r["text"]
            entry  = f"{header}{body}\n{'─'*60}\n"
            if total_chars + len(entry) > max_chars:
                break
            context_parts.append(entry)
            total_chars += len(entry)

        return "\n".join(context_parts)

    def query(
        self,
        question: str,
        bank_type: str = "all",
        top_k: int = TOP_K_RESULTS,
        domain_filter: Optional[str] = None,
    ) -> str:
        """
        Methode principale : requete libre ? contexte formate pour le LLM.
        """
        results = self.retrieve(question, top_k=top_k, bank_type=bank_type, domain_filter=domain_filter)
        return self.format_context(results)

    def query_market_context(
        self,
        query: str,
        simulation_date: Optional[str] = None,
        bank_type: str = "conventional",
        top_k: int = TOP_K_RESULTS,
    ) -> str:
        """
        Extrait un contexte strictement filtré sur le domaine de marché (BCT, BVMT, Macro)
        sans aucune pollution par les contrats islamiques ou stress tests non pertinents.
        """
        year = None
        if simulation_date:
            try:
                year = int(str(simulation_date)[:4])
            except (ValueError, TypeError):
                year = None

        macro_query = f"{query} BCT TMM inflation politique monétaire BVMT {year if year else ''}"
        market_results = self.retrieve_market(macro_query, top_k=top_k)
        return self.format_context(market_results)


# ????????????????????????????????????????????????????????????????????????????
#  SINGLETON ? Instance globale
# ????????????????????????????????????????????????????????????????????????????

_rag_instance: Optional[RAGEngine] = None


def get_rag_engine() -> RAGEngine:
    """Retourne l instance globale du RAGEngine (singleton)."""
    global _rag_instance
    if _rag_instance is None:
        _rag_instance = RAGEngine()
        _rag_instance.build_index()
    return _rag_instance


# ????????????????????????????????????????????????????????????????????????????
#  POINT D ENTREE
# ????????????????????????????????????????????????????????????????????????????

if __name__ == "__main__":
    engine = get_rag_engine()

    test_queries = [
        ("Quel est le ratio LCR minimum exige par Bale III?", "conventional"),
        ("Quels sont les risques specifiques du contrat Murabaha?", "islamic"),
        ("Comment calculer le NSFR?", "conventional"),
        ("Difference entre Mudaraba et Musharaka en termes de risques", "islamic"),
        ("Stress test scenario adverse BCE", "all"),
    ]

    for query, bank_type in test_queries:
        print(f"\n{'='*70}")
        print(f"QUERY [{bank_type}] : {query}")
        print("="*70)
        context = engine.query(query, bank_type=bank_type, top_k=3)
        try:
            print(context[:800] + "..." if len(context) > 800 else context)
        except UnicodeEncodeError:
            print((context[:800] + "...").encode("ascii", "replace").decode("ascii"))