import os
from fastapi import FastAPI, Request
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
from langchain.llms.groq import Groq
from langchain.chains import ConversationChain, ConversationalRetrievalChain
from langchain.memory import ConversationBufferMemory
from langchain.vectorstores import Chroma
from langchain.embeddings import OpenAIEmbeddings

# Load environment variables
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

app = FastAPI()

# In-memory conversation store (for demo; use DB for prod)
conversations = {}

# Set up LLM and memory (Groq)
llm = Groq(api_key=GROQ_API_KEY, model=GROQ_MODEL, temperature=0.7)
memory_store = {}

# Set up ChromaDB for RAG (demo: use ./chroma_db folder)
vectorstore = Chroma(persist_directory="./chroma_db", embedding_function=OpenAIEmbeddings())
retriever = vectorstore.as_retriever()

class Message(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str

class ChatRequest(BaseModel):
    user_id: str
    message: str
    history: Optional[List[Message]] = None

class RAGRequest(BaseModel):
    user_id: str
    question: str
    history: Optional[List[Message]] = None

@app.post("/chat")
def chat_endpoint(req: ChatRequest):
    # Maintain conversation memory per user
    if req.user_id not in memory_store:
        memory_store[req.user_id] = ConversationBufferMemory()
    memory = memory_store[req.user_id]
    conversation = ConversationChain(llm=llm, memory=memory, verbose=False)
    # Add history if provided
    if req.history:
        for msg in req.history:
            memory.chat_memory.add_message(msg.role, msg.content)
    response = conversation.predict(input=req.message)
    return {"reply": response, "history": memory.chat_memory.messages}

@app.post("/rag")
def rag_endpoint(req: RAGRequest):
    # Use ConversationalRetrievalChain for RAG
    if req.user_id not in memory_store:
        memory_store[req.user_id] = ConversationBufferMemory()
    memory = memory_store[req.user_id]
    qa = ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=retriever,
        memory=memory,
        verbose=False
    )
    chat_history = [(msg.role, msg.content) for msg in (req.history or [])]
    result = qa({"question": req.question, "chat_history": chat_history})
    return {"reply": result["answer"], "history": memory.chat_memory.messages}

@app.get("/")
def root():
    return {"status": "ok", "service": "LifeSync AI Service (Groq)"}
