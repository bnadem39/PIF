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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

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

    public MatchRecommendationService(RoomService roomService, RoomParticipantRepository participantRepository,
                                      RoomOrderRepository orderRepository, LearningCatalog catalog,
                                      LearningProgressRepository progressRepository) {
        this.roomService = roomService;
        this.participantRepository = participantRepository;
        this.orderRepository = orderRepository;
        this.catalog = catalog;
        this.progressRepository = progressRepository;
    }

    @Transactional(readOnly = true)
    public MatchRecommendationView recommend(User user, String roomId) {
        if (participantRepository.findByRoomIdAndPlayerId(roomId, user.getId()).isEmpty()) {
            throw new IllegalArgumentException("Vous n'avez pas participé à cette salle.");
        }
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
