package com.college.cloudtrail.repository;

import com.college.cloudtrail.model.LogEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface LogEventRepository extends JpaRepository<LogEvent, Long> {
    List<LogEvent> findAllByOrderByEventTimeDesc();
    List<LogEvent> findTop10ByOrderByEventTimeDesc();
    List<LogEvent> findByAccountIdOrderByEventTimeDesc(String accountId);
    Optional<LogEvent> findFirstByAccountIdOrderByEventTimeDesc(String accountId);
    Optional<LogEvent> findFirstByOrderByEventTimeDesc();
    long countByAccountId(String accountId);
    long countByStatus(String status);
    long countByEventTimeAfter(LocalDateTime time);

    // pattern must already look like %text% in lower case
    @Query("SELECT l FROM LogEvent l WHERE LOWER(l.eventName) LIKE :p OR LOWER(l.accountId) LIKE :p "
         + "OR LOWER(l.username) LIKE :p OR LOWER(l.eventSource) LIKE :p ORDER BY l.eventTime DESC")
    List<LogEvent> search(@Param("p") String pattern);
}
