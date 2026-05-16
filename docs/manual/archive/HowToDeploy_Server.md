Use this exact rollout path for your current repo.

1. One-time infrastructure setup

1) Create a Kubernetes cluster (staging/prod can be separate namespaces first).
2) Provision PostgreSQL and Redis (managed service recommended).
3) Create namespace:

kubectl create namespace aura

4. Create app secret in cluster (aura-secrets) with all required keys:

```
kubectl -n aura create secret generic aura-secrets \
 --from-literal=database_url='postgresql://...' \
 --from-literal=redis_url='redis://...' \
 --from-literal=google_web_client_id='...' \
 --from-literal=google_ios_client_id='...' \
 --from-literal=google_android_client_id='...' \
 --from-literal=google_client_secret='...' \
 --from-literal=google_maps_api_key='...' \
 --from-literal=anthropic_api_key='...' \
 --from-literal=app_encryption_key='...'
```

2. GitHub Actions setup (required)

1) In GitHub, create Environments: staging, production.
2) For each environment, add secret KUBECONFIG_B64.
3) Generate it from your kubeconfig:

base64 < ~/.kube/config | tr -d '\n'

4. For production, set required reviewers (manual approval gate).

3) Deploy flow

1. Push backend changes to main:

- Auto workflow builds image and deploys staging: .github/workflows/backend-staging-auto.yml

2. If staging looks good, run manual prod promotion:

- .github/workflows/backend-prod-promote.yml
- Input image_tag = same SHA tag used in staging.

3. Manual fallback workflows:

- Build/push image: .github/workflows/backend-deploy.yml
- Deploy/migrate/rollout: .github/workflows/backend-release.yml

Check after deploy

kubectl -n aura get pods
kubectl -n aura rollout status deployment/aura-api
kubectl -n aura rollout status deployment/aura-worker

Then call:

- GET /api/v1/health
- GET /api/v1/health/ready
