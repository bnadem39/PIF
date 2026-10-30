package com.pif.trading.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class PriceUnavailableException extends RuntimeException {
    public PriceUnavailableException(String message) {
        super(message);
    }
}
