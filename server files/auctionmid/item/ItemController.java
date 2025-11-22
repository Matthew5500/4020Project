package com.aurora.auctionmid.item;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/items")
@RequiredArgsConstructor
@CrossOrigin
public class ItemController {

    private final ItemService itemService;

    @GetMapping
    public List<ItemResponse> getAllItems() {
        return itemService.listAllItems();
    }

    @GetMapping("/active")
    public List<ItemResponse> getActiveItems() {
        return itemService.listActiveItems();
    }

    @GetMapping("/ended")
    public List<ItemResponse> getEndedItems() {
        return itemService.listEndedItems();
    }

    @PostMapping
    public ResponseEntity<?> createItem(@RequestBody ItemRequest request) {
        try {
            ItemResponse created = itemService.createItem(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", ex.getMessage()));
        }
    }

    @GetMapping("/{itemId}")
    public ResponseEntity<?> getItem(@PathVariable Long itemId) {
        try {
            ItemResponse resp = itemService.getItem(itemId);
            return ResponseEntity.ok(resp);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", ex.getMessage()));
        }
    }

    @GetMapping("/search")
    public List<ItemResponse> searchItems(
            @RequestParam(name = "q", required = false) String query
    ) {
        return itemService.searchItems(query);
    }

    @PostMapping("/{itemId}/end")
    public ResponseEntity<?> endAuction(@PathVariable Long itemId) {
        try {
            ItemResponse resp = itemService.endAuction(itemId);
            return ResponseEntity.ok(resp);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", ex.getMessage()));
        }
    }

    @GetMapping("/{itemId}/receipt")
    public ResponseEntity<?> getReceipt(@PathVariable Long itemId) {
        try {
            ReceiptResponse receipt = itemService.getReceipt(itemId);
            return ResponseEntity.ok(receipt);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", ex.getMessage()));
        }
    }

    /**
     * POST /api/items/{itemId}/pay
     * Simulate payment by the winning bidder.
     */
    @PostMapping("/{itemId}/pay")
    public ResponseEntity<?> payForItem(@PathVariable Long itemId,
                                        @RequestBody PaymentRequest request) {
        try {
            ReceiptResponse receipt = itemService.payForItem(itemId, request);
            return ResponseEntity.ok(receipt);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", ex.getMessage()));
        }
    }
}
