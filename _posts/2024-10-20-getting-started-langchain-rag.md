---
layout: post
title: "Building RAG Systems: My Journey with LangChain"
date: 2024-10-20
tags: [langchain, rag, ai, llm, vector-databases]
excerpt: "After months of hearing about RAG and LangChain, I finally built my first retrieval-augmented generation system. Here's what I learned."
author: "Niranjan Agaram"
---

# Building RAG Systems: My Journey with LangChain

I've been putting off learning about RAG (Retrieval-Augmented Generation) for months. Every AI meetup, every blog post, every LinkedIn update seemed to mention it. Finally, when our hospital asked for a "smart document search system" for medical protocols, I couldn't avoid it anymore.

This is the story of building my first RAG system with LangChain, and why it took me 3 weeks to get something that actually worked.

## What I Thought RAG Was

Before diving in, my understanding of RAG was pretty basic:
1. Store documents in a vector database
2. When user asks a question, find relevant documents
3. Feed documents + question to an LLM
4. Get a smart answer

Simple, right? Well, the concept is simple. The implementation... not so much.

## The Use Case

Our hospital has hundreds of medical protocols, guidelines, and procedures scattered across PDFs, Word docs, and internal wikis. Doctors and nurses waste time searching for specific information during critical moments.

The ask: "Can we build something where they can just ask questions and get answers from our documents?"

## Setting Up LangChain (First Frustration)

Installing LangChain looked straightforward:

```bash
pip install langchain
```

But then I needed vector storage, embeddings, and an LLM. Each required different packages:

```bash
pip install langchain-openai
pip install langchain-community
pip install chromadb
pip install pypdf
pip install tiktoken
```

And that was just the beginning. Different tutorials used different combinations of packages, and half of them were outdated.

## Attempt 1: The Basic Tutorial Approach

Following a YouTube tutorial, I built this:

```python
from langchain.document_loaders import PyPDFLoader
from langchain.text_splitter import CharacterTextSplitter
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import Chroma
from langchain.chains import RetrievalQA
from langchain.llms import OpenAI

# Load documents
loader = PyPDFLoader("medical_protocols.pdf")
documents = loader.load()

# Split text
text_splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=0)
texts = text_splitter.split_documents(documents)

# Create embeddings and vector store
embeddings = OpenAIEmbeddings(openai_api_key="your-api-key-here")
vectorstore = Chroma.from_documents(texts, embeddings)

# Create QA chain
qa = RetrievalQA.from_chain_type(
    llm=OpenAI(openai_api_key="your-api-key-here"),
    chain_type="stuff",
    retriever=vectorstore.as_retriever()
)

# Ask questions
response = qa.run("What is the protocol for chest pain patients?")
print(response)
```

**Result**: It worked! Sort of. The answers were generic and often missed important details from our specific protocols.

## The Problems I Discovered

### 1. Chunking Strategy Matters

My first approach split documents at arbitrary 1000-character boundaries. This often broke up important information:

```
Chunk 1: "For chest pain patients, first assess vital signs and..."
Chunk 2: "...then immediately administer aspirin unless contraindicated by..."
```

When the system retrieved Chunk 1, it missed the crucial aspirin instruction.

**Better approach**:
```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    separators=["\n\n", "\n", ". ", " ", ""]
)
```

This preserved more context by splitting on natural boundaries.

### 2. Retrieval Quality Was Poor

The system often retrieved irrelevant chunks. When I asked about "chest pain protocols," it sometimes returned information about "chest X-ray procedures" because they shared similar words.

**Solution**: Better embeddings and retrieval parameters:
```python
# Use more relevant retrieval
retriever = vectorstore.as_retriever(
    search_type="similarity_score_threshold",
    search_kwargs={"score_threshold": 0.7, "k": 3}
)
```

### 3. No Source Attribution

The system gave answers but didn't tell me which document they came from. For medical protocols, this is crucial for verification.

## Attempt 2: Custom RAG Pipeline

I rebuilt the system with more control over each step:

