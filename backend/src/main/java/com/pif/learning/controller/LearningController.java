package com.pif.learning.controller;

import com.pif.auth.model.User;
import com.pif.learning.dto.LearningDtos.*;
import com.pif.learning.service.LearningService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Formation et gamification (cahier §3.3) : utilisateurs authentifiés.
 */
@RestController
@RequestMapping("/api/v1/learning")
public class LearningController {

    private static final int MAX_LEADERBOARD = 50;

    private final LearningService service;

    public LearningController(LearningService service) {
        this.service = service;
    }

    /** Modules, scénarios et défis avec la progression de l'utilisateur. */
    @GetMapping("/catalog")
    public ResponseEntity<CatalogView> catalog(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(service.catalog(user));
    }

    @GetMapping("/lessons/{id}")
    public ResponseEntity<LessonView> lesson(@AuthenticationPrincipal User user, @PathVariable String id) {
        return ResponseEntity.ok(service.lesson(user, id));
    }

    @PostMapping("/lessons/{id}/complete")
    public ResponseEntity<ProgressView> completeLesson(@AuthenticationPrincipal User user, @PathVariable String id) {
        return ResponseEntity.ok(service.completeLesson(user, id));
    }

    /** Questions sans les réponses : la correction se fait à la soumission. */
    @GetMapping("/quizzes/{id}")
    public ResponseEntity<QuizView> quiz(@AuthenticationPrincipal User user, @PathVariable String id) {
        return ResponseEntity.ok(service.quiz(user, id));
    }

    @PostMapping("/quizzes/{id}/submit")
    public ResponseEntity<QuizResult> submitQuiz(@AuthenticationPrincipal User user, @PathVariable String id,
                                                 @Valid @RequestBody QuizSubmission submission) {
        return ResponseEntity.ok(service.submitQuiz(user, id, submission));
    }

    /** Historique jusqu'à la date de décision ; la suite n'est révélée qu'après la réponse. */
    @GetMapping("/scenarios/{id}")
    public ResponseEntity<ScenarioView> scenario(@AuthenticationPrincipal User user, @PathVariable String id) {
        return ResponseEntity.ok(service.scenario(user, id));
    }

    @PostMapping("/scenarios/{id}/answer")
    public ResponseEntity<ScenarioView> answerScenario(@AuthenticationPrincipal User user, @PathVariable String id,
                                                       @Valid @RequestBody ScenarioAnswer answer) {
        return ResponseEntity.ok(service.answerScenario(user, id, answer));
    }

    @PostMapping("/challenges/{id}/submit")
    public ResponseEntity<ChallengeResult> submitChallenge(@AuthenticationPrincipal User user, @PathVariable String id,
                                                           @Valid @RequestBody ChallengeSubmission submission) {
        return ResponseEntity.ok(service.submitChallenge(user, id, submission));
    }

    @GetMapping("/progress")
    public ResponseEntity<ProgressView> progress(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(service.progress(user));
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<List<LeaderboardEntry>> leaderboard(@AuthenticationPrincipal User user,
                                                              @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(service.leaderboard(user, Math.max(1, Math.min(limit, MAX_LEADERBOARD))));
    }
}
