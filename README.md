# llmchatbot
Simple LLM chatbot using ollama

# Prerequisites
1. Docker
2. Ollama3
3. Python3
4. ReactJS

# Install Docker Desktop
https://docs.docker.com/desktop/setup/install/mac-install/



# Bring-up backend and frontend apps
```
cd src/backend
docker build --no-cache -t llmchatbottemplate .
docker network ls | grep llmnetwork && docker network rm llmnetwork
docker network create llmnetwork
docker-compose up -d
cd src/frontend
npm install
npm start
```

# Test backend using curl
```
curl --request POST \
  --url http://localhost:8000/api/v1/chat \
  --header 'Content-Type: application/json' \
  --header 'User-Agent: insomnia/11.2.0' \
  --data '{
	"question": "What is the capital of India?"
}'
```
