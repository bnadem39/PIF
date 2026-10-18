package com.pif.trading.repository;

import com.pif.market.model.User;
import com.pif.trading.model.Position;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PositionRepository extends JpaRepository<Position, Long> {

    Optional<Position> findByUserAndSymbol(User user, String symbol);

    List<Position> findByUser(User user);

    void deleteByUser(User user);
}
