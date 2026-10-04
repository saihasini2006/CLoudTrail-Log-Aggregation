package com.college.cloudtrail.util;

import java.time.Duration;
import java.time.LocalDateTime;

public class TimeUtil {
    // Turns a time into text like "5 min ago" for the dashboard.
    public static String ago(LocalDateTime t) {
        if (t == null) return "-";
        long mins = Math.max(0, Duration.between(t, LocalDateTime.now()).toMinutes());
        if (mins < 1) return "just now";
        if (mins < 60) return mins + " min ago";
        if (mins < 1440) return (mins / 60) + " hr ago";
        return (mins / 1440) + " days ago";
    }
}
