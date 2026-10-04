# CloudTrail Organization Log Dashboard (Frontend)

Multi-Account Log Aggregation with CloudTrail Organization Trail
Stack: HTML + CSS + JavaScript -> Spring Boot REST API -> MySQL (test APIs with Postman)

## Run
1. Unzip the folder.
2. Open the folder in VS Code and use the "Live Server" extension on index.html
   (or run `python -m http.server 5500` in the folder and open http://localhost:5500).
3. With no backend running, the page shows demo data and a "Demo Data" badge.

## Connect to Spring Boot
- Change `API_BASE_URL` at the top of script.js (default http://localhost:8080/api).
- Allow the frontend in Spring Boot with CORS, e.g. on your controllers:
  `@CrossOrigin(origins = "*")`  (or restrict to http://localhost:5500)
- MySQL is configured only in Spring Boot (`application.properties`):
  spring.datasource.url=jdbc:mysql://localhost:3306/cloudtrail_db
  spring.datasource.username=...   spring.datasource.password=...
  spring.jpa.hibernate.ddl-auto=update

## API endpoints (all GET, test each in Postman)
| Endpoint | Example response |
|---|---|
| /api/dashboard/stats | {"totalAccounts":5,"totalLogs":1250,"todayLogs":320,"failedEvents":18,"trailStatus":"ACTIVE","lastEvent":"2 minutes ago"} |
| /api/accounts | [{"accountId":"100000000001","accountName":"Development","region":"ap-south-1","status":"ACTIVE"}] |
| /api/accounts/{id} | single account object |
| /api/logs | array of log objects (below) |
| /api/logs/{id} | single log object |
| /api/logs/recent | latest 5-10 log objects |
| /api/logs/account/{accountId} | logs for one account |
| /api/logs/search?keyword=x | matching log objects |
| /api/logs/test | {"status":"SUCCESS","message":"Log API is working","timestamp":"2026-10-03T10:20:00"} |
| /api/reports/summary?from=&to=&accountId=&eventName=&status= | {"totalEvents":100,"successfulEvents":90,"failedEvents":10,"perAccount":{"Development":40},"perRegion":{"ap-south-1":100},"perEventType":{"CreateBucket":20}} |

Log object fields the frontend reads:
```json
{"id":1,"eventId":"evt-001","accountId":"100000000001","accountName":"Development",
 "eventName":"CreateBucket","eventSource":"s3.amazonaws.com","username":"admin","userType":"IAMUser",
 "region":"ap-south-1","sourceIp":"192.168.1.10","eventTime":"2026-10-03T10:20:00",
 "resourceName":"my-bucket","status":"SUCCESS","errorCode":"","errorMessage":"","eventJson":"{...}"}
```

## Postman steps
1. Start Spring Boot. 2. New request -> GET -> paste URL, e.g. http://localhost:8080/api/logs/test -> Send.
3. Expect status 200 and JSON. 4. The same URL feeds the dashboard; when it works, the badge switches to "Live Backend Data".

## Files
- index.html: all sections (Dashboard, Accounts, Logs, Reports, Architecture, API info) and the details modal
- style.css: light blue theme, responsive
- script.js: API helper (`apiGet`), demo fallback data, rendering, filters, pagination, reports, Test Log API, Run Demo

No AWS keys or database passwords are stored in the frontend.
