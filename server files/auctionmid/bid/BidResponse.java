package com.aurora.auctionmid.bid;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record BidResponse(
        Long bidId,
        Long itemId,
        Long bidderId,
        BigDecimal amount,
        LocalDateTime bidTime
) {}
