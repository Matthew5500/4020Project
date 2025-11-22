package com.aurora.auctionmid.item;

public record ReceiptUserView(
        Long userId,
        String username,
        String firstName,
        String lastName,
        String email
) {}
