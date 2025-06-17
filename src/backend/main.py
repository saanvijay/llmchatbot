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
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings
from langchain_core.documents import Document

import os
import io
import pandas as pd
import chromadb

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)
#global retriever 
#retriever = None

# Configuration
app.config['OLLAMA_BASE_URL'] = os.getenv('OLLAMA_BASE_URL', 'http://ollama:11434')
app.config['OLLAMA_MODEL'] = os.getenv('OLLAMA_MODEL', 'llama3.2')
app.config['CONTEXT_EXPIRY'] = int(os.getenv('CONTEXT_EXPIRY', 3600))  # 1 hour default

# Initialize Ollama
template = """
Answer the queries based on the provided context.
Summary: {summary}
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

        summary = []
        if os.path.exists("data1/chroma_db"):
            client = chromadb.PersistentClient(path="data1/chroma_db")
            embedding_fn = OllamaEmbeddings(base_url=app.config['OLLAMA_BASE_URL'], model="mxbai-embed-large")
            
            vector_store = Chroma(
                client=client,
                collection_name="rag_collection",
                embedding_function=embedding_fn
            )
            retriever = vector_store.as_retriever()
            summary = retriever.invoke(question)
 
        result = chain.invoke({"summary": summary, "question": question})
        
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
    try:
        if 'file' not in request.files:
            return jsonify({
                'status': 'error',
                'message': 'No file part in the request'
            }), HTTPStatus.BAD_REQUEST

        file = request.files['file']
        if file.filename == '':
            return jsonify({
                'status': 'error',
                'message': 'No file selected'
            }), HTTPStatus.BAD_REQUEST

        if not file.filename.endswith('.csv'):
            return jsonify({
                'status': 'error',
                'message': 'Invalid file type. Only CSV files are allowed'
            }), HTTPStatus.BAD_REQUEST
        
        if file:
            df = pd.read_csv(io.StringIO(file.read().decode('utf-8')))
            documents = []
        # Initialize the embeddings
            embeddings = OllamaEmbeddings(base_url=app.config['OLLAMA_BASE_URL'], model="mxbai-embed-large")
            rag_docs = not os.path.exists("data1/chroma_db")
            if rag_docs:
                documents = []
                ids = []
                for index, row in df.iterrows():
                    doc = Document(
                        page_content=row["name"] + " " + row["summary"],
                        metadata={
                            "team": row["team"],
                            "year": row["year"],
                            "matches": row["matches"],
                            "runs": row["runs"],
                            "wickets": row["wickets"],
                            "strike_rate": row["strike"],
                        },
                        id=str(index)
                    )
                    ids.append(str(index))
                    documents.append(doc)

        # Initialize the vector store with documents
                vectorstore = Chroma(
                    collection_name="rag_collection",
                    persist_directory="data1/chroma_db",
                    embedding_function=embeddings
                )

                vectorstore.add_documents(documents, ids=ids)   

        # Initialize the retriever
        #retriever = vectorstore.as_retriever(search_kwargs={"k": 4})  

            return jsonify({
                'status': 'success',
                'message': 'RAG system initialized successfully',
                'data': {
                    'filename': file.filename,
                    'rows_processed': len(df),
                    'vector_store_path': 'data1/chroma_db'
                }
            }), HTTPStatus.OK

    except Exception as e:
        logger.error(f"Error processing RAG request: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Error processing CSV file',
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
    app.run(host='0.0.0.0', port=port, debug=True)
