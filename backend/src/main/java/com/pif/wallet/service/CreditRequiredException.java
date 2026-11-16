package com.pif.wallet.service;

/**
 * Le solde ne couvre pas le prix d'entrée, mais un crédit est possible : le joueur doit l'accepter.
 * Le message commence par PREFIX, ce qui permet au frontend de proposer le crédit.
 */
public class CreditRequiredException extends IllegalStateException {

    public static final String PREFIX = "Crédit nécessaire : ";

    public CreditRequiredException(String detail) {
        super(PREFIX + detail);
    }
}
