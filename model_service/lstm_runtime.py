"""Small NumPy inference runtime for the trained two-layer Keras LSTM.

The training job exports the ten Keras weight arrays in layer order. Keeping
TensorFlow out of the web process makes a 512 MB deployment more realistic.
"""

from pathlib import Path

import numpy as np


class LSTMRuntime:
    def __init__(self, weights_path: str | Path):
        with np.load(weights_path, allow_pickle=False) as weights:
            self.weights = [np.asarray(weights[f"w{i}"], dtype=np.float32) for i in range(10)]

    @staticmethod
    def _sigmoid(values: np.ndarray) -> np.ndarray:
        return 1.0 / (1.0 + np.exp(-np.clip(values, -40.0, 40.0)))

    def _lstm(self, inputs: np.ndarray, offset: int, return_sequences: bool) -> np.ndarray:
        kernel, recurrent, bias = self.weights[offset:offset + 3]
        batch, timesteps, _ = inputs.shape
        units = recurrent.shape[0]
        hidden = np.zeros((batch, units), dtype=np.float32)
        cell = np.zeros_like(hidden)
        outputs = []
        for step in range(timesteps):
            gates = inputs[:, step, :] @ kernel + hidden @ recurrent + bias
            input_gate = self._sigmoid(gates[:, :units])
            forget_gate = self._sigmoid(gates[:, units:2 * units])
            candidate = np.tanh(gates[:, 2 * units:3 * units])
            output_gate = self._sigmoid(gates[:, 3 * units:])
            cell = forget_gate * cell + input_gate * candidate
            hidden = output_gate * np.tanh(cell)
            if return_sequences:
                outputs.append(hidden)
        return np.stack(outputs, axis=1) if return_sequences else hidden

    def predict_scaled(self, sequences: np.ndarray) -> np.ndarray:
        sequences = np.asarray(sequences, dtype=np.float32)
        if sequences.ndim != 3 or sequences.shape[0] == 0:
            raise ValueError("Expected a non-empty (batch, timesteps, features) array")
        if sequences.shape[2] != self.weights[0].shape[0]:
            raise ValueError("Feature count does not match the exported model")
        first = self._lstm(sequences, 0, return_sequences=True)
        second = self._lstm(first, 3, return_sequences=False)
        dense = np.maximum(second @ self.weights[6] + self.weights[7], 0.0)
        return (dense @ self.weights[8] + self.weights[9]).reshape(-1)
