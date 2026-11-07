package com.pif.multiplayer.service;

import com.pif.auth.model.User;
import com.pif.auth.repository.UserRepository;
import com.pif.multiplayer.dto.FriendDto;
import com.pif.multiplayer.model.Friendship;
import com.pif.multiplayer.repository.FriendshipRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class FriendService {

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;

    public FriendService(FriendshipRepository friendshipRepository, UserRepository userRepository) {
        this.friendshipRepository = friendshipRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<FriendDto> getFriends(Long userId) {
        List<Friendship> friendships = friendshipRepository.findAcceptedFriendships(userId);
        return friendships.stream().map(f -> {
            User friend = f.getRequester().getId().equals(userId) ? f.getAddressee() : f.getRequester();
            FriendDto dto = new FriendDto();
            dto.setId(f.getId());
            dto.setFriendId(friend.getId());
            dto.setUsername(friend.getUsernameAlias());
            dto.setStatus(f.getStatus());
            dto.setEloRating(friend.getEloRating());
            dto.setTier(friend.getTier());
            dto.setLevel(friend.getLevel());
            dto.setThemeAccentColor(friend.getThemeAccentColor());
            dto.setOnline(true); // Indication temps réel
            return dto;
        }).collect(Collectors.toList());
    }

    public FriendDto addFriend(User currentUser, String friendUsername) {
        if (currentUser.getUsernameAlias().equalsIgnoreCase(friendUsername)) {
            throw new IllegalArgumentException("Impossible de s'ajouter soi-même en ami.");
        }

        User friend = userRepository.findAll().stream()
                .filter(u -> u.getUsernameAlias().equalsIgnoreCase(friendUsername) || u.getEmail().equalsIgnoreCase(friendUsername))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Joueur introuvable avec le pseudo : " + friendUsername));

        Friendship friendship = friendshipRepository.findBetweenUsers(currentUser.getId(), friend.getId())
                .orElseGet(() -> new Friendship(currentUser, friend, "ACCEPTED"));

        friendship.setStatus("ACCEPTED");
        Friendship saved = friendshipRepository.save(friendship);

        FriendDto dto = new FriendDto();
        dto.setId(saved.getId());
        dto.setFriendId(friend.getId());
        dto.setUsername(friend.getUsernameAlias());
        dto.setStatus(saved.getStatus());
        dto.setEloRating(friend.getEloRating());
        dto.setTier(friend.getTier());
        dto.setLevel(friend.getLevel());
        dto.setThemeAccentColor(friend.getThemeAccentColor());
        dto.setOnline(true);
        return dto;
    }

    @Transactional(readOnly = true)
    public List<FriendDto> searchPlayers(String query, Long currentUserId) {
        return userRepository.findAll().stream()
                .filter(u -> !u.getId().equals(currentUserId))
                .filter(u -> query == null || query.isBlank() || u.getUsernameAlias().toLowerCase().contains(query.toLowerCase()))
                .limit(10)
                .map(u -> {
                    FriendDto dto = new FriendDto();
                    dto.setFriendId(u.getId());
                    dto.setUsername(u.getUsernameAlias());
                    dto.setEloRating(u.getEloRating());
                    dto.setTier(u.getTier());
                    dto.setLevel(u.getLevel());
                    dto.setThemeAccentColor(u.getThemeAccentColor());
                    dto.setOnline(true);
                    return dto;
                })
                .collect(Collectors.toList());
    }
}

