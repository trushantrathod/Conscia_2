from flask import Flask, jsonify, request
from flask_cors import CORS
from sentiment_analyzer import get_final_sentiment

app = Flask(__name__)
CORS(app)

# ==============================
# 🔥 INTERNAL API FOR NODE.JS
# ==============================
@app.route("/api/analyze-sentiment", methods=["POST"])
def analyze_internal():
    data = request.get_json()
    base_score = float(data.get("base_score", 50))
    user_review = data.get("review", "")

    # Run the Hybrid VADER + BERT logic
    new_score = get_final_sentiment(base_score, user_review)

    # Return JUST the math result to Node.js
    return jsonify({"new_score": new_score})

if __name__ == "__main__":
    print("🔥 Starting Python ML Engine on Port 5000...")
    app.run(debug=True, port=5000)