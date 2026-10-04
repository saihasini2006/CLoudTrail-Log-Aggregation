package com.college.cloudtrail.repository;

import com.college.cloudtrail.model.AwsAccount;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AwsAccountRepository
        extends JpaRepository<AwsAccount, Long> {

    Optional<AwsAccount> findByAccountId(String accountId);

    boolean existsByAccountId(String accountId);
}