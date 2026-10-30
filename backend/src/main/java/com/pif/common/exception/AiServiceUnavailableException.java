package com.pif.common.exception;

public class AiServiceUnavailableException extends RuntimeException {
    public AiServiceUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
