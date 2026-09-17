"""
train_model.py

Trains a very simple, well-known ML model (Logistic Regression on the
Iris dataset) and saves it to disk as model.pkl.

We are NOT trying to build a fancy or accurate model here.
The point of this project is DevOps/MLOps: containerizing, serving,
monitoring, and deploying a model — not ML research.

Run this once, locally, to produce model/model.pkl.
"""

from sklearn.datasets import load_iris
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
import joblib
import os

def main():
    # 1. Load a built-in, well-known dataset (no external downloads needed)
    iris = load_iris()
    X, y = iris.data, iris.target

    # 2. Split into train/test just to sanity-check accuracy
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # 3. Train a simple, fast, interpretable model
    model = LogisticRegression(max_iter=200)
    model.fit(X_train, y_train)

    # 4. Print accuracy just so we know the model isn't broken
    accuracy = model.score(X_test, y_test)
    print(f"Model trained. Test accuracy: {accuracy:.2f}")

    # 5. Save the trained model to disk so the API can load it later
    output_path = os.path.join(os.path.dirname(__file__), "model.pkl")
    joblib.dump(model, output_path)
    print(f"Model saved to {output_path}")

if __name__ == "__main__":
    main()
