package com.aurora.auctionmid.item;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ItemRepository extends JpaRepository<ItemEntity, Long> {

    List<ItemEntity> findByStatus(String status);

    List<ItemEntity> findBySellerId(Long sellerId);

    List<ItemEntity> findBySellerIdAndStatus(Long sellerId, String status);

    // simple text search on title OR description (case-insensitive)
    List<ItemEntity> findByTitleContainingIgnoreCaseOrDescriptionContainingIgnoreCase(
            String titlePart,
            String descriptionPart
    );
}
