package com.pif.gamification.controller;

import com.pif.auth.model.User;
import com.pif.auth.repository.UserRepository;
import com.pif.gamification.dto.*;
import com.pif.gamification.service.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/gamification")
public class GamificationController {

    private final SeasonService seasonService;
    private final SkillService skillService;
    private final AchievementService achievementService;
    private final CareerService careerService;
    private final CelebrationService celebrationService;
    private final SpectatorService spectatorService;
    private final GamificationEngine gamificationEngine;
    private final UserRepository userRepository;

    public GamificationController(SeasonService seasonService,
                                  SkillService skillService,
                                  AchievementService achievementService,
                                  CareerService careerService,
                                  CelebrationService celebrationService,
                                  SpectatorService spectatorService,
                                  GamificationEngine gamificationEngine,
                                  UserRepository userRepository) {
        this.seasonService = seasonService;
        this.skillService = skillService;
        this.achievementService = achievementService;
        this.careerService = careerService;
        this.celebrationService = celebrationService;
        this.spectatorService = spectatorService;
        this.gamificationEngine = gamificationEngine;
        this.userRepository = userRepository;
    }

    // ─── 1. SEASONS ──────────────────────────────────────────────────────────

    @GetMapping("/seasons/active")
    public ResponseEntity<SeasonDto> getActiveSeason(@AuthenticationPrincipal User user) {
        return seasonService.getActiveSeason(user)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/seasons")
    public ResponseEntity<List<SeasonDto>> getAllSeasons() {
        return ResponseEntity.ok(seasonService.getAllSeasons());
    }

    @PostMapping("/seasons/{id}/finalize")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SeasonDto> finalizeSeason(@PathVariable String id) {
        return ResponseEntity.ok(seasonService.finalizeSeason(id));
    }

    // ─── 2. SKILL TREE ───────────────────────────────────────────────────────

    @GetMapping("/skills")
    public ResponseEntity<List<SkillNodeDto>> getSkillTree(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(skillService.getSkillTreeForUser(user));
    }

    @PostMapping("/skills/{id}/start")
    public ResponseEntity<SkillNodeDto> startSkill(@PathVariable String id,
                                                   @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(skillService.startSkill(id, user));
    }

    @PostMapping("/skills/{id}/unlock")
    public ResponseEntity<SkillNodeDto> unlockSkill(@PathVariable String id,
                                                   @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(skillService.unlockSkill(id, user));
    }

    @PostMapping("/skills/{id}/mastery")
    public ResponseEntity<SkillNodeDto> improveMastery(@PathVariable String id,
                                                      @RequestParam(defaultValue = "INTERMEDIATE") String tier,
                                                      @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(skillService.improveMastery(id, tier, user));
    }

    // ─── 3. ACHIEVEMENTS & TROPHY ROOM ──────────────────────────────────────

    @GetMapping("/achievements")
    public ResponseEntity<List<AchievementDto>> getAchievements(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(achievementService.getAchievementsForUser(user));
    }

    @GetMapping("/achievements/public/{userId}")
    public ResponseEntity<List<AchievementDto>> getPublicTrophies(@PathVariable Long userId) {
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Trader introuvable."));
        return ResponseEntity.ok(achievementService.getPublicTrophyRoom(target));
    }

    @PostMapping("/achievements/{id}/pin")
    public ResponseEntity<AchievementDto> togglePinAchievement(@PathVariable String id,
                                                              @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(achievementService.togglePinTrophy(id, user));
    }

    // ─── 4. TRADER CAREER ───────────────────────────────────────────────────

    @GetMapping("/career")
    public ResponseEntity<PlayerCareerDto> getMyCareer(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(careerService.getCareerDashboard(user));
    }

    @GetMapping("/career/public/{userId}")
    public ResponseEntity<PlayerCareerDto> getPublicCareer(@PathVariable Long userId) {
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Trader introuvable."));
        return ResponseEntity.ok(careerService.getCareerDashboard(target));
    }

    @PostMapping("/career/evaluate")
    public ResponseEntity<Map<String, Object>> evaluateCareerPromotion(@AuthenticationPrincipal User user) {
        boolean promoted = careerService.evaluatePromotion(user);
        return ResponseEntity.ok(Map.of(
                "promoted", promoted,
                "career", careerService.getCareerDashboard(user)
        ));
    }

    // ─── 5. CELEBRATIONS ────────────────────────────────────────────────────

    @GetMapping("/celebrations/pending")
    public ResponseEntity<List<CelebrationEventDto>> getPendingCelebrations(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(celebrationService.getPendingCelebrations(user));
    }

    @PostMapping("/celebrations/{id}/displayed")
    public ResponseEntity<Void> markCelebrationDisplayed(@PathVariable String id) {
        celebrationService.markCelebrationDisplayed(id);
        return ResponseEntity.ok().build();
    }

    // ─── 6. SPECTATOR MODE ──────────────────────────────────────────────────

    @PostMapping("/spectator/{roomId}/join")
    public ResponseEntity<SpectatorSessionDto> joinSpectator(@PathVariable String roomId,
                                                             @AuthenticationPrincipal User user) {
        SpectatorSessionDto session = spectatorService.joinAsSpectator(roomId, user);
        gamificationEngine.onSpectatorWatched(user);
        return ResponseEntity.ok(session);
    }

    @PostMapping("/spectator/{roomId}/leave")
    public ResponseEntity<Void> leaveSpectator(@PathVariable String roomId,
                                              @AuthenticationPrincipal User user) {
        spectatorService.leaveSpectator(roomId, user);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/spectator/{roomId}/count")
    public ResponseEntity<Map<String, Long>> getSpectatorCount(@PathVariable String roomId) {
        long count = spectatorService.getSpectatorCount(roomId);
        return ResponseEntity.ok(Map.of("spectatorsCount", count));
    }

    // ─── 7. ACADEMY INTEGRATION HOOK ────────────────────────────────────────

    @PostMapping("/academy/{courseId}/complete")
    public ResponseEntity<Map<String, Object>> completeAcademyCourse(@PathVariable String courseId,
                                                                    @AuthenticationPrincipal User user) {
        gamificationEngine.onCourseCompleted(user, courseId);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "courseId", courseId,
                "message", "Cours validé avec succès. Compétences et succès synchronisés."
        ));
    }
}

