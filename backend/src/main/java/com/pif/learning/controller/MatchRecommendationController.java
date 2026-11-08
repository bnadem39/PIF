package com.pif.learning.controller;

import com.pif.auth.model.User;
import com.pif.learning.recommendation.MatchRecommendationDtos.MatchRecommendationView;
import com.pif.learning.recommendation.MatchRecommendationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Cours recommandés à un joueur d'après son résultat dans une salle : utilisateurs authentifiés.
 */
@RestController
@RequestMapping("/api/v1/learning/recommendation")
public class MatchRecommendationController {

    private final MatchRecommendationService service;

    public MatchRecommendationController(MatchRecommendationService service) {
        this.service = service;
    }

    @GetMapping("/{roomId}")
    public ResponseEntity<MatchRecommendationView> recommend(@AuthenticationPrincipal User user, @PathVariable String roomId) {
        return ResponseEntity.ok(service.recommend(user, roomId));
    }
}
