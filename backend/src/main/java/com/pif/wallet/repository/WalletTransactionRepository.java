package com.pif.wallet.repository;

import com.pif.wallet.model.WalletTransaction;
import com.pif.wallet.model.WalletTransactionType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, Long> {

    boolean existsByUserIdAndRoomIdAndType(Long userId, String roomId, WalletTransactionType type);

    List<WalletTransaction> findTop30ByUserIdOrderByIdDesc(Long userId);
}
