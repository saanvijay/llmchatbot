# clean up
.PHONY: all build
build:
	docker build -t llmchatbottemplate:latest backend/

.PHONY: clean
clean:
	docker rm -f llmapp ollama
	docker rmi -f llmchatbottemplate:latest ollama/ollama
	docker network ls | grep llmnetwork && docker network rm llmnetwork

.PHONY: run
run: build
	docker network inspect llmnetwork >/dev/null 2>&1 || docker network create llmnetwork && \
	cd backend && \
	docker-compose up -d && \
	cd ../frontend && \
	npm install && \
	npm start


.PHONY: stop
stop:
	docker-compose down	