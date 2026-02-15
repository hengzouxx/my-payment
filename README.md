# My Payment Service

## Running Locally

This project is a NestJS-based payment/order processing service with async provider simulation and logging.

### Prerequisites
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/)
- Node.js (v18+) and npm (for local development without Docker)

### Quick Start (Recommended)

1. **Clone the repository**
2. **Start all services:**
	```sh
	docker-compose up --build
	```
	This will start:
	- The NestJS app (on port 3000)
	- PostgreSQL (on port 5432)
	- Redis (on port 6379)

3. **Access the API:**
	- The app runs at [http://localhost:3000](http://localhost:3000)

### Manual Start (Without Docker)

1. Start PostgreSQL and Redis locally (see `docker-compose.yml` for env vars).
2. Install dependencies:
	```sh
	npm install
	```
3. Run database migrations (if needed):
	```sh
	npm run migration:run
	```
4. Start the app:
	```sh
	npm run start:dev
	```

Logs are written to `logs/app.log` and the console.

---

## Async Worker & Queue

Order processing is handled asynchronously using a [Bull](https://github.com/OptimalBits/bull) queue backed by Redis. When an order is created, it is enqueued for background processing. The worker (in the same NestJS app) picks up jobs from the queue and:

- Submits the order to a simulated provider
- Polls the provider for status updates
- Handles retries and failures automatically (configurable attempts and backoff)

**Worker is not a separate process**: The async worker runs within the same NestJS application instance. If you want to scale workers separately, you can run multiple instances of the app (e.g., with Docker Compose or Kubernetes).

**Logs**: All processing steps and state transitions are logged to both the console and `logs/app.log`.

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
	- Good for small/medium projects or prototyping
- **Amazon SQS:**
	- Fully managed, highly durable, scalable
	- Better for production, multi-region, or high-availability needs
	- More operational complexity and cost

### Outbox Pattern
- Ensures reliable event delivery by writing events to a DB table (outbox) as part of the same transaction as business data.
- A separate process reads the outbox and publishes to the queue/bus.
- **This project does not implement the outbox pattern** (but it is recommended for mission-critical systems to avoid message loss).

### Logging: File vs. NoSQL
- **File Logging:**
	- Simple, easy to inspect locally (`logs/app.log`)
	- Not scalable for distributed/multi-instance setups
- **NoSQL Logging (e.g., MongoDB, Elasticsearch):**
	- Centralized, queryable, scalable
	- Better for production, monitoring, and analytics
	- Requires extra infrastructure

**This project logs to both file and console for simplicity.**
