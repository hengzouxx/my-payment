# My Payment Service

## Running Locally

This project is a NestJS-based payment/order processing service with async provider simulation and logging.

### Prerequisites
- Docker and Docker Compose
- Node.js (v18+) and npm 

### Quick Start
1. Start PostgreSQL and Redis containers locally
	```sh
   	docker compose up -d postgres redis
	```

2. Copy .env.example and rename it as .env

3. Install dependencies:
	```sh
	npm install
	```

4. Start the app:
	```sh
	npm run start:dev
	```

5. health check - http://localhost:3000/health

6. Use Postman to make POST request to http://localhost:3000/orders
   - put idempotency-key in the header with unique value
   - body with json like
   	{
    	"amount": 30000
	}

7. use GET http://localhost:3000/orders/:orderId to retreive order and order history

---

## Async Worker & Queue

Order processing is handled asynchronously using a [Bull](https://github.com/OptimalBits/bull) queue backed by Redis. When an order is created, it is enqueued for background processing. The worker (in the same NestJS app) picks up jobs from the queue and:

- Submits the order to a simulated provider
- Polls the provider for status updates
- Handles retries and failures automatically (configurable attempts and backoff)

**Worker is not a separate process**: The async worker runs within the same NestJS application instance. Use message broker like SQS or Kafka for more robust solution.

**Logs**: 
- All order activities are logged in  `logs/order.log`.
Eg:
{"level":30,"time":1771195279964,"pid":4657,"hostname":"MacBookPro","message":"order_state_created","correlationId":"efd3167c-728c-4334-a6a0-8169d0dee901","orderId":"b50a1dce-667d-40c2-8980-4bbd8011127e","status":"RECEIVED"}
{"level":30,"time":1771195279976,"pid":4657,"hostname":"MacBookPro","message":"order_processing_started","correlationId":"efd3167c-728c-4334-a6a0-8169d0dee901","orderId":"b50a1dce-667d-40c2-8980-4bbd8011127e","attempt":1}
{"level":30,"time":1771195279998,"pid":4657,"hostname":"MacBookPro","message":"order_state_transition","correlationId":"efd3167c-728c-4334-a6a0-8169d0dee901","orderId":"b50a1dce-667d-40c2-8980-4bbd8011127e","from":"RECEIVED","to":"SUBMITTED"}
{"level":30,"time":1771195284883,"pid":4657,"hostname":"MacBookPro","message":"submit_to_provider_result","correlationId":"efd3167c-728c-4334-a6a0-8169d0dee901","duration":4885,"provider_order_id":"304727ec-070d-46ff-916f-b958bbc39b90","orderId":"b50a1dce-667d-40c2-8980-4bbd8011127e","attempt":1}
{"level":30,"time":1771195284907,"pid":4657,"hostname":"MacBookPro","message":"order_state_transition","correlationId":"efd3167c-728c-4334-a6a0-8169d0dee901","orderId":"b50a1dce-667d-40c2-8980-4bbd8011127e","from":"SUBMITTED","to":"PENDING"}
{"level":30,"time":1771195285914,"pid":4657,"hostname":"MacBookPro","message":"poll_from_provider_result","correlationId":"efd3167c-728c-4334-a6a0-8169d0dee901","duration":7,"provider_order_id":"304727ec-070d-46ff-916f-b958bbc39b90","provider_order_status":"COMPLETED","orderId":"b50a1dce-667d-40c2-8980-4bbd8011127e","attempt":1}
{"level":30,"time":1771195285924,"pid":4657,"hostname":"MacBookPro","message":"order_state_transition","correlationId":"efd3167c-728c-4334-a6a0-8169d0dee901","orderId":"b50a1dce-667d-40c2-8980-4bbd8011127e","from":"PENDING","to":"COMPLETED"}

---

## Simulating Provider Failures & Timeouts

The provider is simulated by the `/provider-simulator` endpoints. Failures and timeouts are triggered randomly to test the system's resilience:

- **Random Failures:**
	- Each provider call (submit/status) has a 50% chance to throw a 500 error (see `simulateRandomFailure()` in the provider simulator service).
- **Random Delays/Timeouts:**
	- Each call has a 60% chance to be delayed by 2–5 seconds (see `simulateRandomDelay()`).
	- The worker polls the provider with a 3s timeout and retries up to 10 times.
- **Order Status:**
	- Orders may remain `PENDING` for a few seconds, then resolve to either `COMPLETED` or `FAILED` (randomized).

You can observe these behaviors by creating orders and watching logs for retries, failures, and status transitions.

---

## Design Trade-offs

### Bull Queue (Redis) vs. SQS
- **Bull (Redis):**
	- Simple to set up for local/dev environments
	- Fast, in-memory, but not as durable as cloud queues

- **Amazon SQS:**
	- Fully managed, highly durable, scalable
	- Better for production, multi-region, or high-availability needs

### Use Outbox Pattern for more reliable delivery (Did not impliment it as time limited)
- Ensures reliable event delivery by writing events to a DB table (outbox) as part of the same transaction as business data.
- A separate process reads the outbox and publishes to the queue/bus.

### Logging: File vs. Centralized Logging
- **File Logging:**
	- Simple, easy to inspect locally (`logs/app.log`)
	- Not scalable for distributed/multi-instance setups
- **Centralized Logging:**
	- Integrate a centralized logging solution like ELK (Elasticsearch, Logstash, Kibana) or Loki with Grafana for better observability.
	