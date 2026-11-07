package com.pif.multiplayer.service;

import com.pif.auth.model.User;
import com.pif.auth.repository.UserRepository;
import com.pif.marketdata.service.MarketPriceService;
import com.pif.multiplayer.dto.*;
import com.pif.multiplayer.model.*;
import com.pif.multiplayer.repository.RoomInvitationRepository;
import com.pif.multiplayer.repository.RoomOrderRepository;
import com.pif.multiplayer.repository.RoomParticipantRepository;
import com.pif.multiplayer.repository.RoomRepository;
import com.pif.gamification.service.GamificationEngine;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class RoomService {

    private final RoomRepository roomRepository;
    private final RoomParticipantRepository participantRepository;
    private final RoomOrderRepository orderRepository;
    private final RoomInvitationRepository invitationRepository;
    private final UserRepository userRepository;
    private final MarketPriceService priceService;
    private final SimpMessagingTemplate messagingTemplate;
    private final RoomSimulationTicker simulationTicker;
    private final GamificationEngine gamificationEngine;

    public RoomService(RoomRepository roomRepository,
                       RoomParticipantRepository participantRepository,
                       RoomOrderRepository orderRepository,
                       UserRepository userRepository,
                       MarketPriceService priceService,
                       SimpMessagingTemplate messagingTemplate,
                       @Lazy RoomSimulationTicker simulationTicker) {
        this(roomRepository, participantRepository, orderRepository, null, userRepository, priceService, messagingTemplate, simulationTicker, null);
    }

    @Autowired
    public RoomService(RoomRepository roomRepository,
                       RoomParticipantRepository participantRepository,
                       RoomOrderRepository orderRepository,
                       RoomInvitationRepository invitationRepository,
                       UserRepository userRepository,
                       MarketPriceService priceService,
                       SimpMessagingTemplate messagingTemplate,
                       @Lazy RoomSimulationTicker simulationTicker,
                       @Lazy GamificationEngine gamificationEngine) {
        this.roomRepository = roomRepository;
        this.participantRepository = participantRepository;
        this.orderRepository = orderRepository;
        this.invitationRepository = invitationRepository;
        this.userRepository = userRepository;
        this.priceService = priceService;
        this.messagingTemplate = messagingTemplate;
        this.simulationTicker = simulationTicker;
        this.gamificationEngine = gamificationEngine;
    }

    /**
     * Création d'une room privée de simulation multijoueur (Accessible à TOUT trader connecté).
     */
    @Transactional
    public RoomDto createRoom(RoomCreateDto dto, User creator) {
        if (dto.getStartDate().isAfter(dto.getEndDate())) {
            throw new IllegalArgumentException("La date de début doit être antérieure à la date de fin.");
        }

        Room room = new Room(
                dto.getName(),
                dto.getStartDate(),
                dto.getEndDate(),
                dto.getInitialCash(),
                dto.getGameDurationMinutes(),
                dto.getTickRateMs()
        );
        while (roomRepository.existsById(room.getId())) {
            room.setId(Room.generateRoomCode());
        }
        if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
            room.setPassword(dto.getPassword().trim());
        }
        User managedCreator = creator;
        if (userRepository != null && creator != null && creator.getId() != null) {
            Optional<User> found = userRepository.findById(creator.getId());
            if (found != null && found.isPresent()) {
                managedCreator = found.get();
            }
        }
        if (managedCreator != null) {
            room.setCreatedBy(managedCreator);
        }
        Room saved = roomRepository.saveAndFlush(room);

        // Inscription automatique de l'hôte/créateur en tant que joueur prêt
        if (managedCreator != null) {
            RoomParticipant hostParticipant = new RoomParticipant(saved, managedCreator, saved.getInitialCash());
            hostParticipant.setIsReady(true);
            RoomParticipant savedParticipant = participantRepository.saveAndFlush(hostParticipant);
            savedParticipant.markNotNew();
            saved.getParticipants().add(savedParticipant);

            if (gamificationEngine != null) {
                try {
                    gamificationEngine.onRoomCreated(managedCreator);
                } catch (Exception ignored) {}
            }
        }

        return RoomDto.fromEntity(saved, true);
    }

    /**
     * Liste des arènes multijoueur (filtrable par statut, exclut les salles terminées/supprimées).
     */
    @Transactional(readOnly = true)
    public List<RoomDto> listRooms(RoomStatus status) {
        List<Room> rooms = (status != null)
                ? roomRepository.findByStatusWithCreatorAndParticipants(status)
                : roomRepository.findAllWithCreatorAndParticipants();
        return rooms.stream()
                .filter(r -> r.getStatus() != RoomStatus.FINISHED)
                .map(r -> RoomDto.fromEntity(r, false))
                .collect(Collectors.toList());
    }

    /**
     * Détails complets d'une room avec ses participants.
     */
    @Transactional(readOnly = true)
    public RoomDto getRoom(String roomId) {
        Room room = roomRepository.findByIdWithParticipants(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Room introuvable: " + roomId));
        return RoomDto.fromEntity(room, true);
    }

    /**
     * Inscription d'un joueur dans une salle de match.
     */
    @Transactional
    public RoomParticipantDto joinRoom(String roomId, User user) {
        return joinRoom(roomId, null, user);
    }

    /**
     * Inscription d'un joueur dans une salle avec mot de passe éventuel.
     */
    @Transactional
    public RoomParticipantDto joinRoom(String roomId, String password, User user) {
        if (user == null) {
            throw new IllegalArgumentException("Vous devez être authentifié pour rejoindre une arène.");
        }
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Room introuvable: " + roomId));

        if (room.getStatus() == RoomStatus.FINISHED) {
            throw new IllegalStateException("Cette salle de match est clôturée et terminée.");
        }
        if (room.getStatus() != RoomStatus.LOBBY && room.getStatus() != RoomStatus.WAITING) {
            throw new IllegalStateException("Impossible de rejoindre une room déjà en cours de simulation.");
        }

        // Contrôle du mot de passe si la salle est privée (l'hôte créateur en est dispensé)
        boolean isCreator = room.getCreatedBy() != null && room.getCreatedBy().getId().equals(user.getId());
        if (room.isPasswordProtected() && !isCreator) {
            if (password == null || !password.trim().equals(room.getPassword())) {
                throw new IllegalArgumentException("Mot de passe incorrect pour cette salle privée.");
            }
        }

        RoomParticipantId participantId = new RoomParticipantId(roomId, user.getId());
        if (participantRepository.existsById(participantId)) {
            RoomParticipant existing = participantRepository.findById(participantId).get();
            return RoomParticipantDto.fromEntity(existing);
        }

        User managedUser = user;
        if (userRepository != null && user != null && user.getId() != null) {
            Optional<User> found = userRepository.findById(user.getId());
            if (found != null && found.isPresent()) {
                managedUser = found.get();
            }
        }
        RoomParticipant participant = new RoomParticipant(room, managedUser, room.getInitialCash());
        RoomParticipant saved = participantRepository.saveAndFlush(participant);
        saved.markNotNew();

        // Notification temps réel aux joueurs dans le salon d'attente
        RoomParticipantDto participantDto = RoomParticipantDto.fromEntity(saved);
        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/participants", participantDto);

        return participantDto;
    }

    /**
     * Bascule du statut "Prêt" (Ready) d'un participant dans le lobby de la salle.
     */
    @Transactional
    public RoomParticipantDto toggleReady(String roomId, User user) {
        RoomParticipant participant = participantRepository.findByRoomIdAndPlayerId(roomId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("Participant introuvable dans la salle: " + roomId));

        participant.setIsReady(!participant.getIsReady());
        RoomParticipant saved = participantRepository.save(participant);

        RoomParticipantDto dto = RoomParticipantDto.fromEntity(saved);
        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/participants", dto);
        return dto;
    }

    /**
     * Démarrage de la partie (Par l'hôte créateur de la salle).
     */
    public RoomDto startRoom(String roomId, User user) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Room introuvable: " + roomId));

        if (room.getStatus() == RoomStatus.RUNNING) {
            return RoomDto.fromEntity(room, true);
        }

        room.setStatus(RoomStatus.RUNNING);
        room.setCurrentSimulatedDate(room.getStartDate());
        if (room.getStartedAt() == null) {
            room.setStartedAt(java.time.LocalDateTime.now());
        }
        Room saved = roomRepository.save(room);

        // Lancement du ticker asynchrone pour la room
        simulationTicker.startRoomTicker(saved);

        RoomDto dto = RoomDto.fromEntity(saved, true);
        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/status", dto);

        return dto;
    }

    /**
     * Mise en pause de la simulation de la salle (pour audit IA FinGPT).
     */
    public RoomDto pauseRoom(String roomId, User user) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Room introuvable: " + roomId));

        if (room.getStatus() != RoomStatus.RUNNING) {
            return RoomDto.fromEntity(room, true);
        }

        room.setStatus(RoomStatus.PAUSED);
        Room saved = roomRepository.save(room);

        simulationTicker.stopTicker(roomId);

        RoomDto dto = RoomDto.fromEntity(saved, true);
        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/status", dto);
        return dto;
    }

    /**
     * Reprise de la simulation de la salle après une pause.
     */
    public RoomDto resumeRoom(String roomId, User user) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Room introuvable: " + roomId));

        if (room.getStatus() != RoomStatus.PAUSED) {
            return RoomDto.fromEntity(room, true);
        }

        room.setStatus(RoomStatus.RUNNING);
        Room saved = roomRepository.save(room);

        simulationTicker.startRoomTicker(saved);

        RoomDto dto = RoomDto.fromEntity(saved, true);
        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/status", dto);
        return dto;
    }

    /**
     * Clôture définitive d'une arène et suppression immédiate (Par le créateur ou un administrateur).
     */
    public RoomDto closeRoom(String roomId, User user) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Room introuvable: " + roomId));

        boolean isCreator = room.getCreatedBy() != null && user != null && room.getCreatedBy().getId().equals(user.getId());
        boolean isAdmin = user != null && user.getRole() != null && "ROLE_ADMIN".equals(user.getRole().name());
        if (!isCreator && !isAdmin) {
            throw new IllegalStateException("Seul le créateur ou un administrateur peut clôturer cette salle.");
        }

        simulationTicker.stopTicker(roomId);
        room.setStatus(RoomStatus.FINISHED);
        Room saved = roomRepository.save(room);

        // Clôture des positions et attribution de l'ELO / EXP aux vainqueurs
        simulationTicker.finalizeMatch(saved);

        RoomDto dto = RoomDto.fromEntity(saved, true);
        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/status", dto);

        // Suppression de la salle après clôture (demande explicite utilisateur)
        try {
            invitationRepository.deleteByRoomId(roomId);
            orderRepository.deleteByRoomId(roomId);
            participantRepository.deleteByRoomId(roomId);
            roomRepository.delete(saved);
        } catch (Exception e) {
            // Sécurité en cas de contrainte imprévue : la salle est de toute façon marquée FINISHED et exclue du lobby
        }

        return dto;
    }

    /**
     * Exécution d'un ordre de trading dans l'arène.
     */
    public RoomOrderResponseDto placeOrder(String roomId, RoomOrderRequestDto dto, User user) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Room introuvable: " + roomId));

        // L'administrateur / créateur ne fait pas de trade dans son propre match (Arbitre impartial)
        if (room.getCreatedBy() != null && user != null && room.getCreatedBy().getId().equals(user.getId())) {
            throw new IllegalStateException("L'administrateur de la salle ne peut pas trader dans sa propre salle (rôle d'arbitre et superviseur du match).");
        }

        if (room.getStatus() != RoomStatus.RUNNING) {
            throw new IllegalStateException("Les ordres ne peuvent être exécutés que pendant une simulation active.");
        }

        RoomParticipant participant = participantRepository.findByRoomIdAndPlayerId(roomId, user.getId())
                .orElseThrow(() -> new IllegalArgumentException("L'utilisateur n'est pas inscrit dans cette room."));

        LocalDate simDate = room.getCurrentSimulatedDate();
        String dateStr = simDate != null ? simDate.toString() : room.getStartDate().toString();

        BigDecimal execPrice = priceService.findClosePrice(dto.getTicker(), dateStr)
                .orElse(dto.getPrice());

        BigDecimal totalCost = execPrice.multiply(BigDecimal.valueOf(dto.getQuantity()));

        if (dto.getSide() == RoomOrderSide.BUY) {
            if (participant.getCash().compareTo(totalCost) < 0) {
                throw new IllegalStateException(String.format(
                        "Fonds insuffisants : Solde disponible = %.2f TND, Montant requis = %.2f TND",
                        participant.getCash(), totalCost
                ));
            }
            participant.setCash(participant.getCash().subtract(totalCost));
        } else {
            // Vente
            participant.setCash(participant.getCash().add(totalCost));
        }

        // Mise à jour de la valorisation et du PnL %
        BigDecimal newTotalEquity = participant.getCash();
        participant.setTotalEquity(newTotalEquity);

        BigDecimal initialCash = room.getInitialCash();
        if (initialCash != null && initialCash.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal pnlPct = newTotalEquity.subtract(initialCash)
                    .divide(initialCash, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100.0));
            participant.setPnlPercentage(pnlPct);
        }

        participantRepository.save(participant);

        RoomOrder order = new RoomOrder(
                room,
                user,
                dto.getTicker().toUpperCase().trim(),
                dto.getSide(),
                dto.getOrderType(),
                execPrice,
                dto.getQuantity(),
                simDate != null ? simDate : room.getStartDate()
        );
        if (dto.getStopLoss() != null) {
            order.setStopLossPrice(dto.getStopLoss());
        }
        if (dto.getTakeProfit() != null) {
            order.setTakeProfitPrice(dto.getTakeProfit());
        }

        RoomOrder savedOrder = orderRepository.save(order);
        RoomOrderResponseDto orderResponse = RoomOrderResponseDto.fromEntity(savedOrder);

        // Diffusion WebSocket de l'ordre
        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/orders", orderResponse);

        // Diffusion du classement mis à jour
        updateAndBroadcastLeaderboard(roomId);

        // Orchestration Gamifiée : Succès de trading (premier ordre, multi-actifs, stop-loss)
        if (gamificationEngine != null) {
            try {
                long totalOrders = orderRepository.countByUserId(user.getId());
                gamificationEngine.onOrderPlaced(user, (int) totalOrders, 1, dto.getStopLoss() != null);
            } catch (Exception ignored) {}
        }

        return orderResponse;
    }

    /**
     * Récupère le classement en direct de la salle.
     */
    @Transactional(readOnly = true)
    public RoomLeaderboardDto getLeaderboard(String roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Room introuvable: " + roomId));

        List<RoomParticipant> participants = participantRepository.findByRoomIdOrderByTotalEquityDesc(roomId);
        List<RoomParticipantDto> rankings = new ArrayList<>();
        int rank = 1;
        for (RoomParticipant p : participants) {
            p.setRank(rank++);
            rankings.add(RoomParticipantDto.fromEntity(p));
        }

        return new RoomLeaderboardDto(roomId, room.getName(), room.getCurrentSimulatedDate(), rankings);
    }

    /**
     * Met à jour les rangs et diffuse le leaderboard en direct sur WebSocket.
     */
    public void updateAndBroadcastLeaderboard(String roomId) {
        RoomLeaderboardDto leaderboard = getLeaderboard(roomId);
        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/leaderboard", leaderboard);
    }

    /**
     * Portefeuille et ordres dédiés exclusivement à cette arène pour un joueur donné.
     * Garantit l'isolation stricte des positions entre chaque arène.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getMyRoomPortfolio(String roomId, User user) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("Room introuvable: " + roomId));

        Long userId = user != null ? user.getId() : -1L;
        RoomParticipant participant = participantRepository.findByRoomIdAndPlayerId(roomId, userId).orElse(null);

        List<RoomOrder> orders = orderRepository.findByRoomIdAndUserIdOrderByCreatedAtDesc(roomId, userId);

        Map<String, Integer> positionQuantities = new HashMap<>();
        Map<String, BigDecimal> positionEntryCosts = new HashMap<>();

        for (RoomOrder o : orders) {
            String sym = o.getTicker().toUpperCase().trim();
            int qty = o.getQuantity();
            BigDecimal p = o.getPrice();
            if (o.getSide() == RoomOrderSide.BUY) {
                positionQuantities.put(sym, positionQuantities.getOrDefault(sym, 0) + qty);
                BigDecimal c = positionEntryCosts.getOrDefault(sym, BigDecimal.ZERO);
                positionEntryCosts.put(sym, c.add(p.multiply(BigDecimal.valueOf(qty))));
            } else {
                int cur = positionQuantities.getOrDefault(sym, 0);
                positionQuantities.put(sym, Math.max(0, cur - qty));
            }
        }

        List<Map<String, Object>> positions = new ArrayList<>();
        LocalDate simDate = room.getCurrentSimulatedDate();
        String dateStr = simDate != null ? simDate.toString() : room.getStartDate().toString();

        BigDecimal posValue = BigDecimal.ZERO;
        for (Map.Entry<String, Integer> entry : positionQuantities.entrySet()) {
            if (entry.getValue() > 0) {
                String sym = entry.getKey();
                int qty = entry.getValue();
                BigDecimal totalEntryCost = positionEntryCosts.getOrDefault(sym, BigDecimal.ZERO);
                BigDecimal avgEntry = totalEntryCost.divide(BigDecimal.valueOf(qty), 4, RoundingMode.HALF_UP);
                BigDecimal livePrice = priceService.findClosePrice(sym, dateStr).orElse(avgEntry);
                BigDecimal mktVal = livePrice.multiply(BigDecimal.valueOf(qty));
                posValue = posValue.add(mktVal);

                Map<String, Object> pos = new HashMap<>();
                pos.put("symbol", sym);
                pos.put("ticker", sym);
                pos.put("quantity", qty);
                pos.put("entryPrice", avgEntry);
                pos.put("currentPrice", livePrice);
                pos.put("unrealizedPnl", mktVal.subtract(totalEntryCost));
                positions.add(pos);
            }
        }

        BigDecimal cash = participant != null ? participant.getCash() : room.getInitialCash();
        BigDecimal totalEquity = cash.add(posValue);

        Map<String, Object> result = new HashMap<>();
        result.put("roomId", roomId);
        result.put("initialCash", room.getInitialCash());
        result.put("cashBalance", cash);
        result.put("totalPortfolioValue", totalEquity);
        result.put("positions", positions);
        result.put("orders", orders.stream().map(RoomOrderResponseDto::fromEntity).collect(Collectors.toList()));
        return result;
    }
}
