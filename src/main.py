from langchain_ollama import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate
from flask import Flask, request, jsonify
from http import HTTPStatus
from functools import wraps
import logging
import os
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configuration
app.config['OLLAMA_BASE_URL'] = os.getenv('OLLAMA_BASE_URL', 'http://ollama:11434')
app.config['OLLAMA_MODEL'] = os.getenv('OLLAMA_MODEL', 'llama3')

# Initialize Ollama
template = """
Answer the queries based on the provided context.
Context: {context}
Question: {question}
Answer: 
"""
model = OllamaLLM(base_url=app.config['OLLAMA_BASE_URL'], model=app.config['OLLAMA_MODEL'])
prompt = ChatPromptTemplate.from_template(template)
chain = prompt | model

def validate_json(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not request.is_json:
            return jsonify({
                'status': 'error',
                'message': 'Content-Type must be application/json'
            }), HTTPStatus.BAD_REQUEST
        return f(*args, **kwargs)
    return decorated_function

def log_request(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        start_time = datetime.now()
        response = f(*args, **kwargs)
        duration = datetime.now() - start_time
        logger.info(f"Request: {request.method} {request.path} - Duration: {duration}")
        return response
    return decorated_function

@app.route('/api/v1/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'success',
        'message': 'Service is healthy',
        'timestamp': datetime.now().isoformat()
    }), HTTPStatus.OK

@app.route('/api/v1/chat', methods=['POST'])
@validate_json
@log_request
def chat():
    """
    Chat endpoint that processes questions based on provided context
    
    Request body:
    {
        "context": "string",
        "question": "string"
    }
    
    Returns:
    {
        "status": "success",
        "data": {
            "question": "string",
            "answer": "string",
            "timestamp": "string"
        }
    }
    """
    try:
        data = request.get_json()
        context = data.get("context", "")
        question = data.get("question", "")

        # Input validation
        if not context:
            return jsonify({
                'status': 'error',
                'message': 'Context is required'
            }), HTTPStatus.BAD_REQUEST
        
        if not question:
            return jsonify({
                'status': 'error',
                'message': 'Question is required'
            }), HTTPStatus.BAD_REQUEST

        # Process the request
        result = chain.invoke({"context": context, "question": question})
        
        return jsonify({
            'status': 'success',
            'data': {
                'question': question,
                'answer': result,
                'timestamp': datetime.now().isoformat()
            }
        }), HTTPStatus.OK

    except Exception as e:
        logger.error(f"Error processing chat request: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Internal server error',
            'error': str(e)
        }), HTTPStatus.INTERNAL_SERVER_ERROR

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'status': 'error',
        'message': 'Resource not found'
    }), HTTPStatus.NOT_FOUND

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({
        'status': 'error',
        'message': 'Method not allowed'
    }), HTTPStatus.METHOD_NOT_ALLOWED

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'status': 'error',
        'message': 'Internal server error'
    }), HTTPStatus.INTERNAL_SERVER_ERROR

if __name__ == "__main__":
    port = int(os.getenv('PORT', 8000))
    app.run(host='0.0.0.0', port=port)
