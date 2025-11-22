package com.aurora.auctionmid.auth.dto;

public record LoginRequest(
        String username,
        String password
) {}
