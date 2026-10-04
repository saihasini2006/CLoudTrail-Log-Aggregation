package com.college.cloudtrail.controller;

import com.college.cloudtrail.model.AwsAccount;
import com.college.cloudtrail.repository.AwsAccountRepository;
import com.college.cloudtrail.repository.LogEventRepository;
import com.college.cloudtrail.util.TimeUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    private final AwsAccountRepository accounts;
    private final LogEventRepository logs;

    public AccountController(AwsAccountRepository accounts, LogEventRepository logs) {
        this.accounts = accounts;
        this.logs = logs;
    }

    // What the frontend receives for each account
    public record AccountResponse(Long id, String accountId, String accountName, String region,
                                  String status, long totalLogs, String lastActivity) {}

    private AccountResponse toResponse(AwsAccount a) {
        long total = logs.countByAccountId(a.getAccountId());
        String last = logs.findFirstByAccountIdOrderByEventTimeDesc(a.getAccountId())
                .map(l -> TimeUtil.ago(l.getEventTime())).orElse("-");
        return new AccountResponse(a.getId(), a.getAccountId(), a.getAccountName(), a.getRegion(),
                a.getStatus(), total, last);
    }

    @GetMapping
    public List<AccountResponse> getAll() {
        return accounts.findAll().stream().map(this::toResponse).toList();
    }

    @GetMapping("/{id}")
    public AccountResponse getOne(@PathVariable Long id) {
        return accounts.findById(id).map(this::toResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
    }

    @PostMapping
    public ResponseEntity<AccountResponse> add(@RequestBody AwsAccount body) {
        if (body.getAccountId() == null || body.getAccountId().isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "accountId is required");
        if (accounts.existsByAccountId(body.getAccountId()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Account already exists");
        body.setId(null);
        if (body.getStatus() == null || body.getStatus().isBlank()) body.setStatus("ACTIVE");
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(accounts.save(body)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!accounts.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found");
        accounts.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
