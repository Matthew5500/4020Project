package com.aurora.auctionmid.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

@Component
public class JwtUtil {

    private final Key key;
    private final long ttlMinutes;

    public JwtUtil(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.ttlMinutes:60}") long ttlMinutes
    ) {
        // For dev: derive key from secret string
        this.key = Keys.hmacShaKeyFor(secret.getBytes());
        this.ttlMinutes = ttlMinutes;
    }

    public String generate(String username) {
        Instant now = Instant.now();
        Instant expiry = now.plus(ttlMinutes, ChronoUnit.MINUTES);

        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(expiry))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public String getUsername(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }
}
