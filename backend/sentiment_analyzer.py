import nltk
import numpy as np
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from transformers import pipeline

try:
    nltk.data.find('sentiment/vader_lexicon.zip')
except LookupError:
    nltk.download('vader_lexicon')

sia = SentimentIntensityAnalyzer()
bert = pipeline("sentiment-analysis")

def vader_score(text):
    score = sia.polarity_scores(text)['compound']
    return (score + 1) * 50

def bert_score(text):
    try:
        result = bert(text[:512])[0]
        if result['label'] == "POSITIVE":
            return 50 + result['score'] * 50
        else:
            return 50 - result['score'] * 50
    except Exception as e:
        print("BERT Error:", e)
        return 50

def get_review_score(text):
    v = vader_score(text)
    b = bert_score(text)
    return round((0.4 * v) + (0.6 * b), 2)

def get_final_sentiment(base_score, user_review=None):
    if user_review:
        review_score = get_review_score(user_review)
        final_score = (0.7 * base_score) + (0.3 * review_score)
    else:
        final_score = base_score
    return round(max(0, min(100, final_score)), 2)