package com.college.cloudtrail.controller;

import com.college.cloudtrail.model.LogEvent;
import com.college.cloudtrail.repository.LogEventRepository;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final LogEventRepository logs;

    public ReportController(LogEventRepository logs) { this.logs = logs; }

    // All filters are optional; the frontend sends empty values when a filter is not chosen.
    @GetMapping("/summary")
    public Map<String, Object> summary(@RequestParam(required = false) String from,
                                       @RequestParam(required = false) String to,
                                       @RequestParam(required = false) String accountId,
                                       @RequestParam(required = false) String eventName,
                                       @RequestParam(required = false) String status) {
        LocalDate fromDate = blank(from) ? null : LocalDate.parse(from);
        LocalDate toDate = blank(to) ? null : LocalDate.parse(to);

        List<LogEvent> list = logs.findAll().stream()
                .filter(l -> fromDate == null || !l.getEventTime().toLocalDate().isBefore(fromDate))
                .filter(l -> toDate == null || !l.getEventTime().toLocalDate().isAfter(toDate))
                .filter(l -> blank(accountId) || accountId.equals(l.getAccountId()))
                .filter(l -> blank(eventName) || eventName.equals(l.getEventName()))
                .filter(l -> blank(status) || status.equalsIgnoreCase(l.getStatus()))
                .toList();

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("totalEvents", list.size());
        r.put("successfulEvents", list.stream().filter(l -> "SUCCESS".equals(l.getStatus())).count());
        r.put("failedEvents", list.stream().filter(l -> "FAILED".equals(l.getStatus())).count());
        r.put("perAccount", group(list, LogEvent::getAccountName));
        r.put("perRegion", group(list, LogEvent::getRegion));
        r.put("perEventType", group(list, LogEvent::getEventName));
        return r;
    }

    private Map<String, Long> group(List<LogEvent> list, Function<LogEvent, String> key) {
        return list.stream().collect(Collectors.groupingBy(l -> String.valueOf(key.apply(l)), TreeMap::new, Collectors.counting()));
    }

    private boolean blank(String s) { return s == null || s.isBlank(); }
}
