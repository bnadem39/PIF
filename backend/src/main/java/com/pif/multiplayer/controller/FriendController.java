package com.pif.multiplayer.controller;

import com.pif.auth.model.User;
import com.pif.multiplayer.dto.FriendDto;
import com.pif.multiplayer.service.FriendService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/friends")
public class FriendController {

    private final FriendService friendService;

    public FriendController(FriendService friendService) {
        this.friendService = friendService;
    }

    @GetMapping
    public ResponseEntity<List<FriendDto>> getFriends(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(friendService.getFriends(user.getId()));
    }

    @PostMapping("/add")
    public ResponseEntity<FriendDto> addFriend(@RequestBody Map<String, String> body,
                                               @AuthenticationPrincipal User user) {
        String username = body.get("username");
        if (username == null || username.isBlank()) {
            throw new IllegalArgumentException("Le pseudo de l'ami est obligatoire.");
        }
        return ResponseEntity.ok(friendService.addFriend(user, username.trim()));
    }

    @GetMapping("/search")
    public ResponseEntity<List<FriendDto>> searchPlayers(@RequestParam(required = false) String query,
                                                         @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(friendService.searchPlayers(query, user.getId()));
    }
}

