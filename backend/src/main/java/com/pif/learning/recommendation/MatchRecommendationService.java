package com.pif.learning.recommendation;

import com.pif.auth.model.User;
import com.pif.learning.catalog.LearningCatalog;
import com.pif.learning.model.ItemType;
import com.pif.learning.model.LearningProgress;
import com.pif.learning.recommendation.MatchRecommendationDtos.Item;
import com.pif.learning.recommendation.MatchRecommendationDtos.MatchRecommendationView;
import com.pif.learning.recommendation.MatchRecommendationDtos.Summary;
import com.pif.learning.repository.LearningProgressRepository;
import com.pif.multiplayer.dto.RoomParticipantDto;
import com.pif.multiplayer.model.RoomOrder;
import com.pif.multiplayer.repository.RoomOrderRepository;
import com.pif.multiplayer.repository.RoomParticipantRepository;
import com.pif.multiplayer.service.RoomService;
import com.pif.multiplayer.event.RoomClosingEvent;
import com.pif.multiplayer.model.RoomParticipant;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Recommande des cours au joueur à partir de SON résultat dans une salle (cf. RecommendationRules).
 * Aucune donnée d'un autre joueur n'est lue, hormis le classement pour connaître son rang.
 */
@Service
public class MatchRecommendationService {

    private final RoomService roomService;
    private final RoomParticipantRepository participantRepository;
    private final RoomOrderRepository orderRepository;
    private final LearningCatalog catalog;
    private final LearningProgressRepository progressRepository;

    /**
     * La clôture d'une salle supprime ses participants et ses ordres : les résultats sont donc relevés juste avant
     * (RoomClosingEvent) et gardés ici un moment, le temps que le joueur consulte sa fenêtre de fin de match.
     * Mémoire du serveur uniquement : perdu au redémarrage, ce qui est acceptable pour un affichage de fin de match.
     */
    private static final long SNAPSHOT_TTL_MS = 2 * 60 * 60 * 1000L;
    private static final int SNAPSHOT_MAX = 2000;
    private final Map<String, Snapshot> snapshots = new ConcurrentHashMap<>();

    private record Snapshot(MatchRecommendationView view, long createdAt) {
    }

    public MatchRecommendationService(RoomService roomService, RoomParticipantRepository participantRepository,
                                      RoomOrderRepository orderRepository, LearningCatalog catalog,
                                      LearningProgressRepository progressRepository) {
        this.roomService = roomService;
        this.participantRepository = participantRepository;
        this.orderRepository = orderRepository;
        this.catalog = catalog;
        this.progressRepository = progressRepository;
    }

    /** Relève la recommandation de chaque joueur avant la suppression de la salle. */
    @EventListener
    @Transactional(readOnly = true)
    public void onRoomClosing(RoomClosingEvent event) {
        purgeSnapshots();
        for (RoomParticipant p : participantRepository.findByRoomIdOrderByTotalEquityDesc(event.roomId())) {
            try {
                snapshots.put(snapshotKey(event.roomId(), p.getUser().getId()),
                        new Snapshot(build(p.getUser(), event.roomId()), System.currentTimeMillis()));
            } catch (Exception ignored) {
                // Un joueur en échec ne doit pas bloquer la clôture ni les autres joueurs
            }
        }
    }

    @Transactional(readOnly = true)
    public MatchRecommendationView recommend(User user, String roomId) {
        if (participantRepository.findByRoomIdAndPlayerId(roomId, user.getId()).isPresent()) {
            return build(user, roomId);
        }
        // Salle déjà clôturée (donc supprimée) : on reprend le relevé fait à la clôture
        Snapshot snapshot = snapshots.get(snapshotKey(roomId, user.getId()));
        if (snapshot != null) {
            return snapshot.view();
        }
        // Spectateur ou autre compte : pas de résultat à analyser, ce n'est pas une erreur
        return new MatchRecommendationView(null, List.of(),
                "Tu n'as pas joué dans cette salle avec ce compte : aucune recommandation à afficher.");
    }

    private static String snapshotKey(String roomId, Long userId) {
        return roomId + ":" + userId;
    }

    private void purgeSnapshots() {
        long limit = System.currentTimeMillis() - SNAPSHOT_TTL_MS;
        snapshots.values().removeIf(s -> s.createdAt() < limit);
        if (snapshots.size() > SNAPSHOT_MAX) {
            Iterator<String> it = snapshots.keySet().iterator();
            while (snapshots.size() > SNAPSHOT_MAX && it.hasNext()) {
                it.next();
                it.remove();
            }
        }
    }

    private MatchRecommendationView build(User user, String roomId) {
        MatchStats stats = stats(user, roomId);
        RecommendationRules.Progress progress = progress(user);
        List<Item> items = RecommendationRules.plan(RecommendationRules.evaluate(stats), catalog, progress);

        Summary summary = new Summary(round2(stats.returnPct() * 100), stats.rank(), stats.participants(),
                stats.tradeCount(), stats.positionCount(), round2(stats.cashShare() * 100),
                round2(stats.largestShareOfInvested() * 100));
        String message = items.isEmpty() ? "Tu as déjà validé tous les cours de la formation : bravo !" : null;
        return new MatchRecommendationView(summary, items, message);
    }

    private MatchStats stats(User user, String roomId) {
        Map<String, Object> portfolio = roomService.getMyRoomPortfolio(roomId, user);
        double initial = number(portfolio.get("initialCash"));
        double cash = number(portfolio.get("cashBalance"));
        double equity = number(portfolio.get("totalPortfolioValue"));

        double positionsValue = 0.0;
        double largest = 0.0;
        int positionCount = 0;
        Object rawPositions = portfolio.get("positions");
        if (rawPositions instanceof List<?> list) {
            for (Object o : list) {
                if (!(o instanceof Map<?, ?> position)) continue;
                double value = number(position.get("quantity")) * number(position.get("currentPrice"));
                if (value <= 0) continue;
                positionCount++;
                positionsValue += value;
                largest = Math.max(largest, value);
            }
        }

        List<RoomOrder> orders = orderRepository.findByRoomIdAndUserIdOrderByCreatedAtDesc(roomId, user.getId());
        boolean protectedOrders = orders.stream().anyMatch(o -> o.getStopLossPrice() != null || o.getTakeProfitPrice() != null);

        List<RoomParticipantDto> rankings = roomService.getLeaderboard(roomId).getRankings();
        int participants = rankings.size();
        int rank = participants;
        for (RoomParticipantDto p : rankings) {
            if (user.getId().equals(p.getUserId()) && p.getRank() != null) {
                rank = p.getRank();
                break;
            }
        }
        return new MatchStats(initial, equity, cash, positionsValue, largest, positionCount, orders.size(),
                protectedOrders, rank, participants);
    }

    private RecommendationRules.Progress progress(User user) {
        Set<String> lessons = new HashSet<>();
        Set<String> quizzes = new HashSet<>();
        for (LearningProgress p : progressRepository.findByUserId(user.getId())) {
            if (p.getItemType() == ItemType.LESSON) lessons.add(p.getItemId());
            if (p.getItemType() == ItemType.QUIZ && p.isCompleted()) quizzes.add(p.getItemId());
        }
        return new RecommendationRules.Progress() {
            @Override
            public boolean lessonDone(String lessonId) {
                return lessons.contains(lessonId);
            }

            @Override
            public boolean quizPassed(String quizId) {
                return quizzes.contains(quizId);
            }
        };
    }

    private static double number(Object value) {
        return value instanceof Number n ? n.doubleValue() : 0.0;
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
