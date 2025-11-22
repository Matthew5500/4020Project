package com.aurora.auctionmid.item;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ItemResponse(
        Long id,
        Long sellerId,
        String title,
        String description,
        BigDecimal startingPrice,
        BigDecimal currentPrice,
        BigDecimal minimumPrice,
        String auctionType,
        String status,
        Long currentWinnerId,
        LocalDateTime createdAt,
        LocalDateTime endTime
) {}
