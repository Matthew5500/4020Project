package com.aurora.auctionmid.auth.dto;

public record RegisterRequest(
        String username,
        String password,
        String email,
        String firstName,
        String lastName,
        String phone
) {}
