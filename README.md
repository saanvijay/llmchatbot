# llmchatbot
Simple LLM chatbot using ollama

# Prerequisites
1. Docker
2. Ollama3
3. Python3
4. ReactJS

# Bring-up backend and frontend apps
```
make clean
make
make run
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
