package com.college.cloudtrail.controller;

import com.college.cloudtrail.model.LogEvent;
import com.college.cloudtrail.repository.AwsAccountRepository;
import com.college.cloudtrail.repository.LogEventRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/logs")
public class LogController {

    private final LogEventRepository logs;
    private final AwsAccountRepository accounts;

    public LogController(
            LogEventRepository logs,
            AwsAccountRepository accounts) {

        this.logs = logs;
        this.accounts = accounts;
    }

    // Get all logs
    @GetMapping
    public List<LogEvent> getAll() {
        return logs.findAllByOrderByEventTimeDesc();
    }

    // Get latest 10 logs
    @GetMapping("/recent")
    public List<LogEvent> recent() {
        return logs.findTop10ByOrderByEventTimeDesc();
    }

    // Test API
    @GetMapping("/test")
    public Map<String, String> test() {

        return Map.of(
                "status", "SUCCESS",
                "message", "Log API is working",
                "timestamp", LocalDateTime.now()
                        .withNano(0)
                        .toString()
        );
    }

    // Get logs by account
    @GetMapping("/account/{accountId}")
    public List<LogEvent> byAccount(
            @PathVariable String accountId) {

        return logs.findByAccountIdOrderByEventTimeDesc(accountId);
    }

    // Search logs
    @GetMapping("/search")
    public List<LogEvent> search(
            @RequestParam String keyword) {

        return logs.search(
                "%" + keyword.trim().toLowerCase() + "%"
        );
    }

    // Get one log
    @GetMapping("/{id}")
    public LogEvent getOne(
            @PathVariable Long id) {

        return logs.findById(id)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Log not found"
                        )
                );
    }

    // Add CloudTrail-style log
    @PostMapping
    public ResponseEntity<LogEvent> add(
            @RequestBody LogEvent body) {

        // accountId and eventName are required
        if (isBlank(body.getAccountId())
                || isBlank(body.getEventName())) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "accountId and eventName are required"
            );
        }

        // Always create a new log
        body.setId(null);

        // Get account information from database
        accounts.findByAccountId(body.getAccountId())
                .ifPresent(account -> {

                    if (isBlank(body.getAccountName())) {
                        body.setAccountName(
                                account.getAccountName()
                        );
                    }

                    if (isBlank(body.getRegion())) {
                        body.setRegion(
                                account.getRegion()
                        );
                    }
                });

        // Generate event ID if not provided
        if (isBlank(body.getEventId())) {

            body.setEventId(
                    "evt-" +
                    UUID.randomUUID()
                            .toString()
                            .substring(0, 8)
            );
        }

        // Generate event time if not provided
        if (body.getEventTime() == null) {

            body.setEventTime(
                    LocalDateTime.now().withNano(0)
            );
        }

        // Default status = SUCCESS
        if (isBlank(body.getStatus())) {

            body.setStatus("SUCCESS");

        } else {

            body.setStatus(
                    body.getStatus().toUpperCase()
            );
        }

        // Save into PostgreSQL
        LogEvent saved = logs.save(body);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(saved);
    }

    public LogEventRepository getLogs() {
		return logs;
	}

	public AwsAccountRepository getAccounts() {
		return accounts;
	}

	// Check empty values
    private boolean isBlank(String value) {

        return value == null || value.isBlank();
    }
}