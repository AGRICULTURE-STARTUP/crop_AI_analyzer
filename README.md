# AgriScan

AgriScan is a machine learning-powered crop disease detection system that helps farmers and agronomists identify crop health issues from images and receive actionable recommendations.



## Problem Statement

Crop diseases are a major threat to agricultural productivity, often causing significant yield loss. Early detection of diseases is difficult for farmers without specialized knowledge. AgriScan solves this by providing:

- Rapid and accurate identification of crop diseases from images.
- Recommendations for treatment or preventive measures.
- Support for 2 crop types with possibility of adding more crops to improve farm productivity.

---

## Features

- Detects crop diseases from leaf images in real-time.
- Provides user-friendly interface for uploading images and viewing results.
- Suggests possible remedies or preventive actions for detected issues.
- Supports multiple disease classes.

---

## Models Used

The system leverages deep learning models for image classification:

| Model        | Description                                     |
|-------------|------------------------------------------------|
| **CNN**      | Convolutional Neural Network for leaf image classification. |
| **MobileNetV2** | Lightweight pretrained model for faster predictions and deployment on web/mobile. |
| **ResNet50** | Used for higher accuracy on complex datasets. |

---

## Metrics

Model performance is evaluated using standard metrics:

| Metric        | Description                                 |
|---------------|--------------------------------------------|
| **Accuracy**  | 97%        |
| **loss** |0.1087 |
| **val_accuracy**    |  0.8556|


## Usage 
LINK: `https://crop-ai-analyzer.onrender.com`  

## Installation

1. Clone the repository:

