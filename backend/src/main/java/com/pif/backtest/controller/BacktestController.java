package com.pif.backtest.controller;

import com.pif.auth.model.User;
import com.pif.backtest.dto.BacktestRequest;
import com.pif.backtest.dto.BacktestResponse;
import com.pif.backtest.dto.StrategyInfo;
import com.pif.backtest.service.BacktestService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Backtesting et comparaison de stratégies (cahier §3.2) : utilisateurs authentifiés.
 */
@RestController
@RequestMapping("/api/v1/backtest")
public class BacktestController {

    private final BacktestService service;

    public BacktestController(BacktestService service) {
        this.service = service;
    }

    /** Catalogue des stratégies et de leurs paramètres (bornes et valeurs par défaut). */
    @GetMapping("/strategies")
    public ResponseEntity<List<StrategyInfo>> strategies() {
        return ResponseEntity.ok(service.strategies().stream().map(StrategyInfo::from).toList());
    }

    @PostMapping("/run")
    public ResponseEntity<BacktestResponse> run(@AuthenticationPrincipal User user, @Valid @RequestBody BacktestRequest request) {
        return ResponseEntity.ok(service.run(user, request));
    }
}
