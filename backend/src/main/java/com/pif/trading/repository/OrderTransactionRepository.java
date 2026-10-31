package com.pif.trading.repository;

import com.pif.auth.model.User;
import com.pif.trading.model.OrderTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderTransactionRepository extends JpaRepository<OrderTransaction, Long> {

    List<OrderTransaction> findByUserOrderByCreatedAtDesc(User user);

    List<OrderTransaction> findByUserAndSymbolOrderByCreatedAtDesc(User user, String symbol);

    void deleteByUser(User user);

    /** Par utilisateur : nombre d'ordres et montant échangé (quantité × prix d'exécution). */
    @Query("select t.user.id, count(t), coalesce(sum(t.quantity * t.executionPrice), 0) from OrderTransaction t group by t.user.id")
    List<Object[]> activityByUser();
}
