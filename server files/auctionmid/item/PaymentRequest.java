package com.aurora.auctionmid.item;

/**
 * Simple payment request. We don't actually validate cards;
 * this is just to simulate a payment step.
 */
public record PaymentRequest(
        Long payerId,   
        String method,   
        String note       
) {}
