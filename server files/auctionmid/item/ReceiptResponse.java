package com.aurora.auctionmid.item;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ReceiptResponse(
        Long itemId,
        String title,
        String auctionType,
        String status,
        BigDecimal finalPrice,
        LocalDateTime createdAt,
        LocalDateTime endTime,
        ReceiptUserView seller,
        ReceiptUserView buyer,
        String paymentStatus,       // UNPAID / PAID
        LocalDateTime paymentTime   // when "paid"
) {}
