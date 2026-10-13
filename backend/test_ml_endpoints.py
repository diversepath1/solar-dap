from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

print('--- 1. Testing GET /api/ml/metrics ---')
r = client.get('/api/ml/metrics')
print('Status:', r.status_code)
d = r.json()
print('Metrics count:', len(d['metrics']))
print('RF Metrics:', [m for m in d['metrics'] if m['model_name'] == 'Random Forest'])
print('Metadata test rows:', d['metadata']['test_rows'], 'Split:', d['metadata']['test_split_method'])

print('\n--- 2. Testing GET /api/ml/city-metrics ---')
r = client.get('/api/ml/city-metrics')
print('Status:', r.status_code)
d = r.json()
for c in d['city_metrics']:
    print(f"{c['location']} (n={c['observations']}): RF MAE={c['rf_mae']}, RMSE={c['rf_rmse']}, R2={c['rf_r2']} | Pers MAE={c['persistence_mae']}, R2={c['persistence_r2']}")

print('\n--- 3. Testing GET /api/ml/feature-importance ---')
r = client.get('/api/ml/feature-importance')
print('Status:', r.status_code)
d = r.json()
print('Top 4 features:')
for f in d['features'][:4]:
    print(f"  {f['feature']}: {f['percentage']}%")

print('\n--- 4. Testing GET /api/ml/predictions?location=Delhi&date=2025-10-30 ---')
r = client.get('/api/ml/predictions?location=Delhi&date=2025-10-30')
print('Status:', r.status_code)
d = r.json()
print('Matched predictions count:', d['total_matched'])
if d['total_matched'] > 0:
    print('Sample prediction at noon (index 48):', d['predictions'][min(48, len(d['predictions'])-1)])

print('\n--- 5. Testing GET /api/ml/anomalies?location=Delhi ---')
r = client.get('/api/ml/anomalies?location=Delhi')
print('Status:', r.status_code)
d = r.json()
print('Delhi flagged anomalies:', d['total_flagged'])
print('Thresholds:', d['thresholds'])
print('Top Delhi anomaly:', d['anomalies'][0])

print('\n--- 6. Testing GET /api/ml/anomalies?severity=Critical ---')
r = client.get('/api/ml/anomalies?severity=Critical')
print('Status:', r.status_code)
d = r.json()
print('Critical anomalies count:', d['total_flagged'])
print('Sample critical anomaly:', d['anomalies'][0])
