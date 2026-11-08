package com.pif.multiplayer.service;

import com.pif.auth.model.User;
import com.pif.auth.repository.UserRepository;
import com.pif.marketdata.service.LocalCsvMarketDataService;
import com.pif.multiplayer.dto.EloUpdateResultDto;
import com.pif.multiplayer.dto.RoomLeaderboardDto;
import com.pif.multiplayer.dto.RoomParticipantDto;
import com.pif.multiplayer.dto.RoomTickDto;
import com.pif.multiplayer.model.Room;
import com.pif.multiplayer.model.RoomParticipant;
import com.pif.multiplayer.model.RoomStatus;
import com.pif.multiplayer.repository.RoomParticipantRepository;
import com.pif.multiplayer.repository.RoomRepository;
import jakarta.annotation.PreDestroy;
import com.pif.gamification.service.GamificationEngine;
import org.springframework.context.annotation.Lazy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.*;

@Service
public class RoomSimulationTicker {

    private static final Logger log = LoggerFactory.getLogger(RoomSimulationTicker.class);

    private final RoomRepository roomRepository;
    private final RoomParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final EloCalculator eloCalculator;
    private final SimpMessagingTemplate messagingTemplate;
    private final LocalCsvMarketDataService localCsvService;
    private final TransactionTemplate transactionTemplate;
    private final GamificationEngine gamificationEngine;

    // Injection par champ : le constructeur reste inchange (utilise tel quel par RoomServiceTest)
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private RoomEquityValuator equityValuator;

    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(4);
    private final Map<String, ScheduledFuture<?>> activeTasks = new ConcurrentHashMap<>();

    private static final List<String> BENCHMARK_SYMBOLS = List.of("BIAT", "SFBT", "BT", "AB", "CC", "BTC-USD", "ETH-USD");

    public RoomSimulationTicker(RoomRepository roomRepository,
                                RoomParticipantRepository participantRepository,
                                UserRepository userRepository,
                                EloCalculator eloCalculator,
                                SimpMessagingTemplate messagingTemplate,
                                LocalCsvMarketDataService localCsvService,
                                PlatformTransactionManager transactionManager,
                                @Lazy GamificationEngine gamificationEngine) {
        this.roomRepository = roomRepository;
        this.participantRepository = participantRepository;
        this.userRepository = userRepository;
        this.eloCalculator = eloCalculator;
        this.messagingTemplate = messagingTemplate;
        this.localCsvService = localCsvService;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.gamificationEngine = gamificationEngine;
    }

    /**
     * Démarre la boucle de diffusion synchrone des ticks pour une salle.
     */
    public synchronized void startRoomTicker(Room room) {
        String roomId = room.getId();
        if (activeTasks.containsKey(roomId)) {
            log.warn("Le ticker pour la room {} est déjà en cours d'exécution.", roomId);
            return;
        }

        // Construction du calendrier des dates de simulation (séances de bourse)
        LocalDate startFrom = (room.getCurrentSimulatedDate() != null && room.getCurrentSimulatedDate().isAfter(room.getStartDate()))
                ? room.getCurrentSimulatedDate()
                : room.getStartDate();
        List<LocalDate> timeline = buildTimeline(startFrom, room.getEndDate());
        if (timeline.isEmpty()) {
            timeline = List.of(room.getStartDate());
        }

        final List<LocalDate> finalTimeline = timeline;
        final int[] currentIndex = {0};
        final int tickRateMs = Math.max(100, room.getTickRateMs());

        log.info("Démarrage de la simulation multijoueur pour la room {} ({} séances, cadence = {}ms).",
                room.getName(), finalTimeline.size(), tickRateMs);

        ScheduledFuture<?> future = scheduler.scheduleAtFixedRate(() -> {
            try {
                executeTick(roomId, finalTimeline, currentIndex);
            } catch (Exception e) {
                log.error("Erreur durant l'exécution du tick pour la room " + roomId, e);
            }
        }, tickRateMs, tickRateMs, TimeUnit.MILLISECONDS); // delai initial = 1 tick : laisse le temps au commit de startRoom (statut RUNNING)

        activeTasks.put(roomId, future);
    }

