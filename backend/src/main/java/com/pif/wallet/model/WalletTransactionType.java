package com.pif.wallet.model;

public enum WalletTransactionType {
    /** Prix d'entrée d'une salle, débité du solde. */
    ENTRY,
    /** Crédit accordé pour pouvoir entrer : augmente le solde et la dette. */
    CREDIT,
    /** Capital final récupéré à la fin du match. */
    SETTLEMENT,
    /** Remboursement de la dette, prélevé sur ce qui est récupéré. */
    REPAYMENT
}
