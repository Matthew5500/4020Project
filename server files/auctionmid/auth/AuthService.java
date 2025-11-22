package com.aurora.auctionmid.auth;

import com.aurora.auctionmid.auth.dto.LoginRequest;
import com.aurora.auctionmid.auth.dto.RegisterRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final RestTemplate restTemplate;

    // from application.properties
    @Value("${auth.base-url}")
    private String authBaseUrl;

    public ResponseEntity<String> register(RegisterRequest request) {
        String url = authBaseUrl + "/api/auth/register";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<RegisterRequest> entity = new HttpEntity<>(request, headers);

        return restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
    }

    public ResponseEntity<String> login(LoginRequest request) {
        String url = authBaseUrl + "/api/auth/login";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<LoginRequest> entity = new HttpEntity<>(request, headers);

        return restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
    }
}
