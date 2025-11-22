package com.aurora.auctionmid.bid;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BidRepository extends JpaRepository<BidEntity, Long> {

    List<BidEntity> findByItemIdOrderByAmountDesc(Long itemId);
}
