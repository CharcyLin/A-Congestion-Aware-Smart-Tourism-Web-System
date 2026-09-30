# LSTM inference service

This is a small Python service for the trained **Holiday+Weather two-layer LSTM**. Runtime dependencies are NumPy and the Python standard library; TensorFlow is used only on the training computer to export weights. The service never trains on Render.

## Local artifact export

From `/Users/charcychalamet/IdeaProjects/Data_Cleaning`, run:

```sh
python export_lstm_for_service.py --output '/Users/charcychalamet/Desktop/澳门旅游智能规划系统/model_service/artifacts'
```

Then from this `model_service` folder run:

```sh
python export_may_archive.py
python enrich_quantiles.py
```

Commit the three runtime inputs (`lstm_weights.npz`, `metadata.json`, and `may_inputs.npz`) and the two small evaluation records (`training_report.json` and `blind_test_report.json`). Do not upload the full training CSV to Render. To run locally, install `requirements.txt` and execute `python server.py`; `/health` reports model loading and the SHA-256 of the loaded weights, while `/predict` accepts the batched route request format. Compare that hash with the committed artifact after deployment to confirm which model is online.

The exported checkpoint was selected using per-region chronological validation and the April holdout. Its April MAE was **242.55**, compared with **267.65** for the earlier retraining. A single full-May blind evaluation after selection measured **284.04 MAE** over 244,032 observations and **419.19 MAE** during the five Golden Week days. The original ablation reported 255.97 and 373.98 respectively, but did not save those exact weights. Those original results must not be attributed to this deployed checkpoint. The machine-readable evaluation records and `model_sha256` document which model was measured.

## Render setup

The repository's `render.yaml` is a Blueprint for **only the new Python inference service**; it leaves the existing website service alone. In Render, choose **New → Blueprint**, connect this repository, review the one Free web service and deploy it. Alternatively create a Python Web Service manually with Root Directory `model_service`, Build Command `pip install -r requirements.txt`, Start Command `python server.py`, Free compute plan and HTTP health-check path `/health`. A `.python-version` file is included both at the repository root and inside `model_service`, so Python 3.11 is selected whether Render resolves the version before or after applying the root directory. The service binds to Render's `PORT`. Copy its public `https://…onrender.com` address into the existing website service's `LSTM_SERVICE_URL` environment variable, then redeploy the website. The public website no longer accepts visitor-supplied model URLs in production.

The free plan has 512 MB RAM and sleeps after idle. A local load test with the selected weights and 17-region history used about **53 MB peak RSS** for a 128-query batch; verify the actual deployed process in Render Metrics and Logs because the Render runtime can use more memory. A cold start can take about a minute, so the website allows 90 seconds for a model request and 110 seconds for the editable route preview; unavailable data falls back to an embedded estimate. On a fresh local service, fetching live official data for four regions took about seven seconds after parallelizing the four daily requests. Render's 0.1 CPU and network conditions may differ.

Render currently shares **750 running Free instance-hours per workspace per month** across free web services. The website and this model service consume separate hours while awake and each sleeps after 15 minutes without incoming traffic. This setup fits intermittent demonstrations; two continuously busy free services would exhaust the shared allowance. See [Render's Free tier limits](https://render.com/docs/free).

## Data interpretation

The mapped POIs represent **official scenic regions**, which may include multiple attractions. Cafes, restaurants, hotels and other unmapped POIs are not claimed to have an LSTM count. The `crowd_ratio` field is a 0–100 **regional congestion score** calibrated to training-count p50/p85 quantiles for route ranking, not a venue occupancy percentage. May 2026 requests use archived inputs with the actual preceding 24-hour model window, reproducing a retrospective one-step prediction. Live requests require recent official 15-minute counts and hourly precipitation; building the model input needs 48 hours of continuous counts because its 24-hour window itself contains a 24-hour lag feature. Future arrival slots up to eight hours ahead are generated recursively and marked `lstm_live_recursive`. This recursive setting has **not** been evaluated by the one-step May blind-test metrics in the report, so do not cite those MAE values as live route accuracy. The live holiday calendar extends the trained 2025 October stage pattern to October 2026; this is an extrapolation beyond the engineered test window.
