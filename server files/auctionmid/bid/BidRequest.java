package com.aurora.auctionmid.bid;

import java.math.BigDecimal;

public record BidRequest(
        Long bidderId,       // userId
        BigDecimal amount
) {}
