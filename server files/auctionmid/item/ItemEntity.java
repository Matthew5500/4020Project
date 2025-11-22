package com.aurora.auctionmid.item;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "item_id")
    private Long itemId;

    @Column(name = "seller_id", nullable = false)
    private Long sellerId;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "starting_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal startingPrice;

    @Column(name = "current_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal currentPrice;

    @Column(name = "minimum_price", precision = 10, scale = 2)
    private BigDecimal minimumPrice;  // for Dutch

    @Column(name = "auction_type", nullable = false, length = 20)
    private String auctionType;       // FORWARD / DUTCH

    @Column(name = "status", nullable = false, length = 20)
    private String status;            // ACTIVE / ENDED

    @Column(name = "current_winner_id")
    private Long currentWinnerId;

    @Column(name = "created_at", nullable = false, updatable = false,
            insertable = false)
    private LocalDateTime createdAt;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    // 🔹 NEW fields for payment
    @Column(name = "payment_status", nullable = false, length = 20)
    private String paymentStatus;     // UNPAID / PAID

    @Column(name = "payment_time")
    private LocalDateTime paymentTime;
}