```python
import os
from langchain.document_loaders import DirectoryLoader, PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import Chroma
from langchain.chat_models import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema.runnable import RunnablePassthrough
from langchain.schema.output_parser import StrOutputParser

class MedicalRAGSystem:
    def __init__(self, docs_directory, persist_directory="./chroma_db"):
        self.docs_directory = docs_directory
        self.persist_directory = persist_directory
        self.embeddings = OpenAIEmbeddings(openai_api_key=os.getenv("OPENAI_API_KEY"))
        self.llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0, openai_api_key=os.getenv("OPENAI_API_KEY"))
        self.vectorstore = None
        
    def load_documents(self):
        """Load all PDF documents from directory"""
        loader = DirectoryLoader(
            self.docs_directory,
            glob="**/*.pdf",
            loader_cls=PyPDFLoader
        )
        documents = loader.load()
        print(f"Loaded {len(documents)} document pages")
        return documents
    
    def create_chunks(self, documents):
        """Split documents into chunks"""
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=800,
            chunk_overlap=100,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        chunks = text_splitter.split_documents(documents)
        print(f"Created {len(chunks)} chunks")
        return chunks
    
    def create_vectorstore(self, chunks):
        """Create and persist vector store"""
        self.vectorstore = Chroma.from_documents(
            documents=chunks,
            embedding=self.embeddings,
            persist_directory=self.persist_directory
        )
        self.vectorstore.persist()
        print("Vector store created and persisted")
    
    def load_vectorstore(self):
        """Load existing vector store"""
        self.vectorstore = Chroma(
            persist_directory=self.persist_directory,
            embedding_function=self.embeddings
        )
        print("Vector store loaded")
    
    def create_rag_chain(self):
        """Create the RAG chain"""
        # Custom prompt template
        template = """You are a medical assistant helping healthcare professionals find information from hospital protocols.
        
        Use the following pieces of context to answer the question. If you don't know the answer based on the context, say so.
        Always cite which document or section your answer comes from.
        
        Context:
        {context}
        
        Question: {question}
        
        Answer:"""
        
        prompt = ChatPromptTemplate.from_template(template)
        
        # Create retriever
        retriever = self.vectorstore.as_retriever(
            search_type="similarity_score_threshold",
            search_kwargs={"score_threshold": 0.6, "k": 4}
        )
        
        # Create chain
        def format_docs(docs):
            formatted = []
            for doc in docs:
                source = doc.metadata.get('source', 'Unknown')
                content = doc.page_content
                formatted.append(f"Source: {source}\nContent: {content}\n")
            return "\n---\n".join(formatted)
        
        rag_chain = (
            {"context": retriever | format_docs, "question": RunnablePassthrough()}
            | prompt
            | self.llm
            | StrOutputParser()
        )
        
        return rag_chain
    
    def query(self, question):
        """Query the RAG system"""
        if not self.vectorstore:
            self.load_vectorstore()
        
        rag_chain = self.create_rag_chain()
        response = rag_chain.invoke(question)
        return response

# Usage
rag_system = MedicalRAGSystem("./medical_docs")

# First time setup
documents = rag_system.load_documents()
chunks = rag_system.create_chunks(documents)
rag_system.create_vectorstore(chunks)

# Query the system
response = rag_system.query("What is the protocol for chest pain patients?")
print(response)
```

This worked much better! The answers were more accurate and included source citations.

## The Challenges I Didn't Expect

### 1. PDF Quality Issues

Medical documents are often scanned PDFs with poor text extraction. Some protocols came out as gibberish:

```
"Pati3nt with ch3st p@in should b3 ass3ss3d..."
```

**Solution**: I had to preprocess documents and sometimes manually clean the worst ones.

### 2. Medical Terminology

Standard embeddings don't understand medical context well. "MI" (myocardial infarction) and "heart attack" should be similar, but weren't always treated as such.

**Partial solution**: I added a preprocessing step to expand common medical abbreviations:

