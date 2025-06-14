# llmchatbot
Simple LLM chatbot using ollama

# Prerequisites
1. Docker
2. Ollama3
3. Python3

# Install Docker Desktop
https://docs.docker.com/desktop/setup/install/mac-install/



# Create docker network and bring-up containers
```
cd src
docker build --no-cache -t llmchatbottemplate .
docker network ls | grep llmnetwork && docker network rm llmnetwork
docker-compose up -d
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
