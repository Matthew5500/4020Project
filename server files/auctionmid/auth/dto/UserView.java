package com.aurora.auctionmid.auth.dto;

public record UserView(
        Long id,
        String username,
        String email,
        String firstName,
        String lastName,
        String phone
) {}
