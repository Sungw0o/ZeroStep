package com.example.backend.global.response;

public record ApiResponse<T>(T data, Object meta) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(data, null);
    }
}

