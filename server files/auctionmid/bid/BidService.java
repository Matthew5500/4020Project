package com.aurora.auctionmid.bid;

import com.aurora.auctionmid.item.ItemEntity;
import com.aurora.auctionmid.item.ItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BidService {

    private final BidRepository bidRepository;
    private final ItemRepository itemRepository;

    public BidResponse placeBid(Long itemId, BidRequest request) {
        ItemEntity item = itemRepository.findById(itemId)
            .orElseThrow(() -> new IllegalArgumentException("Item not found"));

        if (!"FORWARD".equalsIgnoreCase(item.getAuctionType())) {
            throw new IllegalArgumentException("Bidding is only allowed on FORWARD auctions");
        }

        // 🔹 If already ended → no more bids
        if (!"ACTIVE".equalsIgnoreCase(item.getStatus())) {
            throw new IllegalArgumentException("Auction is not active");
        }

        // 🔹 If end_time passed, mark ended and reject
        if (item.getEndTime() != null && LocalDateTime.now().isAfter(item.getEndTime())) {
            item.setStatus("ENDED");
            itemRepository.save(item);
            throw new IllegalArgumentException("Auction has ended");
        }


        if (request.bidderId() == null) {
            throw new IllegalArgumentException("bidderId is required");
        }
        if (request.amount() == null) {
            throw new IllegalArgumentException("amount is required");
        }

        BigDecimal amount = request.amount();

        if (amount.compareTo(item.getStartingPrice()) < 0) {
            throw new IllegalArgumentException("Bid must be >= starting price");
        }
        if (amount.compareTo(item.getCurrentPrice()) <= 0) {
            throw new IllegalArgumentException("Bid must be higher than current price");
        }

        BidEntity bid = BidEntity.builder()
                .itemId(itemId)
                .bidderId(request.bidderId())
                .amount(amount)
                .build();

        BidEntity savedBid = bidRepository.save(bid);

        item.setCurrentPrice(amount);
        item.setCurrentWinnerId(request.bidderId());
        itemRepository.save(item);

        return new BidResponse(
                savedBid.getBidId(),
                savedBid.getItemId(),
                savedBid.getBidderId(),
                savedBid.getAmount(),
                savedBid.getBidTime()
        );
    }

    public List<BidResponse> getBidsForItem(Long itemId) {
        return bidRepository.findByItemIdOrderByAmountDesc(itemId)
                .stream()
                .map(b -> new BidResponse(
                        b.getBidId(),
                        b.getItemId(),
                        b.getBidderId(),
                        b.getAmount(),
                        b.getBidTime()
                ))
                .toList();
    }
}
