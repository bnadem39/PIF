package com.pif.trading.repository;

import com.pif.auth.model.User;
import com.pif.trading.model.Position;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PositionRepository extends JpaRepository<Position, Long> {

    Optional<Position> findByUserAndSymbol(User user, String symbol);

    List<Position> findByUser(User user);

    @Query("select p.user.id, count(p) from Position p where p.quantity > 0 group by p.user.id")
    List<Object[]> openPositionsByUser();

    void deleteByUser(User user);
}
