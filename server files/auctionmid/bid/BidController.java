package com.aurora.auctionmid.bid;

import com.aurora.auctionmid.item.ItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/items")
@RequiredArgsConstructor
@CrossOrigin
public class BidController {

    private final BidService bidService;
    private final ItemService itemService;

    /**
     * POST /api/items/{itemId}/bids
     * Place a bid on a FORWARD auction.
     */
    @PostMapping("/{itemId}/bids")
    public ResponseEntity<?> placeBid(@PathVariable Long itemId,
                                      @RequestBody BidRequest request) {
        try {
            BidResponse response = bidService.placeBid(itemId, request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    /**
     * GET /api/items/{itemId}/bids
     * List bids for an item (highest first).
     */
    @GetMapping("/{itemId}/bids")
    public List<BidResponse> getBids(@PathVariable Long itemId) {
        return bidService.getBidsForItem(itemId);
    }

    /**
     * GET /api/items/{itemId}/dutch/price
     * Get current price for a DUTCH auction.
     */
    @GetMapping("/{itemId}/dutch/price")
    public ResponseEntity<?> getDutchPrice(@PathVariable Long itemId) {
        try {
            BigDecimal price = itemService.getCurrentDutchPrice(itemId);
            return ResponseEntity.ok(Map.of("currentPrice", price));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    /**
     * POST /api/items/{itemId}/dutch/accept
     * Buyer accepts the current Dutch price (first come, first served).
     */
    @PostMapping("/{itemId}/dutch/accept")
    public ResponseEntity<?> acceptDutch(@PathVariable Long itemId,
                                         @RequestBody Map<String, Long> body) {
        Long buyerId = body.get("buyerId");
        try {
            var response = itemService.acceptDutch(itemId, buyerId);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }
}