    private void executeTick(String roomId, List<LocalDate> timeline, int[] currentIndexRef) {
        int idx = currentIndexRef[0];
        boolean isLast = idx >= timeline.size() - 1;
        LocalDate currentDate = timeline.get(Math.min(idx, timeline.size() - 1));

        transactionTemplate.executeWithoutResult(status -> {
            Room room = roomRepository.findById(roomId).orElse(null);
            if (room == null || room.getStatus() != RoomStatus.RUNNING) {
                stopTicker(roomId);
                return;
            }

            room.setCurrentSimulatedDate(currentDate);
            roomRepository.save(room);

            // 1. Calcul des cours de marché de la séance courante
            Map<String, BigDecimal> prices = new HashMap<>();
            String dateStr = currentDate.toString();
            for (String sym : BENCHMARK_SYMBOLS) {
                // Lecture locale ou fallback prix simulé
                BigDecimal p = getSymbolPrice(sym, dateStr);
                prices.put(sym, p);
            }

            // Calcul indicatif de l'indice TUNINDEX
            BigDecimal tunindexVal = BigDecimal.valueOf(8500.0).add(
                    BigDecimal.valueOf(Math.sin(idx * 0.1) * 200.0 + idx * 2.5)
            ).setScale(2, RoundingMode.HALF_UP);

            BigDecimal initialTunindex = BigDecimal.valueOf(8500.0);
            BigDecimal tunindexPnl = tunindexVal.subtract(initialTunindex)
                    .divide(initialTunindex, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100.0));

            // 2. Diffusion du tick WebSocket pour tous les participants
            RoomTickDto tickDto = new RoomTickDto();
            tickDto.setRoomId(roomId);
            tickDto.setSimulatedDate(currentDate);
            tickDto.setTickIndex(idx + 1);
            tickDto.setTotalTicks(timeline.size());
            tickDto.setMarketPrices(prices);
            tickDto.setTunindexValue(tunindexVal);
            tickDto.setTunindexPnl(tunindexPnl);
            tickDto.setLastTick(isLast);

            messagingTemplate.convertAndSend("/topic/room/" + roomId + "/tick", tickDto);

            // 3. Mise à jour et diffusion du Leaderboard temps réel
            List<RoomParticipant> participants = participantRepository.findByRoomIdOrderByTotalEquityDesc(roomId);
            if (equityValuator != null) {
                // Revalorise cash + positions aux cours du tick, puis reclasse
                equityValuator.revalue(room, participants, currentDate);
                participants = new ArrayList<>(participants);
                participants.sort(Comparator.comparing(RoomParticipant::getTotalEquity).reversed());
            }
            List<RoomParticipantDto> rankingDtos = new ArrayList<>();
            int rank = 1;
            for (RoomParticipant p : participants) {
                p.setRank(rank++);
                rankingDtos.add(RoomParticipantDto.fromEntity(p));
            }
            participantRepository.saveAll(participants);

            RoomLeaderboardDto leaderboard = new RoomLeaderboardDto(roomId, room.getName(), currentDate, rankingDtos);
            messagingTemplate.convertAndSend("/topic/room/" + roomId + "/leaderboard", leaderboard);

            // 4. Si dernière séance : clôture de la partie et attribution du score ELO
            if (isLast) {
                finalizeMatch(room, participants, tunindexPnl);
                stopTicker(roomId);
            }
        });

