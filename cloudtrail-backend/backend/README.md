# CloudTrail Log Backend (Spring Boot + PostgreSQL)

REST API for the "Multi-Account Log Aggregation with CloudTrail Organization Trail" dashboard.
Requires: Java 17+, Maven (or an IDE such as IntelliJ / VS Code with Java), PostgreSQL, Postman.
(Lombok is used; IntelliJ and current VS Code Java extensions support it automatically.)

## 1. Create the database
In pgAdmin Query Tool or psql:
    CREATE DATABASE cloudtrail_db;
Tables (aws_accounts, log_events) are created automatically by Spring Boot.

## 2. Configure
Edit src/main/resources/application.properties and set spring.datasource.password
(and the username if it is not postgres).

## 3. Run
    mvn spring-boot:run
Or run CloudTrailApplication from your IDE. The API runs on http://localhost:8080.
On first start, sample accounts and logs are inserted (config/DataSeeder.java).

## 4. Test in Postman
Import postman/CloudTrail-API.postman_collection.json and run the requests one by one.
Start with GET {{baseUrl}}/api/logs/test. Expected: {"status":"SUCCESS","message":"Log API is working", ...}

## 5. Connect the frontend
Open ../frontend/index.html with Live Server. The badge at the top right changes from
"Demo Data" to "Live Backend Data" once the backend answers.

## Endpoints
| Method | URL | Purpose |
|---|---|---|
| GET | /api/logs/test | Connectivity check |
| GET | /api/dashboard/stats | Dashboard cards |
| GET | /api/dashboard/account-summary, /event-summary | Counts per account / event |
| GET | /api/accounts, /api/accounts/{id} | List / one account |
| POST | /api/accounts | Add account |
| DELETE | /api/accounts/{id} | Delete account |
| GET | /api/logs, /api/logs/recent, /api/logs/{id} | Logs |
| GET | /api/logs/account/{accountId} | Logs of one account |
| GET | /api/logs/search?keyword=x | Search logs |
| POST | /api/logs | Insert a log (simulates CloudTrail ingestion) |
| GET | /api/reports/summary?from=&to=&accountId=&eventName=&status= | Report (filters optional) |

## Layout
    controller/  REST endpoints       model/    database entities
    repository/  database queries     config/   CORS + sample data
    util/        small helpers

## Notes
- Real AWS CloudTrail delivers logs to S3. In this college project events are stored in PostgreSQL through
  POST /api/logs (send CloudTrail-style events from Postman). Reading real S3 files would need the AWS SDK.
- To use MySQL instead: replace the postgresql dependency in pom.xml with mysql-connector-j and change the datasource URL.
- Do not commit your real database password.
