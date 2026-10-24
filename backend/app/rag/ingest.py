
from pathlib import Path

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma

from app.core.config import settings


# Project paths
RAG_DIR = Path(__file__).resolve().parent

KNOWLEDGE_BASE_DIR = RAG_DIR / "knowledge_base"

VECTOR_DB_DIR = RAG_DIR / "chroma_db"

DOCUMENT_PATH = KNOWLEDGE_BASE_DIR / "cybersecurity_basics.txt"

COLLECTION_NAME = "cybersecurity_knowledge"


def get_embeddings():
    """Create the Google Gemini embedding model."""

    return GoogleGenerativeAIEmbeddings(
        model="gemini-embedding-001",
        google_api_key=settings.GEMINI_API_KEY,
    )


def ingest_documents():
    """Read, split, embed and store knowledge-base documents."""

    if not DOCUMENT_PATH.exists():
        raise FileNotFoundError(
            f"Knowledge document not found: {DOCUMENT_PATH}"
        )

    # Step 1: Read the document
    document_text = DOCUMENT_PATH.read_text(encoding="utf-8")

    # Step 2: Split document into smaller chunks
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=700,
        chunk_overlap=100,
    )

    chunks = splitter.create_documents(
        [document_text],
        metadatas=[
            {
                "source": "cybersecurity_basics.txt",
                "category": "cybersecurity",
            }
        ],
    )

    if not chunks:
        raise ValueError("No document chunks were created.")

    # Step 3: Create embedding model
    embeddings = get_embeddings()

    # Step 4: Store chunks in ChromaDB
    vector_store = Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=str(VECTOR_DB_DIR),
    )

    # Replace previous version of this source to avoid duplicates
    existing = vector_store.get(
        where={"source": "cybersecurity_basics.txt"}
    )

    if existing["ids"]:
        vector_store.delete(ids=existing["ids"])

    vector_store.add_documents(chunks)

    print(f"Successfully stored {len(chunks)} chunks in ChromaDB.")

    return len(chunks)


if __name__ == "__main__":
    ingest_documents()
