package com.pif.wallet.controller;

import com.pif.auth.model.User;
import com.pif.wallet.dto.WalletView;
import com.pif.wallet.service.WalletService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Portefeuille global du joueur connecté : solde, dette, crédit disponible, derniers mouvements. */
@RestController
@RequestMapping("/api/v1/wallet")
public class WalletController {

    private final WalletService walletService;

    public WalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    @GetMapping
    public ResponseEntity<WalletView> myWallet(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(walletService.view(user.getId()));
    }
}
