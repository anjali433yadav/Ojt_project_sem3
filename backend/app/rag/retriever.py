
from pathlib import Path

from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma

from app.core.config import settings


# ChromaDB configuration
RAG_DIR = Path(__file__).resolve().parent

VECTOR_DB_DIR = RAG_DIR / "chroma_db"

COLLECTION_NAME = "cybersecurity_knowledge"


def get_vector_store():
    """Connect to the existing ChromaDB collection."""

    embeddings = GoogleGenerativeAIEmbeddings(
        model="gemini-embedding-001",
        google_api_key=settings.GEMINI_API_KEY,
    )

    vector_store = Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=str(VECTOR_DB_DIR),
    )

    return vector_store


def retrieve_context(query: str, k: int = 3):
    """Find the most relevant knowledge chunks for a question."""

    if not query.strip():
        raise ValueError("Search query cannot be empty.")

    vector_store = get_vector_store()

    results = vector_store.similarity_search_with_score(
        query,
        k=k,
    )

    retrieved_chunks = []

    for document, score in results:
        retrieved_chunks.append({
            "content": document.page_content,
            "source": document.metadata.get("source", "Unknown"),
            "category": document.metadata.get("category", "Unknown"),
            "score": float(score),
        })

    return retrieved_chunks


if __name__ == "__main__":
    question = "What are the warning signs of phishing emails?"

    results = retrieve_context(question)

    print("\nQuestion:", question)
    print("\nRetrieved Knowledge:\n")

    for index, result in enumerate(results, start=1):
        print(f"--- Result {index} ---")
        print("Content:", result["content"])
        print("Source:", result["source"])
        print("Distance:", result["score"])
        print()