```python
def expand_medical_terms(text):
    abbreviations = {
        "MI": "myocardial infarction",
        "BP": "blood pressure",
        "HR": "heart rate",
        "SOB": "shortness of breath",
        # ... many more
    }
    
    for abbrev, full_term in abbreviations.items():
        text = text.replace(abbrev, f"{abbrev} ({full_term})")
    
    return text
```

### 3. Context Window Limitations

Sometimes the relevant information was spread across multiple chunks, but the LLM's context window couldn't fit all of them.

**Solution**: I implemented a two-stage retrieval:
1. First pass: Get top 10 relevant chunks
2. Second pass: Re-rank and select top 3 most relevant

### 4. Hallucination Issues

Even with good context, the LLM sometimes made up information or mixed details from different protocols.

**Solution**: More specific prompting and temperature settings:

```python
template = """You are a medical protocol assistant. You must ONLY use information from the provided context.

IMPORTANT RULES:
- If the context doesn't contain the answer, say "I don't have information about this in the provided protocols"
- Never make up medical advice
- Always cite the specific document and section
- If you're uncertain, say so

Context:
{context}

Question: {question}

Answer:"""
```

## Production Deployment

Getting this running for our medical staff required additional considerations:

### 1. Security and Privacy

Medical documents contain sensitive information. I had to:
- Use local embeddings instead of OpenAI (switched to sentence-transformers)
- Run everything on-premises
- Add access controls and audit logging

### 2. User Interface

Command-line wasn't going to work for busy doctors. I built a simple web interface:

```python
import streamlit as st

st.title("Medical Protocol Assistant")

# Initialize RAG system
@st.cache_resource
def load_rag_system():
    return MedicalRAGSystem("./medical_docs")

rag_system = load_rag_system()

# User input
question = st.text_input("Ask about medical protocols:")

if question:
    with st.spinner("Searching protocols..."):
        response = rag_system.query(question)
        st.write(response)
```

### 3. Performance Optimization

Initial queries took 10-15 seconds. For busy medical staff, that's too slow. Optimizations:
- Cached embeddings
- Smaller, more focused vector store
- Faster embedding model
- Query result caching

Final response time: 2-3 seconds.

## What I Learned

### 1. RAG is More Than Just "Embeddings + LLM"

The quality depends heavily on:
- Document preprocessing
- Chunking strategy
- Retrieval parameters
- Prompt engineering
- Post-processing

### 2. Domain-Specific Challenges Are Real

Generic tutorials don't prepare you for:
- Poor document quality
- Domain-specific terminology
- Regulatory requirements
- User expectations

### 3. Evaluation is Hard

How do you know if your RAG system is working well? I ended up creating a test set of questions with known correct answers and measuring:
- Retrieval accuracy (did it find the right documents?)
- Answer quality (human evaluation)
- Response time

### 4. Iteration is Key

My first version was terrible. The current version (after 3 weeks of iteration) is actually useful. Plan for multiple iterations.

## Current Status

The system is now in limited production with 20 medical staff. Early feedback:
- ✅ "Much faster than searching through PDFs"
- ✅ "Answers are usually accurate"
- ❌ "Sometimes can't find information I know is there"
- ❌ "Wish it could handle images and diagrams"

## What's Next

Planned improvements:
1. **Multi-modal RAG**: Handle images and diagrams in protocols
2. **Better evaluation**: Automated testing with medical experts
3. **Conversation memory**: Remember context across questions
4. **Integration**: Connect with our EMR system

## For Others Building RAG Systems

**Start simple**: Get basic retrieval working before optimizing
**Focus on data quality**: Garbage in, garbage out applies here too
**Test with real users**: Your assumptions about what works will be wrong
**Plan for iteration**: Your first version won't be your last

RAG is powerful, but it's not magic. Like any system, it requires careful engineering, testing, and iteration to work well in production.

---

*Next post: I'm planning to explore multi-agent systems with CrewAI. The idea of AI agents working together to solve complex problems is fascinating, and I want to see if it lives up to the hype.*