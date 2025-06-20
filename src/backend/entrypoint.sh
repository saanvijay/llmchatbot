#!/bin/bash

# Start Ollama in the background
/bin/ollama serve &
pid=$!

# Wait for Ollama to start
sleep 5

echo "Pulling mxbai-embed-large..."
ollama pull mxbai-embed-large
ollama pull llama3:latest
echo "Done."

# Wait for Ollama process to finish
wait $pid
