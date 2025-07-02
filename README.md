# llmchatbot ( WIP )
Simple LLM chatbot using ollama

# Prerequisites
1. Docker
2. Ollama3
3. Python3
4. ReactJS
![Pre-requisites](./src/images/pre-req.png)
# Bring-up backend 
```
make build
make containers
```
![Containers](./src/images/docker-containers.png)

# Make sure ollama model and text embed model pulled successfully 100%
![Ollama-pull-success](./src/images/ollama-pull.png)

# Bring up frontend
```
make run
```

# Test your first prompt
![first-prompt](./src/images/first-prompt.png)

# Test RAG
* Click on 'CHOOSE FILE'
* Select data/test.csv (sample file) ( if you have your own csv/docx file you can upload it)
* Click on 'UPLOAD'
![RAG-test](./src/images/RAG-test.png)

# Clear context
  Click on delete icon

# Cleanup
```
make down
```
