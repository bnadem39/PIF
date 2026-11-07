package com.pif.multiplayer.controller;

import com.pif.auth.model.User;
import com.pif.auth.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping({"/api/v1/players", "/api/players"})
public class PlayerController {

    private static final Logger log = LoggerFactory.getLogger(PlayerController.class);
    private static final Path AVATAR_DIR = Paths.get("uploads", "avatars").toAbsolutePath().normalize();
    private static final Path BACKGROUND_DIR = Paths.get("uploads", "backgrounds").toAbsolutePath().normalize();
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB for Avatar
    private static final long MAX_BG_FILE_SIZE = 25 * 1024 * 1024; // 25 MB for Background

    private final UserRepository userRepository;
    private final com.pif.gamification.service.CustomizationPermissionService permissionService;

    public PlayerController(UserRepository userRepository,
                            com.pif.gamification.service.CustomizationPermissionService permissionService) {
        this.userRepository = userRepository;
        this.permissionService = permissionService;
        try {
            Files.createDirectories(AVATAR_DIR);
            Files.createDirectories(BACKGROUND_DIR);
        } catch (IOException e) {
            log.error("Impossible de créer les répertoires de stockage uploads: {}", e.getMessage());
        }
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getMyProfile(@AuthenticationPrincipal User user) {
        User fresh = userRepository.findById(user.getId()).orElse(user);
        Map<String, Object> profile = new HashMap<>();
        profile.put("id", fresh.getId());
        profile.put("username", fresh.getUsernameAlias());
        profile.put("email", fresh.getEmail());
        profile.put("eloRating", fresh.getEloRating());
        profile.put("tier", fresh.getTier());
        profile.put("level", fresh.getLevel());
        profile.put("exp", fresh.getExp());
        profile.put("wins", fresh.getWins());
        profile.put("totalMatches", fresh.getTotalMatches());
        profile.put("profileImageUrl", fresh.getProfileImageUrl());
        profile.put("customBackgroundUrl", fresh.getCustomBackgroundUrl());
        profile.put("backgroundDarkness", fresh.getBackgroundDarkness());
        profile.put("backgroundBlur", fresh.getBackgroundBlur());
        profile.put("backgroundPosition", fresh.getBackgroundPosition());
        profile.put("themeMode", fresh.getThemeMode());
        profile.put("themeAccentColor", fresh.getThemeAccentColor());
        profile.put("themeSecondaryColor", fresh.getThemeSecondaryColor());
        profile.put("cashBalance", fresh.getCashBalance());
        return ResponseEntity.ok(profile);
    }

    @GetMapping("/{id}/public")
    public ResponseEntity<Map<String, Object>> getPublicPlayerProfile(@PathVariable Long id) {
        User target = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Joueur introuvable"));

        Map<String, Object> publicProfile = new HashMap<>();
        publicProfile.put("id", target.getId());
        publicProfile.put("username", target.getUsernameAlias());
        publicProfile.put("profileImageUrl", target.getProfileImageUrl());
        publicProfile.put("level", target.getLevel());
        publicProfile.put("exp", target.getExp());
        publicProfile.put("eloRating", target.getEloRating());
        publicProfile.put("tier", target.getTier());
        publicProfile.put("wins", target.getWins());
        publicProfile.put("totalMatches", target.getTotalMatches());
        publicProfile.put("themeAccentColor", target.getThemeAccentColor());
        return ResponseEntity.ok(publicProfile);
    }

    /**
     * TÉLÉVERSEMENT MULTIPART OFFICIEL D'AVATAR (Validation stricte format, taille & magic bytes).
     */
    @PostMapping(value = "/avatar/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentification requise.");
        }
        User freshUser = userRepository.findById(user.getId()).orElse(user);
        permissionService.checkPermission(freshUser, com.pif.gamification.model.CustomizationFeature.CUSTOM_AVATAR);

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Aucun fichier transmis.");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fichier trop volumineux. La taille maximale est de 5 Mo.");
        }

        String extension = validateImageFormat(file);

        try {
            Files.createDirectories(AVATAR_DIR);

            // Nettoyer tous les anciens fichiers d'avatar de cet utilisateur
            String[] cleanupExts = {"png", "jpg", "jpeg", "webp", "gif"};
            for (String oldExt : cleanupExts) {
                Path oldFile = AVATAR_DIR.resolve("avatar_user_" + user.getId() + "." + oldExt);
                try {
                    Files.deleteIfExists(oldFile);
                } catch (Exception ignored) {}
            }

            String filename = "avatar_user_" + user.getId() + "." + extension;
            Path destination = AVATAR_DIR.resolve(filename);

            try (InputStream in = file.getInputStream()) {
                Files.copy(in, destination, StandardCopyOption.REPLACE_EXISTING);
            }

            User fresh = userRepository.findById(user.getId()).orElse(user);
            String publicAvatarUrl = "/api/v1/players/" + fresh.getId() + "/avatar?v=" + System.currentTimeMillis();
            fresh.setProfileImageUrl(publicAvatarUrl);
            userRepository.save(fresh);

            log.info("[AVATAR] Nouvel avatar sauvegardé pour {} : {}", fresh.getUsernameAlias(), destination);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("profileImageUrl", publicAvatarUrl);
            response.put("message", "Photo de profil mise à jour avec succès.");
            response.put("user", getMyProfile(fresh).getBody());

            return ResponseEntity.ok(response);

        } catch (IOException e) {
            log.error("[AVATAR] Erreur lors de l'enregistrement du fichier: {}", e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Erreur lors de l'enregistrement de l'avatar.");
        }
    }

    /**
     * SERVING SÉCURISÉ ET CACHÉ DE L'AVATAR JOUEUR (Accès Public en lecture).
     */
    @GetMapping("/{id}/avatar")
    public ResponseEntity<Resource> getAvatar(@PathVariable Long id) {
        User target = userRepository.findById(id).orElse(null);

        // 1. Recherche fichier physique valide et le plus récent sur disque
        Path bestFile = null;
        long lastModified = -1;
        String[] extensions = {"png", "jpg", "jpeg", "webp", "gif"};
        for (String ext : extensions) {
            Path file = AVATAR_DIR.resolve("avatar_user_" + id + "." + ext);
            if (Files.exists(file) && Files.isReadable(file)) {
                try {
                    long size = Files.size(file);
                    long modified = Files.getLastModifiedTime(file).toMillis();
                    if (size > 100 && modified > lastModified) {
                        lastModified = modified;
                        bestFile = file;
                    }
                } catch (Exception ignored) {}
            }
        }

        if (bestFile != null) {
            String name = bestFile.getFileName().toString().toLowerCase();
            MediaType mediaType = MediaType.IMAGE_JPEG;
            if (name.endsWith(".png")) mediaType = MediaType.IMAGE_PNG;
            else if (name.endsWith(".webp")) mediaType = MediaType.parseMediaType("image/webp");
            else if (name.endsWith(".gif")) mediaType = MediaType.IMAGE_GIF;

            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .cacheControl(CacheControl.noCache().mustRevalidate())
                    .body(new FileSystemResource(bestFile));
        }

        // 2. Si le joueur a une image en base64 stockée en base
        if (target != null && target.getProfileImageUrl() != null && target.getProfileImageUrl().startsWith("data:image/")) {
            try {
                String dataUri = target.getProfileImageUrl();
                int commaIdx = dataUri.indexOf(',');
                if (commaIdx != -1) {
                    String meta = dataUri.substring(5, commaIdx); // ex: image/png;base64
                    String mimeType = meta.split(";")[0];
                    byte[] bytes = Base64.getDecoder().decode(dataUri.substring(commaIdx + 1));
                    return ResponseEntity.ok()
                            .contentType(MediaType.parseMediaType(mimeType))
                            .cacheControl(CacheControl.maxAge(1, TimeUnit.DAYS).cachePublic())
                            .body(new ByteArrayResource(bytes));
                }
            } catch (Exception e) {
                log.debug("[AVATAR] Échec parsing base64 avatar pour joueur {}: {}", id, e.getMessage());
            }
        }

        // 3. Image non trouvée : code 404 pour que le client affiche l'avatar initial par défaut
        return ResponseEntity.notFound().build();
    }

    /**
     * TÉLÉVERSEMENT MULTIPART DE FOND D'ÉCRAN DYNAMIQUE (Images et GIF animés jusqu'à 25 Mo).
     */
    @PostMapping(value = "/background/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> uploadBackground(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal User user) {

        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentification requise.");
        }
        User freshUser = userRepository.findById(user.getId()).orElse(user);
        permissionService.checkPermission(freshUser, com.pif.gamification.model.CustomizationFeature.CUSTOM_BACKGROUND);

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Aucun fichier transmis.");
        }
        if (file.getSize() > MAX_BG_FILE_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fichier trop volumineux. La taille maximale est de 25 Mo.");
        }

        String extension = validateImageFormat(file);

        try {
            Files.createDirectories(BACKGROUND_DIR);

            // Nettoyer tous les anciens fichiers de fond d'écran de cet utilisateur
            String[] cleanupExts = {"gif", "png", "jpg", "jpeg", "webp"};
            for (String oldExt : cleanupExts) {
                Path oldFile = BACKGROUND_DIR.resolve("bg_user_" + user.getId() + "." + oldExt);
                try {
                    Files.deleteIfExists(oldFile);
                } catch (Exception ignored) {}
            }

            String filename = "bg_user_" + user.getId() + "." + extension;
            Path destination = BACKGROUND_DIR.resolve(filename);

            try (InputStream in = file.getInputStream()) {
                Files.copy(in, destination, StandardCopyOption.REPLACE_EXISTING);
            }

            User fresh = userRepository.findById(user.getId()).orElse(user);
            String publicBgUrl = "/api/v1/players/" + fresh.getId() + "/background?v=" + System.currentTimeMillis();
            fresh.setCustomBackgroundUrl(publicBgUrl);
            userRepository.save(fresh);

            log.info("[BACKGROUND] Nouveau fond d'écran sauvegardé pour {} : {}", fresh.getUsernameAlias(), destination);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("customBackgroundUrl", publicBgUrl);
            response.put("message", "Fond d'écran mis à jour avec succès.");
            response.put("user", getMyProfile(fresh).getBody());

            return ResponseEntity.ok(response);

        } catch (IOException e) {
            log.error("[BACKGROUND] Erreur lors de l'enregistrement du fichier: {}", e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Erreur lors de l'enregistrement de l'arrière-plan.");
        }
    }

    /**
     * SERVING PUBLIC ET CACHÉ DU FOND D'ÉCRAN JOUEUR (Supporte PNG, JPG, WEBP, GIF).
     */
    @GetMapping("/{id}/background")
    public ResponseEntity<Resource> getBackground(@PathVariable Long id) {
        User target = userRepository.findById(id).orElse(null);

        // 1. Recherche fichier physique valide (> 100 octets) et le plus récent dans BACKGROUND_DIR
        Path bestFile = null;
        long lastModified = -1;
        String[] extensions = {"gif", "png", "jpg", "jpeg", "webp"};
        for (String ext : extensions) {
            Path file = BACKGROUND_DIR.resolve("bg_user_" + id + "." + ext);
            if (Files.exists(file) && Files.isReadable(file)) {
                try {
                    long size = Files.size(file);
                    long modified = Files.getLastModifiedTime(file).toMillis();
                    if (size > 100 && modified > lastModified) {
                        lastModified = modified;
                        bestFile = file;
                    }
                } catch (Exception ignored) {}
            }
        }

        if (bestFile != null) {
            String name = bestFile.getFileName().toString().toLowerCase();
            MediaType mediaType = MediaType.IMAGE_JPEG;
            if (name.endsWith(".gif")) mediaType = MediaType.IMAGE_GIF;
            else if (name.endsWith(".png")) mediaType = MediaType.IMAGE_PNG;
            else if (name.endsWith(".webp")) mediaType = MediaType.parseMediaType("image/webp");

            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .cacheControl(CacheControl.noCache().mustRevalidate())
                    .body(new FileSystemResource(bestFile));
        }

        // 2. Si le joueur a une image en data URI en base de données
        if (target != null && target.getCustomBackgroundUrl() != null && target.getCustomBackgroundUrl().startsWith("data:image/")) {
            try {
                String dataUri = target.getCustomBackgroundUrl();
                int commaIdx = dataUri.indexOf(',');
                if (commaIdx != -1) {
                    String meta = dataUri.substring(5, commaIdx);
                    String mimeType = meta.split(";")[0];
                    byte[] bytes = Base64.getDecoder().decode(dataUri.substring(commaIdx + 1));
                    return ResponseEntity.ok()
                            .contentType(MediaType.parseMediaType(mimeType))
                            .cacheControl(CacheControl.maxAge(1, TimeUnit.DAYS).cachePublic())
                            .body(new ByteArrayResource(bytes));
                }
            } catch (Exception ignored) {}
        }

        return ResponseEntity.notFound().build();
    }

    @PutMapping("/avatar")
    public ResponseEntity<Map<String, Object>> updateAvatar(@RequestBody Map<String, String> body,
                                                            @AuthenticationPrincipal User user) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentification requise.");
        }
        User fresh = userRepository.findById(user.getId()).orElse(user);
        String avatarUrl = body.get("profileImageUrl");
        if (avatarUrl != null && !avatarUrl.isBlank()) {
            permissionService.checkPermission(fresh, com.pif.gamification.model.CustomizationFeature.CUSTOM_AVATAR);
        }
        fresh.setProfileImageUrl(avatarUrl);
        userRepository.save(fresh);
        return getMyProfile(fresh);
    }

    @PutMapping("/appearance")
    public ResponseEntity<Map<String, Object>> updateAppearance(@RequestBody Map<String, Object> body,
                                                                @AuthenticationPrincipal User user) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentification requise.");
        }
        User fresh = userRepository.findById(user.getId()).orElse(user);

        if (body.containsKey("customBackgroundUrl")) {
            Object val = body.get("customBackgroundUrl");
            String bg = val != null ? val.toString().trim() : null;
            if (bg != null && !bg.isBlank()) {
                permissionService.checkPermission(fresh, com.pif.gamification.model.CustomizationFeature.CUSTOM_BACKGROUND);
            } else {
                // Si le fond est supprimé, nettoyer les fichiers physiques sur disque
                String[] cleanupExts = {"gif", "png", "jpg", "jpeg", "webp"};
                for (String oldExt : cleanupExts) {
                    Path oldFile = BACKGROUND_DIR.resolve("bg_user_" + fresh.getId() + "." + oldExt);
                    try { Files.deleteIfExists(oldFile); } catch (Exception ignored) {}
                }
            }
            fresh.setCustomBackgroundUrl(bg);
        }
        if (body.containsKey("backgroundDarkness")) {
            try {
                fresh.setBackgroundDarkness(Integer.parseInt(body.get("backgroundDarkness").toString()));
            } catch (Exception ignored) {}
        }
        if (body.containsKey("backgroundBlur")) {
            try {
                int blur = Integer.parseInt(body.get("backgroundBlur").toString());
                if (blur > 0) {
                    permissionService.checkPermission(fresh, com.pif.gamification.model.CustomizationFeature.ADVANCED_BACKGROUND_EFFECTS);
                }
                fresh.setBackgroundBlur(blur);
            } catch (ResponseStatusException rse) {
                throw rse;
            } catch (Exception ignored) {}
        }
        if (body.containsKey("backgroundPosition") && body.get("backgroundPosition") != null) {
            fresh.setBackgroundPosition(body.get("backgroundPosition").toString());
        }
        if (body.containsKey("themeMode") && body.get("themeMode") != null) {
            fresh.setThemeMode(body.get("themeMode").toString());
        }
        if (body.containsKey("themeAccentColor") && body.get("themeAccentColor") != null) {
            fresh.setThemeAccentColor(body.get("themeAccentColor").toString().trim());
        }
        if (body.containsKey("themeSecondaryColor") && body.get("themeSecondaryColor") != null) {
            fresh.setThemeSecondaryColor(body.get("themeSecondaryColor").toString().trim());
        }

        userRepository.save(fresh);
        return getMyProfile(fresh);
    }

    @PutMapping("/theme")
    public ResponseEntity<Map<String, Object>> updateTheme(@RequestBody Map<String, String> body,
                                                           @AuthenticationPrincipal User user) {
        User fresh = userRepository.findById(user.getId()).orElse(user);

        String bgUrl = body.get("customBackgroundUrl");
        String accentColor = body.get("themeAccentColor");

        if (bgUrl != null) {
            fresh.setCustomBackgroundUrl(bgUrl);
        }
        if (accentColor != null && !accentColor.isBlank()) {
            fresh.setThemeAccentColor(accentColor.trim());
        }

        userRepository.save(fresh);
        return getMyProfile(fresh);
    }

    /**
     * Validation stricte des Magic Bytes pour prévenir tout téléversement malveillant.
     */
    private String validateImageFormat(MultipartFile file) {
        try (InputStream is = file.getInputStream()) {
            byte[] header = new byte[12];
            int read = is.read(header);
            if (read < 4) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fichier corrompu ou illisible.");
            }

            // GIF magic bytes: 47 49 46 38 (GIF8)
            if (header[0] == 0x47 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x38) {
                return "gif";
            }

            // PNG magic bytes: 89 50 4E 47
            if ((header[0] & 0xFF) == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47) {
                return "png";
            }

            // JPEG magic bytes: FF D8 FF
            if ((header[0] & 0xFF) == 0xFF && (header[1] & 0xFF) == 0xD8 && (header[2] & 0xFF) == 0xFF) {
                return "jpg";
            }

            // WEBP magic bytes: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
            if (read >= 12 &&
                    header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46 &&
                    header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50) {
                return "webp";
            }

            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Format d'image non supporté. Seuls PNG, JPG, JPEG et WEBP sont acceptés.");
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Erreur lors de la validation du fichier image.");
        }
    }
}
