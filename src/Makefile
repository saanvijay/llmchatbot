# clean up
.PHONY: all build
build:
	docker build --no-cache -t llmchatbottemplate:latest backend/

.PHONY: clean
clean:
	docker rm -f llmapp ollama
	docker rmi -f llmchatbottemplate:latest ollama/ollama
	docker network ls | grep llmnetwork && docker network rm llmnetwork

.PHONY: containers-with-cpu
containers-with-cpu: 
	docker network inspect llmnetwork >/dev/null 2>&1 || docker network create llmnetwork && \
	cd backend && \
	docker-compose --profile cpu up -d

.PHONY: containers-with-gpu
containers-with-gpu: 
	docker network inspect llmnetwork >/dev/null 2>&1 || docker network create llmnetwork && \
	cd backend && \
	docker-compose --profile gpu up -d

.PHONY: run
run: 
	cd frontend && \
	npm install && \
	npm start

.PHONY: down
down:
	cd backend && \
	docker-compose down -v 