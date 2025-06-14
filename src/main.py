from langchain_ollama import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate
from flask import Flask, request, jsonify

app = Flask(__name__)

template = """
Answer the queries based on the provided context.
Context: {context}
Question: {question}
Answer: 
"""
model = OllamaLLM(base_url="http://ollama:11434", model="llama3")
prompt = ChatPromptTemplate.from_template(template)
chain = prompt | model

@app.route('/api/v1/chat', methods=['POST'])
def chat():
    data = request.json
    context = data.get("context", "")
    question = data.get("question", "")

    if not context or not question:
        return jsonify({"error": "Context and question are required"}), 400
    
    result = chain.invoke({"context": context, "question": question})
    return jsonify({"question": question, "answer": result})


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8000)
