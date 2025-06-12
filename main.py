from langchain_ollama import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate

template = """
Answer the queries based on the provided context.
Context: {context}
Question: {question}
Answer: 
"""
model = OllamaLLM(model="llama3")
prompt = ChatPromptTemplate.from_template(template)
chain = prompt | model

def handle_chat():
    context = ""
    print("Welcome to the chat! Type 'exit' to quit.")
    while True:
        user_input = input("You: ")
        if user_input.lower() == 'exit':
            print("Exiting chat. Goodbye!")
            break
        context += f"{user_input}\n"
        result = chain.invoke({"context": context, "question": user_input})
        print(f"LLM chat bot: {result}")
        context += f"\nUser: {user_input}\n LLMChatBot: {result}\n"

if __name__ == "__main__":
    handle_chat()
