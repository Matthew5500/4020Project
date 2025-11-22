package com.aurora.auctionmid.item;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ItemRequest(
        Long sellerId,
        String title,
        String description,
        BigDecimal startingPrice,
        BigDecimal minimumPrice,   // for DUTCH
        String auctionType,        // "FORWARD" or "DUTCH"
        LocalDateTime endTime
) {}
