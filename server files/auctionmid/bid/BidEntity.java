package com.aurora.auctionmid.bid;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "bids")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BidEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "bid_id")
    private Long bidId;

    @Column(name = "item_id", nullable = false)
    private Long itemId;

    @Column(name = "bidder_id", nullable = false)
    private Long bidderId;

    @Column(name = "amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "bid_time", nullable = false,
            insertable = false, updatable = false)
    private LocalDateTime bidTime;   // default CURRENT_TIMESTAMP
}
