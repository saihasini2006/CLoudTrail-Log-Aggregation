package com.college.cloudtrail.controller;

import com.college.cloudtrail.model.LogEvent;
import com.college.cloudtrail.repository.AwsAccountRepository;
import com.college.cloudtrail.repository.LogEventRepository;
import com.college.cloudtrail.util.TimeUtil;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final LogEventRepository logs;
    private final AwsAccountRepository accounts;

    public DashboardController(LogEventRepository logs, AwsAccountRepository accounts) {
        this.logs = logs;
        this.accounts = accounts;
    }

    @GetMapping("/stats")
    public Map<String, Object> stats() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("totalAccounts", accounts.count());
        m.put("totalLogs", logs.count());
        m.put("todayLogs", logs.countByEventTimeAfter(LocalDate.now().atStartOfDay()));
        m.put("failedEvents", logs.countByStatus("FAILED"));
        m.put("trailStatus", "ACTIVE");
        m.put("lastEvent", logs.findFirstByOrderByEventTimeDesc()
                .map(l -> TimeUtil.ago(l.getEventTime())).orElse("No events yet"));
        return m;
    }

    @GetMapping("/account-summary")
    public Map<String, Long> accountSummary() {
        return count(l -> String.valueOf(l.getAccountName()));
    }

    @GetMapping("/event-summary")
    public Map<String, Long> eventSummary() {
        return count(l -> String.valueOf(l.getEventName()));
    }

    private Map<String, Long> count(Function<LogEvent, String> key) {
        return logs.findAll().stream().collect(Collectors.groupingBy(key, TreeMap::new, Collectors.counting()));
    }
}
