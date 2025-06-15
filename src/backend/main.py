from langchain_ollama import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate
from flask import Flask, request, jsonify
from flask_cors import CORS
from http import HTTPStatus
from functools import wraps
import logging
import os
from datetime import datetime
from collections import defaultdict
from langchain_community.vectorstores import Chroma
from langchain_ollama import OllamaEmbeddings

import os
import pandas as pd

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)
retriever = None # Enable CORS for all routes

# Configuration
app.config['OLLAMA_BASE_URL'] = os.getenv('OLLAMA_BASE_URL', 'http://ollama:11434')
app.config['OLLAMA_MODEL'] = os.getenv('OLLAMA_MODEL', 'llama3')
app.config['CONTEXT_EXPIRY'] = int(os.getenv('CONTEXT_EXPIRY', 3600))  # 1 hour default

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

# In-memory storage for context
context_store = defaultdict(lambda: {
    'context': '',
    'last_updated': datetime.now()
})

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

def get_session_id():
    """Get or create a session ID from the request"""
    session_id = request.headers.get('X-Session-ID')
    if not session_id:
        session_id = request.remote_addr
    return session_id

def is_context_expired(session_id):
    """Check if the context for a session has expired"""
    if session_id not in context_store:
        return True
    
    last_updated = context_store[session_id]['last_updated']
    expiry_time = datetime.now() - last_updated
    return expiry_time.total_seconds() > app.config['CONTEXT_EXPIRY']

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
        "context": "string", (optional)
        "question": "string",
        "clear_context": boolean (optional)
    }
    
    Returns:
    {
        "status": "success",
        "data": {
            "question": "string",
            "answer": "string",
            "timestamp": "string",
            "session_id": "string"
        }
    }
    """
    try:
        data = request.get_json()
        session_id = get_session_id()
        question = data.get("question", "")
        clear_context = data.get("clear_context", False)

        # Input validation
        if not question:
            return jsonify({
                'status': 'error',
                'message': 'Question is required'
            }), HTTPStatus.BAD_REQUEST

        # Handle context
        if clear_context or session_id not in context_store:
            context = data.get("context", "")
        else:
            if is_context_expired(session_id):
                context = data.get("context", "")
            else:
                context = context_store[session_id]['context']

        # Update context store
        context_store[session_id] = {
            'context': context,
            'last_updated': datetime.now()
        }

        if retriever is not None:
            context = retriever.invoke(question)
            result = chain.invoke({"context": context, "question": question})
        else:
            result = chain.invoke({"context": context, "question": question})

        # Process the request
        
        
        return jsonify({
            'status': 'success',
            'data': {
                'question': question,
                'answer': result,
                'timestamp': datetime.now().isoformat(),
                'session_id': session_id
            }
        }), HTTPStatus.OK

    except Exception as e:
        logger.error(f"Error processing chat request: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Internal server error',
            'error': str(e)
        }), HTTPStatus.INTERNAL_SERVER_ERROR

@app.route('/api/v1/context', methods=['DELETE'])
def clear_context():
    """Clear the context for a session"""
    session_id = get_session_id()
    if session_id in context_store:
        del context_store[session_id]
    return jsonify({
        'status': 'success',
        'message': 'Context cleared successfully'
    }), HTTPStatus.OK

@app.route('/api/v1/rag', methods=['POST'])
def rag():
    """Process a CSV file and create a vector store for RAG"""
    data = request.get_json()
    csv_path = data.get('csv_path')
    if not csv_path:
        return jsonify({
            'status': 'error',
            'message': 'CSV path is required'
        }), HTTPStatus.BAD_REQUEST
    
    if not os.path.exists(csv_path):
        return jsonify({
            'status': 'error',
            'message': f'CSV file not found at path: {csv_path}'
        }), HTTPStatus.NOT_FOUND
    
    # Load the data
    df = pd.read_csv(csv_path)  

    # Initialize the embeddings
    embeddings = OllamaEmbeddings(model="nomic-embed-text")

    # Initialize the vector store
    vectorstore = Chroma.from_documents(
        documents=df.to_dict(orient="records"),
        embedding=embeddings,
        persist_directory="data/chroma_db"
    )

    # Initialize the retriever
    retriever = vectorstore.as_retriever()  

    return jsonify({
        'status': 'success',
        'message': 'RAG system initialized successfully',
        'data': {
            'rows_processed': len(df),
            'vector_store_path': 'data/chroma_db'
        }
    }), HTTPStatus.OK


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
