# llmchatbot 
Simple LLM chatbot using ollama

# Prerequisites
1. Docker (https://docs.docker.com/desktop/setup/install/mac-install/)
2. Ollama3 (https://ollama.com/library/llama3)
3. Python3
4. ReactJS
![Pre-requisites](./src/images/pre-req.png)
# Bring-up backend 
```
make build
make containers-with-cpu ( slow response with cpu )
or
make containers-with-gpu ( fast LLM response, but make sure you have nvidia driver installed and 'nvidia-smi' command works in CLI)
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

# Voice support
Click on 'mic' icon and talk, your voice will be converted into words and Click on Send. Once the LLM responds, you can click on 'Speaker' icon to listen

# Clear context
  Click on delete icon

# Cleanup
```
make down
```
