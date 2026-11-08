package com.pif.multiplayer.service;

import com.pif.marketdata.service.MarketPriceService;
import com.pif.multiplayer.model.Room;
import com.pif.multiplayer.model.RoomOrder;
import com.pif.multiplayer.model.RoomOrderSide;
import com.pif.multiplayer.model.RoomParticipant;
import com.pif.multiplayer.repository.RoomOrderRepository;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

/**
 * Revalorise les participants d'une salle : equite = cash + valeur de marche des positions
 * (quantite nette par ticker x dernier cours connu a la date simulee).
 * Ne sauvegarde rien : l'appelant persiste les participants.
 */
@Component
public class RoomEquityValuator {

    private final RoomOrderRepository orderRepository;
    private final MarketPriceService priceService;

    public RoomEquityValuator(RoomOrderRepository orderRepository, MarketPriceService priceService) {
        this.orderRepository = orderRepository;
        this.priceService = priceService;
    }

    public void revalue(Room room, List<RoomParticipant> participants, LocalDate simulatedDate) {
        if (room == null || participants == null || participants.isEmpty()) {
            return;
        }
        LocalDate date = simulatedDate != null ? simulatedDate : room.getStartDate();
        String dateStr = date != null ? date.toString() : null;

        // Ordres tries du plus recent au plus ancien : on les parcourt a l'envers (chronologique).
        List<RoomOrder> orders = orderRepository.findByRoomIdOrderByCreatedAtDesc(room.getId());
        Map<Long, Map<String, Integer>> netQty = new HashMap<>();
        Map<String, BigDecimal> lastOrderPrice = new HashMap<>();
        for (int i = orders.size() - 1; i >= 0; i--) {
            RoomOrder o = orders.get(i);
            String sym = o.getTicker().toUpperCase().trim();
            int signed = o.getSide() == RoomOrderSide.BUY ? o.getQuantity() : -o.getQuantity();
            netQty.computeIfAbsent(o.getUser().getId(), k -> new HashMap<>()).merge(sym, signed, Integer::sum);
            lastOrderPrice.put(sym, o.getPrice());
        }

        Map<String, BigDecimal> priceCache = new HashMap<>();
        BigDecimal initialCash = room.getInitialCash();

        for (RoomParticipant p : participants) {
            BigDecimal positionsValue = BigDecimal.ZERO;
            Map<String, Integer> positions = netQty.get(p.getUser().getId());
            if (positions != null) {
                for (Map.Entry<String, Integer> e : positions.entrySet()) {
                    if (e.getValue() == 0) continue;
                    String sym = e.getKey();
                    BigDecimal px = priceCache.computeIfAbsent(sym, s ->
                            priceService.findClosePrice(s, dateStr)
                                    .orElse(lastOrderPrice.getOrDefault(s, BigDecimal.ZERO)));
                    positionsValue = positionsValue.add(px.multiply(BigDecimal.valueOf(e.getValue())));
                }
            }

            BigDecimal equity = p.getCash().add(positionsValue).setScale(2, RoundingMode.HALF_UP);
            p.setTotalEquity(equity);
            if (initialCash != null && initialCash.compareTo(BigDecimal.ZERO) > 0) {
                p.setPnlPercentage(equity.subtract(initialCash)
                        .divide(initialCash, 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100.0)));
            }
        }
    }
}
