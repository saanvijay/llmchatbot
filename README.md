# llmchatbot
Simple LLM chatbot using ollama

# Prerequisites
1. Docker
2. Ollama3
3. Python3

# Install Docker Desktop
https://docs.docker.com/desktop/setup/install/mac-install/

# Install ollama3
brew install ollama
brew services start ollama 
ollama pull llama3:latest
## Ollama models
    Check the list of models here (https://ollama.com/library/llama3)
## Test ollama
    ollama run llama3

# Setting up python virtual environment
python3 -m venv llmchatbotvenv
source llmchatbotvenv/bin/activate
pip install langchain langchain-ollama ollama

# Execute LLM chat bot
python3 main.py



