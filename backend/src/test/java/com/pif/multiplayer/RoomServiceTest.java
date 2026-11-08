package com.pif.multiplayer;

import com.pif.auth.model.Role;
import com.pif.auth.model.User;
import com.pif.auth.repository.UserRepository;
import com.pif.marketdata.service.MarketPriceService;
import com.pif.multiplayer.dto.RoomCreateDto;
import com.pif.multiplayer.dto.RoomDto;
import com.pif.multiplayer.dto.RoomOrderRequestDto;
import com.pif.multiplayer.dto.RoomParticipantDto;
import com.pif.multiplayer.model.*;
import com.pif.multiplayer.repository.RoomOrderRepository;
import com.pif.multiplayer.repository.RoomParticipantRepository;
import com.pif.multiplayer.repository.RoomRepository;
import com.pif.multiplayer.service.RoomService;
import com.pif.multiplayer.service.RoomSimulationTicker;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.lang.reflect.Proxy;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class RoomServiceTest {

    private RoomRepository roomRepository;
    private RoomParticipantRepository participantRepository;
    private RoomOrderRepository orderRepository;
    private UserRepository userRepository;
    private MarketPriceService priceService;
    private SimpMessagingTemplate messagingTemplate;
    private RoomSimulationTicker simulationTicker;
    private RoomService roomService;

    // In-memory test state
    private Map<String, Room> rooms;
    private Map<String, RoomParticipant> participants;

    @SuppressWarnings("unchecked")
    private <T> T createStub(Class<T> intf, java.lang.reflect.InvocationHandler handler) {
        return (T) Proxy.newProxyInstance(intf.getClassLoader(), new Class<?>[]{intf}, handler);
    }

    @BeforeEach
    void setUp() {
        rooms = new HashMap<>();
        participants = new HashMap<>();

        roomRepository = createStub(RoomRepository.class, (proxy, method, args) -> {
            String name = method.getName();
            if ("existsById".equals(name)) {
                return rooms.containsKey((String) args[0]);
            }
            if ("save".equals(name) || "saveAndFlush".equals(name)) {
                Room r = (Room) args[0];
                if (r.getId() == null) r.setId("PIF-" + (1000 + rooms.size()));
                rooms.put(r.getId(), r);
                return r;
            }
            if ("findById".equals(name)) {
                String id = (String) args[0];
                return Optional.ofNullable(rooms.get(id));
            }
            if ("findByIdWithParticipants".equals(name)) {
                String id = (String) args[0];
                return Optional.ofNullable(rooms.get(id));
            }
            return null;
        });

        participantRepository = createStub(RoomParticipantRepository.class, (proxy, method, args) -> {
            String name = method.getName();
            if ("save".equals(name) || "saveAndFlush".equals(name)) {
                RoomParticipant p = (RoomParticipant) args[0];
                String key = p.getId().getRoomId() + ":" + p.getId().getPlayerId();
                participants.put(key, p);
                return p;
            }
            if ("existsById".equals(name)) {
                RoomParticipantId pid = (RoomParticipantId) args[0];
                return participants.containsKey(pid.getRoomId() + ":" + pid.getPlayerId());
            }
            if ("findById".equals(name)) {
                RoomParticipantId pid = (RoomParticipantId) args[0];
                return Optional.ofNullable(participants.get(pid.getRoomId() + ":" + pid.getPlayerId()));
            }
            if ("findByRoomIdAndPlayerId".equals(name)) {
                String roomId = (String) args[0];
                Long playerId = (Long) args[1];
                return Optional.ofNullable(participants.get(roomId + ":" + playerId));
            }
            if ("countByIdRoomId".equals(name)) {
                String roomId = (String) args[0];
                return participants.values().stream().filter(p -> p.getId().getRoomId().equals(roomId)).count();
            }
            return null;
        });

        orderRepository = createStub(RoomOrderRepository.class, (proxy, method, args) -> {
            if ("save".equals(method.getName())) return args[0];
            return null;
        });

        userRepository = createStub(UserRepository.class, (proxy, method, args) -> null);

        priceService = new MarketPriceService(null, null);

        messagingTemplate = new SimpMessagingTemplate((message, timeout) -> true);

        simulationTicker = new RoomSimulationTicker(null, null, null, null, null, null, null, null);

        roomService = new RoomService(
                roomRepository,
                participantRepository,
                orderRepository,
                userRepository,
                priceService,
                messagingTemplate,
                simulationTicker
        );
    }

    private User createPlayer(Long id, String email, int elo) {
        User u = new User();
        u.setId(id);
        u.setEmail(email);
        u.setUsername(email.split("@")[0]);
        u.setEloRating(elo);
        u.setTier(User.calculateTier(elo));
        u.setRole(Role.ROLE_TRADER);
        return u;
    }

    @Test
    @DisplayName("Création d'une room privée avec code PIF-XXXX et inscription automatique de l'hôte")
    void testCreateRoom() {
        User creator = createPlayer(1L, "host@pif.tn", 1200);

        RoomCreateDto dto = new RoomCreateDto();
        dto.setName("Arène Défi BVMT");
        dto.setStartDate(LocalDate.of(2023, 1, 1));
        dto.setEndDate(LocalDate.of(2023, 12, 31));
        dto.setInitialCash(new BigDecimal("100000.00"));
        dto.setGameDurationMinutes(15);
        dto.setTickRateMs(1000);

        RoomDto result = roomService.createRoom(dto, creator);

        assertNotNull(result);
        assertNotNull(result.getId());
        assertTrue(result.getId().startsWith("PIF-"));
        assertEquals("Arène Défi BVMT", result.getName());
        assertEquals(RoomStatus.LOBBY, result.getStatus());
        assertEquals(1, result.getParticipantCount());
    }

    @Test
    @DisplayName("Un joueur peut rejoindre une salle d'attente existante")
    void testJoinRoom() {
        User creator = createPlayer(1L, "host@pif.tn", 1200);
        Room room = new Room("Room Test", LocalDate.of(2023, 1, 1), LocalDate.of(2023, 12, 31),
                new BigDecimal("100000.00"), 15, 1000);
        room.setId("PIF-9999");
        rooms.put(room.getId(), room);

        User guest = createPlayer(2L, "guest@pif.tn", 1100);

        RoomParticipantDto part = roomService.joinRoom("PIF-9999", guest);

        assertNotNull(part);
        assertEquals(2L, part.getUserId());
        assertEquals("guest", part.getUsername());
        assertEquals(new BigDecimal("100000.00"), part.getCash());
    }

    @Test
    @DisplayName("Bascule de l'état prêt d'un joueur dans la salle")
    void testToggleReady() {
        Room room = new Room("Room Ready Test", LocalDate.of(2023, 1, 1), LocalDate.of(2023, 12, 31),
                new BigDecimal("100000.00"), 15, 1000);
        room.setId("PIF-1234");
        rooms.put(room.getId(), room);

        User player = createPlayer(5L, "player5@pif.tn", 1300);
        roomService.joinRoom("PIF-1234", player);

        RoomParticipantDto toggled = roomService.toggleReady("PIF-1234", player);
        assertTrue(toggled.getIsReady());

        RoomParticipantDto toggledBack = roomService.toggleReady("PIF-1234", player);
        assertFalse(toggledBack.getIsReady());
    }
}
