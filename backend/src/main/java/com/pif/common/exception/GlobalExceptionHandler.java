package com.pif.common.exception;

import com.pif.marketdata.exception.PriceUnavailableException;
import com.pif.trading.exception.InsufficientPositionException;
import com.pif.trading.exception.InsufficientFundsException;

import com.pif.stresstest.service.AiServiceUnavailableException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Format d'erreur JSON unique pour toute l'API : {status, error, message}.
 * Le frontend affiche directement le champ "message".
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler({
            InsufficientFundsException.class,
            InsufficientPositionException.class,
            PriceUnavailableException.class,
            IllegalArgumentException.class
    })
    public ResponseEntity<Map<String, Object>> handleBusinessError(RuntimeException ex) {
        return body(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + " : " + e.getDefaultMessage())
                .collect(Collectors.joining(" ; "));
        return body(HttpStatus.BAD_REQUEST, message);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleUnreadable(HttpMessageNotReadableException ex) {
        return body(HttpStatus.BAD_REQUEST, "Requête JSON invalide ou valeur non reconnue.");
    }

    @ExceptionHandler(AiServiceUnavailableException.class)
    public ResponseEntity<Map<String, Object>> handleAiUnavailable(AiServiceUnavailableException ex) {
        log.warn("{} ({})", ex.getMessage(), ex.getCause() != null ? ex.getCause().getMessage() : "");
        return body(HttpStatus.SERVICE_UNAVAILABLE, ex.getMessage());
    }

    @ExceptionHandler(PessimisticLockingFailureException.class)
    public ResponseEntity<Map<String, Object>> handleLock(PessimisticLockingFailureException ex) {
        log.warn("Conflit de verrouillage : {}", ex.getMessage());
        return body(HttpStatus.CONFLICT, "Un autre ordre est en cours sur ce compte. Réessayez.");
    }

    private ResponseEntity<Map<String, Object>> body(HttpStatus status, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);
        return ResponseEntity.status(status).body(body);
    }
}
