package com.pif.multiplayer.repository;

import com.pif.multiplayer.model.Friendship;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FriendshipRepository extends JpaRepository<Friendship, Long> {

    @Query("SELECT f FROM Friendship f JOIN FETCH f.requester JOIN FETCH f.addressee " +
           "WHERE (f.requester.id = :userId OR f.addressee.id = :userId) AND f.status = 'ACCEPTED'")
    List<Friendship> findAcceptedFriendships(@Param("userId") Long userId);

    @Query("SELECT f FROM Friendship f WHERE " +
           "(f.requester.id = :u1 AND f.addressee.id = :u2) OR " +
           "(f.requester.id = :u2 AND f.addressee.id = :u1)")
    Optional<Friendship> findBetweenUsers(@Param("u1") Long u1, @Param("u2") Long u2);
}

