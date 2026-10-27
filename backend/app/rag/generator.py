
from langchain_google_genai import ChatGoogleGenerativeAI

from app.core.config import settings
from app.rag.retriever import retrieve_context


def generate_rag_simulation(
    topic: str,
    difficulty: str = "beginner",
):
    """Generate a cybersecurity simulation using RAG and Gemini."""

    # Step 1: Retrieve relevant cybersecurity knowledge
    results = retrieve_context(topic, k=3)

    if not results:
        raise ValueError("No relevant cybersecurity knowledge found.")

    context = "\n\n".join(
        result["content"] for result in results
    )

    # Step 2: Initialize Gemini
    llm = ChatGoogleGenerativeAI(
        model=settings.GEMINI_MODEL,
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0.4,
    )

    # Step 3: Prepare the RAG prompt
    prompt = f"""
You are a cybersecurity awareness training assistant.

Generate a safe phishing-awareness simulation draft.

TOPIC:
{topic}

DIFFICULTY:
{difficulty}

RETRIEVED CYBERSECURITY KNOWLEDGE:
{context}

INSTRUCTIONS:

1. Use the retrieved knowledge as the factual foundation.
2. Create an educational simulation draft.
3. Include a subject line and message body.
4. Explain the warning signs employees should notice.
5. Keep the language appropriate for the requested difficulty.
6. Do not request real passwords or confidential information.
7. Do not include functional phishing links.
8. Use this exact placeholder if a link is needed:
[SIMULATED TRAINING LINK - DO NOT OPEN]
9. Clearly label the output as a simulated training exercise.
10. Do not invent cybersecurity facts unsupported by the context.

Return the result in this format:

SIMULATION TITLE:
SUBJECT:
MESSAGE:
LEARNING OBJECTIVE:
WARNING SIGNS:
"""

    # Step 4: Generate the draft
    response = llm.invoke(prompt)

    return {
        "topic": topic,
        "difficulty": difficulty,
        "retrieved_chunks": len(results),
        "sources": list({
            result["source"] for result in results
        }),
        "generated_content": response.content,
    }


if __name__ == "__main__":
    result = generate_rag_simulation(
        topic="Recognizing suspicious phishing emails",
        difficulty="beginner",
    )

    print("\n===== RAG GENERATED SIMULATION =====\n")
    print(result["generated_content"])

    print("\n===== RAG INFORMATION =====")
    print("Retrieved chunks:", result["retrieved_chunks"])
    print("Sources:", result["sources"])