        currentIndexRef[0] = idx + 1;
    }

    public void finalizeMatch(Room room) {
        List<RoomParticipant> participants = participantRepository.findByRoomIdOrderByTotalEquityDesc(room.getId());
        finalizeMatch(room, participants, BigDecimal.ZERO);
    }

    public void finalizeMatch(Room room, List<RoomParticipant> participants, BigDecimal tunindexPnl) {
        room.setStatus(RoomStatus.FINISHED);
        roomRepository.save(room);

        List<EloUpdateResultDto> matchResults = new ArrayList<>();
        BigDecimal estimatedVolatility = BigDecimal.valueOf(0.18); // 18% volatilité annuelle moyenne

        for (RoomParticipant p : participants) {
            User user = p.getUser();
            BigDecimal initialCash = room.getInitialCash();
            BigDecimal diff = p.getTotalEquity().subtract(initialCash);
            BigDecimal pnlPercent = (initialCash.compareTo(BigDecimal.ZERO) > 0)
                    ? diff.divide(initialCash, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100.0))
                    : BigDecimal.ZERO;

            EloUpdateResultDto eloResult = eloCalculator.calculateAndApply(
                    user,
                    pnlPercent,
                    tunindexPnl,
                    estimatedVolatility,
                    p.getRank()
            );

            // Progression EXP : +150 EXP pour le 1er, +75 EXP pour les autres
            user.addExp(p.getRank() == 1 ? 150 : 75);
            user.setTotalMatches(user.getTotalMatches() + 1);
            if (p.getRank() == 1) {
                user.setWins(user.getWins() + 1);
            }

            userRepository.save(user);
            matchResults.add(eloResult);
        }

        // Orchestration Gamifiée : Saisons, Succès, Célébration 3D et Carrière
        if (gamificationEngine != null) {
            try {
                RoomParticipant winner = participants.stream()
                        .filter(p -> p.getRank() != null && p.getRank() == 1)
                        .findFirst()
                        .orElse(null);
                gamificationEngine.onMatchFinished(room, winner, participants);
            } catch (Exception e) {
                log.warn("[TICKER] Erreur orchestration gamifiée sur match {}: {}", room.getId(), e.getMessage());
            }
        }

        // Diffusion WebSocket des résultats ELO finaux
        messagingTemplate.convertAndSend("/topic/room/" + room.getId() + "/results", matchResults);
        messagingTemplate.convertAndSend("/topic/room/" + room.getId() + "/status", "FINISHED");

        log.info("Simulation terminée pour la room {} avec {} joueurs classés et ELO recalculés.",
                room.getName(), participants.size());
    }

    private BigDecimal getSymbolPrice(String symbol, String dateStr) {
        try {
            if (localCsvService.hasSymbol(symbol)) {
                var candles = localCsvService.getCandles(symbol, "1d", "ALL", 0);
                if (candles != null && !candles.isEmpty()) {
                    for (int i = candles.size() - 1; i >= 0; i--) {
                        var c = candles.get(i);
                        if (c.time() != null && c.time().compareTo(dateStr) <= 0) {
                            return BigDecimal.valueOf(c.close());
                        }
                    }
                    return BigDecimal.valueOf(candles.get(candles.size() - 1).close());
                }
            }
        } catch (Exception ignored) {}
        // Fallback déterministe
        return BigDecimal.valueOf(100.0);
    }

    private List<LocalDate> buildTimeline(LocalDate start, LocalDate end) {
        List<LocalDate> dates = new ArrayList<>();
        LocalDate cur = start;
        while (!cur.isAfter(end)) {
            // Ignorer les week-ends (Samedi et Dimanche)
            if (cur.getDayOfWeek().getValue() < 6) {
                dates.add(cur);
            }
            cur = cur.plusDays(1);
        }
        return dates;
    }

    public synchronized void stopTicker(String roomId) {
        ScheduledFuture<?> future = activeTasks.remove(roomId);
        if (future != null) {
            future.cancel(false);
            log.info("Ticker arrêté pour la room {}.", roomId);
        }
    }

    @PreDestroy
    public void shutdown() {
        scheduler.shutdownNow();
    }
}

