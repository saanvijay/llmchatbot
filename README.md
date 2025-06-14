# llmchatbot
Simple LLM chatbot using ollama

# Prerequisites
1. Docker
2. Ollama3
3. Python3

# Install Docker Desktop
https://docs.docker.com/desktop/setup/install/mac-install/

# Install ollama3
```
brew install ollama
brew services start ollama 
ollama pull llama3:latest
```

## Ollama models
Check the list of models here (https://ollama.com/library/llama3)

## Test ollama
```
ollama run llama3
```

# Setting up python virtual environment
```
python3 -m venv llmchatbotvenv
source llmchatbotvenv/bin/activate
pip3 install langchain langchain-ollama ollama
```

# Execute LLM chat bot
```
python3 main.py
```

# Docker version of ollama
```
docker pull ollama/ollama
docker run -d -v /Users/vijay/ollamamodels:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
```
# Test ollama3 docker instance
```
docker exec -it ollama ollama run llama3
```
# Python App docker image
```
docker build --no-cache -t llmchatbottemplate .
docker run -d -p 8000:8000 --name llmapp llmchatbottemplate:latest
```

# Test Python App
```
docker exec -it llmapp bash
```

# Create docker network
```
docker network ls | grep llmnetwork && docker network rm llmnetwork
docker network create llmnetwork
docker run -d -v /Users/vijay/ollamamodels:/root/.ollama --network llmnetwork -p 11434:11434 --name ollama ollama/ollama
docker run -d --network llmnetwork -p 8000:8000 --name llmapp llmchatbottemplate:latest
```

# Test using curl
```
curl --request POST \
  --url http://localhost:8000/api/v1/chat \
  --header 'Content-Type: application/json' \
  --header 'User-Agent: insomnia/11.2.0' \
  --data '{
	"context": "climate",
	"question": "weather in usa texas?"
}'
```
