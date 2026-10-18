package com.pif.trading.repository;

import com.pif.market.model.User;
import com.pif.trading.model.OrderTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderTransactionRepository extends JpaRepository<OrderTransaction, Long> {

    List<OrderTransaction> findByUserOrderByCreatedAtDesc(User user);

    List<OrderTransaction> findByUserAndSymbolOrderByCreatedAtDesc(User user, String symbol);

    void deleteByUser(User user);
}
