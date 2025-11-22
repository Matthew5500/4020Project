package com.aurora.auctionmid.auth.dto;

public record LoginResponse(
        String token,
        UserView user
) {}
