package com.college.cloudtrail.config;

import com.college.cloudtrail.model.AwsAccount;
import com.college.cloudtrail.model.LogEvent;
import com.college.cloudtrail.repository.AwsAccountRepository;
import com.college.cloudtrail.repository.LogEventRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

// Inserts SAMPLE data the first time the app starts (only if the tables are empty),
// so the dashboard has something to show. Delete this file if you want an empty database.
@Component
public class DataSeeder implements CommandLineRunner {

    private final AwsAccountRepository accounts;
    private final LogEventRepository logs;

    public DataSeeder(AwsAccountRepository accounts, LogEventRepository logs) {
        this.accounts = accounts;
        this.logs = logs;
    }

    @Override
    public void run(String... args) {
        if (accounts.count() > 0 || logs.count() > 0) return;

        String[][] acc = {{"100000000001", "Development"}, {"100000000002", "Testing"}, {"100000000003", "Production"}};
        for (String[] a : acc) {
            AwsAccount x = new AwsAccount();
            x.setAccountId(a[0]); x.setAccountName(a[1]); x.setRegion("ap-south-1"); x.setStatus("ACTIVE");
            accounts.save(x);
        }

        String[][] events = {{"ConsoleLogin", "signin.amazonaws.com"}, {"CreateBucket", "s3.amazonaws.com"},
                {"DeleteBucket", "s3.amazonaws.com"}, {"PutObject", "s3.amazonaws.com"},
                {"RunInstances", "ec2.amazonaws.com"}, {"StopInstances", "ec2.amazonaws.com"}};
        String[] users = {"admin", "user1", "devops"};
        String[] regions = {"ap-south-1", "us-east-1", "eu-west-1"};

        List<LogEvent> list = new ArrayList<>();
        for (int i = 1; i <= 36; i++) {
            String[] a = acc[i % 3], ev = events[i % events.length];
            boolean failed = i % 7 == 0;
            LogEvent l = new LogEvent();
            l.setEventId(String.format("evt-%03d", i));
            l.setAccountId(a[0]); l.setAccountName(a[1]);
            l.setEventName(ev[0]); l.setEventSource(ev[1]);
            l.setUsername(users[i % 3]); l.setUserType(i % 3 == 0 ? "Root" : "IAMUser");
            l.setRegion(regions[i % 3 == 2 ? 1 : 0]);
            l.setSourceIp("192.168.1." + (10 + i));
            l.setEventTime(LocalDateTime.now().withNano(0).minusMinutes(i * 17L));
            l.setResourceName(ev[0].contains("Bucket") ? "demo-bucket-" + i : "N/A");
            l.setStatus(failed ? "FAILED" : "SUCCESS");
            l.setErrorCode(failed ? "AccessDenied" : null);
            l.setErrorMessage(failed ? "User is not authorized to perform this action" : null);
            l.setEventJson(String.format("{\n  \"eventName\": \"%s\",\n  \"eventSource\": \"%s\",\n  \"awsRegion\": \"%s\",\n  \"sourceIPAddress\": \"%s\"\n}",
                    ev[0], ev[1], l.getRegion(), l.getSourceIp()));
            list.add(l);
        }
        logs.saveAll(list);
        System.out.println("Sample accounts and logs inserted.");
    }
}
