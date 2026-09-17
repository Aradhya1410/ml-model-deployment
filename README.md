# ML Model Deployment & Monitoring Pipeline

A small, end-to-end project demonstrating how to take a trained machine
learning model and turn it into a production-style service: served via a
REST API, containerized with Docker, tested and built automatically with
CI/CD, and monitored with Prometheus and Grafana.

This project intentionally uses a **simple** ML model (Iris flower
classification). The goal is not ML accuracy — it's demonstrating the
DevOps/MLOps workflow around a model: packaging, deployment, automation,
and observability.

## Architecture

```
                    ┌─────────────┐
   HTTP request --> │   FastAPI   │ --> loads model.pkl --> prediction
                    │  (in Docker)│
                    └──────┬──────┘
                           │ exposes /metrics
                           ▼
                    ┌─────────────┐
                    │ Prometheus  │  (scrapes /metrics every 5s)
                    └──────┬──────┘
                           │ Prometheus is a data source for
                           ▼
                    ┌─────────────┐
                    │   Grafana   │  (dashboards / visualization)
                    └─────────────┘
```

## Tech Stack

| Category        | Tools |
|------------------|-------|
| API              | Python, FastAPI, Uvicorn |
| ML               | scikit-learn, joblib |
| Containerization | Docker, Docker Compose |
| CI/CD            | GitHub Actions |
| Monitoring       | Prometheus, Grafana |
| Cloud            | AWS (EC2 / ECR) |

## Project Structure

```
ml-model-deployment/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI app: /predict, /health, /metrics
│   └── model.py          # Loads model.pkl and runs predictions
├── model/
│   ├── train_model.py    # Trains and saves the ML model
│   └── model.pkl          # Trained model artifact (generated)
├── tests/
│   └── test_api.py       # Automated tests (run in CI)
├── grafana/
│   └── dashboard.json    # Importable Grafana dashboard
├── .github/workflows/
│   └── ci.yml            # GitHub Actions CI/CD pipeline
├── Dockerfile
├── docker-compose.yml
├── prometheus.yml
├── requirements.txt
├── .gitignore
└── README.md
```

## Running Locally (no Docker)

```bash
git clone <your-repo-url>
cd ml-model-deployment
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python model/train_model.py
uvicorn app.main:app --reload
```

Visit:
- API docs: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/health
- Metrics: http://127.0.0.1:8000/metrics

## Running With Docker Compose (API + Prometheus + Grafana)

```bash
docker compose up --build
```

- API: http://localhost:8000
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (login: admin / admin)

Stop everything:

```bash
docker compose down
```

## Example Request

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"sepal_length": 5.1, "sepal_width": 3.5, "petal_length": 1.4, "petal_width": 0.2}'
```

Response:

```json
{"predicted_class": "setosa", "confidence": 0.97}
```

## Monitoring

Prometheus scrapes API metrics (request count, latency, in-progress
requests) from the `/metrics` endpoint every 5 seconds. Grafana then
reads from Prometheus as a data source to visualize:

- Request rate (requests/sec)
- Request count by endpoint
- 95th-percentile request latency
- API availability (`up` metric)

To set up Grafana manually:
1. Open http://localhost:3000, log in with admin/admin.
2. Add a data source → Prometheus → URL: `http://prometheus:9090`.
3. Import `grafana/dashboard.json` (Dashboards → Import → upload JSON).

## CI/CD

Every push to `main` triggers `.github/workflows/ci.yml`, which:
1. Checks out the code
2. Installs Python dependencies
3. Trains the model
4. Runs the automated test suite
5. Builds the Docker image

## Deployment (AWS)

See the deployment notes provided alongside this project for a
beginner-friendly walkthrough of deploying this container to an AWS EC2
instance, including what's free vs. what may incur charges.

## Notes

This project is a learning/portfolio project built to demonstrate core
DevOps/MLOps concepts (containerization, CI/CD, monitoring) using a
deliberately simple ML model.
