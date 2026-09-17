"""
model.py

Small helper module that loads the trained model ONCE when the app
starts, and exposes a predict() function the API can call.

Keeping this separate from main.py means:
- main.py only deals with "web stuff" (routes, requests, responses)
- model.py only deals with "ML stuff" (loading the model, predicting)
This separation is a common, interview-friendly pattern.
"""

import os
import joblib
import numpy as np

# Path to the trained model file (saved by model/train_model.py)
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "model", "model.pkl")

# Iris target classes, in the same order scikit-learn uses internally
CLASS_NAMES = ["setosa", "versicolor", "virginica"]

# Load the model a single time when this module is first imported.
# Loading it once (not on every request) is important for performance.
_model = joblib.load(MODEL_PATH)


def predict(sepal_length: float, sepal_width: float,
            petal_length: float, petal_width: float) -> dict:
    """
    Takes 4 iris flower measurements and returns a prediction.
    """
    features = np.array([[sepal_length, sepal_width, petal_length, petal_width]])
    prediction_index = _model.predict(features)[0]
    probabilities = _model.predict_proba(features)[0]

    return {
        "predicted_class": CLASS_NAMES[prediction_index],
        "confidence": round(float(max(probabilities)), 4),
    }
