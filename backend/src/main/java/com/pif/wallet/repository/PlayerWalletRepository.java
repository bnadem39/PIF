package com.pif.wallet.repository;

import com.pif.wallet.model.PlayerWallet;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PlayerWalletRepository extends JpaRepository<PlayerWallet, Long> {

    /** Lecture avec verrou : deux opérations simultanées sur le même portefeuille passent l'une après l'autre. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM PlayerWallet w WHERE w.userId = :userId")
    Optional<PlayerWallet> findForUpdate(@Param("userId") Long userId);
}
